import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Review from "../models/review.model.js";
import Appointment from "../models/appointment.model.js";
import { Doctor } from "../models/doctor.model.js";
import mongoose from "mongoose"; 

const createReview = asyncHandler(async (req, res) => {

    const { appointmentId } = req.params;
    const { rating, comment } = req.body;
    const patientId = req.user._id;


    if (!rating || rating < 1 || rating > 5) {
        throw new ApiError(400, "Please provide a valid rating between 1 and 5");
    }

 
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
        console.log("--- ERROR: Appointment not found! ---");
        throw new ApiError(404, "Appointment not found");
    }
    if (appointment.status !== "completed") {
        console.log("--- ERROR: Appointment is not completed yet! ---");
        throw new ApiError(400, "You can only review completed appointments. Current status is: " + appointment.status);
    }

    try {
        const review = await Review.create({
            appointmentId,
            doctorId: appointment.doctorId,
            patientId,
            rating,
            comment
        });

        const stats = await Review.aggregate([
            { $match: { doctorId: new mongoose.Types.ObjectId(appointment.doctorId) } },
            { 
                $group: { 
                    _id: "$doctorId", 
                    averageRating: { $avg: "$rating" }, 
                    totalReviews: { $sum: 1 } 
                } 
            }
        ]);

        if (stats.length > 0) {
            await Doctor.findByIdAndUpdate(appointment.doctorId, {
                averageRating: Math.round(stats[0].averageRating * 10) / 10,
                totalReviews: stats[0].totalReviews
            });
        }

        return res.status(201).json(
            new ApiResponse(201, review, "Review submitted successfully")
        );

    } catch (error) {
        console.log("--- ERROR CAUGHT IN CATCH BLOCK ---", error);
        if (error.code === 11000) {
            throw new ApiError(400, "You have already reviewed this appointment");
        }
        throw error;
    }
});




const getDoctorReviews = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;

    if (req.user.role === "doctor") {
        const doctor = await Doctor.findOne({ userId: req.user._id });
        if (!doctor || String(doctor._id) !== String(doctorId)) {
            throw new ApiError(403, "You can only view your own reviews");
        }
    }

    const reviews = await Review.find({ doctorId })
        .populate("patientId", "name profilePhoto") 
        .sort({ createdAt: -1 }); 

    return res.status(200).json(
        new ApiResponse(200, reviews, "Reviews fetched successfully")
    );
});

export { createReview, getDoctorReviews };