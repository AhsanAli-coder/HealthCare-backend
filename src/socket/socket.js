import { Server } from "socket.io";
import Message from "../models/message.model.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import Appointment from "../models/appointment.model.js";
import { Doctor } from "../models/doctor.model.js";
import { DateTime } from "luxon";
import Notification from "../models/notification.model.js";
import { setIO } from "./io.js";

async function isAuthorizedForAppointment({ appointmentId, user }) {
  const appointment = await Appointment.findById(appointmentId).select(
    "doctorId patientId status startAt"
  );
  if (!appointment) return { ok: false, reason: "Appointment not found" };

  // Chat only after confirmation (or completed)
  if (!["confirmed", "completed"].includes(appointment.status)) {
    return { ok: false, reason: "Chat is only available for confirmed appointments" };
  }

  // Chat ends 1 hour after appointment start time
  if (appointment.startAt) {
    const endWindow = DateTime.fromJSDate(appointment.startAt, { zone: "utc" }).plus({
      hours: 1,
    });
    if (DateTime.utc() > endWindow) {
      return { ok: false, reason: "Chat window has ended" };
    }
  }

  const userIdStr = String(user._id);
  const patientMatch = String(appointment.patientId) === userIdStr && user.role === "patient";

  let doctorMatch = false;
  if (user.role === "doctor") {
    const doctorProfile = await Doctor.findOne({ userId: user._id }).select("_id");
    if (doctorProfile) {
      doctorMatch = String(appointment.doctorId) === String(doctorProfile._id);
    }
  }

  if (!patientMatch && !doctorMatch) {
    return { ok: false, reason: "Not authorized for this appointment chat" };
  }

  return { ok: true, appointment };
}


export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
    },
  });

  // Make 'io' globally available so we can trigger notifications from our Express Controllers later!
  server.io = io;
  setIO(io);

  // Authenticate sockets with the same JWT as REST
  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      const tokenFromHeader = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null;
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        tokenFromHeader;

      if (!token) return next(new Error("Unauthorized: token missing"));

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded?._id).select("-password -refreshToken");
      if (!user) return next(new Error("Unauthorized: user not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Unauthorized: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🟢 User connected: ${socket.id} (${socket.user?.role})`);

    // --- NEW: Global Notification Room ---
    socket.on("join_notifications", (userId) => {
      // Only allow listening to own notifications
      if (String(userId) !== String(socket.user?._id)) return;
      socket.join(String(userId));
      console.log(`🔔 User ${userId} is now listening for notifications`);
    });

    // --- EXISTING: Chat Room Logic ---
    //by appointment the patietn and doctor will be in the same room and they can chat with each other
    socket.on("join_chat", async (appointmentId, ack) => {
      try {
        const result = await isAuthorizedForAppointment({
          appointmentId,
          user: socket.user,
        });
        if (!result.ok) {
          if (typeof ack === "function") ack({ ok: false, error: result.reason });
          return;
        }

        socket.join(String(appointmentId));
        if (typeof ack === "function") ack({ ok: true });
        console.log(`👥 User joined chat room: ${appointmentId}`);
      } catch (error) {
        if (typeof ack === "function") ack({ ok: false, error: "Failed to join chat" });
      }
    });

    socket.on("typing", async ({ appointmentId } = {}) => {
      const result = await isAuthorizedForAppointment({
        appointmentId,
        user: socket.user,
      });
      if (!result.ok) return;
      socket.to(String(appointmentId)).emit("typing", {
        appointmentId,
        userId: String(socket.user._id),
      });
    });

    socket.on("stop_typing", async ({ appointmentId } = {}) => {
      const result = await isAuthorizedForAppointment({
        appointmentId,
        user: socket.user,
      });
      if (!result.ok) return;
      socket.to(String(appointmentId)).emit("stop_typing", {
        appointmentId,
        userId: String(socket.user._id),
      });
    });

    //here the doctor and patient will send message to each other and the message will be saved in the database and then it will be emitted to the other user in the same room
    socket.on("send_message", async (data, ack) => {
      const { appointmentId, text } = data || {};
      try {
        const result = await isAuthorizedForAppointment({
          appointmentId,
          user: socket.user,
        });
        if (!result.ok) {
          if (typeof ack === "function") ack({ ok: false, error: result.reason });
          return;
        }
        if (!text || !String(text).trim()) {
          if (typeof ack === "function") ack({ ok: false, error: "Message text is required" });
          return;
        }

        //  here the send message of doctor and patient go there
        // broadcast the message of patient and doctor in a comon join room 
        const newMessage = await Message.create({
          appointmentId,
          senderId: socket.user._id,
          text: String(text).trim(),
        });
        const populated = await newMessage.populate("senderId", "name profilePhoto role");
        io.to(String(appointmentId)).emit("receive_message", populated);

        // Create + emit notification to the other participant
        try {
          const appointment = result.appointment;
          const senderIdStr = String(socket.user._id);

          let recipientUserId = null;
          if (String(appointment.patientId) === senderIdStr) {
            // sender is patient -> notify doctor user
            const doctorProfile = await Doctor.findById(appointment.doctorId).select("userId");
            if (doctorProfile?.userId) recipientUserId = doctorProfile.userId;
          } else {
            // sender is doctor -> notify patient
            recipientUserId = appointment.patientId;
          }

          if (recipientUserId) {
            const notification = await Notification.create({
              userId: recipientUserId,
              type: "new_message",
              message: "You have a new message",
              relatedAppointmentId: appointmentId,
            });
            io.to(String(recipientUserId)).emit("notification", notification);
          }
        } catch (_) {
          // don't fail message send if notification fails
        }

        if (typeof ack === "function") ack({ ok: true, message: populated });
      } catch (error) {
        console.error("❌ Error saving message:", error);
        if (typeof ack === "function") ack({ ok: false, error: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔴 User disconnected: ${socket.id}`);
    });
  });
};
