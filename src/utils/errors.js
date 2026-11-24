/**
 * Errores de negocio que lanzan los services.
 * No dependen de Express: cada error solo indica qué código HTTP le corresponde
 * y son los controllers quienes construyen la respuesta.
 */

/** Datos inválidos, incompletos o que incumplen una regla de negocio -> HTTP 400 */
export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
    this.details = details;
  }
}

/** Recurso inexistente -> HTTP 404 */
export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

/**
 * Convierte un error en { statusCode, body } para que el controller responda.
 * Traduce también errores de validación o casteo de Mongoose a 400.
 * Los errores inesperados se informan como 500 sin exponer detalles internos.
 */
export const toErrorResponse = (error) => {
  if (error?.statusCode) {
    const body = { status: "error", error: error.message };
    if (error.details?.length) body.details = error.details;
    return { statusCode: error.statusCode, body };
  }

  if (error?.name === "ValidationError" && error?.errors) {
    const details = Object.values(error.errors).map((e) => e.message);
    return {
      statusCode: 400,
      body: { status: "error", error: "Datos inválidos", details },
    };
  }

  if (error?.name === "CastError") {
    return {
      statusCode: 400,
      body: { status: "error", error: `Identificador o formato inválido para el campo ${error.path}` },
    };
  }

  console.error(error);
  return { statusCode: 500, body: { status: "error", error: "Error interno del servidor" } };
};
