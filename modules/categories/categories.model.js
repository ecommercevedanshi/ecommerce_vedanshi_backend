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
             type : String           
         }

    },
    { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;