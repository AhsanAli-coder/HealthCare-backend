import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Document from "../models/document.model.js";
import { cloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import {
  assertDoctorCanAccessPatient,
  assertPatientUserExists,
} from "../utils/doctorPatientAccess.utils.js";

const uploadDocument = asyncHandler(async (req, res) => {
  const { title, category, description } = req.body;

  if (!title || !category) {
    throw new ApiError(400, "Title and category are required");
  }

  const fileLocalPath = req.files?.documentFile?.[0];
  if (!fileLocalPath) {
    throw new ApiError(400, "File is required");
  }

  let ownerId;

  if (req.user.role === "patient") {
    // Never trust body patientId — always own account
    ownerId = req.user._id;
  } else if (req.user.role === "doctor") {
    const patientId = req.body.patientId;
    if (!patientId || !String(patientId).trim()) {
      throw new ApiError(400, "patientId is required for doctor uploads");
    }
    const patientCheck = await assertPatientUserExists(patientId);
    if (!patientCheck.ok) {
      throw new ApiError(patientCheck.code, patientCheck.message);
    }
    const access = await assertDoctorCanAccessPatient(req.user._id, patientId);
    if (!access.ok) {
      throw new ApiError(access.code, access.message);
    }
    ownerId = patientId;
  } else {
    throw new ApiError(403, "Only patients and doctors can upload documents");
  }

  const uploadedFile = await uploadOnCloudinary(fileLocalPath.path);
  if (!uploadedFile?.secure_url) {
    throw new ApiError(500, "Error uploading file to Cloudinary");
  }

  const fileType = uploadedFile.format === "pdf" ? "pdf" : "jpg";

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
    description,
  });

  return res.status(201).json(
    new ApiResponse(201, document, "Document uploaded successfully")
  );
});

const getPatientDocuments = asyncHandler(async (req, res) => {
  if (req.user.role === "patient") {
    const documents = await Document.find({ ownerId: req.user._id }).sort({
      createdAt: -1,
    });
    return res.status(200).json(
      new ApiResponse(200, documents, "Documents fetched successfully")
    );
  }

  if (req.user.role === "doctor") {
    const { patientId } = req.params;
    if (!patientId) {
      throw new ApiError(400, "patientId is required");
    }
    const patientCheck = await assertPatientUserExists(patientId);
    if (!patientCheck.ok) {
      throw new ApiError(patientCheck.code, patientCheck.message);
    }
    const access = await assertDoctorCanAccessPatient(req.user._id, patientId);
    if (!access.ok) {
      throw new ApiError(access.code, access.message);
    }

    const documents = await Document.find({ ownerId: patientId }).sort({
      createdAt: -1,
    });
    return res.status(200).json(
      new ApiResponse(200, documents, "Documents fetched successfully")
    );
  }

  throw new ApiError(403, "Forbidden");
});

const getDocumentSignedUrl = asyncHandler(async (req, res) => {
  const { documentId } = req.params;
  const { download } = req.query;

  const doc = await Document.findById(documentId);
  if (!doc) throw new ApiError(404, "Document not found");

  if (req.user.role === "patient") {
    if (doc.ownerId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Access denied");
    }
  } else if (req.user.role === "doctor") {
    const access = await assertDoctorCanAccessPatient(
      req.user._id,
      doc.ownerId
    );
    if (!access.ok) {
      throw new ApiError(access.code, access.message);
    }
  } else {
    throw new ApiError(403, "Access denied");
  }

  if (!doc.cloudinaryPublicId || !doc.cloudinaryResourceType) {
    return res.status(200).json(
      new ApiResponse(200, { url: doc.fileUrl }, "Document URL fetched")
    );
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 300;

  const format =
    doc.cloudinaryFormat || (doc.fileType === "pdf" ? "pdf" : undefined);
  if (!format) {
    throw new ApiError(400, "Document format missing for signed URL");
  }

  const url = cloudinary.utils.private_download_url(doc.cloudinaryPublicId, format, {
    resource_type: doc.cloudinaryResourceType,
    type: doc.cloudinaryType || "authenticated",
    expires_at: expiresAt,
    attachment: String(download) === "true",
  });

  return res.status(200).json(
    new ApiResponse(200, { url, expiresAt }, "Signed URL generated")
  );
});

export { uploadDocument, getPatientDocuments, getDocumentSignedUrl };
