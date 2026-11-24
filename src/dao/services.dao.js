import mongoose from "mongoose";
import ServiceModel from "../models/service.model.js";

/**
 * DAO de services: única capa que interactúa directamente con la colección "services" en MongoDB.
 * Solo persiste y consulta datos mediante Mongoose; no contiene reglas de negocio.
 * Métodos: getAll, getById, create, update, delete.
 */
export class ServicesDAO {
  #model;

  constructor(model) {
    this.#model = model;
  }

  /** Devuelve todos los servicios que cumplen el filtro indicado (vacío por defecto). */
  async getAll(filters = {}) {
    const query = {};
    if (filters.category !== undefined) query.category = filters.category;
    if (filters.available !== undefined) query.available = filters.available;
    return this.#model.find(query).lean();
  }

  /** Devuelve el servicio con ese ObjectId o null si no existe o el formato no es válido. */
  async getById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return this.#model.findById(id).lean();
  }

  /** Persiste un nuevo servicio en MongoDB (ignora id/_id enviados) y lo devuelve. */
  async create(data) {
    const { _id: _ignoredObjectId, id: _ignoredId, ...fields } = data;
    const created = await this.#model.create(fields);
    return created.toObject();
  }

  /** Actualiza los campos indicados conservando el _id. Devuelve el documento actualizado o null. */
  async update(id, data) {
    if (!mongoose.isValidObjectId(id)) return null;
    const { _id: _ignoredObjectId, id: _ignoredId, ...fields } = data;
    return this.#model
      .findByIdAndUpdate(id, { $set: fields }, { new: true, runValidators: true })
      .lean();
  }

  /** Elimina el servicio por ObjectId. Devuelve el documento eliminado o null. */
  async delete(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return this.#model.findByIdAndDelete(id).lean();
  }
}

const servicesDAO = new ServicesDAO(ServiceModel);

export default servicesDAO;
