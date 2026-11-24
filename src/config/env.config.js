import dotenv from "dotenv";

// Carga las variables definidas en el archivo .env (si existe) dentro de process.env
dotenv.config({ quiet: true });

const port = Number.parseInt(process.env.PORT, 10);

const envConfig = {
  // Puerto en el que escucha el servidor. Si no viene en .env se usa 8080.
  PORT: Number.isInteger(port) && port > 0 ? port : 8080,
  // URI de conexión a MongoDB Atlas
  MONGO_URI: process.env.MONGO_URI?.trim() || "",
};

export default envConfig;
