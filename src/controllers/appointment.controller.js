import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Appointment from "../models/appointment.model.js";
import { Doctor } from "../models/doctor.model.js";
import { User } from "../models/user.model.js";

const bookAppointment = asyncHandler(async (req, res) => {
    const { doctorId, date, startTime, endTime } = req.body;
    const patientId = req.user._id;

    if (!doctorId || !date || !startTime || !endTime) {
        throw new ApiError(400, "All fields (doctorId, date, startTime, endTime) are required");
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.isApproved) {
        throw new ApiError(404, "Doctor not found or not approved for bookings");
    }

   
    const existingAppointment = await Appointment.findOne({
        doctorId,
        date,
        startTime,
        status: { $in: ["pending", "confirmed"] }
    });

    if (existingAppointment) {
        throw new ApiError(409, "This time slot is already booked. Please choose another time.");
    }

    const appointment = await Appointment.create({
        doctorId,
        patientId,
        date,
        startTime,
        endTime,
        status: "pending", 
        paymentStatus: "pending"
    });

    return res.status(201).json(
        new ApiResponse(201, appointment, "Appointment booked successfully. Waiting for doctor's approval.")
    );
});


const getPatientAppointments = asyncHandler(async (req, res) => {


    if (!req.user || !req.user._id) {
        throw new ApiError(401, "Unauthorized: User information is missing from the request.");
    }

    const rawAppointments = await Appointment.find({ patientId: req.user._id });
    console.log(`3. Found ${rawAppointments.length} raw appointments for this patient in the DB.`);

    const appointments = await Appointment.find({ patientId: req.user._id })
        .populate({
            path: "doctorId",
            populate: { path: "userId", select: "name profilePhoto email phone" }
        })
        .sort({ date: 1, startTime: 1 });

    console.log("4. Successfully populated appointments!");
    
    return res.status(200).json(
        new ApiResponse(200, appointments, "Patient appointments fetched successfully")
    );
});

const getDoctorAppointments = asyncHandler(async (req, res) => {
    // First, find the doctor profile associated with the logged-in user
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    
    if (!doctorProfile) {
        throw new ApiError(404, "Doctor profile not found");
    }

    const appointments = await Appointment.find({ doctorId: doctorProfile._id })
        .populate("patientId", "name profilePhoto email phone")
        .sort({ date: 1, startTime: 1 });

    return res.status(200).json(
        new ApiResponse(200, appointments, "Doctor appointments fetched successfully")
    );
});


const updateAppointmentStatus = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const { status } = req.body; // Expecting: "confirmed", "rejected", "cancelled", "completed"

    const validStatuses = ["confirmed", "rejected", "cancelled", "completed"];
    if (!validStatuses.includes(status)) {
        throw new ApiError(400, "Invalid status update");
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        throw new ApiError(404, "Appointment not found");
    }

    // Role-based authorization checks
    const isPatient = req.user.role === "patient" && appointment.patientId.toString() === req.user._id.toString();
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    const isDoctor = req.user.role === "doctor" && doctorProfile && appointment.doctorId.toString() === doctorProfile._id.toString();

    if (!isPatient && !isDoctor) {
        throw new ApiError(403, "You are not authorized to update this appointment");
    }

    if (isPatient && status !== "cancelled") {
        throw new ApiError(403, "Patients can only cancel appointments.");
    }
    if (isDoctor && status === "cancelled") {
        throw new ApiError(403, "Doctors must use 'rejected' instead of 'cancelled'.");
    }

    appointment.status = status;
    await appointment.save();
    return res.status(200).json(
        new ApiResponse(200, appointment, `Appointment status updated to ${status}`)
    );
});

export {
    bookAppointment,
    getPatientAppointments,
    getDoctorAppointments,
    updateAppointmentStatus
};