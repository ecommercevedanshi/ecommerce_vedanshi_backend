
import mongoose from "mongoose"
const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  variantId: { type: mongoose.Schema.Types.ObjectId },
  productName: { type: String, required: true },
  size: { type: String, required: true },
  colour: { type: String, required: true },
  sku: { type: String },
  imageUrl: { type: String },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  totalPrice: { type: Number, required: true },
  itemStatus: {
    type: String,
    enum: ["active", "cancelled", "return_requested", "returned"],
    default: "active",
  },
});


const shippingAddressSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  line1: String,
  line2: String,
  city: String,
  state: String,
  pincode: String,
  country: { type: String, default: "India" },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invoiceNumber: { type: String, unique: true },
    items: [orderItemSchema],
    shippingAddress: shippingAddressSchema,

    // Financials
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    shippingCharge: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Coupon
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
    couponCode: { type: String },

    // Order lifecycle
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "return_requested",
        "returned",
      ],
      default: "pending",
    },

    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
      default: "pending",
    },
    paymentMethod: { type: String },
    trackingNumber: { type: String },
    courierPartner: { type: String },

    confirmedAt: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },

    adminNotes: { type: String },
  },
  { timestamps: true }
);

// // Indexes
// orderSchema.index({ user: 1, createdAt: -1 });
// orderSchema.index({ status: 1 });
// orderSchema.index({ paymentStatus: 1 });
// orderSchema.index({ invoiceNumber: 1 });
// orderSchema.index({ createdAt: -1 });

// Auto-generate invoice number before save
orderSchema.pre("save", async function (next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

const Order = mongoose.model("Order", orderSchema);
export default Order;