const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info("Conectado a MongoDB Atlas exitosamente");
  } catch (error) {
    logger.error("Error fatal conectando a MongoDB Atlas", error);
    process.exit(1);
  }
};

module.exports = connectDB;
