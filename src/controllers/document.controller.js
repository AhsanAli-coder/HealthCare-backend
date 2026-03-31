import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Document from "../models/document.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const uploadDocument = asyncHandler(async (req, res) => {
    const { title, category, description } = req.body;
    
  
    const ownerId = req.body.patientId || req.user._id; 

    if (!title || !category) {
        throw new ApiError(400, "Title and category are required");
    }

    const fileLocalPath = req.file?.path;
    if (!fileLocalPath) {
        throw new ApiError(400, "File is required");
    }

    const uploadedFile = await uploadOnCloudinary(fileLocalPath);
    if (!uploadedFile?.url) {
        throw new ApiError(500, "Error uploading file to Cloudinary");
    }

    const fileType = uploadedFile.format === "pdf" ? "pdf" : "jpg"; // Simplified

    const document = await Document.create({
        ownerId,
        uploadedBy: req.user._id,
        title,
        fileUrl: uploadedFile.url,
        fileType,
        category,
        description
    });

    return res.status(201).json(
        new ApiResponse(201, document, "Document uploaded successfully")
    );
});

const getPatientDocuments = asyncHandler(async (req, res) => {
    // Patients fetch their own, Doctors fetch the specific patient's ID
    const targetPatientId = req.user.role === "patient" ? req.user._id : req.params.patientId;

    const documents = await Document.find({ ownerId: targetPatientId })
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, documents, "Documents fetched successfully")
    );
});

export { uploadDocument, getPatientDocuments };