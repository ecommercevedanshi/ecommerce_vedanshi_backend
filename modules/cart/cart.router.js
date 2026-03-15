import express from "express";
import CartController from "./cart.controller.js";
import { Auth } from "../../shared/middleware/authenticate.js";

const router = express.Router();

router.get("/get-cart", Auth, CartController.getCart);
router.post("/add-cart", Auth, CartController.addToCart);
router.delete("/remove/:itemId", Auth, CartController.removeCartItem);
router.delete("/clear", Auth, CartController.clearCart);
router.put("/update/:itemId", Auth, CartController.updateCartItem);
router.post("/merge-cart", Auth, CartController.mergeCart);
router.post("/apply-coupon", CartController.applyCoupon);
router.delete("/remove-coupon", CartController.removeCoupon);

export default router;