import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.config.js";
import ServiceModel from "../src/models/service.model.js";
import BookingModel from "../src/models/booking.model.js";
import MessageModel from "../src/models/message.model.js";

let mongoServer;
let httpServer;
let baseUrl;

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const body = await response.json();
  return { status: response.status, body };
};

describe("API Sistema Backend de Turnos y Reservas (MongoDB + Mongoose)", () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDB(mongoServer.getUri());

    await new Promise((resolve) => {
      httpServer = app.listen(0, "127.0.0.1", () => {
        const { port } = httpServer.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  beforeEach(async () => {
    await Promise.all([
      ServiceModel.deleteMany({}),
      BookingModel.deleteMany({}),
      MessageModel.deleteMany({}),
    ]);
  });

  after(async () => {
    await new Promise((resolve) => httpServer.close(resolve));
    await disconnectDB();
    await mongoServer.stop();
  });

  describe("Rutas base y errores globales", () => {
    it("GET / devuelve información general y los tres recursos", async () => {
      const { status, body } = await request("/");
      assert.equal(status, 200);
      assert.equal(body.status, "success");
      assert.deepEqual(body.resources, ["/api/services", "/api/bookings", "/api/messages"]);
    });

    it("Devuelve 404 ante una ruta inexistente", async () => {
      const { status, body } = await request("/api/inexistente");
      assert.equal(status, 404);
      assert.equal(body.status, "error");
    });

    it("Devuelve 400 ante JSON mal formado", async () => {
      const response = await fetch(`${baseUrl}/api/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ json invalido",
      });
      const body = await response.json();
      assert.equal(response.status, 400);
      assert.equal(body.status, "error");
    });
  });

  describe("Recurso /api/services", () => {
    const sampleService = {
      name: "Control dental",
      description: "Revisión y limpieza dental completa",
      duration: 40,
      price: 30000,
      category: "SALUD",
      available: true,
    };

    it("POST /api/services crea un servicio en MongoDB y normaliza category", async () => {
      const { status, body } = await request("/api/services", {
        method: "POST",
        body: JSON.stringify({ ...sampleService, _id: "ignorado", id: "ignorado" }),
      });

      assert.equal(status, 201);
      assert.equal(body.status, "success");
      assert.equal(mongoose.isValidObjectId(body.payload._id), true);
      assert.equal(body.payload.category, "salud");
      assert.equal(body.payload.name, "Control dental");

      const inDb = await ServiceModel.findById(body.payload._id).lean();
      assert.ok(inDb);
      assert.equal(inDb.price, 30000);
    });

    it("POST /api/services rechaza campos faltantes o tipos inválidos con 400", async () => {
      const missing = await request("/api/services", {
        method: "POST",
        body: JSON.stringify({ name: "Incompleto" }),
      });
      assert.equal(missing.status, 400);

      const invalid = await request("/api/services", {
        method: "POST",
        body: JSON.stringify({ ...sampleService, duration: 0, price: -10 }),
      });
      assert.equal(invalid.status, 400);
      assert.ok(invalid.body.details.length >= 2);
    });

    it("GET /api/services lista y filtra por category y available", async () => {
      await request("/api/services", { method: "POST", body: JSON.stringify(sampleService) });
      await request("/api/services", {
        method: "POST",
        body: JSON.stringify({
          name: "Sesión de kinesiología",
          description: "Rehabilitación personalizada",
          duration: 45,
          price: 18000,
          category: "salud",
          available: false,
        }),
      });
      await request("/api/services", {
        method: "POST",
        body: JSON.stringify({
          name: "Corte de cabello",
          description: "Corte para adultos",
          duration: 30,
          price: 12000,
          category: "belleza",
          available: true,
        }),
      });

      const all = await request("/api/services");
      assert.equal(all.status, 200);
      assert.equal(all.body.count, 3);

      const filtered = await request("/api/services?category=SALUD&available=true");
      assert.equal(filtered.status, 200);
      assert.equal(filtered.body.count, 1);
      assert.equal(filtered.body.payload[0].name, "Control dental");

      const badFilter = await request("/api/services?available=si");
      assert.equal(badFilter.status, 400);
    });

    it("GET /api/services/:sid obtiene un servicio o devuelve 404 (id válido o formato inválido)", async () => {
      const created = await request("/api/services", {
        method: "POST",
        body: JSON.stringify(sampleService),
      });
      const sid = created.body.payload._id;

      const found = await request(`/api/services/${sid}`);
      assert.equal(found.status, 200);
      assert.equal(found.body.payload._id, sid);

      const notFoundValidId = await request(`/api/services/${new mongoose.Types.ObjectId()}`);
      assert.equal(notFoundValidId.status, 404);

      const notFoundInvalidId = await request("/api/services/id-invalido");
      assert.equal(notFoundInvalidId.status, 404);
    });

    it("PUT /api/services/:sid actualiza parcialmente conservando _id", async () => {
      const created = await request("/api/services", {
        method: "POST",
        body: JSON.stringify(sampleService),
      });
      const sid = created.body.payload._id;

      const updated = await request(`/api/services/${sid}`, {
        method: "PUT",
        body: JSON.stringify({ price: 27000, available: false, _id: new mongoose.Types.ObjectId() }),
      });
      assert.equal(updated.status, 200);
      assert.equal(updated.body.payload._id, sid);
      assert.equal(updated.body.payload.price, 27000);
      assert.equal(updated.body.payload.available, false);
      assert.equal(updated.body.payload.name, "Control dental");

      const emptyBody = await request(`/api/services/${sid}`, {
        method: "PUT",
        body: JSON.stringify({}),
      });
      assert.equal(emptyBody.status, 400);
    });

    it("DELETE /api/services/:sid elimina el servicio y luego devuelve 404", async () => {
      const created = await request("/api/services", {
        method: "POST",
        body: JSON.stringify(sampleService),
      });
      const sid = created.body.payload._id;

      const deleted = await request(`/api/services/${sid}`, { method: "DELETE" });
      assert.equal(deleted.status, 200);
      assert.equal(deleted.body.payload._id, sid);

      const secondDelete = await request(`/api/services/${sid}`, { method: "DELETE" });
      assert.equal(secondDelete.status, 404);
    });
  });

  describe("Recurso /api/bookings", () => {
    let serviceA;
    let serviceB;

    beforeEach(async () => {
      const resA = await request("/api/services", {
        method: "POST",
        body: JSON.stringify({
          name: "Consulta médica",
          description: "Evaluación general",
          duration: 30,
          price: 25000,
          category: "salud",
          available: true,
        }),
      });
      const resB = await request("/api/services", {
        method: "POST",
        body: JSON.stringify({
          name: "Clase de yoga",
          description: "Nivel inicial",
          duration: 60,
          price: 8000,
          category: "bienestar",
          available: true,
        }),
      });
      serviceA = resA.body.payload;
      serviceB = resB.body.payload;
    });

    it("POST /api/bookings crea reserva y almacena services[].service como ObjectId", async () => {
      const { status, body } = await request("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          clientName: "Juan Pérez",
          clientEmail: "JUAN.PEREZ@EXAMPLE.COM",
          date: "2026-10-20",
          time: "16:00",
          services: [
            { service: serviceA._id, quantity: 1 },
            { service: serviceA._id, quantity: 2 },
          ],
        }),
      });

      assert.equal(status, 201);
      assert.equal(body.payload.status, "pending");
      assert.equal(body.payload.clientEmail, "juan.perez@example.com");
      assert.deepEqual(body.payload.services, [{ service: serviceA._id, quantity: 3 }]);

      // Verifica en MongoDB que el campo service es realmente un ObjectId (no objeto completo)
      const docInDb = await BookingModel.findById(body.payload._id);
      assert.equal(docInDb.services.length, 1);
      assert.equal(docInDb.services[0].service instanceof mongoose.Types.ObjectId, true);
      assert.equal(docInDb.services[0].quantity, 3);
    });

    it("POST /api/bookings valida fecha, hora, email y existencia de servicios", async () => {
      const invalidDate = await request("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          clientName: "Ana",
          clientEmail: "ana@example.com",
          date: "2026-02-30",
          time: "25:00",
        }),
      });
      assert.equal(invalidDate.status, 400);

      const unknownService = await request("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          clientName: "Ana",
          clientEmail: "ana@example.com",
          date: "2026-10-20",
          time: "10:00",
          services: [{ service: new mongoose.Types.ObjectId().toString(), quantity: 1 }],
        }),
      });
      assert.equal(unknownService.status, 400);
    });

    it("GET /api/bookings/:bid devuelve la reserva (ObjectId por defecto y soporte ?populate=true)", async () => {
      const created = await request("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          clientName: "María González",
          clientEmail: "maria@example.com",
          date: "2026-10-15",
          time: "10:30",
          services: [{ service: serviceA._id, quantity: 1 }],
        }),
      });
      const bid = created.body.payload._id;

      const raw = await request(`/api/bookings/${bid}`);
      assert.equal(raw.status, 200);
      assert.equal(raw.body.payload.services[0].service, serviceA._id);

      const populated = await request(`/api/bookings/${bid}?populate=true`);
      assert.equal(populated.status, 200);
      assert.equal(populated.body.payload.services[0].service.name, "Consulta médica");

      const notFound = await request("/api/bookings/id-no-valido");
      assert.equal(notFound.status, 404);
    });

    it("POST /api/bookings/:bid/services/:sid agrega servicios, incrementa quantity y bloquea canceladas", async () => {
      const created = await request("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          clientName: "Carlos López",
          clientEmail: "carlos@example.com",
          date: "2026-11-01",
          time: "09:00",
          services: [],
        }),
      });
      const bid = created.body.payload._id;

      const firstAdd = await request(`/api/bookings/${bid}/services/${serviceA._id}`, { method: "POST" });
      assert.equal(firstAdd.status, 200);
      assert.deepEqual(firstAdd.body.payload.services, [{ service: serviceA._id, quantity: 1 }]);

      // Dos agregados concurrentes del mismo servicio no deben perder ningún incremento
      await Promise.all([
        request(`/api/bookings/${bid}/services/${serviceA._id}`, { method: "POST" }),
        request(`/api/bookings/${bid}/services/${serviceA._id}`, { method: "POST" }),
      ]);

      const afterConcurrent = await request(`/api/bookings/${bid}`);
      assert.deepEqual(afterConcurrent.body.payload.services, [{ service: serviceA._id, quantity: 3 }]);

      const secondService = await request(`/api/bookings/${bid}/services/${serviceB._id}`, { method: "POST" });
      assert.equal(secondService.status, 200);
      assert.equal(secondService.body.payload.services.length, 2);

      // Reserva cancelada no permite agregar servicios
      const cancelled = await request("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          clientName: "Lucía Díaz",
          clientEmail: "lucia@example.com",
          date: "2026-11-02",
          time: "11:00",
          status: "cancelled",
        }),
      });
      const rejected = await request(`/api/bookings/${cancelled.body.payload._id}/services/${serviceA._id}`, {
        method: "POST",
      });
      assert.equal(rejected.status, 400);

      // Servicio o reserva inexistente devuelve 404
      const missingService = await request(`/api/bookings/${bid}/services/${new mongoose.Types.ObjectId()}`, {
        method: "POST",
      });
      assert.equal(missingService.status, 404);
    });
  });

  describe("Recurso /api/messages", () => {
    it("Permite crear, listar, consultar y eliminar mensajes en MongoDB", async () => {
      const bookingRes = await request("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          clientName: "Sofía Rojas",
          clientEmail: "sofia@example.com",
          date: "2026-11-10",
          time: "14:00",
        }),
      });
      const bid = bookingRes.body.payload._id;

      const created = await request("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          user: "sofia@example.com",
          message: "¿Puedo llegar 10 minutos antes?",
          booking: bid,
        }),
      });
      assert.equal(created.status, 201);
      assert.equal(created.body.payload.booking, bid);
      const mid = created.body.payload._id;

      const list = await request(`/api/messages?booking=${bid}`);
      assert.equal(list.status, 200);
      assert.equal(list.body.count, 1);

      const single = await request(`/api/messages/${mid}`);
      assert.equal(single.status, 200);
      assert.equal(single.body.payload.user, "sofia@example.com");

      const invalidBooking = await request("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          user: "sofia@example.com",
          message: "Consulta",
          booking: new mongoose.Types.ObjectId().toString(),
        }),
      });
      assert.equal(invalidBooking.status, 400);

      const deleted = await request(`/api/messages/${mid}`, { method: "DELETE" });
      assert.equal(deleted.status, 200);

      const afterDelete = await request(`/api/messages/${mid}`);
      assert.equal(afterDelete.status, 404);
    });
  });
});
