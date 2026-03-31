import { Router } from "express";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";
import { createPrescription, getPrescription } from "../controllers/prescription.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/:appointmentId").post(verifyRole(["doctor"]), createPrescription);

router.route("/:appointmentId").get(verifyRole(["doctor", "patient"]), getPrescription);

export default router;