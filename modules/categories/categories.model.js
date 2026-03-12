import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },

        image: {
            type: String
        },

        parent: {
            type: String,
            ref: "Category",
            default: null
        },

        isActive: {
            type: Boolean,
            default: true
        },

        sortOrder: {
            type: Number,
            default: 0
        },
        thumbnail: {
            type: String,
            default: null
        }

    },
    { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;