import mongoose from "mongoose";

/**
 * Modelo Mongoose para la colección "messages".
 * Representa mensajes o consultas asociadas al sistema de turnos y reservas.
 */
const messageSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: [true, "El campo user es obligatorio"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "El campo message es obligatorio"],
      trim: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
  },
  {
    collection: "messages",
    timestamps: true,
    versionKey: false,
  }
);

// Índices para listar mensajes recientes y filtrar por usuario o reserva
messageSchema.index({ createdAt: -1 });
messageSchema.index({ user: 1 });
messageSchema.index({ booking: 1 });

const MessageModel = mongoose.model("Message", messageSchema);

export default MessageModel;
