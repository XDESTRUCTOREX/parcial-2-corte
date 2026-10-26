const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');
const productRoutes = require('./routes/productRoutes');

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Servidor de Inventario activo',
  });
});

app.use('/api/v1/products', productRoutes);

app.all('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Ruta ${req.originalUrl} no encontrada`,
  });
});

app.use(errorHandler);

module.exports = app;
