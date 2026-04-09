import mongoose from "mongoose";
const { Schema } = mongoose;
const appointmentSchema = new Schema(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true
    },

    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    date: {
      type: String,
      required: true
    },

    startTime: {
      type: String,
      required: true
    },

    endTime: {
      type: String,
      required: true
    },

    // Canonical appointment time in UTC. Prefer these fields for all logic.
    startAt: {
      type: Date,
      required: true,
      index: true
    },

    endAt: {
      type: Date,
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "completed", "cancelled", "no_show"],
      default: "pending"
    },

    // Doctor must accept/reject within timeframe
    expiresAt: {
      type: Date,
      index: true
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },

    chatRoomId: {
      type: String,
      index: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// prevent the duplicate booking for same slot
// appointmentSchema.index(
//   { doctorId: 1, date: 1, startTime: 1 },
//   { unique: true }
// );

// Fast overlap queries per doctor and time range
appointmentSchema.index({ doctorId: 1, startAt: 1, endAt: 1 });
appointmentSchema.index({ status: 1, expiresAt: 1 });

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
