import { Router } from "express";
import responseHandler from "../shared/responseHandler.js";

import userRouter from "../modules/user/user.router.js"
import productsRouter from "../modules/products/product.router.js"
import categoryRouter from "../modules/categories/categories.router.js"
import couponsRouter from "../modules/coupon/coupon.router.js"
import orderRouter from "../modules/orders/orders.router.js"
import mediaRouter from "../modules/media/media.router.js";
import cartRouter from "../modules/cart/cart.router.js";

let router = Router();

router.get("/", (req, res) => {
  return responseHandler.sendSuccessResponse(res, "Welcome to Kafka API", null);
});

router.use("/user", userRouter);
router.use("/products", productsRouter)
router.use("/category", categoryRouter)
router.use("/cart", cartRouter)
router.use("/coupons", couponsRouter)
router.use("/orders", orderRouter)

router.use("/media", mediaRouter)


export default router;
