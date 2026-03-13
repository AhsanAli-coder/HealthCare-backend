import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyRole } from "../middlewares/auth.middleware.js";
import { 
    updateDoctorProfile, 
    updateAvailability 
} from "../controllers/doctor.controller.js";

const router = Router();

// All routes here require the user to be logged in
router.use(verifyJWT); 

// Route: PATCH /api/v1/doctors/update-profile
router.route("/update-profile").patch(verifyJWT,verifyRole(["doctor"]),updateDoctorProfile);

// Route: PATCH /api/v1/doctors/availability
router.route("/availability").patch(verifyJWT,verifyRole(["doctor"]),updateAvailability);

export default router;