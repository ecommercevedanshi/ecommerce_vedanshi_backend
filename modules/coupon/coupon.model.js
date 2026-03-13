import mongoose from "mongoose";

const usageLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }, // ← must have ref
    usedAt: { type: Date, default: Date.now },
    discountApplied: { type: Number, required: true },
  },
  { _id: false }
);

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, trim: true },

    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },



    discountValue: { type: Number, required: true, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },

    scope: {
      type: String,
      enum: ["all", "specific_products", "category"],
      default: "all",
      required: true,
    },

    applicableProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],
    applicableCategories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    ],

    // ── User restriction ──────────────────────────────────────
    applicableUsers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    // ── Validity window ───────────────────────────────────────
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true, index: true },

    // ── Usage limits ──────────────────────────────────────────
    usageLimitTotal: { type: Number, min: 1 },
    usageLimitPerUser: { type: Number, default: 1, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },

    usageLog: { type: [usageLogSchema], default: [] },
  },
  { timestamps: true }
);

// ── Compound indexes ─────────────────────────────────────────────────────────
// couponSchema.index({ isActive: 1, expiresAt: 1 });
// couponSchema.index({ scope: 1, applicableProducts: 1 });
// couponSchema.index({ scope: 1, applicableCategories: 1 });
// couponSchema.index({ applicableUsers: 1 });

// ── Schema-level validation ───────────────────────────────────────────────────
couponSchema.pre("validate", function (next) {
  if (this.startsAt && this.expiresAt && this.startsAt >= this.expiresAt) {
    return next(new Error("startsAt must be before expiresAt"));
  }
  if (this.scope === "specific_products" && this.applicableProducts.length === 0) {
    return next(new Error("applicableProducts is required when scope is 'specific_products'"));
  }
  if (this.scope === "category" && this.applicableCategories.length === 0) {
    return next(new Error("applicableCategories is required when scope is 'category'"));
  }
  // next();

});

// ── Instance methods ──────────────────────────────────────────────────────────
couponSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.startsAt &&
    now <= this.expiresAt &&
    (this.usageLimitTotal == null || this.usedCount < this.usageLimitTotal)
  );
};

couponSchema.methods.hasUserExceededLimit = function (userId) {
  const uses = this.usageLog.filter(
    (log) => log.user.toString() === userId.toString()
  ).length;
  return uses >= this.usageLimitPerUser;
};

/** 
 * Returns only the cart items this coupon applies to.
 * Each item must have: { product (ObjectId), category (ObjectId) }
 */
couponSchema.methods.getEligibleItems = function (cartItems) {
  if (this.scope === "all") return cartItems;

  if (this.scope === "specific_products") {
    const ids = this.applicableProducts.map((p) => p.toString());
    return cartItems.filter((i) => ids.includes(i.product.toString()));
  }

  if (this.scope === "category") {
    const ids = this.applicableCategories.map((c) => c.toString());
    return cartItems.filter(
      (i) => i.category && ids.includes(i.category.toString())
    );
  }

  return [];
};


couponSchema.methods.calcDiscount = function (subtotal) {
  let discount = 0;
  if (this.discountType === "percentage") {
    discount = (subtotal * this.discountValue) / 100;
    if (this.maxDiscountAmount) discount = Math.min(discount, this.maxDiscountAmount);
  } else {
    discount = this.discountValue;
  }
  return parseFloat(Math.min(discount, subtotal).toFixed(2));
};

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;