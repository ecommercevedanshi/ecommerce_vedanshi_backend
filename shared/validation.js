import { Validator } from "node-input-validator";


const validation = async (req, res, next) => {
  let path = req.path.toString();
  console.log({ path });



  if (path.includes("/register")) {
    var feilds = {
      email: "required|email",
      password: "required",
      phone: "required",
      countryCode: "required",
    };
  }
  if (path.includes("/isVerify")) {
    var feilds = {
      email: "required|email",
      otpType: "required|in:register,forgotPassword,ChangePassword",
      otp: "required",
    };
  }
  if (path.includes("/resendOtp") || path.includes("/forgotPassword")) {
    var feilds = {
      email: "required|email",
    };
  }
  if (path.includes("/login")) {
    var feilds = {
      password: "required",
      role: "required",
    };
  }


  if (path.includes("/resetPassword")) {
    var feilds = {
      email: "required|email",
      password: "required",
    };
  }
  if (path.includes("/changePassword")) {
    if (path == "/changePassword") {
      var feilds = {
        newPassword: "required",
      };
    } else {
      var feilds = {
        password: "required",
      };
    }
  }

  if (path.includes("/create_payment")) {
    var feilds = {
      order_id: "required",
    };
  }
  if (path.includes("/get_order")) {
    var feilds = {
      order_id: "required",
    };
    req.body.order_id = req.query.order_id;
  }
  if (path.includes("/create-admin-user")) {
    var feilds = {
      name: "required",
      email: "required",
      password: "required",
      permissions: "required",
      phone: "required",
      countryCode: "required",
    };
  }
  if (path.includes("/edit-admin-user")) {
    var feilds = {
      name: "required",
      permissions: "required",
      phone: "required",
      countryCode: "required",
    };
  }


  const v = new Validator(req.body, feilds);
  v.check()
    .then((matched) => {
      if (!matched) {
        return res.status(400).send(v.errors);
      } else {
        next();
      }
    })
    .catch(console.log);
};

export default validation;
