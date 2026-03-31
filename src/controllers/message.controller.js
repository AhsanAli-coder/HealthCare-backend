import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Message from "../models/message.model.js";
import Appointment from "../models/appointment.model.js";
import { Doctor } from "../models/doctor.model.js";

/**
 * @description Get all messages for a specific appointment
 * @route GET /api/v1/messages/:appointmentId
 */
const getChatHistory = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const userId = req.user._id;

    // 1. Verify the appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        throw new ApiError(404, "Appointment not found");
    }

    // 2. SECURITY CHECK: Is this user actually part of this appointment?
    let isAuthorized = false;

    if (req.user.role === "patient" && appointment.patientId.toString() === userId.toString()) {
        isAuthorized = true; // It's the assigned patient
    } else if (req.user.role === "doctor") {
        const doctorProfile = await Doctor.findOne({ userId });
        if (doctorProfile && appointment.doctorId.toString() === doctorProfile._id.toString()) {
            isAuthorized = true; // It's the assigned doctor
        }
    }

    if (!isAuthorized) {
        throw new ApiError(403, "Access denied. You are not authorized to view this chat room.");
    }

    // 3. RULE CHECK: Chat is only available after confirmation
    if (!["confirmed", "completed"].includes(appointment.status)) {
        throw new ApiError(400, "Chat is only available for confirmed appointments.");
    }

    // 4. Fetch the chat history, sorted oldest to newest (top to bottom reading)
    const messages = await Message.find({ appointmentId })
        .populate("senderId", "name profilePhoto role")
        .sort({ createdAt: 1 }); 

    return res.status(200).json(
        new ApiResponse(200, messages, "Chat history fetched successfully")
    );
});

export { getChatHistory };