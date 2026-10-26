const Product = require("../models/Product");

const productService = {
  getAllProducts: async (filters) => {
    return await Product.find(filters);
  },

  getProductById: async (id) => {
    const product = await Product.findById(id);
    if (!product) throw new Error("Recurso no encontrado");
    return product;
  },

  createProduct: async (productData) => {
    const newProduct = new Product(productData);
    return await newProduct.save();
  },

  updateProduct: async (id, updateData) => {
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updatedProduct) throw new Error("Recurso no encontrado");
    return updatedProduct;
  },

  deleteProduct: async (id) => {
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) throw new Error("Recurso no encontrado");
    return deletedProduct;
  },
};

module.exports = productService;
