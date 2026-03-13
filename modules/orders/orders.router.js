import express from "express";
import OrderController from "./orders.controller.js";

const router = express.Router();

//  USER ROUTES
router.post("/place-order", OrderController.placeOrder);
router.get("/my", OrderController.getMyOrders);
router.get("/my/:id", OrderController.getMyOrderById);
router.patch("/my/:id/cancel", OrderController.cancelMyOrder);
router.post("/my/:id/return", OrderController.requestReturn);

//  ADMIN ROUTES
router.get("/admin/stats", OrderController.getOrderStats);
router.get("/admin", OrderController.getAllOrders);
router.get("/admin/:id", OrderController.getOrderById);
router.patch("/admin/:id/status", OrderController.updateOrderStatus);
router.patch("/admin/:id/tracking", OrderController.updateTracking);
router.patch("/admin/:id/payment-status", OrderController.updatePaymentStatus);
router.patch("/admin/:id/notes", OrderController.updateAdminNotes);
router.patch("/admin/:id/item/:itemId/status", OrderController.updateItemStatus);

export default router;