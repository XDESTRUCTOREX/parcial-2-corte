const app = require("../src/app");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const logger = require("../src/utils/logger");

const PORT = process.env.PORT || 3000;

(async () => {
  let mongoServer;
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI, {
        dbName: process.env.MONGODB_DB_NAME || "inventario",
      });
      logger.info("Servidor conectado a base de datos externa");
    } else {
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri, { dbName: "inventario_local" });
      logger.info(`Servidor conectado a MongoDB en memoria`);
    }

    const server = app.listen(PORT, () => {
      logger.info(`Servidor escuchando en http://localhost:${PORT}`);
    });

    const shutdown = async () => {
      logger.info("Apagando servidor...");
      server.close(async () => {
        await mongoose.disconnect();
        if (mongoServer) await mongoServer.stop();
        logger.info("Servidor finalizado limpiamente.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (err) {
    logger.error("Error iniciando servidor", err);
    process.exit(1);
  }
})();

