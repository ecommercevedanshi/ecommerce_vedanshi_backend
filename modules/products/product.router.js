import express from "express";

import ProductController from "./product.controller.js";

const router = express.Router();

//  USER ROUTES (public)
router.get("/", ProductController.getAllProducts);
router.get("/product-details/:id", ProductController.getAllProducts);
router.get("/featured", ProductController.getFeaturedProducts);
router.get("/new-arrivals", ProductController.getNewArrivals);
router.get("/search", ProductController.searchProducts);
router.get("/category/:slug", ProductController.getProductsByCategory);
router.get("/subcategory/:slug", ProductController.getProductsBySubCategory);
router.get("/:slug", ProductController.getProductBySlug);

//  ADMIN ROUTES (protected)

router.get("/admin/product", ProductController.adminGetAllProducts);
// router.get("/admin/products/low-stock", ProductController.getLowStockProducts);
router.get("/admin/products/:id", ProductController.adminGetProductById);
router.post("/admin/create-product", ProductController.createProduct);
router.put("/admin/update-products/:id", ProductController.updateProduct);
router.post(
    "/admin/upload-images",
    ProductController.uploadProductImages
);
router.delete("/admin/delete-products/:id", ProductController.deleteProduct);

export default router;