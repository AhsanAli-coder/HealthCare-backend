import mongoose from "mongoose";

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true
    },

    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    text: {
      type: String,
      required: true,
      trim: true
    },

    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// index for faster chat loading
messageSchema.index({ appointmentId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;