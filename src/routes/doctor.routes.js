import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyRole } from "../middlewares/auth.middleware.js";
import { 
    updateDoctorProfile, 
    updateAvailability,
    getMyProfile
} from "../controllers/doctor.controller.js";

const router = Router();




router.route("/me").get(verifyJWT,verifyRole(["doctor"]),getMyProfile);
router.route("/update-profile").patch(verifyJWT,verifyRole(["doctor"]),updateDoctorProfile);

router.route("/availability").patch(verifyJWT,verifyRole(["doctor"]),updateAvailability);

export default router;