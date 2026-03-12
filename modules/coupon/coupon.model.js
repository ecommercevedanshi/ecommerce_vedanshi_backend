const mongoose = require("mongoose");
import mongoose from "mongoose"

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String },

    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 }, 
    maxDiscountAmount: { type: Number },  
    minOrderAmount: { type: Number, default: 0 }, 

    
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },

   
    applicableCategories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    ],
    applicableUsers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    usageLimitTotal: { type: Number },  
    usageLimitPerUser: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },

    usageLog: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        usedAt: { type: Date, default: Date.now },
        discountApplied: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

// couponSchema.index({ code: 1 });
// couponSchema.index({ isActive: 1, expiresAt: 1 });
// couponSchema.index({ applicableCategories: 1 });
// couponSchema.index({ applicableUsers: 1 });

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
  const userUses = this.usageLog.filter(
    (log) => log.user.toString() === userId.toString()
  ).length;
  return userUses >= this.usageLimitPerUser;
};

const coupon  = mongoose.model("Coupon", couponSchema);
export default coupon;