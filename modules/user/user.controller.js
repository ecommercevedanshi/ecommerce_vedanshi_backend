import User from "./user.model.js";
import responseHandler from "../../shared/responseHandler.js";
import jwt from "jsonwebtoken";

class UserController {
  static async register(req, res, next) {
    try {

      // ✅ generate unique username like first code
      var username;
      while (true) {
        username = await responseHandler.generateRandomUsername();
        const exists = await User.exists({ username: "VEDANSHI" + username });
        if (!exists) break;
      }

      let { name, email, phone, password, confirmPassword } = req.body; // ✅ no role from body

      if (!name || !email || !phone || !password || !confirmPassword) {
        return responseHandler.sendfailureResponse(res, "All fields are required", 400);
      }

      if (password !== confirmPassword) {
        return responseHandler.sendfailureResponse(res, "Passwords do not match", 400);
      }

      email = email.toLowerCase();
      req.body.email = email;

      let findEmail = await User.findOne({ email, isDeleted: false }).lean();
      console.log(findEmail ,"fondemail")

      if (findEmail && !findEmail.isVerified) {
        return responseHandler.sendfailureResponse(res, "User verification pending", 400);
      }

      if (findEmail && findEmail.isVerified && !findEmail.isDeleted) {
        return responseHandler.sendfailureResponse(res, "Email already exists", 400);
      }

      let findPhone = await User.findOne({ phone, isDeleted: false });
      if (findPhone) {
        return responseHandler.sendfailureResponse(res, "Phone already exists", 400);
      }

      let otp_number = await responseHandler.generateOTP();

      // ✅ sanitize name
      name = (req.body.name || "").replace(/[^A-Za-z.\s]/g, "");

      req.body.name = name;
      req.body.username = "VEDANSHI" + username;
      req.body.password = await responseHandler.hashPassword(password);
      req.body.otp = otp_number;
      req.body.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      req.body.role = 1;          // ✅ always user — never from body
      req.body.isVerified = false;
      req.body.isActive = false;
      req.body.isBlock = false;

      const createUser = await User.create(req.body);

      responseHandler.nodeMailer(createUser.email, otp_number);

      return responseHandler.sendSuccessResponse(
        res,
        "User registered successfully. Please verify with OTP.",
        {
          email,
          phone,
          userId: createUser._id,
          username: req.body.username,
        }
      );
    } catch (error) {
      next(error);
    }
  }
  // static async getOtp(req, res, next) {
  //   try {
  //     let { email, phone } = req.body;
  //     console.log(email, phone);

  //     if (!email || !phone) {
  //       return responseHandler.sendfailureResponse(res, "Email and phone are required");
  //     }

  //     email = email.toLowerCase();

  //     // Find user by email
  //     let findUser = await User.findOne({
  //       email: email,
  //       phone: phone,
  //       isDeleted: false,
  //     });

  //     if (!findUser) {
  //       return responseHandler.sendfailureResponse(res, "User not found with this email and phone");
  //     }

  //     // Generate new OTP
  //     let otp_number = await responseHandler.generateOTP();

  //     // Send OTP via email and SMS
  //     // responseHandler.nodeMailer(email, otp_number);
  //     // responseHandler.SmsOtp(phone, otp_number, "register");


  //     return responseHandler.sendSuccessResponse(res, "OTP sent successfully", {
  //       email: email,
  //       phone: phone,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // }


  static async resendOtp(req, res, next) {
    try {
      let { email } = req.body;

      if (!email) {
        return responseHandler.sendfailureResponse(res, "Email is required", 400);
      }

      email = email.toLowerCase();

      const findUser = await User.findOne({
        email: email,
        isDeleted: false,
      });

      if (!findUser) {
        return responseHandler.sendfailureResponse(res, "User not found", 404);
      }

      if (findUser.isVerified) {
        return responseHandler.sendfailureResponse(res, "User already verified", 400);
      }

      // Generate new OTP and save to user
      const otp_number = await responseHandler.generateOTP();

      await User.findByIdAndUpdate(findUser._id, {
        otp: otp_number,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
      });

      // Send OTP via email
      responseHandler.nodeMailer(email, otp_number);

      return responseHandler.sendSuccessResponse(res, "OTP resent successfully", { email });
    } catch (error) {
      next(error);
    }
  }


