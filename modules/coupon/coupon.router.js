import express from "express";
import CouponController from "./coupon.controller.js";

const router = express.Router();


router.get("/product/:productId", CouponController.getCouponsForProduct);
router.get("/category/:categoryId", CouponController.getCouponsForCategory);

router.post("/validate-coupon", CouponController.validateCoupon);
router.get("/available", CouponController.getAvailableCoupons);

//  ADMIN
router.post("/admin/create-coupon", CouponController.createCoupon);
router.get("/admin/get-all-coupons", CouponController.getAllCoupons);
router.get("/admin/get-coupon/:id", CouponController.getCouponById);
router.put("/admin/update-coupon/:id", CouponController.updateCoupon);
// router.patch("/:id/toggle", CouponController.toggleCouponStatus);
router.delete("/admin/delete-coupon/:id", CouponController.deleteCoupon);
// router.get("/:id/usage", CouponController.getCouponUsageLog);


export default router;