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

    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "completed", "cancelled"],
      default: "pending"
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

// prevent duplicate booking for same slot
appointmentSchema.index(
  { doctorId: 1, date: 1, startTime: 1 },
  { unique: true }
);
const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
