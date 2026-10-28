const express = require("express");
const orderController = require("../controllers/orderController");

const router = express.Router();

router.route("/").post(orderController.create);

module.exports = router;
