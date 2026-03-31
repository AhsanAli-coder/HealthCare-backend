import mongoose from "mongoose";

const { Schema } = mongoose;

const medicineSchema = new Schema({
  name: { type: String, required: true, trim: true },
  dosage: { type: String, required: true, trim: true }, 
  duration: { type: String, required: true, trim: true }, 
  instructions: { type: String, trim: true } 
});

const prescriptionSchema = new Schema(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true 
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

    pdfUrl: { type: String } 
  },
  { timestamps: true }
);

prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ patientId: 1, createdAt: -1 });

const Prescription = mongoose.model("Prescription", prescriptionSchema);

export default Prescription;