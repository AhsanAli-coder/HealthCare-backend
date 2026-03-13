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
app.listen(process.env.PORT, () => {
  console.log(`server is running for health  at port ${process.env.PORT}`);
});

//routes import
import userRoutes from "./routes/user.routes.js";
import doctorRoutes from "./routes/doctor.routes.js"; // Add this line
//routes declaration
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/doctors", doctorRoutes); // Add this line
//localhost:8000/users/
export { app };
