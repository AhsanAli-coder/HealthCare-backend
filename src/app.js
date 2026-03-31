import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.get("/", (req, res) => {
  res.send("hallo health backend");
});
// app.listen(process.env.PORT, () => {
//   console.log(`server is running for health  at port ${process.env.PORT}`);
// });

//routes import
import userRoutes from "./routes/user.routes.js";
import doctorRoutes from "./routes/doctor.routes.js"; 
import patientRoutes from "./routes/patient.routes.js";   
import appointmentRoutes from "./routes/appointment.roures.js";
import prescriptionRoutes from "./routes/prescription.routes.js";
import documentRoutes from "./routes/document.routes.js";     
import reviewRoutes from "./routes/review.routes.js";  
import messageRoutes from "./routes/message.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import adminRoutes from "./routes/admin.routes.js";
//routes declaration
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/doctors", doctorRoutes); 

app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/prescriptions", prescriptionRoutes); 
app.use("/api/v1/documents", documentRoutes); 
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/admin", adminRoutes);


export { app };
