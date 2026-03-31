import Notification from "../models/notification.model.js";
import { getIO } from "../socket/io.js";

export async function createAndEmitNotification({
  userId,
  type,
  message,
  relatedAppointmentId,
}) {
  const notification = await Notification.create({
    userId,
    type,
    message,
    relatedAppointmentId,
  });

  const io = getIO();
  if (io) {
    io.to(String(userId)).emit("notification", notification);
  }

  return notification;
}

