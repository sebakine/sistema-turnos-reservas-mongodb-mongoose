import messagesDAO from "../dao/messages.dao.js";

/**
 * Repository de messages: ofrece los métodos de acceso a datos que usa la capa de services.
 * Delega en el DAO de MongoDB sin agregar reglas de negocio.
 */
export class MessagesRepository {
  #dao;

  constructor(dao) {
    this.#dao = dao;
  }

  getAll(filters) {
    return this.#dao.getAll(filters);
  }

  getById(id) {
    return this.#dao.getById(id);
  }

  create(data) {
    return this.#dao.create(data);
  }

  delete(id) {
    return this.#dao.delete(id);
  }
}

const messagesRepository = new MessagesRepository(messagesDAO);

export default messagesRepository;
