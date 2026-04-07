import Appointment from "../models/appointment.model.js";
import { Doctor } from "../models/doctor.model.js";
import { createAndEmitNotification } from "../utils/notification.utils.js";

export function startAppointmentExpiryJob() {
  const intervalMs = Number(process.env.APPOINTMENT_EXPIRY_JOB_INTERVAL_MS || 60000);

  const tick = async () => {
    try {
      const now = new Date();

      const expired = await Appointment.find({
        status: "pending",
        expiresAt: { $lte: now },
      }).select("_id doctorId patientId");

      if (expired.length === 0) return;

      await Appointment.updateMany(
        { _id: { $in: expired.map((a) => a._id) } },
        { $set: { status: "rejected" }, $unset: { expiresAt: 1 } }
      );

      for (const a of expired) {
        // notify patient
        await createAndEmitNotification({
          userId: a.patientId,
          type: "appointment_update",
          message: "Your appointment request expired (no response) and was rejected",
          relatedAppointmentId: a._id,
        });

        // notify doctor user
        const doctor = await Doctor.findById(a.doctorId).select("userId");
        if (doctor?.userId) {
          await createAndEmitNotification({
            userId: doctor.userId,
            type: "appointment_update",
            message: "A pending appointment request expired",
            relatedAppointmentId: a._id,
          });
        }
      }
    } catch (e) {
      // keep job alive
      console.error("appointment expiry job error", e?.message || e);
    }
  };

  // start
  tick();
  setInterval(tick, intervalMs);
}

