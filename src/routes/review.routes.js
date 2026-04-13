import { Router } from "express";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";
import { createReview, getDoctorReviews } from "../controllers/review.controller.js";

const router = Router();


router
  .route("/doctor/:doctorId")
  .get(verifyJWT, verifyRole(["patient", "doctor"]), getDoctorReviews);
router.route("/:appointmentId").post(verifyJWT,verifyRole(["patient"]), createReview);

export default router;