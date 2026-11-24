import mongoose from "mongoose";
import MessageModel from "../models/message.model.js";

/**
 * DAO de messages: única capa que interactúa directamente con la colección "messages" en MongoDB.
 * Solo persiste y consulta datos mediante Mongoose; no contiene reglas de negocio.
 * Métodos: getAll, getById, create, delete.
 */
export class MessagesDAO {
  #model;

  constructor(model) {
    this.#model = model;
  }

  /** Devuelve los mensajes ordenados del más reciente al más antiguo, con filtros opcionales. */
  async getAll(filters = {}) {
    const query = {};
    if (filters.user !== undefined) query.user = filters.user;
    if (filters.booking !== undefined) {
      if (!mongoose.isValidObjectId(filters.booking)) return [];
      query.booking = filters.booking;
    }
    return this.#model.find(query).sort({ createdAt: -1 }).lean();
  }

  /** Devuelve el mensaje con ese ObjectId o null si no existe o el formato no es válido. */
  async getById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return this.#model.findById(id).lean();
  }

  /** Persiste un nuevo mensaje en MongoDB y lo devuelve. */
  async create(data) {
    const { _id: _ignoredObjectId, id: _ignoredId, ...fields } = data;
    const created = await this.#model.create(fields);
    return created.toObject();
  }

  /** Elimina el mensaje por ObjectId. Devuelve el documento eliminado o null. */
  async delete(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return this.#model.findByIdAndDelete(id).lean();
  }
}

const messagesDAO = new MessagesDAO(MessageModel);

export default messagesDAO;
