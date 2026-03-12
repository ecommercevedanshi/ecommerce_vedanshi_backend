const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        channel: {
            type: String,
            enum: ["email", "sms"],
            required: true,
        },
        category: {
            type: String,
            enum: ["order", "payment", "account", "wishlist"],
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: [
                // 3.1 Order Notifications
                "order_placed",
                "order_confirmed",
                "order_shipped",
                "order_delivered",
                "order_cancelled",
                // 3.2 Payment Notifications
                "payment_success",
                "payment_failed",
                "refund_initiated",
                "refund_completed",
                // 3.3 Account & Wishlist Notifications
                "account_registered",
                "password_changed",
                "login_alert",
                "wishlist_item_available",  // back in stock
                "wishlist_price_drop",
            ],
        },

        // Content
        subject: { type: String },   // email subject
        body: { type: String, required: true },
        recipient: { type: String, required: true }, // email address or phone number

        // Linked entities
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },

        // Delivery tracking
        status: {
            type: String,
            enum: ["queued", "sent", "delivered", "failed"],
            default: "queued",
        },
        sentAt: { type: Date },
        failureReason: { type: String },

        // Provider response (e.g. SendGrid messageId, Twilio SID)
        providerMessageId: { type: String },
    },
    { timestamps: true }
);

// notificationSchema.index({ user: 1, createdAt: -1 });
// notificationSchema.index({ type: 1 });
// notificationSchema.index({ status: 1 });
// notificationSchema.index({ channel: 1, status: 1 });
// notificationSchema.index({ order: 1 });

const notification = mongoose.model("Notification", notificationSchema);
export default notification;