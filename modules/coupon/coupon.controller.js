import Coupon from "./coupon.model.js";
import Cart from "../cart/cart.model.js";
import responseHandler from "../../shared/responseHandler.js";

const scopeCheck = (coupon, cartItems) => {
    const eligible = coupon.getEligibleItems(cartItems);
    const subtotal = eligible.reduce((s, i) => s + i.price * i.quantity, 0);
    return { eligible, subtotal };
};

class CouponController {

    static createCoupon = async (req, res) => {
        try {
            const {
                code, description,
                discountType, discountValue, maxDiscountAmount, minOrderAmount,
                scope, applicableProducts, applicableCategories, applicableUsers,
                startsAt, expiresAt, isActive,
                usageLimitTotal, usageLimitPerUser,
            } = req.body;

            if (!code || !discountType || !discountValue || !startsAt || !expiresAt)
                return responseHandler.sendfailureResponse(res, "code, discountType, discountValue, startsAt, expiresAt are required", 400);

            if (discountType === "percentage" && discountValue > 100)
                return responseHandler.sendfailureResponse(res, "Percentage discount cannot exceed 100", 400);

            if (discountType === "flat" && maxDiscountAmount)
                return responseHandler.sendfailureResponse(res, "maxDiscountAmount is only applicable for percentage discounts", 400);

            if (scope === "specific_products" && (!applicableProducts || applicableProducts.length === 0))
                return responseHandler.sendfailureResponse(res, "applicableProducts required for 'specific_products' scope", 400);

            if (scope === "category" && (!applicableCategories || applicableCategories.length === 0))
                return responseHandler.sendfailureResponse(res, "applicableCategories required for 'category' scope", 400);

            const exists = await Coupon.findOne({ code: code });
            if (exists) return responseHandler.sendfailureResponse(res, "Coupon code already exists", 409);

            const coupon = await Coupon.create({
                code, description,
                discountType, discountValue, maxDiscountAmount, minOrderAmount,
                scope: scope,
                applicableProducts: applicableProducts || [],
                applicableCategories: applicableCategories || [],
                applicableUsers: applicableUsers || [],
                startsAt, expiresAt,
                isActive: isActive ?? true,
                usageLimitTotal,
                usageLimitPerUser: usageLimitPerUser ?? 1,
            });

            return responseHandler.sendSuccessResponse(res, "Coupon created", { coupon }, 201);
        } catch (err) {
            if (err.name === "ValidationError")
                return responseHandler.sendfailureResponse(res, err.message, 400);
            console.error("createCoupon:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };

    static getAllCoupons = async (req, res) => {
        try {
            const { page = 1, limit = 10, isActive, discountType, scope, search } = req.query;

            const filter = {};
            if (isActive !== undefined) filter.isActive = isActive === "true";
            if (discountType) filter.discountType = discountType;
            if (scope) filter.scope = scope;
            if (search) filter.code = { $regex: search.toUpperCase(), $options: "i" };

            const [total, coupons] = await Promise.all([
                Coupon.countDocuments(filter),
                Coupon.find(filter)
                    .populate("applicableProducts", "name images")
                    .populate("applicableCategories", "name")
                    .populate("applicableUsers", "name email")
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(Number(limit))
                    .lean(),
            ]);

            return responseHandler.sendSuccessResponse(res, "Coupons fetched", {
                total,
                page: Number(page),
                totalPages: Math.ceil(total / limit),
                coupons,
            });
        } catch (err) {
            console.error("getAllCoupons:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };

    static getCouponById = async (req, res) => {
        try {
            const coupon = await Coupon.findById(req.params.id)
                .populate("applicableProducts", "name images price")
                .populate("applicableCategories", "name")
                .populate("applicableUsers", "name email")
                .populate("usageLog.user", "name email")
                .populate("usageLog.order", "orderNumber totalAmount");

            if (!coupon) return responseHandler.sendfailureResponse(res, "Coupon not found", 404);

            return responseHandler.sendSuccessResponse(res, "Coupon fetched", { coupon });
        } catch (err) {
            console.error("getCouponById:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };

    // PUT /api/admin/coupons/:id
    static updateCoupon = async (req, res) => {
        try {
            const updates = { ...req.body };
            console.log(updates, "udpates")
            delete updates.usageLog;
            delete updates.usedCount;
            delete updates.code;

            const { id } = req.params
            if (updates.scope === "specific_products" && updates.applicableProducts?.length === 0)
                return responseHandler.sendfailureResponse(res, "applicableProducts cannot be empty for 'specific_products' scope", 400);

            if (updates.scope === "category" && updates.applicableCategories?.length === 0)
                return responseHandler.sendfailureResponse(res, "applicableCategories cannot be empty for 'category' scope", 400);

            const coupon = await Coupon.findByIdAndUpdate(
                id,
                { $set: updates },
                { returnDocument: "after", runValidators: true }
            );
            console.log(coupon, "coupon")

            if (!coupon) return responseHandler.sendfailureResponse(res, "Coupon not found", 404);

            return responseHandler.sendSuccessResponse(res, "Coupon updated", { coupon });
        } catch (err) {
            if (err.name === "ValidationError")
                return responseHandler.sendfailureResponse(res, err.message, 400);
            console.error("updateCoupon:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };

    // PATCH /api/admin/coupons/:id/toggle
    static toggleCouponStatus = async (req, res) => {
        try {
            const coupon = await Coupon.findById(req.params.id);
            if (!coupon) return responseHandler.sendfailureResponse(res, "Coupon not found", 404);

            coupon.isActive = !coupon.isActive;
            await coupon.save();

            return responseHandler.sendSuccessResponse(res, `Coupon ${coupon.isActive ? "activated" : "deactivated"}`, {
                isActive: coupon.isActive,
            });
        } catch (err) {
            console.error("toggleCouponStatus:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };

    // DELETE /api/admin/coupons/:id
    static deleteCoupon = async (req, res) => {
        try {
            const coupon = await Coupon.findByIdAndDelete(req.params.id);
            if (!coupon) return responseHandler.sendfailureResponse(res, "Coupon not found", 404);

            return responseHandler.sendSuccessResponse(res, "Coupon deleted", {});
        } catch (err) {
            console.error("deleteCoupon:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };

    // GET /api/admin/coupons/:id/usage
    static getCouponUsageLog = async (req, res) => {
        try {
            const coupon = await Coupon.findById(req.params.id)
                .populate("usageLog.user", "name email")
                .populate("usageLog.order", "orderNumber totalAmount");

            if (!coupon) return responseHandler.sendfailureResponse(res, "Coupon not found", 404);

            return responseHandler.sendSuccessResponse(res, "Usage log fetched", {
                code: coupon.code,
                scope: coupon.scope,
                usedCount: coupon.usedCount,
                usageLimitTotal: coupon.usageLimitTotal,
                usageLog: coupon.usageLog,
            });
        } catch (err) {
            console.error("getCouponUsageLog:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };

    
    //  USER

    // POST /api/coupons/validate
    static validateCoupon = async (req, res) => {
        try {
            const { code } = req.body;
            if (!code) return responseHandler.sendfailureResponse(res, "Coupon code is required", 400);

            const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
            if (!coupon) return responseHandler.sendfailureResponse(res, "Coupon not found", 404);

            console.log(coupon, "coupon")

            
            if (!coupon.isValid())
                return responseHandler.sendfailureResponse(res, "Coupon is expired or inactive", 400);

            // if (coupon.hasUserExceededLimit(req.user._id))
            //     return responseHandler.sendfailureResponse(res, "You have already used this coupon the maximum number of times", 400);

            if (
                coupon.applicableUsers.length > 0 &&
                !coupon.applicableUsers.some((u) => u.toString() === req.user._id.toString())
            ) {
                return responseHandler.sendfailureResponse(res, "This coupon is not available for your account", 403);
            }

            const cart = await Cart.findOne({ user: req.user._id }).lean();
            if (!cart || cart.items.length === 0)
                return responseHandler.sendfailureResponse(res, "Your cart is empty", 400);

            const { eligible, subtotal } = scopeCheck(coupon, cart.items);

            if (eligible.length === 0) {
                const scopeMsg = {
                    specific_products: "This coupon is only valid for specific products not present in your cart",
                    category: "This coupon is only valid for specific categories not present in your cart",
                    all: "No eligible items found",
                };
                return responseHandler.sendfailureResponse(res, scopeMsg[coupon.scope], 400);
            }

            if (subtotal < coupon.minOrderAmount)
                return responseHandler.sendfailureResponse(res, `Minimum eligible order amount ₹${coupon.minOrderAmount} required (current: ₹${subtotal.toFixed(2)})`, 400);

            const discountAmount = coupon.calcDiscount(subtotal);
            const cartTotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);

            return responseHandler.sendSuccessResponse(res, "Coupon is valid", {
                coupon: {
                    code: coupon.code,
                    description: coupon.description,
                    scope: coupon.scope,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue,
                    maxDiscountAmount: coupon.maxDiscountAmount,
                },
                eligibleItemCount: eligible.length,
                eligibleSubtotal: subtotal,
                discountAmount,
                cartTotal,
                finalTotal: parseFloat((cartTotal - discountAmount).toFixed(2)),
            });
        } catch (err) {
            console.error("validateCoupon:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };

    // GET /api/coupons/available
    static getAvailableCoupons = async (req, res) => {
        try {
            const now = new Date();

            const coupons = await Coupon.find({
                isActive: true,
                startsAt: { $lte: now },
                expiresAt: { $gte: now },
                $or: [
                    { applicableUsers: { $size: 0 } },
                    { applicableUsers: req.user._id },
                ],
            })
                .populate("applicableProducts", "name images")
                .populate("applicableCategories", "name")
                .select("-usageLog")
                .lean();

            const filtered = coupons.filter((c) => {
                const uses = c.usageLog
                    ? c.usageLog.filter((l) => l.user.toString() === req.user._id.toString()).length
                    : 0;
                return uses < (c.usageLimitPerUser ?? 1);
            });

            return responseHandler.sendSuccessResponse(res, "Available coupons fetched", { coupons: filtered });
        } catch (err) {
            console.error("getAvailableCoupons:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };

    // GET /api/coupons/product/:productId
    static getCouponsForProduct = async (req, res) => {
        try {
            const { productId } = req.params;
            const now = new Date();

            const coupons = await Coupon.find({
                isActive: true,
                startsAt: { $lte: now },
                expiresAt: { $gte: now },
                $or: [
                    { scope: "all" },
                    { scope: "specific_products", applicableProducts: productId },
                ],
            }).select("code description discountType discountValue maxDiscountAmount minOrderAmount expiresAt scope");

            return responseHandler.sendSuccessResponse(res, "Product coupons fetched", { coupons });
        } catch (err) {
            console.error("getCouponsForProduct:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };

    // GET /api/coupons/category/:categoryId
    static getCouponsForCategory = async (req, res) => {
        try {
            const { categoryId } = req.params;
            const now = new Date();

            const coupons = await Coupon.find({
                isActive: true,
                startsAt: { $lte: now },
                expiresAt: { $gte: now },
                $or: [
                    { scope: "all" },
                    { scope: "category", applicableCategories: categoryId },
                ],
            }).select("code description discountType discountValue maxDiscountAmount minOrderAmount expiresAt scope");

            return responseHandler.sendSuccessResponse(res, "Category coupons fetched", { coupons });
        } catch (err) {
            console.error("getCouponsForCategory:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };
}

export default CouponController;