  static async verifyOtp(req, res, next) {
    try {
      let { email, otp } = req.body;

      if (!email || !otp) {
        return responseHandler.sendfailureResponse(res, "Email and OTP are required", 400);
      }

      email = email.toLowerCase();

      // Find user by email
      let findUser = await User.findOne({
        email: email,
        isDeleted: false,
      });

      if (!findUser) {
        return responseHandler.sendfailureResponse(res, "User not found", 404);
      }

      // Check OTP matches
      if (findUser.otp !== otp) {
        return responseHandler.sendfailureResponse(res, "Invalid OTP", 400);
      }

      // Check OTP expiry
      if (new Date() > findUser.otpExpiry) {
        return responseHandler.sendfailureResponse(res, "OTP has expired", 400);
      }

      const loginTime = Math.floor(Date.now() / 1000);

      // Generate tokens
      const accessToken = jwt.sign(
        { userId: findUser._id },
        process.env.JWT_SK,
        { expiresIn: "7m" }
      );

      const refreshToken = jwt.sign(
        { userId: findUser._id },
        process.env.JWT_REFRESH_SK,
        { expiresIn: "30d" }
      );

      // Update user as verified, clear OTP, save refresh token
      await User.findByIdAndUpdate(findUser._id, {
        isVerified: true,
        loginTime: loginTime,
        otp: null,
        otpExpiry: null,
        refreshToken: refreshToken,
      });

      // Set cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 60 * 1000,
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      // Get updated user for response
      const updatedUser = await User.findById(findUser._id).lean();
      delete updatedUser.password;
      delete updatedUser.otp;
      delete updatedUser.otpExpiry;
      delete updatedUser.refreshToken;

      return responseHandler.sendSuccessResponse(res, "User verified successfully", {
        ...updatedUser,
        accessToken,
        refreshToken,
      });

    } catch (error) {
      next(error);
    }
  }


