import { Router } from "express";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";
import {
  bookAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
  getDoctorAvailableSlots,
} from "../controllers/appointment.controller.js";

const router = Router();

router.use(verifyJWT);


router.route("/book").post(verifyRole(["patient"]), bookAppointment);
router.route("/patient").get(verifyRole(["patient"]), getPatientAppointments);

router.route("/doctor").get(verifyRole(["doctor"]), getDoctorAppointments);

router
  .route("/doctor/:doctorId/slots")
  .get(verifyRole(["patient"]), getDoctorAvailableSlots);

router
  .route("/:appointmentId/status")
  .patch(verifyRole(["patient", "doctor"]), updateAppointmentStatus);

export default router;
