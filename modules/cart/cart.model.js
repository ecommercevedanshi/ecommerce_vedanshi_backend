import mongoose from "mongoose"

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productName: { type: String },
    size: { type: String },
    colour: { type: String },
    imageUrl: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    addedAt: { type: Date, default: Date.now },
});

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true, // one cart per user
        },
        items: [cartItemSchema],
        // Applied coupon
        coupon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Coupon",
            default: null,
        },
        couponCode: { type: String },
        discountAmount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Virtual: cart subtotal
// cartSchema.virtual("subtotal").get(function () {
//   return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
// });

// cartSchema.virtual("total").get(function () {
//   return this.subtotal - this.discountAmount;
// });

// cartSchema.set("toJSON", { virtuals: true });

// cartSchema.index({ user: 1 });

const cart = mongoose.model("Cart", cartSchema);
export default cart;