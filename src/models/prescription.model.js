import mongoose from "mongoose";

const { Schema } = mongoose;

const medicineSchema = new Schema({
  name: { type: String, required: true, trim: true },
  dosage: { type: String, required: true, trim: true }, // e.g., "1-0-1" or "500mg"
  duration: { type: String, required: true, trim: true }, // e.g., "5 days"
  instructions: { type: String, trim: true } // e.g., "After meals"
});

const prescriptionSchema = new Schema(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true // one prescription per appointment
    },

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

    diagnosis: {
      type: String,
      required: true,
      trim: true
    },

    medicines: [medicineSchema],

    advice: {
      type: String,
      trim: true
    },

    pdfUrl: { type: String } // Optional link to PDF
  },
  { timestamps: true }
);

// Helpful indexes
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ patientId: 1, createdAt: -1 });

const Prescription = mongoose.model("Prescription", prescriptionSchema);

export default Prescription;