const orderService = require("../services/orderService");
const catchAsync = require("../utils/catchAsync");

const orderController = {
  create: catchAsync(async (req, res) => {
    const newOrder = await orderService.createOrder(req.body);
    res.status(201).json({
      status: "success",
      data: newOrder,
    });
  }),
};

module.exports = orderController;
