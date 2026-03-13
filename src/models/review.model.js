import mongoose from "mongoose";

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      unique: true, // One review per appointment
      required: true,
      index: true
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

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },

    comment: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

// Optional: index for fast lookup of all reviews for a doctor
reviewSchema.index({ doctorId: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);

export default Review;