import bookingsRepository from "../repositories/bookings.repository.js";
import servicesRepository from "../repositories/services.repository.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

/** Estados posibles de una reserva. */
const BOOKING_STATUSES = ["pending", "confirmed", "cancelled"];

const REQUIRED_FIELDS = ["clientName", "clientEmail", "date", "time"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const isMissing = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

/** Comprueba que la fecha tenga formato YYYY-MM-DD y exista en el calendario. */
const isValidDate = (value) => {
  if (typeof value !== "string" || !DATE_REGEX.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

/**
 * Valida el array inicial de servicios y agrupa los repetidos sumando quantity.
 * Acepta elementos { service, quantity } (quantity opcional, por defecto 1) o solo el id.
 */
const normalizeServices = (services) => {
  if (services === undefined || services === null) return [];
  if (!Array.isArray(services)) {
    throw new ValidationError("services debe ser un array", ["services"]);
  }

  const grouped = new Map();
  const errors = [];

  services.forEach((item, i) => {
    const rawId = typeof item === "string" ? item : item?.service;
    const serviceId = typeof rawId === "string" ? rawId.trim() : "";
    const quantity = typeof item === "object" && item !== null && item.quantity !== undefined ? item.quantity : 1;

    if (!serviceId) {
      errors.push(`services[${i}].service debe ser el id de un servicio`);
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      errors.push(`services[${i}].quantity debe ser un número entero mayor a 0`);
      return;
    }
    grouped.set(serviceId, (grouped.get(serviceId) ?? 0) + quantity);
  });

  if (errors.length) throw new ValidationError("Servicios inválidos", errors);
  return [...grouped].map(([service, quantity]) => ({ service, quantity }));
};

/** Valida los datos del cliente, la fecha, la hora y el estado de una reserva. */
const validateBookingData = (data) => {
  const missing = REQUIRED_FIELDS.filter((f) => isMissing(data[f]));
  if (missing.length) {
    throw new ValidationError(`Faltan campos obligatorios: ${missing.join(", ")}`, missing);
  }

  const errors = [];
  if (typeof data.clientName !== "string") errors.push("clientName debe ser un texto no vacío");
  if (typeof data.clientEmail !== "string" || !EMAIL_REGEX.test(data.clientEmail.trim())) {
    errors.push("clientEmail debe ser un email válido");
  }
  if (!isValidDate(data.date)) errors.push("date debe ser una fecha válida con formato YYYY-MM-DD");
  if (typeof data.time !== "string" || !TIME_REGEX.test(data.time)) {
    errors.push("time debe ser una hora válida con formato HH:mm (24 horas)");
  }
  if (data.status !== undefined && !BOOKING_STATUSES.includes(data.status)) {
    errors.push(`status debe ser uno de: ${BOOKING_STATUSES.join(", ")}`);
  }
  if (errors.length) throw new ValidationError("Datos inválidos", errors);
};

/** Extrae el id en texto de una referencia ObjectId o documento populado. */
const extractServiceId = (serviceRef) => {
  if (serviceRef && typeof serviceRef === "object" && serviceRef._id !== undefined) {
    return String(serviceRef._id);
  }
  return String(serviceRef);
};

/**
 * Service de bookings: reglas de negocio de las reservas.
 * No conoce la petición ni la respuesta HTTP ni accede directamente a MongoDB: usa los repositories.
 */
class BookingsService {
  /** Operaciones pendientes por reserva, para que dos agregados simultáneos no se pisen. */
  #locks = new Map();

  /** Ejecuta la tarea de forma exclusiva para una misma reserva. */
  async #withBookingLock(bookingId, task) {
    const key = String(bookingId);
    const previous = this.#locks.get(key) ?? Promise.resolve();
    const current = previous.then(task, task);
    const settled = current.catch(() => {});
    this.#locks.set(key, settled);
    settled.then(() => {
      if (this.#locks.get(key) === settled) this.#locks.delete(key);
    });
    return current;
  }

  /**
   * Crea una reserva. services puede venir vacío o no enviarse; si trae servicios,
   * deben existir y los repetidos se agrupan en quantity. status por defecto: "pending".
   */
  async createBooking(data) {
    const source = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    validateBookingData(source);
    const services = normalizeServices(source.services);

    const notFound = [];
    for (const { service } of services) {
      if (!(await servicesRepository.getById(service))) notFound.push(service);
    }
    if (notFound.length) {
      throw new ValidationError(`No existen los servicios: ${notFound.join(", ")}`, notFound);
    }

    return bookingsRepository.create({
      clientName: source.clientName.trim(),
      clientEmail: source.clientEmail.trim().toLowerCase(),
      date: source.date,
      time: source.time,
      status: source.status ?? "pending",
      services,
    });
  }

  /**
   * Devuelve una reserva por id o lanza NotFoundError.
   * Acepta opcionalmente populate ("true" | "false") para expandir las referencias ObjectId.
   */
  async getBookingById(id, { populate } = {}) {
    if (populate !== undefined && populate !== "true" && populate !== "false" && typeof populate !== "boolean") {
      throw new ValidationError("El parámetro populate solo acepta true o false");
    }
    const shouldPopulate = populate === true || populate === "true";
    const booking = await bookingsRepository.getById(id, { populate: shouldPopulate });
    if (!booking) throw new NotFoundError(`No existe una reserva con id ${id}`);
    return booking;
  }

  /**
   * Agrega un servicio a una reserva existente.
   * Regla de negocio: si el servicio ya está en la reserva se incrementa su quantity;
   * si no está, se agrega como { service, quantity: 1 }.
   */
  async addServiceToBooking(bookingId, serviceId) {
    return this.#withBookingLock(bookingId, async () => {
      const booking = await bookingsRepository.getById(bookingId);
      if (!booking) throw new NotFoundError(`No existe una reserva con id ${bookingId}`);

      const service = await servicesRepository.getById(serviceId);
      if (!service) throw new NotFoundError(`No existe un servicio con id ${serviceId}`);

      if (booking.status === "cancelled") {
        throw new ValidationError("No se pueden agregar servicios a una reserva cancelada");
      }

      const targetServiceId = String(service._id);
      const services = Array.isArray(booking.services)
        ? booking.services.map((item) => ({
            service: extractServiceId(item.service),
            quantity: item.quantity,
          }))
        : [];

      const existing = services.find((item) => item.service === targetServiceId);
      if (existing) existing.quantity += 1;
      else services.push({ service: targetServiceId, quantity: 1 });

      const updated = await bookingsRepository.update(bookingId, { services });
      if (!updated) throw new NotFoundError(`No existe una reserva con id ${bookingId}`);
      return updated;
    });
  }
}

const bookingsService = new BookingsService();

export default bookingsService;