  static async login(req, res, next) {
    try {
      let { email, password, role } = req.body;

      if (!email || !password) {
        return responseHandler.sendfailureResponse(res, "Email and password are required");
      }

      email = email.toLowerCase();
      console.log(email, "email")
      const user = await User.findOne({ email, isDeleted: false });

      if (!user) {
        return responseHandler.sendfailureResponse(res, "Invalid email or password");
      }

      if (!user.isVerified) {
        return responseHandler.sendfailureResponse(res, "Please verify your account first");
      }

      const isMatch = await responseHandler.comparePassword(password, user.password);
      if (!isMatch) {
        return responseHandler.sendfailureResponse(res, "Invalid email or password");
      }

      const loginTime = Math.floor(Date.now() / 1000);

      await User.findByIdAndUpdate(user._id, { loginTime });


      const accessToken = jwt.sign(
        { userId: user._id, loginTime },
        process.env.JWT_SK,
        { expiresIn: "7m" }
      );

      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SK,
        { expiresIn: "30d" }
      );

      user.refreshToken = refreshToken;
      await user.save();

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict", maxAge: 15 * 60 * 1000
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000
      });

      const responseUser = user.toJSON();
      delete responseUser.password;
      responseUser.token = accessToken;

      const response = {
        id: responseUser._id,
        name: responseUser.name,
        email: responseUser.email,
        role: responseUser.role,
        token: accessToken,
        refreshToken: refreshToken

      }



      return responseHandler.sendSuccessResponse(res, "Login successful", response);
    } catch (error) {
      next(error);
    }
  }
  static async forgotPassword(req, res, next) {
    try {
      const { email, phone } = req.body;

      if (!email && !phone) {
        return responseHandler.sendfailureResponse(res, "Email or phone number is required", 400);
      }

      // Find user by email or phone
      const query = {};
      if (email) query.email = email.toLowerCase();
      if (phone) query.phone = phone;
      query.isDeleted = false;

      const findUser = await User.findOne(query);

      if (!findUser) {
        return responseHandler.sendfailureResponse(res, "User not found with the provided details", 404);
      }

      if (!findUser.isVerified) {
        return responseHandler.sendfailureResponse(res, "Please verify your account first", 400);
      }

      // Generate OTP and save to DB
      const otp_number = await responseHandler.generateOTP();

      await User.findByIdAndUpdate(findUser._id, {
        forgotReq: true,
        otp: otp_number,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 mins expiry
      });

      // Send OTP via email
      responseHandler.nodeMailer(findUser.email, otp_number);

      return responseHandler.sendSuccessResponse(res, "OTP sent successfully", {
        email: findUser.email,
        phone: findUser.phone,
        userId: findUser._id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyForgotOtp(req, res, next) {
    try {
      const { email, phone, otp } = req.body;

      // Check if identifiers and OTP are provided
      if ((!email && !phone) || !otp) {
        return responseHandler.sendfailureResponse(res, "Email/phone and OTP are required");
      }

      // Find user by email or phone
      const query = {};
      if (email) query.email = email.toLowerCase();
      if (phone) query.phone = phone;
      query.isDeleted = false;

      const findUser = await User.findOne(query);

      if (!findUser) {
        return responseHandler.sendfailureResponse(res, "User not found with the provided details");
      }



      // Generate a temporary token for password reset
      const resetToken = jwt.sign(
        { id: findUser._id, purpose: "reset" },
        process.env.JWT_SK,
        { expiresIn: "15m" }
      );

      return responseHandler.sendSuccessResponse(res, "OTP verified successfully", {
        userId: findUser._id,
        resetToken,
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      let { email, newPassword, confirmPassword } = req.body;

      if (!email || !newPassword || !confirmPassword) {
        return responseHandler.sendfailureResponse(res, "All fields are required", 400);
      }

      if (newPassword !== confirmPassword) {
        return responseHandler.sendfailureResponse(res, "Passwords do not match", 400);
      }

      email = email.toLowerCase();

      // Find user
      const findUser = await User.findOne({
        email: email,
        isDeleted: false,
      });

      if (!findUser) {
        return responseHandler.sendfailureResponse(res, "User not found or no reset request exists", 404);
      }

      // Hash new password
      const hashedPassword = await responseHandler.hashPassword(newPassword);

      // Update password and clear forgotReq
      await User.findByIdAndUpdate(findUser._id, {
        password: hashedPassword,
        forgotReq: false,
        otp: null,
        otpExpiry: null,
        loginTime: Math.floor(Date.now() / 1000),
      });

      return responseHandler.sendSuccessResponse(res, "Password reset successfully");
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      // Access token from Authorization header
      const authHeader = req.headers["authorization"];
      console.log(authHeader ,"authheader" )
      const accessToken = authHeader && authHeader.split(" ")[1];

      // Refresh token from body
      const { refreshToken } = req.body;

      if (!accessToken) {
        return res.status(401).json({ message: "Access Token is required" });
      }

      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh Token is required" });
      }

      // Verify refresh token (must be valid and NOT expired)
      let decodedRefresh;
      try {
        decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SK);
      } catch (err) {
        return res.status(403).json({ message: "Invalid or Expired Refresh Token" });
      }

      // Decode access token without verifying expiration
      const decodedAccess = jwt.decode(accessToken);
      if (!decodedAccess) {
        return res.status(403).json({ message: "Invalid Access Token" });
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        { id: decodedAccess.id },
        process.env.JWT_SK,
        { expiresIn: "10m" }
      );

      // Generate new refresh token
      const newRefreshToken = jwt.sign(
        { id: decodedRefresh.id },
        process.env.JWT_REFRESH_SK,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        success: true,
        message: "Tokens Refreshed Successfully",
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        }
      });



    } catch (error) {
      next(error);
    }
  }



  // static async refreshToken(req, res, next) {
  //   try {
  //     const accessToken = req.cookies.accessToken;
  //     const refreshToken = req.cookies.refreshToken;

  //     // Check tokens exist
  //     if (!refreshToken) {
  //       return responseHandler.sendfailureResponse(res, "Refresh token is required", 401);
  //     }

  //     if (!accessToken) {
  //       return responseHandler.sendfailureResponse(res, "Access token is required", 401);
  //     }

  //     // Check if access token is actually expired
  //     try {
  //       jwt.verify(accessToken, process.env.JWT_SK);
  //       // Token still valid — no need to refresh
  //       return responseHandler.sendfailureResponse(res, "Access token is still valid", 400);
  //     } catch (err) {
  //       if (err.name !== "TokenExpiredError") {
  //         return responseHandler.sendfailureResponse(res, "Invalid access token", 401);
  //       }
  //     }

  //     // Verify refresh token
  //     let decodedRefresh;
  //     try {
  //       decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SK);
  //     } catch (err) {
  //       return responseHandler.sendfailureResponse(res, "Refresh token expired, please login again", 401);
  //     }

  //     // Find user
  //     const user = await User.findById(decodedRefresh.userId);
  //     if (!user) {
  //       return responseHandler.sendfailureResponse(res, "User not found", 404);
  //     }

  //     // Compare refresh token from cookie with DB
  //     if (user.refreshToken !== refreshToken) {
  //       return responseHandler.sendfailureResponse(res, "Invalid refresh token, please login again", 401);
  //     }

  //     // Generate new access token
  //     const newAccessToken = jwt.sign(
  //       { userId: user._id },
  //       process.env.JWT_SK,
  //       { expiresIn: "7m" }
  //     );

  //     // Generate new refresh token
  //     const newRefreshToken = jwt.sign(
  //       { userId: user._id },
  //       process.env.JWT_REFRESH_SK,
  //       { expiresIn: "30d" }
  //     );

  //     // Save new refresh token to DB
  //     await User.findByIdAndUpdate(user._id, {
  //       refreshToken: newRefreshToken,
  //     });

  //     // Set new cookies
  //     res.cookie("accessToken", newAccessToken, {
  //       httpOnly: true,
  //       secure: true,
  //       sameSite: "strict",
  //       maxAge: 7 * 60 * 1000,
  //     });

  //     res.cookie("refreshToken", newRefreshToken, {
  //       httpOnly: true,
  //       secure: true,
  //       sameSite: "strict", maxAge: 30 * 24 * 60 * 60 * 1000,
  //     });


  //     return responseHandler.sendSuccessResponse(res, "Tokens refreshed successfully", {
  //       accessToken: newAccessToken,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // }

  static async logout(req, res, next) {
    try {
      await User.findByIdAndUpdate(req.user.id, {
        loginTime: 0,
      });
      return helper.success(res, ` Logout Successfully`, {});
    } catch (error) {
      next(error);
    }
  }



  static async getProfile(req, res, next) {
    try {
      const userId = req.params;

      const user = await User.findById(userId)


      if (!user) {
        return responseHandler.sendfailureResponse(res, "User not found", 404);
      }

      return responseHandler.sendSuccessResponse(res, "Profile fetched successfully", user);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const { id } = req.params;
      const { name, username, gender, dateOfBirth, profileImage, address } = req.body;

      const user = await User.findById(id);
      console.log(user, 'users')

      if (!user) {
        return responseHandler.sendfailureResponse(res, "User not found", 404);
      }

      // Check username unique if being changed
      if (username && username !== user.username) {
        const usernameExists = await User.findOne({ username: username.toLowerCase() });
        if (usernameExists) {
          return responseHandler.sendfailureResponse(res, "Username already taken", 400);
        }
      }

      console.log(address, "user.addresses")
      if (name) user.name = name;
      if (username) user.username = username.toLowerCase();
      if (gender) user.gender = gender;
      if (dateOfBirth) user.dateOfBirth = dateOfBirth;
      if (profileImage) user.profileImage = profileImage;
      if (address) user.addresses = address;

      await user.save();

      const updatedUser = await User.findById(id)

      return responseHandler.sendSuccessResponse(res, "Profile updated successfully", updatedUser);
    } catch (error) {
      next(error);
    }
  }



}

export default UserController;
