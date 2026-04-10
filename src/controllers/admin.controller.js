import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Doctor } from "../models/doctor.model.js";
import Appointment from "../models/appointment.model.js";

const getDashboardKPIs = asyncHandler(async (req, res) => {
  const [totalUsers, totalPatients, totalDoctors, totalAppointments] =
    await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "patient" }),
      User.countDocuments({ role: "doctor" }),
      Appointment.countDocuments({}),
    ]);

  const topRatedDoctors = await Doctor.find({ isApproved: true })
    .populate("userId", "name profilePhoto email")
    .sort({ averageRating: -1, totalReviews: -1 })
    .limit(5);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalUsers,
        totalPatients,
        totalDoctors,
        totalAppointments,
        topRatedDoctors,
      },
      "Admin dashboard KPIs fetched"
    )
  );
});

const listPendingDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({ isApproved: false })
    .populate("userId", "name email phone profilePhoto status createdAt")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, doctors, "Pending doctors fetched"));
});

const approveDoctor = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw new ApiError(404, "Doctor not found");

  doctor.isApproved = true;
  await doctor.save();

  await User.findByIdAndUpdate(doctor.userId, { $set: { status: "active" } });

  return res
    .status(200)
    .json(new ApiResponse(200, doctor, "Doctor approved successfully"));
});

const suspendUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { status: "suspended" } },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) throw new ApiError(404, "User not found");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User suspended successfully"));
});

const activateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { status: "active" } },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) throw new ApiError(404, "User not found");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User activated successfully"));
});

/** List patients/doctors for admin moderation (FR-009). */
const listUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const filter = { role: { $in: ["patient", "doctor"] } };
  if (role === "patient" || role === "doctor") {
    filter.role = role;
  }

  const users = await User.find(filter)
    .select("-password -refreshToken")
    .sort({ createdAt: -1 })
    .limit(500);

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
});

export {
  getDashboardKPIs,
  listPendingDoctors,
  approveDoctor,
  suspendUser,
  activateUser,
  listUsers,
};

