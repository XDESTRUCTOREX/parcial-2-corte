const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const databaseName = process.env.MONGODB_DB_NAME || 'inventario';

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: databaseName,
    });

    logger.info(`Conectado a MongoDB Atlas exitosamente (base de datos: ${databaseName})`);
  } catch (error) {
    logger.error('Error fatal conectando a MongoDB Atlas', error);
    process.exit(1);
  }
};

module.exports = connectDB;
