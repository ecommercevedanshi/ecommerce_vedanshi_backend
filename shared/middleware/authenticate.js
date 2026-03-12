import responseHandler from "../responseHandler.js";
import Jwt from "jsonwebtoken";
import User from "../../modules/user/user.model.js";



export const Auth= async (req, res, next) => {
  try {
    console.log("triggered")
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken && !refreshToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const decoded = Jwt.verify(accessToken, process.env.JWT_SK);
      req.user = decoded;
      return next();
    } catch (accessError) {

      // Access token expired — try refresh token
      if (!refreshToken) {
        return res.status(401).json({ success: false, message: "Session expired, please login again" });
      }

      try {
        const decodedRefresh = Jwt.verify(refreshToken, process.env.JWT_REFRESH_SK);

        // Get user from DB
        const user = await User.findById(decodedRefresh.userId);
        if (!user) {
          return res.status(401).json({ success: false, message: "User not found" });
        }

        // Compare refresh token from cookie with refresh token in DB
        if (user.refreshToken !== refreshToken) {
          return res.status(401).json({ success: false, message: "Invalid session, please login again" });
        }

        // Tokens match — generate new access token only
        const newAccessToken = Jwt.sign(
          { userId: user._id },
          process.env.JWT_SK,
          { expiresIn: "7m" }
        );

        // Set new access token cookie
        res.cookie("accessToken", newAccessToken, {
          httpOnly: true,
          maxAge: 7 * 60 * 1000, // 7 mins
        });

        req.user = { userId: user._id };
        return next();

      } catch (refreshError) {
        return res.status(401).json({ success: false, message: "Session expired, please login again" });
      }
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.admin) {
      return responseHandler.sendfailureResponse(res, "You Are Not Authorised", {}, 401);
    }
    next();
  } catch (error) {
    next(error);
  }
};
export const verifyUser = async (req, res, next) => {
  try {
    if (!req.user && !req.admin) {
      return responseHandler.sendfailureResponse(res, "You Are Not Authorised", {}, 401);
    }
    next();
  } catch (error) {
    next(error);
  }
};

export /**
 * This method is used to check the permissions of the logged-in user
 * @param {*} permission
 * @return {*}
 */
  const checkPermission = (permission) => {
    return async (req, res, next) => {
      try {
        const adminUserPermissions = req.admin.permissions || [];
        if (req.admin.role === 0) {
          return next();
        }

        if (req.admin.role === 2 && !adminUserPermissions.includes(permission)) {
          return responseHandler.sendfailureResponse(
            res,
            `Access denied: User doesn't have ${permission} Permission`,
            {},
            403
          );
        }

        if (req.admin.role !== 0 && req.admin.role !== 2) {
          return responseHandler.sendfailureResponse(
            res,
            "Access denied: User doesn't have the required role or permissions",
            {},
            403
          );
        }

        next();
      } catch (error) {
        console.log(error);
        return responseHandler.err(res, error, req.path);
      }
    };
  };
