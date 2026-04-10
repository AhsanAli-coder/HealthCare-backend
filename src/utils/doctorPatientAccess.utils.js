import mongoose from "mongoose";
import { Doctor } from "../models/doctor.model.js";
import Appointment from "../models/appointment.model.js";
import { User } from "../models/user.model.js";

/**
 * True if there is at least one appointment linking this doctor user and patient.
 */
export async function doctorHasAppointmentWithPatient(doctorUserId, patientId) {
  if (!doctorUserId || !patientId) return false;
  const pid =
    typeof patientId === "string"
      ? new mongoose.Types.ObjectId(patientId)
      : patientId;

  const doctorProfile = await Doctor.findOne({ userId: doctorUserId }).select(
    "_id"
  );
  if (!doctorProfile) return false;

  const exists = await Appointment.exists({
    doctorId: doctorProfile._id,
    patientId: pid,
  });
  return !!exists;
}

export async function assertDoctorCanAccessPatient(doctorUserId, patientId) {
  const ok = await doctorHasAppointmentWithPatient(doctorUserId, patientId);
  if (!ok) {
    return { ok: false, code: 403, message: "You are not allowed to access this patient" };
  }
  return { ok: true };
}

export async function assertPatientUserExists(patientId) {
  if (!mongoose.Types.ObjectId.isValid(String(patientId))) {
    return { ok: false, code: 404, message: "Patient not found" };
  }
  const user = await User.findById(patientId).select("role");
  if (!user || user.role !== "patient") {
    return { ok: false, code: 404, message: "Patient not found" };
  }
  return { ok: true, user };
}
