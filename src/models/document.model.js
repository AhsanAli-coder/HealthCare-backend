import mongoose from "mongoose";

const { Schema } = mongoose;

const documentSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User", // patient who owns the record
      required: true,
      index: true
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User", // doctor or patient
      required: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    fileUrl: {
      type: String,
      required: true
    }, // Cloudinary / AWS URL

    fileType: {
      type: String,
      enum: ["pdf", "jpg", "png", "jpeg"],
      required: true
    },

    category: {
      type: String,
      enum: ["lab-report", "medical-history", "instruction", "other"],
      default: "medical-history"
    },

    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// helpful index for faster queries
documentSchema.index({ ownerId: 1, createdAt: -1 });

const Document = mongoose.model("Document", documentSchema);

export default Document;