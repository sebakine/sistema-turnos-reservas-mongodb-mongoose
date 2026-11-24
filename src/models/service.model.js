import mongoose from "mongoose";

/**
 * Modelo Mongoose para la colección "services".
 * Representa un servicio disponible para agendar en el sistema de turnos y reservas.
 */
const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El campo name es obligatorio"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "El campo description es obligatorio"],
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, "El campo duration es obligatorio"],
      min: [1, "duration debe ser un número entero de minutos mayor a 0"],
      validate: {
        validator: Number.isInteger,
        message: "duration debe ser un número entero de minutos mayor a 0",
      },
    },
    price: {
      type: Number,
      required: [true, "El campo price es obligatorio"],
      min: [0, "price debe ser un número mayor o igual a 0"],
    },
    category: {
      type: String,
      required: [true, "El campo category es obligatorio"],
      trim: true,
      lowercase: true,
    },
    available: {
      type: Boolean,
      required: [true, "El campo available es obligatorio"],
    },
  },
  {
    collection: "services",
    timestamps: true,
    versionKey: false,
  }
);

// Índice compuesto para optimizar consultas por categoría y disponibilidad
serviceSchema.index({ category: 1, available: 1 });

const ServiceModel = mongoose.model("Service", serviceSchema);

export default ServiceModel;
