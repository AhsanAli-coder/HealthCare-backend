import { Server } from "socket.io";
import Message from "../models/message.model.js";

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
    },
  });

  // Make 'io' globally available so we can trigger notifications from our Express Controllers later!
  server.io = io;

  io.on("connection", (socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    // --- NEW: Global Notification Room ---
    socket.on("join_notifications", (userId) => {
      socket.join(userId);
      console.log(`🔔 User ${userId} is now listening for notifications`);
    });

    // --- EXISTING: Chat Room Logic ---
    //by appointment the patietn and doctor will be in the same room and they can chat with each other
    socket.on("join_chat", (appointmentId) => {
      socket.join(appointmentId);
      console.log(`👥 User joined chat room: ${appointmentId}`);
    });
    //here the doctor and patient will send message to each other and the message will be saved in the database and then it will be emitted to the other user in the same room
    socket.on("send_message", async (data) => {
      const { appointmentId, senderId, text } = data;
      try {
        //  here the send message of doctor and patient go there
        // broadcast the message of patient and doctor in a comon join room 
        const newMessage = await Message.create({
          appointmentId,
          senderId,
          text,
        });
        io.to(appointmentId).emit("receive_message", newMessage);
      } catch (error) {
        console.error("❌ Error saving message:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔴 User disconnected: ${socket.id}`);
    });
  });
};
