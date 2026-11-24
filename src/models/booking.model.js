import mongoose from "mongoose";

/**
 * Subesquema de servicio dentro de una reserva.
 * Referencia al documento Service mediante ObjectId (sin incrustar el objeto completo).
 */
const bookingServiceSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: [true, "La referencia al servicio es obligatoria"],
    },
    quantity: {
      type: Number,
      required: [true, "La cantidad es obligatoria"],
      min: [1, "quantity debe ser un número entero mayor a 0"],
      default: 1,
      validate: {
        validator: Number.isInteger,
        message: "quantity debe ser un número entero mayor a 0",
      },
    },
  },
  { _id: false }
);

/**
 * Modelo Mongoose para la colección "bookings".
 * Representa un turno o reserva realizada por un cliente.
 */
const bookingSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: [true, "El campo clientName es obligatorio"],
      trim: true,
    },
    clientEmail: {
      type: String,
      required: [true, "El campo clientEmail es obligatorio"],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "clientEmail debe ser un email válido"],
    },
    date: {
      type: String,
      required: [true, "El campo date es obligatorio"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "date debe tener formato YYYY-MM-DD"],
    },
    time: {
      type: String,
      required: [true, "El campo time es obligatorio"],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "time debe tener formato HH:mm (24 horas)"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "confirmed", "cancelled"],
        message: "status debe ser pending, confirmed o cancelled",
      },
      default: "pending",
    },
    services: {
      type: [bookingServiceSchema],
      default: [],
    },
  },
  {
    collection: "bookings",
    timestamps: true,
    versionKey: false,
  }
);

// Índices para consultas frecuentes por fecha/hora, cliente y estado
bookingSchema.index({ date: 1, time: 1 });
bookingSchema.index({ clientEmail: 1 });
bookingSchema.index({ status: 1 });

const BookingModel = mongoose.model("Booking", bookingSchema);

export default BookingModel;
