import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    password: {
      type: String,
      required: [true, "Password is required"]
    },

    role: {
      type: String,
      enum: ["patient", "doctor", "admin"],
      default: "patient"
    },

    phone: {
      type: String,
      trim: true
    },

    timezone: {
      type: String,
      default: "Asia/Karachi"
    },

    profilePhoto: {
      type: String
    },

    status: {
      type: String,
      enum: ["active", "suspended", "pending"],
      default: "active"
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    refreshToken: {
      type: String
    }
  },
  {
    timestamps: true
  }
);


// PASSWORD HASHING BEFORE SAVE
userSchema.pre("save", async function () {

  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);

  
});


// CHECK PASSWORD
userSchema.methods.isPasswordCorrect = async function (password) {

  return await bcrypt.compare(password, this.password);

};


// GENERATE ACCESS TOKEN
userSchema.methods.generateAccessToken = function () {

  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      name: this.name,
      role: this.role
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  );

};


// GENERATE REFRESH TOKEN
userSchema.methods.generateRefreshToken = function () {

  return jwt.sign(
    {
      _id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  );

};

export const User = mongoose.model("User", userSchema);