import { Router } from "express";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";
import { createPrescription, getPrescription } from "../controllers/prescription.controller.js";

const router = Router();
router.use(verifyJWT);

// Doctor only: Create a prescription
router.route("/:appointmentId").post(verifyRole(["doctor"]), createPrescription);

// Both can view the prescription
router.route("/:appointmentId").get(verifyRole(["doctor", "patient"]), getPrescription);

export default router;