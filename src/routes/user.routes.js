import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { loginUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { logoutUser } from "../controllers/user.controller.js";
import { refreshAccessToken } from "../controllers/user.controller.js"; 
import { updateAccountDetails } from "../controllers/user.controller.js";
import { updateProfilePicture } from "../controllers/user.controller.js";
import { updateTimezone } from "../controllers/user.controller.js";
import { getCurrentUser } from "../controllers/user.controller.js";
import { changeCurrentPassword } from "../controllers/user.controller.js";

const router = Router();
//localhost:8000/users/registers
//localhost:8000/users/login
router.route("/register").post(
  upload.fields([
    {
      name: "profilePhoto",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router.route("/update-profile-picture").patch(verifyJWT, upload.fields([
    {
      name: "profilePhoto",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]), updateProfilePicture);

router.route("/timezone").patch(verifyJWT, updateTimezone);
router.route("/change-password").patch(verifyJWT, changeCurrentPassword);
router.route("/me").get(verifyJWT, getCurrentUser);


export default router;
