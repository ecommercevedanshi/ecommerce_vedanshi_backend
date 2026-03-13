import Cart from "./cart.model.js";
import Product from "../products/product.model.js";
import Coupon from "../coupon/coupon.model.js";
import responseHandler from "../../shared/responseHandler.js";

const calcDiscount = (subtotal, coupon) => {
    if (!coupon) return 0;
    if (coupon.discountType === "percentage") {
        const disc = (subtotal * coupon.discountValue) / 100;
        return coupon.maxDiscount ? Math.min(disc, coupon.maxDiscount) : disc;
    }
    return coupon.discountValue;
};

class CartController {

    static async getCart(req, res, next) {
        try {
            const cart = await Cart.findOne({ user: req.user._id })
                .populate("items.product", "name images stock")
                .populate("coupon");

            if (!cart) {
                return responseHandler.sendSuccessResponse(res, "Cart is empty", {
                    items: [], subtotal: 0, discountAmount: 0, total: 0
                });
            }

            const subtotal = cart.items.reduce(
                (sum, item) => sum + item.price * item.quantity, 0
            );
            const total = subtotal - (cart.discountAmount || 0);

            return responseHandler.sendSuccessResponse(res, "Cart fetched successfully", {
                ...cart.toObject(), subtotal, total
            });
        } catch (err) {
            next(err);
        }
    }

    static async addToCart(req, res, next) {
        try {
            const { productId, variantId, quantity = 1 } = req.body;

            if (!productId || !variantId) {
                return responseHandler.sendfailureResponse(res, "productId and variantId are required");
            }

            const product = await Product.findById(productId);
            if (!product)
                return responseHandler.sendfailureResponse(res, "Product not found", 404);

            if (product.status !== "active" || product.visibility !== "public")
                return responseHandler.sendfailureResponse(res, "Product not available");

            const variant = product.variants?.id(variantId);
            if (!variant)
                return responseHandler.sendfailureResponse(res, "Variant not found", 404);

            if (variant.status !== "active")
                return responseHandler.sendfailureResponse(res, "Variant not available");

            if (variant.stockQty < quantity)
                return responseHandler.sendfailureResponse(res, "Insufficient stock");

            let cart = await Cart.findOne({ user: req.user._id });
            if (!cart) cart = new Cart({ user: req.user._id, items: [] });

            const existingIndex = cart.items.findIndex(
                (i) =>
                    i.product.toString() === productId &&
                    i.variantId.toString() === variantId
            );

            if (existingIndex > -1) {
                cart.items[existingIndex].quantity += quantity;
            } else {
                cart.items.push({
                    product: productId,
                    variantId,
                    productName: product.name,
                    size: variant.size,
                    colour: variant.colour,
                    imageUrl: product.images?.[0]?.url || "",
                    price: variant.price ?? product.price,
                    quantity,
                });
            }

            await cart.save();
            return responseHandler.sendSuccessResponse(res, "Item added to cart", cart);
        } catch (err) {
            next(err);
        }
    }

    static async updateCartItem(req, res, next) {
        try {
            const { itemId } = req.params;
            const { quantity } = req.body;

            if (!quantity || quantity < 1) {
                return responseHandler.sendfailureResponse(res, "Quantity must be at least 1");
            }

            const cart = await Cart.findOne({ user: req.user._id });
            if (!cart)
                return responseHandler.sendfailureResponse(res, "Cart not found", 404);

            const item = cart.items.id(itemId);
            if (!item)
                return responseHandler.sendfailureResponse(res, "Cart item not found", 404);

            item.quantity = quantity;
            await cart.save();

            return responseHandler.sendSuccessResponse(res, "Cart updated", cart);
        } catch (err) {
            next(err);
        }
    }

    static async removeCartItem(req, res, next) {
        try {
            const { itemId } = req.params;

            const cart = await Cart.findOne({ user: req.user._id });
            if (!cart)
                return responseHandler.sendfailureResponse(res, "Cart not found", 404);

            cart.items = cart.items.filter((i) => i._id.toString() !== itemId);
            await cart.save();

            return responseHandler.sendSuccessResponse(res, "Item removed", cart);
        } catch (err) {
            next(err);
        }
    }

    static async clearCart(req, res, next) {
        try {
            const cart = await Cart.findOne({ user: req.user._id });
            if (!cart)
                return responseHandler.sendfailureResponse(res, "Cart not found", 404);

            cart.items = [];
            cart.coupon = null;
            cart.couponCode = "";
            cart.discountAmount = 0;
            await cart.save();

            return responseHandler.sendSuccessResponse(res, "Cart cleared", cart);
        } catch (err) {
            next(err);
        }
    }

    static async applyCoupon(req, res, next) {
        try {
            const { code } = req.body;
            if (!code)
                return responseHandler.sendfailureResponse(res, "Coupon code is required");

            const coupon = await Coupon.findOne({
                code: code.toUpperCase(),
                isActive: true,
                expiresAt: { $gte: new Date() },
            });
            if (!coupon)
                return responseHandler.sendfailureResponse(res, "Invalid or expired coupon", 404);

            const cart = await Cart.findOne({ user: req.user._id });
            if (!cart || cart.items.length === 0)
                return responseHandler.sendfailureResponse(res, "Your cart is empty");

            const subtotal = cart.items.reduce(
                (sum, item) => sum + item.price * item.quantity, 0
            );

            if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
                return responseHandler.sendfailureResponse(
                    res, `Minimum order amount ₹${coupon.minOrderAmount} required`
                );
            }

            cart.coupon = coupon._id;
            cart.couponCode = coupon.code;
            cart.discountAmount = calcDiscount(subtotal, coupon);
            await cart.save();

            return responseHandler.sendSuccessResponse(res, "Coupon applied", {
                discountAmount: cart.discountAmount,
                total: subtotal - cart.discountAmount,
            });
        } catch (err) {
            next(err);
        }
    }

    static async removeCoupon(req, res, next) {
        try {
            const cart = await Cart.findOne({ user: req.user._id });
            if (!cart)
                return responseHandler.sendfailureResponse(res, "Cart not found", 404);

            cart.coupon = null;
            cart.couponCode = "";
            cart.discountAmount = 0;
            await cart.save();

            return responseHandler.sendSuccessResponse(res, "Coupon removed", cart);
        } catch (err) {
            next(err);
        }
    }
}

export default CartController;