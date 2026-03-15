import Category from "./categories.model.js";
import responseHandler from "../../shared/responseHandler.js";

class CategoryController {


    // static async getAllCategories(req, res, next) {
    //     try {
    //         const categories = await Category.find({
    //             isActive: true,
    //         }).sort({ sortOrder: 1 });

    //         return responseHandler.sendSuccessResponse(res, "Categories fetched", categories);
    //     } catch (error) {
    //         next(error);
    //     }
    // }

    static async getAllCategories(req, res, next) {
  try {

    const categories = await Category.find({
      isActive: true
    }).sort({ sortOrder: 1 });

    const categoriesWithUrls = await Promise.all(
      categories.map(async (cat) => {

        const obj = cat.toObject();

        if (obj.thumbnail && !obj.thumbnail.startsWith("http")) {
          obj.thumbnail = await responseHandler.generatePreSignedURL(obj.thumbnail);
        }

        return obj;
      })
    );

    return responseHandler.sendSuccessResponse(
      res,
      "Categories fetched",
      { categories: categoriesWithUrls }
    );

  } catch (error) {
    next(error);
  }
}

    // static async getSubCategories(req, res, next) {
    //     try {
    //         const { slug } = req.params;

    //         const parentCategory = await Category.findOne({ slug, isActive: true });
    //         if (!parentCategory) {
    //             return responseHandler.sendfailureResponse(res, "Category not found", 404);
    //         }

    //         const subCategories = await Category.find({
    //             parent: parentCategory._id,
    //             isActive: true,
    //         }).sort({ sortOrder: 1 });

    //         return responseHandler.sendSuccessResponse(res, "Subcategories fetched", {
    //             category: parentCategory,
    //             subCategories,
    //         });
    //     } catch (error) {
    //         next(error);
    //     }
    // }

    //  ADMIN SIDE

    static async getSubCategories(req, res, next) {
  try {

    const { slug } = req.params;

    const parentCategory = await Category.findOne({
      slug,
      isActive: true
    });

    if (!parentCategory) {
      return responseHandler.sendfailureResponse(res, "Category not found", 404);
    }

    const subCategories = await Category.find({
      parent: parentCategory._id,
      isActive: true
    }).sort({ sortOrder: 1 });

    const subCategoriesWithUrls = await Promise.all(
      subCategories.map(async (cat) => {

        const obj = cat.toObject();

        if (obj.thumbnail && !obj.thumbnail.startsWith("http")) {
          obj.thumbnail = await responseHandler.generatePreSignedURL(obj.thumbnail);
        }

        return obj;
      })
    );

    return responseHandler.sendSuccessResponse(
      res,
      "Subcategories fetched",
      {
        category: parentCategory,
        subCategories: subCategoriesWithUrls
      }
    );

  } catch (error) {
    next(error);
  }
}

    // static async adminGetAllCategories(req, res, next) {
    //     try {
    //         const categories = await Category.find().sort({ sortOrder: 1 });

    //         return responseHandler.sendSuccessResponse(res, "All categories fetched", {
    //             categories,
    //         });
    //     } catch (error) {
    //         next(error);
    //     }
    // }

    static async adminGetAllCategories(req, res, next) {
  try {

    const categories = await Category.find().sort({ sortOrder: 1 });

    const categoriesWithUrls = await Promise.all(
      categories.map(async (cat) => {

        const obj = cat.toObject();

        if (obj.thumbnail && !obj.thumbnail.startsWith("http")) {
          obj.thumbnail = await responseHandler.generatePreSignedURL(obj.thumbnail);
        }

        return obj;
      })
    );

    return responseHandler.sendSuccessResponse(res, "All categories fetched", {
      categories: categoriesWithUrls,
    });

  } catch (error) {
    next(error);
  }
}

    // static async adminGetAllCategoriesById(req, res, next) {
    //     const { id } = req.params;

    //     try {

    //         const category = await Category.findById(id);

    //         return responseHandler.sendSuccessResponse(
    //             res,
    //             "Category fetched successfully",
    //             { category }
    //         );

