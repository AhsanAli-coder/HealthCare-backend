import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Doctor } from "../models/doctor.model.js";

// 1. Update Profile (Experience, Bio, Fees)
const updateDoctorProfile = asyncHandler(async (req, res) => {
    const { specialization, experience, consultationFee, bio } = req.body ;
          console.log("req.body", req.body) ;
    // Validation: Only update what is provided
    const updateData = {};
    if (specialization) updateData.specialization = specialization;
    if (experience) updateData.experience = experience;
    if (consultationFee) updateData.consultationFee = consultationFee;
    if (bio) updateData.bio = bio;

    const doctor = await Doctor.findOneAndUpdate(
        { userId: req.user._id }, // Find the profile linked to the logged-in user
        { $set: updateData },
        { new: true }
    );

    if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
    }

    return res.status(200).json(
        new ApiResponse(200, doctor, "Doctor profile updated successfully")
    );
});

// 2. Set Availability Slots
const updateAvailability = asyncHandler(async (req, res) => {
    const { availability } = req.body; // Expecting an array of objects [{day, startTime, endTime}]

    if (!Array.isArray(availability)) {
        throw new ApiError(400, "Availability must be an array");
    }

    const doctor = await Doctor.findOneAndUpdate(
        { userId: req.user._id },
        { $set: { availability } },
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(200, doctor, "Availability updated successfully")
    );
});

export { updateDoctorProfile, updateAvailability };