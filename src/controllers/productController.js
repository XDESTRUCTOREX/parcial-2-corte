const productService = require("../services/productService");
const catchAsync = require("../utils/catchAsync");

const productController = {
  getAll: catchAsync(async (req, res) => {
    const products = await productService.getAllProducts(req.query);
    res.status(200).json({
      status: "success",
      results: products.length,
      data: products,
    });
  }),

  getById: catchAsync(async (req, res) => {
    const product = await productService.getProductById(req.params.id);
    res.status(200).json({
      status: "success",
      data: product,
    });
  }),

  create: catchAsync(async (req, res) => {
    const newProduct = await productService.createProduct(req.body);
    res.status(201).json({
      status: "success",
      data: newProduct,
    });
  }),

  update: catchAsync(async (req, res) => {
    const updatedProduct = await productService.updateProduct(
      req.params.id,
      req.body,
    );
    res.status(200).json({
      status: "success",
      data: updatedProduct,
    });
  }),

  remove: catchAsync(async (req, res) => {
    await productService.deleteProduct(req.params.id);
    res.status(204).json({
      status: "success",
      data: null,
    });
  }),
};

module.exports = productController;
