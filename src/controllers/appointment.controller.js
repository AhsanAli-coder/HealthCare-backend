import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Appointment from "../models/appointment.model.js";
import { Doctor } from "../models/doctor.model.js";
import { parseDateTimeFromClient, assertValidTimeRange } from "../utils/time.utils.js";
import { DateTime } from "luxon";
import {
    filterSlotsByOverlaps,
    generateSlotsForDay,
    getDayKeyForDate,
    normalizeAvailabilityDay
} from "../utils/slots.utils.js";
import { createAndEmitNotification } from "../utils/notification.utils.js";

const bookAppointment = asyncHandler(async (req, res) => {
    const { doctorId, date, startTime, endTime, startAt, endAt } = req.body;
    const patientId = req.user._id;

    if (!doctorId) {
        throw new ApiError(400, "doctorId is required");
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.isApproved) {
        throw new ApiError(404, "Doctor not found or not approved for bookings");
    }

    const { startAtUtc, endAtUtc } = parseDateTimeFromClient({
        date,
        startTime,
        endTime,
        startAt,
        endAt,
        timezone: req.user?.timezone
    });
    assertValidTimeRange(startAtUtc, endAtUtc);

    if (startAtUtc.getTime() < Date.now()) {
        throw new ApiError(400, "Cannot book an appointment in the past");
    }

    const overlapping = await Appointment.findOne({
        doctorId,
        status: { $in: ["pending", "confirmed"] },
        startAt: { $lt: endAtUtc },
        endAt: { $gt: startAtUtc }
    });

    if (overlapping) {
        throw new ApiError(409, "This time range overlaps an existing booking. Please choose another slot.");
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
        startAt: startAtUtc,
        endAt: endAtUtc,
        status: "pending", 
        paymentStatus: "pending"
    });

    // Notify doctor about new booking request
    if (doctor?.userId) {
        await createAndEmitNotification({
            userId: doctor.userId,
            type: "appointment_update",
            message: "New appointment request received",
            relatedAppointmentId: appointment._id
        });
    }

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
        .sort({ startAt: 1 });

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
        .sort({ startAt: 1 });

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

    // Basic transition guards (applies to both roles)
    if (["completed", "cancelled", "rejected"].includes(appointment.status)) {
        throw new ApiError(400, `Cannot update a ${appointment.status} appointment`);
    }

    if (isPatient) {
        if (status !== "cancelled") {
            throw new ApiError(403, "Patients can only cancel appointments.");
        }

        // Cancellation policy:
        // - Always allow cancel while pending (not yet confirmed)
        // - If confirmed, only allow if >= 24 hours before startAt
        if (appointment.status === "pending") {
            // ok
        } else if (appointment.status === "confirmed") {
            if (!appointment.startAt) {
                throw new ApiError(400, "Cannot evaluate cancellation window for this appointment");
            }
            const hoursLeft = DateTime.fromJSDate(appointment.startAt, { zone: "utc" })
                .diff(DateTime.utc(), "hours").hours;
            if (hoursLeft < 24) {
                throw new ApiError(400, "You can only cancel a confirmed appointment at least 24 hours before start time");
            }
        }
    }

    if (isDoctor) {
        if (status === "cancelled") {
            throw new ApiError(403, "Doctors must use 'rejected' instead of 'cancelled'.");
        }

        // Doctor actions should be meaningful based on current state
        if (status === "confirmed" && appointment.status !== "pending") {
            throw new ApiError(400, "Only pending appointments can be confirmed");
        }
        if (status === "rejected" && appointment.status !== "pending") {
            throw new ApiError(400, "Only pending appointments can be rejected");
        }
        if (status === "completed" && appointment.status !== "confirmed") {
            throw new ApiError(400, "Only confirmed appointments can be completed");
        }
    }

    appointment.status = status;
    await appointment.save();

    // Notify the other side about status change
    if (status === "confirmed" || status === "rejected") {
        await createAndEmitNotification({
            userId: appointment.patientId,
            type: "appointment_update",
            message: `Your appointment was ${status}`,
            relatedAppointmentId: appointment._id
        });
    }

    if (status === "cancelled") {
        const doctorProfileForNotify = await Doctor.findById(appointment.doctorId).select("userId");
        if (doctorProfileForNotify?.userId) {
            await createAndEmitNotification({
                userId: doctorProfileForNotify.userId,
                type: "appointment_update",
                message: "An appointment was cancelled by the patient",
                relatedAppointmentId: appointment._id
            });
        }
    }

    return res.status(200).json(
        new ApiResponse(200, appointment, `Appointment status updated to ${status}`)
    );
});

const getDoctorAvailableSlots = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;
    const { date, tz, slotMinutes, bufferMinutes } = req.query;

    if (!doctorId) throw new ApiError(400, "doctorId is required");
    if (!date) throw new ApiError(400, "date is required (YYYY-MM-DD)");

    const timezone = tz || req.user?.timezone || "UTC";
    const dayKey = getDayKeyForDate({ date, timezone });
    if (!dayKey) throw new ApiError(400, "Invalid date format. Expected YYYY-MM-DD");

    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.isApproved) {
        throw new ApiError(404, "Doctor not found or not approved");
    }

    const availabilityForDay = (doctor.availability || []).filter((a) => {
        const normalized = normalizeAvailabilityDay(a.day);
        return normalized === dayKey;
    });

    const allSlots = generateSlotsForDay({
        date,
        timezone,
        availabilityForDay,
        slotMinutes: slotMinutes ?? 30,
        bufferMinutes: bufferMinutes ?? 0
    });

    // Past slot filtering
    const nowUtc = DateTime.utc();
    const futureSlots = allSlots.filter((s) => DateTime.fromISO(s.startAtUtc, { zone: "utc" }) > nowUtc);

    // Fetch doctor's existing appointments for that UTC day range
    const dayStartUtc = DateTime.fromFormat(date, "yyyy-MM-dd", { zone: timezone }).startOf("day").toUTC();
    const dayEndUtc = dayStartUtc.plus({ days: 1 });

    const existing = await Appointment.find({
        doctorId,
        status: { $in: ["pending", "confirmed"] },
        startAt: { $lt: dayEndUtc.toJSDate() },
        endAt: { $gt: dayStartUtc.toJSDate() }
    }).select("startAt endAt");

    const availableSlots = filterSlotsByOverlaps(futureSlots, existing);

    return res.status(200).json(
        new ApiResponse(
            200,
            { doctorId, date, timezone, dayKey, slotMinutes: Number(slotMinutes ?? 30), bufferMinutes: Number(bufferMinutes ?? 0), slots: availableSlots },
            "Available slots fetched successfully"
        )
    );
});

export {
    bookAppointment,
    getPatientAppointments,
    getDoctorAppointments,
    updateAppointmentStatus,
    getDoctorAvailableSlots
};