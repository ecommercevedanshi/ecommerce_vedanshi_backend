import Product from "./product.model.js";
import Category from "../categories/categories.model.js"
import responseHandler from "../../shared/responseHandler.js";

class ProductController {

    // USER SIDE

    // GET /api/products
    static async getAllProducts(req, res, next) {
        try {

            const products = await Product.find({
                status: "active",
                visibility: "public",
                isArchived: false
            })
                .populate("category", "name slug")
                .populate("subCategory", "name slug");

            return responseHandler.sendSuccessResponse(
                res,
                "Products fetched successfully",
                { products }
            );

        } catch (error) {
            next(error);
        }
    }

    // GET /api/products/featured
    static async getFeaturedProducts(req, res, next) {
        try {
            const products = await Product.find({
                isFeatured: true,
                status: "active",
                visibility: "public",
                isArchived: false,
            })
                .populate("category", "name slug")
                .populate("subCategory", "name slug")
                .sort({ createdAt: -1 });

            return responseHandler.sendSuccessResponse(res, "Featured products fetched", products);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/products/new-arrivals
    static async getNewArrivals(req, res, next) {
        try {
            const products = await Product.find({
                status: "active",
                visibility: "public",
                isArchived: false,
            })
                .populate("category", "name slug")
                .populate("subCategory", "name slug")
                .sort({ createdAt: -1 })
                .limit(20);

            return responseHandler.sendSuccessResponse(res, "New arrivals fetched", products);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/products/search?q=
    static async searchProducts(req, res, next) {
        try {
            const { q } = req.query;

            if (!q) {
                return responseHandler.sendfailureResponse(res, "Search query is required", 400);
            }
            console.log(q, "qq")

            const products = await Product.find({
                $text: { $search: q },
                status: "active",
                visibility: "public",
                isArchived: false,
            })
                .populate("category", "name slug")
                .populate("subCategory", "name slug")
                .sort({ score: { $meta: "textScore" } });

            return responseHandler.sendSuccessResponse(res, "Search results fetched", products);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/products/category/:slug
    static async getProductsByCategory(req, res, next) {
        try {
            const { slug } = req.params;
            console.log(slug, "sluv")

            const category = await Category.findOne({ slug });
            if (!category) {
                return responseHandler.sendfailureResponse(res, "Category not found", 404);
            }

            const products = await Product.find({
                category: category.name,
                status: "active",
                visibility: "public",
                isArchived: false,
            })
                .populate("category", "name slug")
                .populate("subCategory", "name slug")
                .sort({ createdAt: -1 });

            return responseHandler.sendSuccessResponse(res, "Products fetched by category", products);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/products/subcategory/:slug
    static async getProductsBySubCategory(req, res, next) {
        try {
            const { slug } = req.params;

            const subCategory = await Category.findOne({ slug });
            if (!subCategory) {
                return responseHandler.sendfailureResponse(res, "SubCategory not found", 404);
            }

            const products = await Product.find({
                subCategory: subCategory._id,
                status: "active",
                visibility: "public",
                isArchived: false,
            })
                .populate("category", "name slug")
                .populate("subCategory", "name slug")
                .sort({ createdAt: -1 });

            return responseHandler.sendSuccessResponse(res, "Products fetched by subcategory", products);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/products/:slug
    static async getProductBySlug(req, res, next) {
        try {
            const { slug } = req.params;

            const product = await Product.findOne({
                slug,
                status: "active",
                visibility: "public",
                isArchived: false,
            })
                .populate("category", "name slug")
                .populate("subCategory", "name slug");

            if (!product) {
                return responseHandler.sendfailureResponse(res, "Product not found", 404);
            }

            return responseHandler.sendSuccessResponse(res, "Product fetched", product);
        } catch (error) {
            next(error);
        }
    }

    // 🔐 ADMIN SIDE

    // GET /api/admin/products
    static async adminGetAllProducts(req, res, next) {
        try {
            const { status, visibility, isArchived, page = 1, limit = 20 } = req.query;

            const query = {};
            if (status) query.status = status;
            if (visibility) query.visibility = visibility;
            if (isArchived !== undefined) query.isArchived = isArchived === "true";

            const skip = (Number(page) - 1) * Number(limit);
            const total = await Product.countDocuments(query);
            const products = await Product.find(query)
                .populate("category", "name slug")
                .populate("subCategory", "name slug")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit));

            return responseHandler.sendSuccessResponse(res, "Products fetched", {
                products,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        } catch (error) {
            next(error);
        }
    }

    // GET /api/admin/products/low-stock
    static async getLowStockProducts(req, res, next) {
        try {
            const products = await Product.find({ isArchived: false }).populate("category", "name slug");

            const lowStock = products.filter((p) =>
                p.variants.some((v) => v.stockQty <= v.lowStockThreshold && v.status === "active")
            );

            return responseHandler.sendSuccessResponse(res, "Low stock products fetched", lowStock);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/admin/products/:id
    static async adminGetProductById(req, res, next) {
        try {
            const product = await Product.findById(req.params.id)
                .populate("category", "name slug")
                .populate("subCategory", "name slug");

            if (!product) {
                return responseHandler.sendfailureResponse(res, "Product not found", 404);
            }

            return responseHandler.sendSuccessResponse(res, "Product fetched", product);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/admin/products
    static async createProduct(req, res, next) {
        try {
            const {
                name, slug, shortDescription, description, brand,
                category, subCategory, tags, isFeatured, visibility,
                status, clothDetails, accessoryDetails, badges,
                variants, images, seoTitle, seoDescription,
            } = req.body;

            if (!name || !slug || !category) {
                return responseHandler.sendfailureResponse(res, "Name, slug and category are required", 400);
            }

            const existingProduct = await Product.findOne({ slug });
            if (existingProduct) {
                return responseHandler.sendfailureResponse(res, "Slug already exists", 400);
            }
            console.log(category, "catergory")
            const categoryExists = await Category.findOne({ name: category });
            if (!categoryExists) {
                return responseHandler.sendfailureResponse(res, "Category not found", 404);
            }

            const product = await Product.create({
                name, slug, shortDescription, description, brand,
                category, subCategory, tags, isFeatured, visibility,
                status, clothDetails, accessoryDetails, badges,
                variants: variants || [],
                images: images || [],
                seoTitle, seoDescription,
            });

            return responseHandler.sendSuccessResponse(res, "Product created successfully", product, 201);
        } catch (error) {
            next(error);
        }
    }

    // PUT /api/admin/products/:id
    static async updateProduct(req, res, next) {
        try {
            const product = await Product.findById(req.params.id);
            if (!product) {
                return responseHandler.sendfailureResponse(res, "Product not found", 404);
            }

            if (req.body.slug && req.body.slug !== product.slug) {
                const slugExists = await Product.findOne({ slug: req.body.slug });
                if (slugExists) {
                    return responseHandler.sendfailureResponse(res, "Slug already exists", 400);
                }
            }

            Object.assign(product, req.body);
            await product.save();

            return responseHandler.sendSuccessResponse(res, "Product updated successfully", product);
        } catch (error) {
            next(error);
        }
    }

    // DELETE /api/admin/products/:id
    static async deleteProduct(req, res, next) {
        try {
            const product = await Product.findById(req.params.id);
            if (!product) {
                return responseHandler.sendfailureResponse(res, "Product not found", 404);
            }

            product.isArchived = true;
            product.status = "inactive";
            await product.save();

            return responseHandler.sendSuccessResponse(res, "Product deleted successfully");
        } catch (error) {
            next(error);
        }
    }








    // POST /api/admin/upload-images

    static async uploadProductImages(req, res, next) {
        try {
            // const { category, alt } = req.body;
            const userId = "t-shirts"
            const category = "mens"
            const alt = "full_hands_t_shirts"
            const filesObj = req.files || {};
            const imageKey = Object.keys(filesObj).find(k => k.trim() === "images");
            const rawFiles = imageKey
                ? Array.isArray(filesObj[imageKey])
                    ? filesObj[imageKey]
                    : [filesObj[imageKey]]
                : [];
            console.log(rawFiles, "rawFiles")

            if (!rawFiles.length) {
                return responseHandler.sendfailureResponse(res, "No images provided", 400);
            }

            if (!category) {
                return responseHandler.sendfailureResponse(res, "Category is required", 400);
            }

            const folderMap = {
                mens: process.env.FOLDER_MENS,
                womens: process.env.FOLDER_WOMENS,
                kids: process.env.FOLDER_KIDS,
            };

            const folder = folderMap[category.toLowerCase()];
            if (!folder) {
                return responseHandler.sendfailureResponse(res, "Invalid category. Use mens, womens or kids", 400);
            }

            const uploadedImages = [];

            for (let i = 0; i < rawFiles.length; i++) {
                const file = rawFiles[i];

                console.log(file.name, file.mimetype, file.size, "hello");

                const url = await responseHandler.s3FileUpload(file, userId, folder);

                uploadedImages.push({
                    url,
                    alt: alt || "",
                    isPrimary: i === 0,
                    sortOrder: i,
                });
            }

            console.log(uploadedImages, "uploadedImages")
            return responseHandler.sendSuccessResponse(res, "Images uploaded successfully", uploadedImages);
        } catch (error) {
            next(error);
        }
    }






}

export default ProductController;