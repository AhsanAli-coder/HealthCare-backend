import { Router } from "express";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";
import {
    bookAppointment,
    getPatientAppointments,
    getDoctorAppointments,
    updateAppointmentStatus
} from "../controllers/appointment.controller.js";

const router = Router();

// All appointment routes require authentication
router.use(verifyJWT);

// Patient Routes
router.route("/book").post(verifyRole(["patient"]), bookAppointment);
router.route("/patient").get(verifyRole(["patient"]), getPatientAppointments);

// Doctor Routes
router.route("/doctor").get(verifyRole(["doctor"]), getDoctorAppointments);

// Shared Route (Both Patients and Doctors update status, but controller handles the rules)
router.route("/:appointmentId/status").patch(verifyRole(["patient", "doctor"]), updateAppointmentStatus);

export default router;