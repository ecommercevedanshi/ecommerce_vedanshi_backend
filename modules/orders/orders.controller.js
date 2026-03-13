import Order from "./orders.model.js";
import cart from "../cart/cart.model.js";
import Coupon from "../coupon/coupon.model.js";
import responseHandler from "../../shared/responseHandler.js";

class OrderController {

 
    static placeOrder = async (req, res) => {
        try {
            const { shippingAddress, paymentMethod } = req.body;

            if (!shippingAddress || !paymentMethod)
                return responseHandler.sendFailureResponse(res, "shippingAddress and paymentMethod are required", 400);

            // 1. Fetch cart
            const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
            if (!cart || cart.items.length === 0)
                return responseHandler.sendFailureResponse(res, "Your cart is empty", 400);

            // 2. Build order items from cart
            const items = cart.items.map((item) => ({
                product:     item.product._id,
                variantId:   item.variantId,
                productName: item.productName,
                size:        item.size,
                colour:      item.colour,
                imageUrl:    item.imageUrl,
                unitPrice:   item.price,
                quantity:    item.quantity,
                totalPrice:  item.price * item.quantity,
            }));

            // 3. Financials
            const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
            let discountAmount = cart.discountAmount || 0;
            let couponId       = cart.coupon   || null;
            let couponCode     = cart.couponCode || "";

            // 4. Re-validate coupon at order time
            if (couponId) {
                const coupon = await Coupon.findById(couponId);
                if (!coupon || !coupon.isValid()) {
                    discountAmount = 0;
                    couponId       = null;
                    couponCode     = "";
                }
            }

            const shippingCharge = subtotal - discountAmount >= 999 ? 0 : 99;
            const totalAmount    = subtotal - discountAmount + shippingCharge;

            // 5. Create order
            const order = await Order.create({
                user: req.user._id,
                items,
                shippingAddress,
                subtotal,
                discountAmount,
                shippingCharge,
                totalAmount,
                coupon:        couponId,
                couponCode,
                paymentMethod,
                paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
                status:        "pending",
            });

            // 6. Update coupon usageLog + usedCount
            if (couponId) {
                await Coupon.findByIdAndUpdate(couponId, {
                    $inc:  { usedCount: 1 },
                    $push: {
                        usageLog: {
                            user:            req.user._id,
                            order:           order._id,
                            discountApplied: discountAmount,
                        },
                    },
                });
            }

            // 7. Clear cart
            cart.items         = [];
            cart.coupon        = null;
            cart.couponCode    = "";
            cart.discountAmount = 0;
            await cart.save();

            return responseHandler.sendSuccessResponse(res, "Order placed successfully", { order }, 201);
        } catch (err) {
            console.error("placeOrder:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    /**
     * GET /api/orders/my
     * Get logged-in user's orders (paginated)
     */
    static getMyOrders = async (req, res) => {
        try {
            const { page = 1, limit = 10, status } = req.query;

            const filter = { user: req.user._id };
            if (status) filter.status = status;

            const [total, orders] = await Promise.all([
                Order.countDocuments(filter),
                Order.find(filter)
                    .select("-items.product -__v")
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(Number(limit))
                    .lean(),
            ]);

            return responseHandler.sendSuccessResponse(res, "Orders fetched", {
                total,
                page:       Number(page),
                totalPages: Math.ceil(total / limit),
                orders,
            });
        } catch (err) {
            console.error("getMyOrders:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    /**
     * GET /api/orders/my/:id
     * Get single order detail for logged-in user
     */
    static getMyOrderById = async (req, res) => {
        try {
            const order = await Order.findOne({
                _id:  req.params.id,
                user: req.user._id,
            })
                .populate("items.product", "name images")
                .populate("coupon",        "code discountType discountValue")
                .populate("payment");

            if (!order)
                return responseHandler.sendFailureResponse(res, "Order not found", 404);

            return responseHandler.sendSuccessResponse(res, "Order fetched", { order });
        } catch (err) {
            console.error("getMyOrderById:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    /**
     * PATCH /api/orders/my/:id/cancel
     * User cancels their own order (only if pending/confirmed)
     */
    static cancelMyOrder = async (req, res) => {
        try {
            const order = await Order.findOne({
                _id:  req.params.id,
                user: req.user._id,
            });

            if (!order)
                return responseHandler.sendFailureResponse(res, "Order not found", 404);

            if (!["pending", "confirmed"].includes(order.status))
                return responseHandler.sendFailureResponse(res, `Order cannot be cancelled in '${order.status}' status`, 400);

            order.status      = "cancelled";
            order.cancelledAt = new Date();
            await order.save();

            return responseHandler.sendSuccessResponse(res, "Order cancelled", { order });
        } catch (err) {
            console.error("cancelMyOrder:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    /**
     * POST /api/orders/my/:id/return
     * User requests return (only if delivered)
     */
    static requestReturn = async (req, res) => {
        try {
            const order = await Order.findOne({
                _id:  req.params.id,
                user: req.user._id,
            });

            if (!order)
                return responseHandler.sendFailureResponse(res, "Order not found", 404);

            if (order.status !== "delivered")
                return responseHandler.sendFailureResponse(res, "Return can only be requested for delivered orders", 400);

            order.status = "return_requested";
            await order.save();

            return responseHandler.sendSuccessResponse(res, "Return requested successfully", { order });
        } catch (err) {
            console.error("requestReturn:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    // ══════════════════════════════════════════════════════════════
    //  ADMIN CONTROLLERS
    // ══════════════════════════════════════════════════════════════

    /**
     * GET /api/admin/orders
     * Get all orders with filters + pagination
     */
    static getAllOrders = async (req, res) => {
        try {
            const {
                page = 1, limit = 10,
                status, paymentStatus, paymentMethod,
                search,
                startDate, endDate,
            } = req.query;

            const filter = {};
            if (status)        filter.status        = status;
            if (paymentStatus) filter.paymentStatus = paymentStatus;
            if (paymentMethod) filter.paymentMethod = paymentMethod;

            // search by invoiceNumber
            if (search) filter.invoiceNumber = { $regex: search, $options: "i" };

            // date range
            if (startDate || endDate) {
                filter.createdAt = {};
                if (startDate) filter.createdAt.$gte = new Date(startDate);
                if (endDate)   filter.createdAt.$lte = new Date(endDate);
            }

            const [total, orders] = await Promise.all([
                Order.countDocuments(filter),
                Order.find(filter)
                    .populate("user",   "name email phone")
                    .populate("coupon", "code")
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(Number(limit))
                    .lean(),
            ]);

            return responseHandler.sendSuccessResponse(res, "Orders fetched", {
                total,
                page:       Number(page),
                totalPages: Math.ceil(total / limit),
                orders,
            });
        } catch (err) {
            console.error("getAllOrders:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    /**
     * GET /api/admin/orders/:id
     * Get full order detail
     */
    static getOrderById = async (req, res) => {
        try {
            const order = await Order.findById(req.params.id)
                .populate("user",          "name email phone")
                .populate("items.product", "name images")
                .populate("coupon",        "code discountType discountValue")
                .populate("payment");

            if (!order)
                return responseHandler.sendFailureResponse(res, "Order not found", 404);

            return responseHandler.sendSuccessResponse(res, "Order fetched", { order });
        } catch (err) {
            console.error("getOrderById:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    /**
     * PATCH /api/admin/orders/:id/status
     * Admin updates order status
     */
    static updateOrderStatus = async (req, res) => {
        try {
            const { status } = req.body;

            const validStatuses = [
                "pending", "confirmed", "processing",
                "shipped", "delivered", "cancelled",
                "return_requested", "returned",
            ];

            if (!status || !validStatuses.includes(status))
                return responseHandler.sendFailureResponse(res, `Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400);

            const order = await Order.findById(req.params.id);
            if (!order)
                return responseHandler.sendFailureResponse(res, "Order not found", 404);

            order.status = status;

            // Auto-set timestamps
            if (status === "confirmed")  order.confirmedAt = new Date();
            if (status === "shipped")    order.shippedAt   = new Date();
            if (status === "delivered")  order.deliveredAt = new Date();
            if (status === "cancelled")  order.cancelledAt = new Date();

            await order.save();

            return responseHandler.sendSuccessResponse(res, `Order status updated to '${status}'`, { order });
        } catch (err) {
            console.error("updateOrderStatus:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    /**
     * PATCH /api/admin/orders/:id/tracking
     * Admin adds tracking number + courier
     */
    static updateTracking = async (req, res) => {
        try {
            const { trackingNumber, courierPartner } = req.body;

            if (!trackingNumber || !courierPartner)
                return responseHandler.sendFailureResponse(res, "trackingNumber and courierPartner are required", 400);

            const order = await Order.findByIdAndUpdate(
                req.params.id,
                { $set: { trackingNumber, courierPartner, status: "shipped", shippedAt: new Date() } },
                { new: true }
            );

            if (!order)
                return responseHandler.sendFailureResponse(res, "Order not found", 404);

            return responseHandler.sendSuccessResponse(res, "Tracking updated", { order });
        } catch (err) {
            console.error("updateTracking:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    /**
     * PATCH /api/admin/orders/:id/payment-status
     * Admin updates payment status
     */
    static updatePaymentStatus = async (req, res) => {
        try {
            const { paymentStatus } = req.body;

            const validStatuses = ["pending", "paid", "failed", "refunded", "partially_refunded"];
            if (!paymentStatus || !validStatuses.includes(paymentStatus))
                return responseHandler.sendFailureResponse(res, `Invalid paymentStatus. Must be one of: ${validStatuses.join(", ")}`, 400);

            const order = await Order.findByIdAndUpdate(
                req.params.id,
                { $set: { paymentStatus } },
                { new: true }
            );

            if (!order)
                return responseHandler.sendFailureResponse(res, "Order not found", 404);

            return responseHandler.sendSuccessResponse(res, "Payment status updated", { order });
        } catch (err) {
            console.error("updatePaymentStatus:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    /**
     * PATCH /api/admin/orders/:id/notes
     * Admin adds internal notes to an order
     */
    static updateAdminNotes = async (req, res) => {
        try {
            const { adminNotes } = req.body;

            const order = await Order.findByIdAndUpdate(
                req.params.id,
                { $set: { adminNotes } },
                { new: true }
            );

            if (!order)
                return responseHandler.sendFailureResponse(res, "Order not found", 404);

            return responseHandler.sendSuccessResponse(res, "Notes updated", { order });
        } catch (err) {
            console.error("updateAdminNotes:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    /**
     * PATCH /api/admin/orders/:id/item/:itemId/status
     * Admin updates individual item status (cancel/return a single item)
     */
    static updateItemStatus = async (req, res) => {
        try {
            const { itemId } = req.params;
            const { itemStatus } = req.body;

            const validStatuses = ["active", "cancelled", "return_requested", "returned"];
            if (!itemStatus || !validStatuses.includes(itemStatus))
                return responseHandler.sendFailureResponse(res, `Invalid itemStatus. Must be one of: ${validStatuses.join(", ")}`, 400);

            const order = await Order.findOneAndUpdate(
                { _id: req.params.id, "items._id": itemId },
                { $set: { "items.$.itemStatus": itemStatus } },
                { new: true }
            );

            if (!order)
                return responseHandler.sendFailureResponse(res, "Order or item not found", 404);

            return responseHandler.sendSuccessResponse(res, "Item status updated", { order });
        } catch (err) {
            console.error("updateItemStatus:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    /**
     * GET /api/admin/orders/stats
     * Basic order stats for dashboard
     */
    static getOrderStats = async (req, res) => {
        try {
            const [stats] = await Order.aggregate([
                {
                    $group: {
                        _id:            null,
                        totalOrders:    { $sum: 1 },
                        totalRevenue:   { $sum: "$totalAmount" },
                        totalDiscount:  { $sum: "$discountAmount" },
                        avgOrderValue:  { $avg: "$totalAmount" },
                        pendingOrders:  { $sum: { $cond: [{ $eq: ["$status", "pending"] },    1, 0] } },
                        shippedOrders:  { $sum: { $cond: [{ $eq: ["$status", "shipped"] },    1, 0] } },
                        deliveredOrders:{ $sum: { $cond: [{ $eq: ["$status", "delivered"] },  1, 0] } },
                        cancelledOrders:{ $sum: { $cond: [{ $eq: ["$status", "cancelled"] },  1, 0] } },
                    },
                },
            ]);

            return responseHandler.sendSuccessResponse(res, "Stats fetched", { stats: stats || {} });
        } catch (err) {
            console.error("getOrderStats:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };
}

export default OrderController;