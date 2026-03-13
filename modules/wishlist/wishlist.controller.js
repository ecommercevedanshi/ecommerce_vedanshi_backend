import Wishlist from "../models/wishlistModel.js";
import responseHandler from "../utils/responseHandler.js";

class WishlistController {


    static addToWishlist = async (req, res) => {
        try {
            const { productId } = req.params;

            const existing = await Wishlist.findOne({
                user: req.user._id,
                product: productId,
            });

            if (existing)
                return responseHandler.sendFailureResponse(res, "Product already in wishlist", 409);

            const wishlist = await Wishlist.create({
                user: req.user._id,
                product: productId,
            });

            await wishlist.populate("product", "name images price");

            return responseHandler.sendSuccessResponse(res, "Added to wishlist", { wishlist }, 201);
        } catch (err) {
            if (err.code === 11000)
                return responseHandler.sendFailureResponse(res, "Product already in wishlist", 409);
            console.error("addToWishlist:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };


    static removeFromWishlist = async (req, res) => {
        try {
            const { productId } = req.params;

            const wishlist = await Wishlist.findOneAndDelete({
                user: req.user._id,
                product: productId,
            });

            if (!wishlist)
                return responseHandler.sendFailureResponse(res, "Product not found in wishlist", 404);

            return responseHandler.sendSuccessResponse(res, "Removed from wishlist", {});
        } catch (err) {
            console.error("removeFromWishlist:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    /**
     * GET /api/wishlist
     * Get logged-in user's wishlist (paginated)
     */
    static getMyWishlist = async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;

            const [total, items] = await Promise.all([
                Wishlist.countDocuments({ user: req.user._id }),
                Wishlist.find({ user: req.user._id })
                    .populate("product", "name images price variants isActive")
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(Number(limit))
                    .lean(),
            ]);

            return responseHandler.sendSuccessResponse(res, "Wishlist fetched", {
                total,
                page: Number(page),
                totalPages: Math.ceil(total / limit),
                items,
            });
        } catch (err) {
            console.error("getMyWishlist:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    /**
     * GET /api/wishlist/check/:productId
     * Check if a specific product is in the user's wishlist
     * Used to show filled/outline heart icon on product page
     */
    static checkWishlist = async (req, res) => {
        try {
            const { productId } = req.params;

            const exists = await Wishlist.exists({
                user: req.user._id,
                product: productId,
            });

            return responseHandler.sendSuccessResponse(res, "Wishlist status fetched", {
                isWishlisted: !!exists,
            });
        } catch (err) {
            console.error("checkWishlist:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    /**
     * DELETE /api/wishlist/clear
     * Clear entire wishlist
     */
    static clearWishlist = async (req, res) => {
        try {
            await Wishlist.deleteMany({ user: req.user._id });

            return responseHandler.sendSuccessResponse(res, "Wishlist cleared", {});
        } catch (err) {
            console.error("clearWishlist:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };

    // ══════════════════════════════════════════════════════════════
    //  ADMIN
    // ══════════════════════════════════════════════════════════════

    /**
     * GET /api/admin/wishlist/stats
     * Most wishlisted products — useful for inventory & marketing decisions
     */
    static getWishlistStats = async (req, res) => {
        try {
            const { limit = 10 } = req.query;

            const stats = await Wishlist.aggregate([
                {
                    $group: {
                        _id: "$product",
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: Number(limit) },
                {
                    $lookup: {
                        from: "products",
                        localField: "_id",
                        foreignField: "_id",
                        as: "product",
                    },
                },
                { $unwind: "$product" },
                {
                    $project: {
                        _id: 0,
                        productId: "$_id",
                        count: 1,
                        productName: "$product.name",
                        productImage: { $arrayElemAt: ["$product.images", 0] },
                    },
                },
            ]);

            return responseHandler.sendSuccessResponse(res, "Wishlist stats fetched", { stats });
        } catch (err) {
            console.error("getWishlistStats:", err);
            return responseHandler.sendFailureResponse(res, "Server error", 500);
        }
    };
}

export default WishlistController;