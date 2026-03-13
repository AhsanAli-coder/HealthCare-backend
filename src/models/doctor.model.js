import mongoose from "mongoose";

const { Schema } = mongoose;

const doctorSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    specialization: {
      type: String,
      required: true,
      trim: true
    },

    experience: {
      type: Number,
      required: true,
      min: 0
    },

    consultationFee: {
      type: Number,
      required: true,
      min: 0
    },

    bio: {
      type: String,
      trim: true
    },

    averageRating: {
      type: Number,
      default: 0
    },

    totalReviews: {
      type: Number,
      default: 0
    },

    isApproved: {
      type: Boolean,
      default: false
    },

    availability: [
      {
        day: {
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
        }
      }
      
    ]
  },
  {
    timestamps: true
  }
);

const Doctor = mongoose.model("Doctor", doctorSchema);

export { Doctor } ;