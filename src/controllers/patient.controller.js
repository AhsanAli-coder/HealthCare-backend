import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Doctor } from "../models/doctor.model.js";

//browse all doctors with filters and search FR 003
const getAllDoctors = asyncHandler(async (req, res) => {
  const { specialization, minRating, minExperience, search, day } = req.query;

  let query = { isApproved: true };

  if (specialization) {
    query.specialization = { $regex: specialization, $options: "i" };
  }

  if (minRating) {
    query.averageRating = { $gte: Number(minRating) };
  }

  if (minExperience) {
    query.experience = { $gte: Number(minExperience) };
  }


  if (day) {
    query["availability.day"] = { $regex: day, $options: "i" };
  }

  if (search) {
    query.$or = [
      { specialization: { $regex: search, $options: "i" } },
      { bio: { $regex: search, $options: "i" } },
    ];
  }

  const doctors = await Doctor.find(query)
    .populate("userId", "name profilePhoto email")
    .sort({ averageRating: -1 }); // High-rated doctors show up first

  return res
    .status(200)
    .json(new ApiResponse(200, doctors, "Doctors fetched successfully"));
});
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