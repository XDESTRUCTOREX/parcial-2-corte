const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "El producto es obligatorio en cada ítem"],
    },
    quantity: {
      type: Number,
      required: [true, "La cantidad es obligatoria"],
      min: [1, "La cantidad debe ser mayor a cero"],
      validate: {
        validator: Number.isInteger,
        message: "La cantidad debe ser un número entero",
      },
    },
    // unitPrice, lineTotal y total los calcula el servicio con los precios
    // vigentes de la base de datos; nunca se aceptan del cliente.
    unitPrice: {
      type: Number,
      min: [0, "El precio unitario no puede ser negativo"],
    },
    lineTotal: {
      type: Number,
      min: [0, "El importe por ítem no puede ser negativo"],
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: String,
      required: [true, "El cliente es obligatorio"],
      trim: true,
    },
    items: {
      type: [orderItemSchema],
      required: [true, "La orden debe tener al menos un ítem"],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "La orden debe tener al menos un ítem",
      },
    },
    total: {
      type: Number,
      min: [0, "El total no puede ser negativo"],
    },
    status: {
      type: String,
      enum: ["creada", "confirmada", "cancelada"],
      default: "creada",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("Order", orderSchema);
