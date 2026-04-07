import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import http from "http"; // Import native Node http module
import { initializeSocket } from "./socket/socket.js";
import { startAppointmentExpiryJob } from "./jobs/appointmentExpiry.job.js";

dotenv.config({
  path: "./env",
});
const server = http.createServer(app);
initializeSocket(server);
connectDB()
  .then(() => {
    // app.listen(process.env.PORT || 8000, () => {
    //   console.log(`⚙️   Server is running at port : ${process.env.PORT}`);
    //   console.log(`🔌 Socket.IO is active and listening for connections`);
    // });
    const port = Number(process.env.PORT || 9000);
    server.listen(port, () => {
      console.log(`⚙️   Server is running at port : ${port}`);
      console.log(`🔌 Socket.IO is active and listening for connections`);
    });
    startAppointmentExpiryJob();
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });

