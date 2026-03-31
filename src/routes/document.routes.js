import { Router } from "express";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { uploadDocument, getPatientDocuments } from "../controllers/document.controller.js";

const router = Router();
router.use(verifyJWT);

// Patients & Doctors can upload files (using Multer middleware)
router.route("/upload").post(upload.fields([
    {
      name: "profilePhoto",
      maxCount: 1,
    },
  ]), uploadDocument);

// Patients get their own, Doctors must provide the patient ID
router.route("/patient").get(verifyRole(["patient"]), getPatientDocuments);
router.route("/patient/:patientId").get(verifyRole(["doctor"]), getPatientDocuments);

export default router;