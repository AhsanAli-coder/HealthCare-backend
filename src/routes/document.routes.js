import { Router } from "express";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { uploadDocument, getPatientDocuments, getDocumentSignedUrl } from "../controllers/document.controller.js";

const router = Router();
router.use(verifyJWT);

// Patients & Doctors can upload files (using Multer middleware)
router.route("/upload").post(
  verifyRole(["patient", "doctor"]),
  upload.fields([
    {
      name: "documentFile",
      maxCount: 1,
    },
  ]),
  uploadDocument
);

// Patients get their own, Doctors must provide the patient ID
router.route("/patient").get(verifyRole(["patient"]), getPatientDocuments);
router.route("/patient/:patientId").get(verifyRole(["doctor"]), getPatientDocuments);

// Open/download via short-lived signed URL (patient or doctor only)
router
  .route("/:documentId/signed-url")
  .get(verifyRole(["patient", "doctor"]), getDocumentSignedUrl);

export default router;