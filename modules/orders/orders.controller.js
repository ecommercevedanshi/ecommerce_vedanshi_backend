import Order from "./orders.model.js";
import Cart from "../cart/cart.model.js";
import Coupon from "../coupon/coupon.model.js";
import responseHandler from "../../shared/responseHandler.js";
import mongoose from "mongoose";

class OrderController {
  //  USER CONTROLLERS

  static placeOrder = async (req, res) => {
    try {
      const { shippingAddress, paymentMethod } = req.body;
      const userId = req.user || req.admin;

      // const userId = "69b5224c62a2eed1cf776717"

      if (!shippingAddress)
        return responseHandler.sendfailureResponse(
          res,
          "shippingAddress is required",
          400,
        );

      if (
        !shippingAddress.fullName ||
        !shippingAddress.phone ||
        !shippingAddress.line1 ||
        !shippingAddress.city ||
        !shippingAddress.state ||
        !shippingAddress.pincode
      )
        return responseHandler.sendfailureResponse(
          res,
          "Incomplete shipping address",
          400,
        );

      if (!paymentMethod)
        return responseHandler.sendfailureResponse(
          res,
          "paymentMethod is required",
          400,
        );

      if (!["COD", "ONLINE"].includes(paymentMethod))
        return responseHandler.sendfailureResponse(
          res,
          "Invalid payment method",
          400,
        );

      const cart = await Cart.findOne({ user: userId });

      if (!cart || cart.items.length === 0)
        return responseHandler.sendfailureResponse(
          res,
          "Your cart is empty",
          400,
        );

      const items = cart.items.map((item) => ({
        product: item.product,
        variantId: item.variantId,
        productName: item.productName,
        size: item.size,
        colour: item.colour,
        sku: item.sku ?? "",
        imageUrl: item.imageUrl ?? "",
        unitPrice: item.price,
        quantity: item.quantity,
        totalPrice: item.price * item.quantity,
        itemStatus: "active",
      }));

      const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);

      let discountAmount = cart.discountAmount || 0;
      let couponId = cart.coupon || null;
      let couponCode = cart.couponCode || "";

      if (couponId) {
        const coupon = await Coupon.findById(couponId);
        if (!coupon || new Date() > coupon.expiresAt || !coupon.isActive) {
          discountAmount = 0;
          couponId = null;
          couponCode = "";
        }
      }

      const shippingCharge = subtotal - discountAmount >= 999 ? 0 : 99;
      const totalAmount = subtotal - discountAmount + shippingCharge;

      const expectedDeliveryAt = new Date();
      expectedDeliveryAt.setDate(expectedDeliveryAt.getDate() + 7);

      const year = new Date().getFullYear();
      const orderCount = await Order.countDocuments();
      const sequence = String(orderCount + 1).padStart(6, "0");

      const orderId = `ORD-${year}-${sequence}`; // show to customer
      const invoiceNumber = `INV-${year}-${sequence}`;

      const order = await Order.create({
        user: userId,
        items,
        orderId,
        shippingAddress,

        subtotal,
        discountAmount,
        shippingCharge,
        totalAmount,

        coupon: couponId,
        couponCode,

        paymentMethod,
        paymentStatus: "pending",

        status: "pending",

        expectedDeliveryAt,
        invoiceNumber,

        statusHistory: [
          {
            status: "pending",
            changedAt: new Date(),
            note: "Order placed by customer",
          },
        ],
      });

      if (couponId) {
        await Coupon.findByIdAndUpdate(couponId, {
          $inc: { usedCount: 1 },
          $push: {
            usageLog: {
              user: userId,
              order: order._id,
              discountApplied: discountAmount,
            },
          },
        });
      }

      cart.items = [];
      cart.coupon = null;
      cart.couponCode = "";
      cart.discountAmount = 0;
      await cart.save();

      const responseItems = [...order.items];

for (const item of responseItems) {
  if (item.imageUrl && !item.imageUrl.startsWith("http")) {
    item.imageUrl = await responseHandler.generatePreSignedURL(item.imageUrl);
  }
}

      return responseHandler.sendSuccessResponse(
        res,
        "Order placed successfully",
        {
          order: {
            _id: order._id,
            orderId: order.orderId,
            items: responseItems,
            shippingAddress: order.shippingAddress,
            totalAmount: order.totalAmount,
            shippingCharge: order.shippingCharge,
            subtotal: order.subtotal,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            statusHistory: order.statusHistory,
            expectedDeliveryAt: order.expectedDeliveryAt,
          },
        },
        201,
      );
    } catch (err) {
      console.error("placeOrder:", err);
      return responseHandler.sendfailureResponse(res, "Server error", 500);
    }
  };

  static getMyOrders = async (req, res) => {
    try {
      const { page = 1, limit = 10, status } = req.query;
      // const userId = "69b5224c62a2eed1cf776717";
      const userId = req.user || req.admin;

      const filter = { user: userId };
      if (status) filter.status = status;

      const [total, orders] = await Promise.all([
        Order.countDocuments(filter),
        Order.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(Number(limit))
          .lean(),
      ]);

      const formattedOrders = await Promise.all(
  orders.map(async (order) => {

    const items = await Promise.all(
      order.items.map(async (item) => {

        let imageUrl = item.imageUrl;

        if (imageUrl && !imageUrl.startsWith("http")) {
          imageUrl = await responseHandler.generatePreSignedURL(imageUrl);
        }

        return {
          _id: item._id,
          productName: item.productName,
          size: item.size,
          colour: item.colour,
          imageUrl,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          itemStatus: item.itemStatus,
        };

      })
    );

    return {
      _id: order._id,
      orderId: order.orderId,
      status: order.status,
      items,
      shippingAddress: order.shippingAddress,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      shippingCharge: order.shippingCharge,
      totalAmount: order.totalAmount,
      expectedDeliveryAt: order.expectedDeliveryAt,
      createdAt: order.createdAt,
    };

  })
);

      return responseHandler.sendSuccessResponse(res, "Orders fetched", {
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        orders: formattedOrders,
      });
    } catch (err) {
      console.error("getMyOrders:", err);
      return responseHandler.sendfailureResponse(res, "Server error", 500);
    }
  };

  static getMyOrderById = async (req, res) => {
    try {
      // const userId = "69b5224c62a2eed1cf776717";
      const userId = req.params;

      const { orderId:id } = req.body; // ← from POST body

      if (!id)
        return responseHandler.sendfailureResponse(
          res,
          "orderId is required",
          400,
        );

    //   const order = await Order.findOne({
    //     _id: orderId, // ← from URL
    //     user: userId,
    //   })
        const order = await Order.findById(id)
        .populate("coupon", "code discountType discountValue")
        .lean();

      if (!order)
        return responseHandler.sendfailureResponse(res, "Order not found", 404);

       const items = await Promise.all(
      order.items.map(async (item) => {

        let imageUrl = item.imageUrl;

        if (imageUrl && !imageUrl.startsWith("http")) {
          imageUrl = await responseHandler.generatePreSignedURL(imageUrl);
        }

        return {
          _id: item._id,
          productName: item.productName,
          size: item.size,
          colour: item.colour,
          imageUrl,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          itemStatus: item.itemStatus,
        };
      })
    );

      const formattedOrder = {
        _id: order._id,
        orderId: order.orderId,
        status: order.status,
        items,
        shippingAddress: order.shippingAddress,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        shippingCharge: order.shippingCharge,
        totalAmount: order.totalAmount,
        coupon: order.coupon,
        couponCode: order.couponCode,
        tracking: order.tracking,
        statusHistory: order.statusHistory,
        cancellationReason: order.cancellationReason,
        returnReason: order.returnReason,
        refundAmount: order.refundAmount,
        refundStatus: order.refundStatus,
        expectedDeliveryAt: order.expectedDeliveryAt,
        confirmedAt: order.confirmedAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
        returnRequestedAt: order.returnRequestedAt,
        returnedAt: order.returnedAt,
        createdAt: order.createdAt,
      };

      return responseHandler.sendSuccessResponse(res, "Order fetched", {
        order: formattedOrder,
      });
    } catch (err) {
      console.error("getMyOrderById:", err);
      return responseHandler.sendfailureResponse(res, "Server error", 500);
    }
  };

  static cancelMyOrder = async (req, res) => {
    try {
      // const userId = "69b5224c62a2eed1cf776717";
      const userId = req.user || req.admin;

      const { cancellationReason, orderId:id } = req.body;

      // console.log(req.params.id, ' req.params.id')

      if (!id)
        return responseHandler.sendfailureResponse(
          res,
          "orderId is required",
          400,
        );

      // find by orderId + user so customer can only cancel their own order
      const order = await Order.findOne({
        _id: new mongoose.Types.ObjectId(id),
        user: new mongoose.Types.ObjectId(userId),
      });

      console.log(id, userId, "userdetails");
      if (!order)
        return responseHandler.sendfailureResponse(res, "Order not found", 400);

      if (!["pending", "confirmed"].includes(order.status))
        return responseHandler.sendfailureResponse(
          res,
          `Order cannot be cancelled in '${order.status}' status`,
          400,
        );

      order.status = "cancelled";
      order.cancelledAt = new Date();
      order.cancellationReason = cancellationReason ?? "";

      order.items.forEach((item) => {
        item.itemStatus = "cancelled";
        item.cancelledAt = new Date();
      });

      order.statusHistory.push({
        status: "cancelled",
        changedAt: new Date(),
        note: cancellationReason ?? "Cancelled by customer",
      });

      await order.save();

      return responseHandler.sendSuccessResponse(res, "Order cancelled", {
        order: {
          _id: order._id,
          orderId: order.orderId,
          status: order.status,
          cancelledAt: order.cancelledAt,
          cancellationReason: order.cancellationReason,
          statusHistory: order.statusHistory,
        },
      });
    } catch (err) {
      console.error("cancelMyOrder:", err);
      return responseHandler.sendfailureResponse(res, "Server error", 500);
    }
  };

  static requestReturn = async (req, res) => {
    try {
      // const userId = "69b5224c62a2eed1cf776717";
      const userId = req.user || req.admin;

      const { returnReason, orderId } = req.body;

      if (!orderId)
        return responseHandler.sendfailureResponse(
          res,
          "orderId is required",
          400,
        );

      const order = await Order.findOne({
        _id: req.params.id,
        user: userId,
        orderId,
      });

      if (!order)
        return responseHandler.sendfailureResponse(res, "Order not found", 404);

      if (order.status !== "delivered")
        return responseHandler.sendfailureResponse(
          res,
          "Return can only be requested for delivered orders",
          400,
        );

      order.status = "return_requested";
      order.returnRequestedAt = new Date();
      order.returnReason = returnReason ?? "";

      order.statusHistory.push({
        status: "return_requested",
        changedAt: new Date(),
        note: returnReason ?? "Return requested by customer",
      });

      await order.save();

      return responseHandler.sendSuccessResponse(
        res,
        "Return requested successfully",
        {
          order: {
            _id: order._id,
            orderId: order.orderId,
            status: order.status,
            returnRequestedAt: order.returnRequestedAt,
            returnReason: order.returnReason,
            statusHistory: order.statusHistory,
          },
        },
      );
    } catch (err) {
      console.error("requestReturn:", err);
      return responseHandler.sendfailureResponse(res, "Server error", 500);
    }
  };

  static getAllOrders = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        search,
        startDate,
        endDate,
      } = req.query;

      const filter = {};
      if (status) filter.status = status;

      // search by invoiceNumber OR orderId OR customer name
      if (search) {
        filter.$or = [
          { invoiceNumber: { $regex: search, $options: "i" } },
          { orderId: { $regex: search, $options: "i" } },
        ];
      }

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const [total, orders] = await Promise.all([
        Order.countDocuments(filter),
        Order.find(filter)
          .populate("user", "name email phone")
          .populate("coupon", "code")
          .select("-__v -statusHistory")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(Number(limit))
          .lean(),
      ]);

      return responseHandler.sendSuccessResponse(res, "Orders fetched", {
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        orders,
      });
    } catch (err) {
      console.error("getAllOrders:", err);
      return responseHandler.sendfailureResponse(res, "Server error", 500);
    }
  };

  static getOrderById = async (req, res) => {
    try {
      // payment is commented out in schema — removed from populate
      const order = await Order.findById(req.params.id)
        .populate("user", "name email phone")
        .populate("coupon", "code discountType discountValue")
        .select("-__v");

      if (!order)
        return responseHandler.sendfailureResponse(res, "Order not found", 404);

      return responseHandler.sendSuccessResponse(res, "Order fetched", {
        order,
      });
    } catch (err) {
      console.error("getOrderById:", err);
      return responseHandler.sendfailureResponse(res, "Server error", 500);
    }
  };

  static updateOrderStatus = async (req, res) => {
    try {
      const { status, note } = req.body;

      const validStatuses = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "return_requested",
        "returned",
      ];

      if (!status || !validStatuses.includes(status))
        return responseHandler.sendfailureResponse(
          res,
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          400,
        );

      const order = await Order.findById(req.params.id);
      if (!order)
        return responseHandler.sendfailureResponse(res, "Order not found", 404);

      order.status = status;

      // set the relevant timestamp
      if (status === "confirmed") order.confirmedAt = new Date();
      if (status === "shipped") order.shippedAt = new Date();
      if (status === "delivered") order.deliveredAt = new Date();
      if (status === "cancelled") order.cancelledAt = new Date();
      if (status === "return_requested") order.returnRequestedAt = new Date();
      if (status === "returned") order.returnedAt = new Date();

      order.statusHistory.push({
        status,
        changedAt: new Date(),
        note: note ?? `Status changed to ${status} by admin`,
      });

      await order.save();

      return responseHandler.sendSuccessResponse(
        res,
        `Order status updated to '${status}'`,
        { order },
      );
    } catch (err) {
      console.error("updateOrderStatus:", err);
      return responseHandler.sendfailureResponse(res, "Server error", 500);
    }
  };

  // tracking is nested object in schema: order.tracking.trackingNumber etc.
  static updateTracking = async (req, res) => {
    try {
      const { trackingNumber, courierPartner, trackingUrl } = req.body;

      if (!trackingNumber || !courierPartner)
        return responseHandler.sendfailureResponse(
          res,
          "trackingNumber and courierPartner are required",
          400,
        );

      const order = await Order.findById(req.params.id);
      if (!order)
        return responseHandler.sendfailureResponse(res, "Order not found", 404);

      // nested tracking object — matches schema: tracking: { trackingNumber, courierPartner, trackingUrl }
      order.tracking = {
        trackingNumber,
        courierPartner,
        trackingUrl: trackingUrl ?? "",
      };

      order.status = "shipped";
      order.shippedAt = new Date();

      order.statusHistory.push({
        status: "shipped",
        changedAt: new Date(),
        note: `Shipped via ${courierPartner} — ${trackingNumber}`,
      });

      await order.save();

      return responseHandler.sendSuccessResponse(res, "Tracking updated", {
        order,
      });
    } catch (err) {
      console.error("updateTracking:", err);
      return responseHandler.sendfailureResponse(res, "Server error", 500);
    }
  };

  // paymentStatus is commented out in schema — removed this controller
  // uncomment paymentStatus in schema first, then uncomment below
  // static updatePaymentStatus = async (req, res) => { ... };

  static updateAdminNotes = async (req, res) => {
    try {
      const { adminNotes } = req.body;

      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { $set: { adminNotes } },
        { new: true },
      );

      if (!order)
        return responseHandler.sendfailureResponse(res, "Order not found", 404);

      return responseHandler.sendSuccessResponse(res, "Notes updated", {
        order,
      });
    } catch (err) {
      console.error("updateAdminNotes:", err);
      return responseHandler.sendfailureResponse(res, "Server error", 500);
    }
  };

  static updateItemStatus = async (req, res) => {
    try {
      const { itemId } = req.params;
      const { itemStatus, cancellationReason, returnReason } = req.body;

      const validStatuses = [
        "active",
        "cancelled",
        "return_requested",
        "returned",
        "refunded",
      ];
      if (!itemStatus || !validStatuses.includes(itemStatus))
        return responseHandler.sendfailureResponse(
          res,
          `Invalid itemStatus. Must be one of: ${validStatuses.join(", ")}`,
          400,
        );

      const update = { "items.$.itemStatus": itemStatus };
      if (itemStatus === "cancelled") {
        update["items.$.cancelledAt"] = new Date();
        update["items.$.cancellationReason"] = cancellationReason ?? "";
      }
      if (itemStatus === "returned") {
        update["items.$.returnedAt"] = new Date();
        update["items.$.returnReason"] = returnReason ?? "";
      }

      const order = await Order.findOneAndUpdate(
        { _id: req.params.id, "items._id": itemId },
        { $set: update },
        { new: true },
      );

      if (!order)
        return responseHandler.sendfailureResponse(
          res,
          "Order or item not found",
          404,
        );

      return responseHandler.sendSuccessResponse(res, "Item status updated", {
        order,
      });
    } catch (err) {
      console.error("updateItemStatus:", err);
      return responseHandler.sendfailureResponse(res, "Server error", 500);
    }
  };

  static getOrderStats = async (req, res) => {
    try {
      const [stats] = await Order.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
            totalDiscount: { $sum: "$discountAmount" },
            avgOrderValue: { $avg: "$totalAmount" },
            pending: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
            },
            shipped: {
              $sum: { $cond: [{ $eq: ["$status", "shipped"] }, 1, 0] },
            },
            delivered: {
              $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
            },
          },
        },
        // monthly breakdown for charts
        {
          $lookup: {
            from: "orders",
            pipeline: [
              {
                $group: {
                  _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                  },
                  orders: { $sum: 1 },
                  revenue: { $sum: "$totalAmount" },
                },
              },
              { $sort: { "_id.year": 1, "_id.month": 1 } },
              {
                $project: {
                  _id: 0,
                  month: {
                    $dateToString: {
                      format: "%b",
                      date: {
                        $dateFromParts: {
                          year: "$_id.year",
                          month: "$_id.month",
                          day: 1,
                        },
                      },
                    },
                  },
                  orders: 1,
                  revenue: 1,
                },
              },
            ],
            as: "monthly",
          },
        },
      ]);

      return responseHandler.sendSuccessResponse(
        res,
        "Stats fetched",
        stats ?? {},
      );
    } catch (err) {
      console.error("getOrderStats:", err);
      return responseHandler.sendfailureResponse(res, "Server error", 500);
    }
  };
}

export default OrderController;
