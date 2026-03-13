import mongoose from 'mongoose';
const { Schema } = mongoose;

const addressSchema = new Schema({
  label: { type: String, default: 'Home' },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  line1: { type: String, required: true },
  line2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  country: { type: String, default: 'India' },
  isDefault: { type: Boolean, default: false },
});

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationToken: { type: String },
    verificationTokenExpiry: { type: Date },

    forgotReq: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordTokenExpiry: { type: Date },

    role: {
      type: Number,
      required: true,
      default: 1,
    },


    isBlocked: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },

    lastLoginAt: { type: Date },

    addresses: [addressSchema],
    refreshToken: { type: String }, // <-- add this

    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },

    profileImage: { type: String },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    dateOfBirth: { type: Date },
  },
  {
    timestamps: true,
  }
);



const User = mongoose.model('User', UserSchema);
export default User;