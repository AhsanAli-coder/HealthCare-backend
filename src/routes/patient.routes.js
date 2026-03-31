import { Router } from "express";
import { getAllDoctors, getDoctorDetails } from "../controllers/patient.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"; 
import { verifyRole } from "../middlewares/auth.middleware.js"; 
const router = Router();
router.use(verifyJWT);

router.route("/browse").get(verifyRole(["patient"]), getAllDoctors);

// View specific doctor details (Public)
router.route("/doctor/:doctorId").get(verifyRole(["patient"]), getDoctorDetails);

export default router;