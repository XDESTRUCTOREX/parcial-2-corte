const logger = require("../utils/logger");

// Convierte err.value a texto legible: en Mongoose puede llegar como string
// o como objeto con la propiedad stringValue según el origen del CastError.
const formatValue = (value) => {
  if (typeof value === "string") return value;
  if (value && typeof value.stringValue === "string") return value.stringValue;
  try {
    return JSON.stringify(value);
  } catch (e) {
    return String(value);
  }
};

// Contrato uniforme de errores:
// - status "fail" para todos los errores del cliente (4xx)
// - status "error" reservado para fallas del servidor (5xx)
// - ValidationError y errores de parsing agregan la lista "errors"
const errorHandler = (err, req, res, next) => {
  logger.error(err.name || "Error", err.message);

  // Recurso inexistente (lanzado por productService) -> 404
  if (err.message === "Recurso no encontrado") {
    return res.status(404).json({
      status: "fail",
      message: "Recurso no encontrado",
    });
  }

  // Validación de esquema Mongoose -> 400
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      status: "fail",
      message: "Datos de entrada inválidos",
      errors: messages,
    });
  }

  // Valor con tipo incorrecto -> 400
  // Distingue el identificador (_id) de los demás campos (p. ej. price numérico).
  if (err.name === "CastError") {
    const value = formatValue(err.value);
    const message =
      err.path === "_id"
        ? `ID inválido: ${value}`
        : `Valor inválido para el campo ${err.path}: ${value}`;
    return res.status(400).json({
      status: "fail",
      message,
    });
  }

  // Cuerpo JSON malformado (body-parser) -> 400
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      status: "fail",
      message: "JSON malformado en el cuerpo de la petición",
    });
  }

  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;

  res.status(statusCode).json({
    status: isServerError ? "error" : "fail",
    message:
      isServerError && process.env.NODE_ENV !== "development"
        ? "Error interno del servidor"
        : err.message,
  });
};

module.exports = errorHandler;
