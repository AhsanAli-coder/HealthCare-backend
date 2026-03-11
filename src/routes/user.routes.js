import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js"; 
import {upload} from "../middlewares/multer.middleware.js"
const router = Router();
//localhost:8000/users/registers
//localhost:8000/users/login

router.route("/register").post(
    upload.fields([
        {
            name: "profilePhoto",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    )
export default router;