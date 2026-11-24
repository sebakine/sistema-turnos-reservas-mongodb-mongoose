import app from "./app.js";
import envConfig from "./config/env.config.js";
import { connectDB, disconnectDB } from "./config/db.config.js";

const { PORT } = envConfig;

/** Inicia la conexión a MongoDB Atlas y luego levanta el servidor HTTP. */
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`Señal ${signal} recibida. Cerrando servidor...`);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("No se pudo iniciar el servidor:", error.message);
    process.exit(1);
  }
};

startServer();
