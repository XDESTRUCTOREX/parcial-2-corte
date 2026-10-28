const express = require("express");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const errorHandler = require("./middlewares/errorHandler");
const productRoutes = require("./routes/productRoutes");

require("dotenv").config({
  path: `.env.${process.env.NODE_ENV || "development"}`,
});

const app = express();

// Middlewares globales
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Servir cliente estático frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Ruta de estado
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Servidor de Inventario activo",
  });
});

// Rutas principales
app.use("/api/v1/products", productRoutes);

// Manejo de rutas 404
app.all("*", (req, res) => {
  res.status(404).json({
    status: "fail",
    message: `Ruta ${req.originalUrl} no encontrada`,
  });
});

// Middleware centralizado de errores
app.use(errorHandler);

module.exports = app;
