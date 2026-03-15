import express from "express";
import WishlistController from "./wishlist.controller.js";
import { Auth } from "../../shared/middleware/authenticate.js";

const router = express.Router();

//  USER ROUTES
router.get("/get-my-wishlist", Auth, WishlistController.getMyWishlist);
router.get("/my-ids", Auth, WishlistController.getWishlistIds);
router.post("/add-to-my-wishlist/:productId", Auth, WishlistController.addToWishlist);
router.delete("/clear-wishlist", Auth, WishlistController.clearWishlist);
router.get("/check/:productId", Auth, WishlistController.checkWishlist);
router.delete("/delete-get-wishlist/:productId", Auth, WishlistController.removeFromWishlist);


export default router;