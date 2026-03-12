import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
  },
  start: {
    type: String,
    required: true,
  },
  end: {
    type: String,
    required: true,
  },
});

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  specialization: {
    type: String,
    required: true,
  },
  experience: {
    type: Number,
    required: true,
  },
  consultationFee: {
    type: Number,
    required: true,
  },
  bio: {
    type: String,
  },
  rating: {
    type: Number,
    default: 0,
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  availability: [availabilitySchema],
});

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;
