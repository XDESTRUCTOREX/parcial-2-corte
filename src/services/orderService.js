const Order = require("../models/Order");
const Product = require("../models/Product");

// Error de negocio: la solicitud está bien formada pero viola una regla del
// dominio (p. ej. un producto referenciado no existe). El middleware central
// de errores lo mapea al statusCode indicado con status "fail" (4xx).
class BusinessError extends Error {
  constructor(message, statusCode = 422) {
    super(message);
    this.name = "BusinessError";
    this.statusCode = statusCode;
  }
}

// Redondeo a 2 decimales para que los importes monetarios sean consistentes
// y no arrastren ruido de coma flotante (p. ej. 0.1 * 3 = 0.30000000000000004).
const redondear = (valor) => Math.round(valor * 100) / 100;

const orderService = {
  createOrder: async (orderData) => {
    // Normaliza la entrada: cuerpos ausentes o de tipo primitivo se tratan
    // como objeto vacío para que la validación del esquema responda 400.
    const datos = orderData && typeof orderData === "object" ? orderData : {};
    const itemsCrudos = Array.isArray(datos.items) ? datos.items : [];

    // 1. Construye el documento solo con los campos que acepta el cliente.
    //    validate() verifica campos requeridos y cantidades, y detecta ids
    //    con formato inválido (ValidationError/CastError -> 400).
    const order = new Order({
      customer: datos.customer,
      items: itemsCrudos.map((item) => ({
        product: item?.product,
        quantity: item?.quantity,
      })),
    });
    await order.validate();

    // 2. Verifica que todos los productos referenciados existan. Se comparan
    //    ids únicos para permitir el mismo producto en varias líneas.
    const productIds = order.items.map((item) => String(item.product));
    const productos = await Product.find({
      _id: { $in: order.items.map((item) => item.product) },
    });

    if (productos.length !== new Set(productIds).size) {
      const encontrados = new Set(productos.map((p) => String(p._id)));
      const faltantes = [...new Set(productIds)].filter(
        (id) => !encontrados.has(id),
      );
      throw new BusinessError(`Productos inexistentes: ${faltantes.join(", ")}`);
    }

    // 3. Calcula los importes con los precios vigentes en la base de datos,
    //    ignorando cualquier importe enviado por el cliente.
    const precios = new Map(productos.map((p) => [String(p._id), p.price]));

    order.items = order.items.map((item) => {
      const unitPrice = precios.get(String(item.product));
      return {
        product: item.product,
        unitPrice,
        quantity: item.quantity,
        lineTotal: redondear(unitPrice * item.quantity),
      };
    });
    order.total = redondear(
      order.items.reduce((suma, item) => suma + item.lineTotal, 0),
    );

    // 4. Persiste la orden y la devuelve.
    await order.save();
    return order;
  },
};

module.exports = orderService;
