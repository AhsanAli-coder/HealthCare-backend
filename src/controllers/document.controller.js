import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Document from "../models/document.model.js";
import { cloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";



const uploadDocument = asyncHandler(async (req, res) => {
    const { title, category, description } = req.body;
    
  
    const ownerId = req.body.patientId || req.user._id; 

    if (!title || !category) {
        throw new ApiError(400, "Title and category are required");
    }
       console.log("pass one ")
    const fileLocalPath = req.files?.documentFile?.[0];
    if (!fileLocalPath) {
        throw new ApiError(400, "File is required");
    }
    console.log("pass two ")
    const uploadedFile = await uploadOnCloudinary(fileLocalPath.path);
    if (!uploadedFile?.secure_url) {
        throw new ApiError(500, "Error uploading file to Cloudinary");
    }
    console.log("pass three ");
    const fileType = uploadedFile.format === "pdf" ? "pdf" : "jpg"; // Simplified

    const document = await Document.create({
        ownerId,
        uploadedBy: req.user._id,
        title,
        fileUrl: uploadedFile.secure_url,
        cloudinaryPublicId: uploadedFile.public_id,
        cloudinaryResourceType: uploadedFile.resource_type,
        cloudinaryType: uploadedFile.type,
        cloudinaryFormat: uploadedFile.format,
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

const getDocumentSignedUrl = asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const { download } = req.query;

    const doc = await Document.findById(documentId);
    if (!doc) throw new ApiError(404, "Document not found");

    // Authorization:
    // - patient can access own docs
    // - doctor can access docs (same as your /documents/patient/:patientId behavior)
    // NOTE: if you later tie docs to appointments, tighten this to assigned-doctor only.
    if (req.user.role === "patient" && doc.ownerId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Access denied");
    }
    if (req.user.role === "doctor" && !req.params.patientId) {
        // allow doctor role generally for now (same trust model as existing endpoints)
    }

    if (!doc.cloudinaryPublicId || !doc.cloudinaryResourceType) {
        // fallback for older records
        return res.status(200).json(
            new ApiResponse(200, { url: doc.fileUrl }, "Document URL fetched")
        );
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 60; // 60s

    // Prefer private_download_url for private/authenticated assets (prevents 401)
    const format = doc.cloudinaryFormat || (doc.fileType === "pdf" ? "pdf" : undefined);
    if (!format) {
        throw new ApiError(400, "Document format missing for signed URL");
    }

    const url = cloudinary.utils.private_download_url(doc.cloudinaryPublicId, format, {
        resource_type: doc.cloudinaryResourceType,
        type: doc.cloudinaryType || "authenticated",
        expires_at: expiresAt,
        attachment: String(download) === "true"
    });

    return res.status(200).json(
        new ApiResponse(200, { url, expiresAt }, "Signed URL generated")
    );
});

export { uploadDocument, getPatientDocuments, getDocumentSignedUrl };