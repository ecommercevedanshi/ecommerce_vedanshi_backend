import { Router } from "express";
import UserController from "./user.controller.js";
import validation from "../../shared/validation.js";
import {
  Auth,
  verifyUser,
  verifyAdmin,
  checkPermission,
} from "../../shared/middleware/authenticate.js"


let router = Router();


router.post("/register", validation, UserController.register);
router.post("/login", validation, UserController.login);
router.post("/isVerify", validation, UserController.verifyOtp);
router.post("/resend-otp", UserController.resendOtp);

router.post("/forgot-password", validation, UserController.forgotPassword);
// router.post("/verify-forgot-otp", UserController.verifyForgotOtp);
router.post("/reset-password", UserController.resetPassword);
router.post("/refreshToken", UserController.refreshToken);
router.get("/get-allusers", UserController.resetPassword);

router.post("/logout", Auth, UserController.logout);
router.put("/profile/update/:id", UserController.updateProfile);


export default router;
