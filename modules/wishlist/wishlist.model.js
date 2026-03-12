import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        }

    },
    { timestamps: true }
);

// Prevent duplicate wishlist entries for the same user and product
wishlistSchema.index({ user: 1, product: 1 }, { unique: true });

// Improve query performance when fetching wishlist by user
// wishlistSchema.index({ user: 1 });

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

export default Wishlist;