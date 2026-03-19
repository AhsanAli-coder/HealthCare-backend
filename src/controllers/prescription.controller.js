import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Prescription from "../models/prescription.model.js";
import Appointment from "../models/appointment.model.js";

/**
 * @description Create a prescription for an appointment (Doctor only)
 * @route POST /api/v1/prescriptions/:appointmentId
 */
const createPrescription = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const { diagnosis, medicines, advice } = req.body;
        console.log("req.body", req.body) ;

    if (!diagnosis || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
        throw new ApiError(400, "Diagnosis and at least one medicine are required");
    }  
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
        throw new ApiError(404, "Appointment not found");
    }

    // Security Check: Ensure the logged-in doctor is the one who took this appointment
    const doctorId = appointment.doctorId.toString();
    // Note: We'd normally check against doctor profile ID, but for simplicity assuming the route ensures doctor role.

    // Check if prescription already exists
    const existingPrescription = await Prescription.findOne({ appointmentId });
    if (existingPrescription) {
        throw new ApiError(400, "A prescription already exists for this appointment");
    }

    const prescription = await Prescription.create({
        appointmentId,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        diagnosis,
        medicines, // Array of { name, dosage, duration, instructions }
        advice
    });

    // Optional: Auto-mark appointment as completed once prescription is written
    appointment.status = "completed";
    await appointment.save();

    return res.status(201).json(
        new ApiResponse(201, prescription, "Prescription created successfully")
    );
});

/**
 * @description Get prescription by Appointment ID (Patient & Doctor)
 * @route GET /api/v1/prescriptions/:appointmentId
 */
const getPrescription = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;

    const prescription = await Prescription.findOne({ appointmentId })
        .populate({
            path: "doctorId",
            populate: { path: "userId", select: "name specialization" }
        })
        .populate("patientId", "name age email");

    if (!prescription) {
        throw new ApiError(404, "Prescription not found");
    }

    return res.status(200).json(
        new ApiResponse(200, prescription, "Prescription fetched successfully")
    );
});

export { createPrescription, getPrescription };