import { connectDB, disconnectDB } from "../config/db.config.js";
import ServiceModel from "../models/service.model.js";
import BookingModel from "../models/booking.model.js";
import MessageModel from "../models/message.model.js";

const INITIAL_SERVICES = [
  {
    name: "Consulta de medicina general",
    description: "Evaluación clínica general con médico cirujano",
    duration: 30,
    price: 25000,
    category: "salud",
    available: true,
  },
  {
    name: "Sesión de kinesiología",
    description: "Rehabilitación musculoesquelética personalizada",
    duration: 45,
    price: 18000,
    category: "salud",
    available: false,
  },
  {
    name: "Corte de cabello",
    description: "Corte y peinado para adultos",
    duration: 40,
    price: 12000,
    category: "belleza",
    available: true,
  },
  {
    name: "Clase de yoga",
    description: "Clase grupal de yoga nivel inicial",
    duration: 60,
    price: 8000,
    category: "bienestar",
    available: true,
  },
];

/**
 * Carga datos iniciales de ejemplo en MongoDB Atlas si las colecciones están vacías.
 * Útil para probar la API rápidamente luego de configurar MONGO_URI.
 */
const seedDatabase = async () => {
  try {
    await connectDB();

    const existingServices = await ServiceModel.countDocuments();
    if (existingServices > 0) {
      console.log("La colección services ya contiene datos. No se insertaron duplicados.");
      return;
    }

    const insertedServices = await ServiceModel.insertMany(INITIAL_SERVICES);
    console.log(`Se insertaron ${insertedServices.length} servicios iniciales.`);

    const firstBooking = await BookingModel.create({
      clientName: "María González",
      clientEmail: "maria.gonzalez@example.com",
      date: "2026-10-15",
      time: "10:30",
      status: "pending",
      services: [
        {
          service: insertedServices[0]._id,
          quantity: 1,
        },
      ],
    });
    console.log(`Se insertó 1 reserva inicial (id: ${firstBooking._id}).`);

    const firstMessage = await MessageModel.create({
      user: "maria.gonzalez@example.com",
      message: "Hola, confirmo asistencia a mi turno de medicina general.",
      booking: firstBooking._id,
    });
    console.log(`Se insertó 1 mensaje inicial (id: ${firstMessage._id}).`);
  } catch (error) {
    console.error("Error ejecutando el seed:", error.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

seedDatabase();
