import { Router } from "express";
import { getAllDoctors, getDoctorDetails } from "../controllers/patient.controller.js";

const router = Router();

// Browse all doctors (Public)
router.route("/browse").get(getAllDoctors);

// View specific doctor details (Public)
router.route("/doctor/:doctorId").get(getDoctorDetails);

export default router;