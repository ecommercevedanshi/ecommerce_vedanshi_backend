// orders.routes.js
import express from "express";
import OrderController from "./orders.controller.js"
import { Auth } from "../../shared/middleware/authenticate.js";

const router = express.Router();

//  USER ROUTES — all protected
router.post("/place-order", Auth, OrderController.placeOrder);
router.get("/my-orders", Auth, OrderController.getMyOrders);
router.post("/my/:id", Auth, OrderController.getMyOrderById);
router.patch("/my/:id/cancel", Auth, OrderController.cancelMyOrder);
router.post("/my/:id/return", Auth, OrderController.requestReturn);

router.get("/admin/stats", OrderController.getOrderStats);
router.get("/admin", OrderController.getAllOrders);
router.get("/admin/:id", OrderController.getOrderById);
router.patch("/admin/:id/status", OrderController.updateOrderStatus);
router.patch("/admin/:id/tracking", OrderController.updateTracking);
// router.patch("/admin/:id/payment-status", Auth, OrderController.updatePaymentStatus);
router.patch("/admin/:id/notes", OrderController.updateAdminNotes);
router.patch("/admin/:id/item/:itemId/status", OrderController.updateItemStatus);

export default router;