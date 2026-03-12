import mongoose from "mongoose";

const productImageSchema = new mongoose.Schema(
    {
        url: { type: String, required: true },
        alt: { type: String, default: "" },
        isPrimary: { type: Boolean, default: false },
        sortOrder: { type: Number, default: 0 },
    },
    { _id: false }
);

const variantSchema = new mongoose.Schema(
    {
        sku: { type: String, trim: true, index: true },
        size: {
            type: String,
            trim: true,
            enum: ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Over Size"],
        },
        colour: { type: String, trim: true },
        hex: { type: String, trim: true, default: "" },

        mrp: { type: Number, required: true, min: 0 },
        price: { type: Number, required: true, min: 0 },

        stockQty: { type: Number, default: 0, min: 0 },
        lowStockThreshold: { type: Number, default: 3, min: 0 },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
            index: true,
        },
    },
    { _id: true, timestamps: false }
);

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 140 },
        slug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
            index: true,
        },

        shortDescription: { type: String, trim: true, maxlength: 400 },
        description: { type: String, trim: true, maxlength: 10000 },
        brand: { type: String, trim: true, default: "Vedanshi" },

        // Category (parent) and SubCategory (child) — both ref same Category model
        category: {
            type: String,
            required: true,
            index: true,
        },
        subCategory: {
            type: String,
            default: null,
            index: true,
        },

        images: { type: [productImageSchema], default: [] },
        variants: { type: [variantSchema], default: [] },

        // Derived fields — auto computed via pre-save hook
        minPrice: { type: Number, default: 0 },
        maxPrice: { type: Number, default: 0 },
        mrp: { type: Number, default: 0 },
        availableColours: [{ type: String }],
        availableSizes: [{ type: String }],
        totalStock: { type: Number, default: 0 },

        // Simple stock for products without variants
        stock: { type: Number, default: 0, min: 0 },
        lowStockThreshold: { type: Number, default: 3, min: 0 },

        tags: { type: [String], default: [], index: true },

        clothDetails: {
            material: { type: String, trim: true, default: "" },
            fit: { type: String, trim: true, default: "" },
            sleeve: { type: String, trim: true, default: "" },
            washCare: { type: String, trim: true, default: "" },
            sizeChartImage: { type: String, default: "" },
        },

        accessoryDetails: {
            material: { type: String, trim: true, default: "" },
            dimensions: { type: String, trim: true, default: "" },
            warranty: { type: String, trim: true, default: "" },
        },

        isFeatured: { type: Boolean, default: false, index: true },
        badges: { type: [String], default: [] },

        visibility: {
            type: String,
            enum: ["public", "hidden"],
            default: "public",
            index: true,
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
            index: true,
        },
        isArchived: { type: Boolean, default: false },

        seoTitle: { type: String, trim: true, maxlength: 70, default: "" },
        seoDescription: { type: String, trim: true, maxlength: 160, default: "" },
    },
    { timestamps: true }
);

// Text search index
productSchema.index({ name: "text", shortDescription: "text", tags: "text", brand: "text" });

// Pre-save: auto compute derived fields from active variants
productSchema.pre("save", function (next) {
    if (this.variants && this.variants.length > 0) {
        const activeVariants = this.variants.filter((v) => v.status === "active");

        if (activeVariants.length > 0) {
            const prices = activeVariants.map((v) => v.price);
            const mrps = activeVariants.map((v) => v.mrp);

            this.minPrice = Math.min(...prices);
            this.maxPrice = Math.max(...prices);
            this.mrp = Math.max(...mrps);
            this.availableColours = [...new Set(activeVariants.map((v) => v.colour).filter(Boolean))];
            this.availableSizes = [...new Set(activeVariants.map((v) => v.size).filter(Boolean))];
            this.totalStock = activeVariants.reduce((sum, v) => sum + v.stockQty, 0);
        }
    }
});

const Product = mongoose.model("Product", productSchema);


export default Product;
