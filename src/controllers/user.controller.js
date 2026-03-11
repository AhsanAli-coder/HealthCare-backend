import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";



const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

const { name, email, password, phone, role } = req.body;

const allowedRoles = ["patient", "doctor"];
const userRole = allowedRoles.includes(role) ? role : "patient";
  
  if (
    [name, email,password,phone,role].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  console.log(name);
  const existedUser = await User.findOne({
    $or: [{ name }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  //console.log(req.files);

  // const profilePhotoLocalPath = req.files?.profilePhoto[0]?.path;
  // if (!profilePhotoLocalPath) {
  //   throw new ApiError(400, "Profile photo file is required");
  // }

  // const profilePhoto = await uploadOnCloudinary(profilePhotoLocalPath);

  // if (!profilePhoto) {
  //   throw new ApiError(400, "Profile photo file is required");
  // }


    // Handle optional profile photo
  let profilePhotoUrl = "";
  const profilePhotoFile = req.files?.profilePhoto?.[0];

  if (profilePhotoFile) {
    const uploadedPhoto = await uploadOnCloudinary(profilePhotoFile.path);
    if (uploadedPhoto?.url) {
      profilePhotoUrl = uploadedPhoto.url;
    }
  }

const user = await User.create({
  name,
  email,
  password,
  phone,
  role: userRole,
  profilePhoto: profilePhotoUrl|| "",
  status: userRole === "doctor" ? "pending" : "active"
});

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});




export { registerUser };  