const app = require('./app');
const connectDB = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      logger.info(
        `Servidor ejecutándose en puerto ${PORT} - Modo: ${process.env.NODE_ENV}`
      );
    });

    process.on('SIGTERM', () => {
      logger.info('Señal SIGTERM recibida. Cerrando servidor HTTP...');
      server.close(() => {
        logger.info('Servidor HTTP cerrado.');
        process.exit(0);
      });
    });
  });
