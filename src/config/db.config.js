import mongoose from "mongoose";
import envConfig from "./env.config.js";

let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on("error", (error) => {
    console.error("Error en la conexión de MongoDB:", error.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("Conexión a MongoDB cerrada.");
  });
};

/**
 * Establece la conexión con MongoDB Atlas usando la variable MONGO_URI.
 * Acepta una URI opcional para pruebas automatizadas.
 */
export const connectDB = async (uri = envConfig.MONGO_URI) => {
  if (!uri) {
    throw new Error(
      "Falta configurar la variable de entorno MONGO_URI. Copie .env.example a .env y agregue su URI de MongoDB Atlas."
    );
  }

  registerConnectionListeners();

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  console.log(`Conectado a MongoDB (base de datos: ${mongoose.connection.name})`);
  return mongoose.connection;
};

/** Cierra limpiamente la conexión con MongoDB. */
export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
