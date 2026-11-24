import bookingsDAO from "../dao/bookings.dao.js";

/**
 * Repository de bookings: ofrece los métodos de acceso a datos que usa la capa de services.
 * Delega en el DAO de MongoDB sin agregar reglas de negocio.
 */
export class BookingsRepository {
  #dao;

  constructor(dao) {
    this.#dao = dao;
  }

  create(data) {
    return this.#dao.create(data);
  }

  getById(id, options) {
    return this.#dao.getById(id, options);
  }

  update(id, data) {
    return this.#dao.update(id, data);
  }
}

const bookingsRepository = new BookingsRepository(bookingsDAO);

export default bookingsRepository;
