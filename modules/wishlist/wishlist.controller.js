import Wishlist from "./wishlist.model.js";
import responseHandler from "../../shared/responseHandler.js";
import Category from "../categories/categories.model.js";

class WishlistController {


    static addToWishlist = async (req, res) => {
        const user = req.user || req.admin;
        try {
            const { productId } = req.params;

            const existing = await Wishlist.findOne({
                user: user._id,
                product: productId,
            });

            if (existing)
                return responseHandler.sendfailureResponse(res, "Product already in wishlist", 409);

            const wishlist = await Wishlist.create({
                user: user._id,
                product: productId,
            });

            await wishlist.populate("product", "name images price");

            return responseHandler.sendSuccessResponse(res, "Added to wishlist", { wishlist }, 201);
        } catch (err) {
            if (err.code === 11000)
                return responseHandler.sendfailureResponse(res, "Product already in wishlist", 409);
            console.error("addToWishlist:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };


    static removeFromWishlist = async (req, res) => {
        const user = req.user || req.admin;
        try {
            const { productId } = req.params;

            // console.log(productId)

            const wishlist = await Wishlist.findOneAndDelete({
                user: user._id,
                product: productId,
            });

            if (!wishlist)
                return responseHandler.sendfailureResponse(res, "Product not found in wishlist", 404);

            return responseHandler.sendSuccessResponse(res, "Removed from wishlist", {});
        } catch (err) {
            console.error("removeFromWishlist:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };

    
    // static getMyWishlist = async (req, res) => {
    //     const user = req.user || req.admin;
    //     try {
    //         const { page = 1, limit = 20 } = req.query;

    //         const [total, items] = await Promise.all([
    //             Wishlist.countDocuments({ user: user._id }),
    //             Wishlist.find({ user: user._id })
    //                 .populate("product", "name images price variants isActive")
    //                 .sort({ createdAt: -1 })
    //                 .skip((page - 1) * limit)
    //                 .limit(Number(limit))
    //                 .lean(),
    //         ]);

    //         return responseHandler.sendSuccessResponse(res, "Wishlist fetched", {
    //             total,
    //             page: Number(page),
    //             totalPages: Math.ceil(total / limit),
    //             items,
    //         });
    //     } catch (err) {
    //         console.error("getMyWishlist:", err);
    //         return responseHandler.sendfailureResponse(res, "Server error", 500);
    //     }
    // };

    static getMyWishlist = async (req, res) => {
  const user = req.user || req.admin;

  try {

    const { page = 1, limit = 20 } = req.query;

    const [total, items] = await Promise.all([
      Wishlist.countDocuments({ user: user._id }),

      Wishlist.find({ user: user._id })
        .populate("product", "name slug images price variants isActive category subCategory")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
    ]);

    /* 🔹 Convert product image URLs → presigned */

   const formattedItems = await Promise.all(
  items.map(async (item) => {

    const product = item.product;

    if (!product) return null;

    /* SELECT FIRST ACTIVE VARIANT */
    const variant =
      product.variants?.find((v) => v.status === "active") ||
      product.variants?.[0] ||
      null;

    /* TAKE FIRST 2 IMAGES */
    const images = (product.images || []).slice(0, 2);

    const formattedImages = await Promise.all(
      images.map(async (img) => {

        let url = img.url;

        if (url && !url.startsWith("http")) {
          url = await responseHandler.generatePreSignedURL(url);
        }

        return {
          url,
          alt: img.alt || "",
        };

      })
    );

    const category = await Category.findOne({ name: product.category }).lean();
// console.log(product)
const subCategory = await Category.findOne({ name: product.subCategory }).lean();

    return {
      _id: item._id,
      productId: product._id,
      name: product.name,
      slug: product.slug,

      category: category.slug || null,
      subCategory: subCategory.slug || null,

      images: formattedImages,

      variant: variant
        ? {
            variantId: variant._id,
            size: variant.size,
            colour: variant.colour,
            price: variant.price,
            mrp: variant.mrp,
            stockQty: variant.stockQty,
          }
        : null,

      createdAt: item.createdAt,
    };

  })
);

    return responseHandler.sendSuccessResponse(res, "Wishlist fetched", {
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      items: formattedItems,
    });

  } catch (err) {
    console.error("getMyWishlist:", err);
    return responseHandler.sendfailureResponse(res, "Server error", 500);
  }
};

static getWishlistIds = async (req, res) => {
    const user = req.user || req.admin;
  try {
    const items = await Wishlist.find({ user: user._id })
      .select("product")
      .lean();

    const ids = items.map((item) => item.product.toString());

    return responseHandler.sendSuccessResponse(res, "Wishlist IDs fetched", { ids });
  } catch (err) {
    console.log(err)
    return responseHandler.sendfailureResponse(res, "Server error", 500);
  }
};
    /**
     * GET /api/wishlist/check/:productId
     * Check if a specific product is in the user's wishlist
     * Used to show filled/outline heart icon on product page
     */
    static checkWishlist = async (req, res) => {
        const user = req.user || req.admin;
        try {
            const { productId } = req.params;

            const exists = await Wishlist.exists({
                user: user._id,
                product: productId,
            });

            return responseHandler.sendSuccessResponse(res, "Wishlist status fetched", {
                isWishlisted: !!exists,
            });
        } catch (err) {
            console.error("checkWishlist:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };

    /**
     * DELETE /api/wishlist/clear
     * Clear entire wishlist
     */
    static clearWishlist = async (req, res) => {
        const user = req.user || req.admin;
        try {
            await Wishlist.deleteMany({ user: user._id });

            return responseHandler.sendSuccessResponse(res, "Wishlist cleared", {});
        } catch (err) {
            console.error("clearWishlist:", err);
            return responseHandler.sendfailureResponse(res, "Server error", 500);
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
            return responseHandler.sendfailureResponse(res, "Server error", 500);
        }
    };
}

export default WishlistController;