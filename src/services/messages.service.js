import messagesRepository from "../repositories/messages.repository.js";
import bookingsRepository from "../repositories/bookings.repository.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

const REQUIRED_FIELDS = ["user", "message"];

const isMissing = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

/**
 * Service de messages: reglas de negocio para mensajes y consultas del sistema.
 * No conoce la petición ni la respuesta HTTP ni accede directamente a MongoDB: usa los repositories.
 */
class MessagesService {
  /** Devuelve todos los mensajes, con filtros opcionales por user y booking. */
  async getMessages({ user, booking } = {}) {
    if (user !== undefined && (typeof user !== "string" || user.trim() === "")) {
      throw new ValidationError("El filtro user debe ser un texto no vacío");
    }
    if (booking !== undefined && (typeof booking !== "string" || booking.trim() === "")) {
      throw new ValidationError("El filtro booking debe ser un identificador no vacío");
    }

    const filters = {};
    if (user !== undefined) filters.user = user.trim();
    if (booking !== undefined) filters.booking = booking.trim();

    return messagesRepository.getAll(filters);
  }

  /** Devuelve un mensaje por id o lanza NotFoundError. */
  async getMessageById(id) {
    const message = await messagesRepository.getById(id);
    if (!message) throw new NotFoundError(`No existe un mensaje con id ${id}`);
    return message;
  }

  /** Crea un mensaje validando user, message y, si se envía, la existencia de booking. */
  async createMessage(data) {
    const source = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    const missing = REQUIRED_FIELDS.filter((f) => isMissing(source[f]));
    if (missing.length) {
      throw new ValidationError(`Faltan campos obligatorios: ${missing.join(", ")}`, missing);
    }

    const errors = [];
    if (typeof source.user !== "string" || source.user.trim() === "") {
      errors.push("user debe ser un texto no vacío");
    }
    if (typeof source.message !== "string" || source.message.trim() === "") {
      errors.push("message debe ser un texto no vacío");
    }
    if (source.booking !== undefined && source.booking !== null) {
      if (typeof source.booking !== "string" || source.booking.trim() === "") {
        errors.push("booking debe ser el id de una reserva");
      }
    }
    if (errors.length) throw new ValidationError("Datos inválidos", errors);

    let bookingRef = null;
    if (source.booking !== undefined && source.booking !== null) {
      const bookingId = source.booking.trim();
      const booking = await bookingsRepository.getById(bookingId);
      if (!booking) {
        throw new ValidationError(`No existe una reserva con id ${bookingId}`, [bookingId]);
      }
      bookingRef = booking._id;
    }

    return messagesRepository.create({
      user: source.user.trim(),
      message: source.message.trim(),
      booking: bookingRef,
    });
  }

  /** Elimina un mensaje por id y lo devuelve, o lanza NotFoundError. */
  async deleteMessage(id) {
    const deleted = await messagesRepository.delete(id);
    if (!deleted) throw new NotFoundError(`No existe un mensaje con id ${id}`);
    return deleted;
  }
}

const messagesService = new MessagesService();

export default messagesService;
