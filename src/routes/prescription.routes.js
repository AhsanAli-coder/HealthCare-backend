import { Router } from "express";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";
import {
  createPrescription,
  getPrescription,
  getPrescriptionSignedPdfUrl,
} from "../controllers/prescription.controller.js";

const router = Router();
router.use(verifyJWT);

// Must be before /:appointmentId so "signed-pdf-url" is not parsed as appointmentId
router
  .route("/:appointmentId/signed-pdf-url")
  .get(verifyRole(["doctor", "patient"]), getPrescriptionSignedPdfUrl);

router.route("/:appointmentId").post(verifyRole(["doctor"]), createPrescription);

router.route("/:appointmentId").get(verifyRole(["doctor", "patient"]), getPrescription);

export default router;