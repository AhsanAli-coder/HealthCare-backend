import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Doctor } from "../models/doctor.model.js";

/**
 * @description Browse and Filter Doctors (FR-003)
 * @route GET /api/v1/patients/browse
 */
const getAllDoctors = asyncHandler(async (req, res) => {
  const { specialization, minRating, minExperience, search, day } = req.query;

  // Initial Filter: Only show doctors approved by Admin
  let query = { isApproved: true };

  // 1. Filter by Specialization (e.g., "Cardiology")
  if (specialization) {
    query.specialization = { $regex: specialization, $options: "i" };
  }

  // 2. Filter by Rating (e.g., "4 stars and above")
  if (minRating) {
    query.averageRating = { $gte: Number(minRating) };
  }

  // 3. Filter by Experience (e.g., "At least 5 years")
  if (minExperience) {
    query.experience = { $gte: Number(minExperience) };
  }

  // 4. Filter by Availability Day (e.g., "Monday")
  // Since availability is an array of objects, Mongoose searches inside the array
  if (day) {
    query["availability.day"] = { $regex: day, $options: "i" };
  }

  // 5. General Search (Search in Bio or Specialization)
  if (search) {
    query.$or = [
      { specialization: { $regex: search, $options: "i" } },
      { bio: { $regex: search, $options: "i" } },
    ];
  }

  // Fetch doctors and "populate" details from the User model (Name, Email, Photo)
  const doctors = await Doctor.find(query)
    .populate("userId", "name profilePhoto email")
    .sort({ averageRating: -1 }); // High-rated doctors show up first

  return res
    .status(200)
    .json(new ApiResponse(200, doctors, "Doctors fetched successfully"));
});

/**
 * @description Get Details of a Single Doctor
 * @route GET /api/v1/patients/doctor/:doctorId
 */
const getDoctorDetails = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  const doctor = await Doctor.findById(doctorId).populate(
    "userId",
    "name profilePhoto email phone"
  );

  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, doctor, "Doctor details fetched successfully"));
});

export { getAllDoctors, getDoctorDetails };