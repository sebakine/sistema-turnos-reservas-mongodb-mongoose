import mongoose from "mongoose";
import BookingModel from "../models/booking.model.js";

/**
 * DAO de bookings: única capa que interactúa directamente con la colección "bookings" en MongoDB.
 * Solo persiste y consulta datos mediante Mongoose; no contiene reglas de negocio.
 * Métodos: create, getById, update.
 */
export class BookingsDAO {
  #model;

  constructor(model) {
    this.#model = model;
  }

  /** Persiste una nueva reserva en MongoDB (ignora id/_id enviados) y la devuelve. */
  async create(data) {
    const { _id: _ignoredObjectId, id: _ignoredId, ...fields } = data;
    const created = await this.#model.create(fields);
    return created.toObject();
  }

  /**
   * Devuelve la reserva con ese ObjectId o null si no existe o el formato no es válido.
   * Si populate es true, resuelve los ObjectId de services.service con los documentos Service.
   */
  async getById(id, { populate = false } = {}) {
    if (!mongoose.isValidObjectId(id)) return null;
    let query = this.#model.findById(id);
    if (populate) {
      query = query.populate("services.service");
    }
    return query.lean();
  }

  /** Actualiza los campos indicados conservando el _id. Devuelve la reserva actualizada o null. */
  async update(id, data) {
    if (!mongoose.isValidObjectId(id)) return null;
    const { _id: _ignoredObjectId, id: _ignoredId, ...fields } = data;
    return this.#model
      .findByIdAndUpdate(id, { $set: fields }, { new: true, runValidators: true })
      .lean();
  }
}

const bookingsDAO = new BookingsDAO(BookingModel);

export default bookingsDAO;
