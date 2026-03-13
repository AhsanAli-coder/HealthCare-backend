import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      // NEXT_VIDEO: discuss about frontend
      throw new ApiError(401, "Invalid Access Token");
    }
    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});



export const verifyRole = (roles) => {
  return asyncHandler(async (req, res, next) => {
    // Check if user exists (should be handled by verifyJWT first)
    if (!req.user) {
      throw new ApiError(401, "Unauthorized request");
    }

    // Check if the user's role is in the allowed roles array
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, `Access denied: ${req.user.role} role not allowed`);
    }
    

    next();
  });
};