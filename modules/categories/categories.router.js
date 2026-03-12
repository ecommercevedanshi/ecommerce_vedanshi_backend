import express from "express";

import CategoryController from "./categories.controller.js";

const router = express.Router();


//  USER ROUTES (public)
router.get("/", CategoryController.getAllCategories);
router.get("/:slug/subcategories", CategoryController.getSubCategories);

// ADMIN ROUTES (protected)


router.get("/admin/categories", CategoryController.adminGetAllCategories);
router.get("/admin/categories/:id", CategoryController.adminGetAllCategoriesById);
router.post("/admin/create-categories", CategoryController.createCategory);
router.put("/admin/update-category/:id", CategoryController.updateCategory);
router.delete("/admin/delete-category/:id", CategoryController.deleteCategory);

export default router;