    //     } catch (error) {
    //         next(error);
    //     }
    // }



//     static async createCategory(req, res, next) {
//         try {
//             const { name, slug, image, parent, isActive, thumbnail, sortOrder } = req.body;

//             if (!name || !slug) {
//                 return responseHandler.sendfailureResponse(res, "Name and slug are required", 400);
//             }

//             const existingCategory = await Category.findOne({
//   slug,
//   parent: parent || null
// });
//             if (existingCategory) {
//   return responseHandler.sendfailureResponse(
//     res,
//     "Category slug already exists under this parent",
//     400
//   );
// }

//             console.log(parent, 'parent')
//             if (parent) {
//                 const parentExists = await Category.findOne({ name: parent });
//                 console.log(parentExists, "parentExists")
//                 if (!parentExists) {
//                     return responseHandler.sendfailureResponse(res, "Parent category not found", 404);
//                 }
//             }

//             const category = await Category.create({
//                 name,
//                 slug,
//                 image,
//                 parent: parent || null,
//                 isActive,
//                 sortOrder,
//                 thumbnail
//             });

//             return responseHandler.sendSuccessResponse(res, "Category created successfully", category, 201);
//         } catch (error) {
//             next(error);
//         }
//     }

static async adminGetAllCategoriesById(req, res, next) {

  const { id } = req.params;

  try {

    const category = await Category.findById(id);

    if (!category) {
      return responseHandler.sendfailureResponse(res, "Category not found", 404);
    }

    const obj = category.toObject();

    if (obj.thumbnail && !obj.thumbnail.startsWith("http")) {
      obj.thumbnail = await responseHandler.generatePreSignedURL(obj.thumbnail);
    }

    return responseHandler.sendSuccessResponse(
      res,
      "Category fetched successfully",
      { category: obj }
    );

  } catch (error) {
    next(error);
  }
}

static async createCategory(req, res, next) {
  try {
    const { name, slug, image, parent, isActive, thumbnail, sortOrder } = req.body;

    if (!name || !slug) {
      return responseHandler.sendfailureResponse(res, "Name and slug are required", 400);
    }

    const existingCategory = await Category.findOne({
      slug,
      parent: parent || null
    });

    if (existingCategory) {
      return responseHandler.sendfailureResponse(
        res,
        "Category slug already exists under this parent",
        400
      );
    }

  let thumbnailKey = null;

if (thumbnail) {
  thumbnailKey = thumbnail; // already key
}

    const category = await Category.create({
      name,
      slug,
      image,
      parent: parent || null,
      isActive,
      sortOrder,
    //   thumbnail: thumbnailKey ? { key: thumbnailKey } : null
    thumbnail: thumbnailKey || null
    });

    return responseHandler.sendSuccessResponse(
      res,
      "Category created successfully",
      category,
      201
    );

  } catch (error) {
    next(error);
  }
}

    // static async updateCategory(req, res, next) {
    //     try {
    //         const { id } = req.params;
    //         const { name, slug, parent, isActive, sortOrder, thumbnail } = req.body;
    //         console.log(thumbnail, 'thumbnail')

    //         // Find the category by ID
    //         const category = await Category.findById(id);
    //         if (!category) {
    //             return responseHandler.sendfailureResponse(res, "Category not found", 404);
    //         }


    //         const parentName = parent

    //         // Validate parent exists if provided
    //         if (parent) {
    //             const parentExists = await Category.findOne({ parent: parentName });
    //             if (!parentExists) {
    //                 return responseHandler.sendfailureResponse(res, "Parent category not found", 404);
    //             }

    //             // Prevent category from being its own parent
    //             if (parent.toString() === id) {
    //                 return responseHandler.sendfailureResponse(res, "Category cannot be its own parent", 400);
    //             }
    //         }

    //         console.log(category.thumbnail, "category.thumbnail")
    //         // Update fields
    //         if (name) category.name = name;
    //         if (slug) category.slug = slug;
    //         // if (image) category.image = image;
    //         if (parent !== undefined) category.parent = parent;
    //         if (isActive !== undefined) category.isActive = isActive;
    //         if (sortOrder !== undefined) category.sortOrder = sortOrder;
    //         if (thumbnail !== undefined) category.thumbnail = thumbnail;




    //         await category.save();

    //         return responseHandler.sendSuccessResponse(res, "Category updated successfully", category);
    //     } catch (error) {
    //         next(error);
    //     }
    // }


    // DELETE /api/admin/categories/:id
    static async updateCategory(req, res, next) {
  try {

    const { id } = req.params;
    const { name, slug, parent, isActive, sortOrder, thumbnail } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return responseHandler.sendfailureResponse(res, "Category not found", 404);
    }

    const parentName = parent;

    if (parent) {

      const parentExists = await Category.findOne({ name: parentName });

      if (!parentExists) {
        return responseHandler.sendfailureResponse(res, "Parent category not found", 404);
      }

      if (parent.toString() === id) {
        return responseHandler.sendfailureResponse(res, "Category cannot be its own parent", 400);
      }

    }

    // Update fields
    if (name) category.name = name;
    if (slug) category.slug = slug;
    if (parent !== undefined) category.parent = parent;
    if (isActive !== undefined) category.isActive = isActive;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;

    if (thumbnail !== undefined) {
    //   category.thumbnail = { key: thumbnail };
      category.thumbnail = thumbnail ;
    }

    await category.save();

    return responseHandler.sendSuccessResponse(
      res,
      "Category updated successfully",
      category
    );

  } catch (error) {
    next(error);
  }
}

    static async deleteCategory(req, res, next) {
        try {
            const category = await Category.findById(req.params.id);
            if (!category) {
                return responseHandler.sendfailureResponse(res, "Category not found", 404);
            }

            // Check if category has subcategories
            const hasSubCategories = await Category.findOne({ parent: req.params.id });
            if (hasSubCategories) {
                return responseHandler.sendfailureResponse(res, "Cannot delete category with subcategories", 400);
            }

            // Toggle isActive
            category.isActive = !category.isActive;
            await category.save();

            const message = category.isActive
                ? "Category activated successfully"
                : "Category deactivated successfully";

            return responseHandler.sendSuccessResponse(res, message, category);
        } catch (error) {
            next(error);
        }
    }
}

export default CategoryController;