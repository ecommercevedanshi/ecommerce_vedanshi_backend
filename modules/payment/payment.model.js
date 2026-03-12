const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    method: {
      type: String,
      enum: ["phonepe"],
      required: true,
    },
    gateway: { type: String, default: "phonepe" },

    // PhonePe transaction references
    merchantTransactionId: { type: String, unique: true }, 
    gatewayTransactionId: { type: String },              
    gatewayOrderId: { type: String },
    checksum: { type: String },                          
    // Status
    status: {
      type: String,
      enum: [
        "initiated",
        "pending",
        "success",
        "failed",
        "cancelled",
        "refunded",
        "partially_refunded",
      ],
      default: "initiated",
    },

    // Raw gateway response (store for auditing/debugging)
    gatewayResponse: { type: mongoose.Schema.Types.Mixed },

    // Timestamps
    initiatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    failureReason: { type: String },

    // For refunds linked to this payment
    refundedAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// paymentSchema.index({ order: 1 });
// paymentSchema.index({ user: 1 });
// paymentSchema.index({ status: 1 });
// paymentSchema.index({ merchantTransactionId: 1 });
// paymentSchema.index({ gatewayTransactionId: 1 });
// paymentSchema.index({ createdAt: -1 });
// paymentSchema.index({ method: 1, status: 1 }); // for Payment Method Report

module.exports = mongoose.model("Payment", paymentSchema);