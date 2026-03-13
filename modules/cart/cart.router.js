import express from "express";
import CartController from "./cart.controller.js";

const router = express.Router();

router.get("/get-cart", CartController.getCart);
router.post("/add-cart", CartController.addToCart);
// router.put("/update/:itemId", CartController.updateCartItem);
router.delete("/remove/:itemId", CartController.removeCartItem);
router.delete("/clear", CartController.clearCart);
router.post("/apply-coupon", CartController.applyCoupon);
router.delete("/remove-coupon", CartController.removeCoupon);

export default router;