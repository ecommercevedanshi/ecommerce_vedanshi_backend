import { Router } from "express";
import responseHandler from "../shared/responseHandler.js";

import userRouter from "../modules/user/user.router.js"
import productsRouter from "../modules/products/product.router.js"
import categoryRouter from "../modules/categories/categories.router.js"

let router = Router();

router.get("/", (req, res) => {
  return responseHandler.sendSuccessResponse(res, "Welcome to Kafka API", null);
});

router.use("/user", userRouter);
router.use("/products", productsRouter)
router.use("/category", categoryRouter)


export default router;
