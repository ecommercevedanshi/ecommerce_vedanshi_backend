import express from "express";
import WishlistController from "./wishlist.controller.js";

const router = express.Router();

//  USER ROUTES
router.get("/get-my-wishlist", WishlistController.getMyWishlist);
router.post("/add-to-my-wishlist/:productId", WishlistController.addToWishlist);
router.delete("/clear-wishlist", WishlistController.clearWishlist);
router.get("/check/:productId", WishlistController.checkWishlist);
router.delete("/delete-get-wishlist/:productId", WishlistController.removeFromWishlist);


export default router;