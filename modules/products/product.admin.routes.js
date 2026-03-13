import express from "express";

import ProductController from "./product.controller.js";

const router = express.Router();



router.get("/product", ProductController.adminGetAllProducts);
// router.get("/admin/products/low-stock", ProductController.getLowStockProducts);
router.get("/products/:id", ProductController.adminGetProductById);
router.post("/create-product", ProductController.createProduct);
router.put("/update-products/:id", ProductController.updateProduct);
router.post(
    "/upload-images",
    ProductController.uploadProductImages
);
router.delete("/delete-products/:id", ProductController.deleteProduct);

export default router;