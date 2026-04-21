const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    index: true,
  },
  customerName: {
    type: String,
    default: "Unknown",
  },
  address: {
    type: String,
    default: "",
  },
  items: [String],
  totalAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "out_for_delivery", "delivered", "cancelled"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);
