import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Prescription from "../models/prescription.model.js";
import Appointment from "../models/appointment.model.js";
import { Doctor } from "../models/doctor.model.js";
import { User } from "../models/user.model.js";
import { generateAndUploadPrescriptionPdf } from "../utils/prescriptionPdf.utils.js";
import { cloudinary } from "../utils/cloudinary.js";

/** ObjectId from a ref field whether it is still an id or a populated document. */
function refIdString(ref) {
  if (ref == null) return null;
  if (typeof ref === "object" && ref._id != null) return String(ref._id);
  return String(ref);
}

async function assertPrescriptionReader(req, prescription) {
  const prescPatientUserId = refIdString(prescription.patientId);
  const isPatient =
    req.user.role === "patient" &&
    prescPatientUserId != null &&
    prescPatientUserId === String(req.user._id);

  const doctorProfile = await Doctor.findOne({ userId: req.user._id });
  const prescDoctorId = refIdString(prescription.doctorId);
  const isDoctor =
    req.user.role === "doctor" &&
    doctorProfile &&
    prescDoctorId != null &&
    prescDoctorId === String(doctorProfile._id);

  if (!isPatient && !isDoctor) {
    throw new ApiError(403, "You are not authorized to view this prescription");
  }
}

const createPrescription = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { diagnosis, medicines, advice } = req.body;

  if (
    !diagnosis ||
    !medicines ||
    !Array.isArray(medicines) ||
    medicines.length === 0
  ) {
    throw new ApiError(
      400,
      "Diagnosis and at least one medicine are required"
    );
  }

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  const doctorProfile = await Doctor.findOne({ userId: req.user._id });
  if (
    !doctorProfile ||
    appointment.doctorId.toString() !== doctorProfile._id.toString()
  ) {
    throw new ApiError(403, "Only the assigned doctor can create a prescription");
  }

  const existingPrescription = await Prescription.findOne({ appointmentId });
  if (existingPrescription) {
    throw new ApiError(400, "A prescription already exists for this appointment");
  }

  let prescription = await Prescription.create({
    appointmentId,
    doctorId: appointment.doctorId,
    patientId: appointment.patientId,
    diagnosis,
    medicines,
    advice,
  });

  appointment.status = "completed";
  await appointment.save();

  try {
    const patientUser = await User.findById(appointment.patientId).select(
      "name"
    );
    const doctorWithUser = await Doctor.findById(appointment.doctorId).populate(
      "userId",
      "name"
    );
    const patientName = patientUser?.name || "";
    const doctorName = doctorWithUser?.userId?.name || "";

    const pdfMeta = await generateAndUploadPrescriptionPdf({
      diagnosis,
      medicines,
      advice,
      patientName,
      doctorName,
      appointmentId: String(appointmentId),
    });

    prescription = await Prescription.findByIdAndUpdate(
      prescription._id,
      {
        $set: {
          pdfUrl: pdfMeta.pdfUrl,
          pdfCloudinaryPublicId: pdfMeta.cloudinaryPublicId,
          pdfCloudinaryResourceType: pdfMeta.cloudinaryResourceType,
          pdfCloudinaryType: pdfMeta.cloudinaryType,
          pdfCloudinaryFormat: pdfMeta.cloudinaryFormat,
        },
      },
      { new: true }
    );
  } catch (err) {
    console.error("Prescription PDF generation/upload failed:", err?.message || err);
  }

  return res.status(201).json(
    new ApiResponse(201, prescription, "Prescription created successfully")
  );
});

const getPrescription = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  const prescription = await Prescription.findOne({ appointmentId })
    .populate({
      path: "doctorId",
      populate: { path: "userId", select: "name specialization" },
    })
    .populate("patientId", "name email");

  if (!prescription) {
    throw new ApiError(404, "Prescription not found");
  }

  await assertPrescriptionReader(req, prescription);

  return res.status(200).json(
    new ApiResponse(200, prescription, "Prescription fetched successfully")
  );
});

/**
 * Private Cloudinary raw PDFs return 401 on direct secure_url; same pattern as document signed-url.
 */
const getPrescriptionSignedPdfUrl = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { download } = req.query;

  const prescription = await Prescription.findOne({ appointmentId })
    .populate("patientId", "name email")
    .populate({
      path: "doctorId",
      populate: { path: "userId", select: "name" },
    });

  if (!prescription) {
    throw new ApiError(404, "Prescription not found");
  }

  await assertPrescriptionReader(req, prescription);

  if (!prescription.pdfCloudinaryPublicId || !prescription.pdfCloudinaryResourceType) {
    if (prescription.pdfUrl) {
      return res.status(200).json(
        new ApiResponse(
          200,
          { url: prescription.pdfUrl, expiresAt: null },
          "PDF URL fetched"
        )
      );
    }
    throw new ApiError(404, "Prescription PDF is not available");
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  const format = prescription.pdfCloudinaryFormat || "pdf";

  const url = cloudinary.utils.private_download_url(
    prescription.pdfCloudinaryPublicId,
    format,
    {
      resource_type: prescription.pdfCloudinaryResourceType,
      type: prescription.pdfCloudinaryType || "upload",
      expires_at: expiresAt,
      attachment: String(download) === "true",
    }
  );

  return res.status(200).json(
    new ApiResponse(200, { url, expiresAt }, "Signed PDF URL generated")
  );
});

export {
  createPrescription,
  getPrescription,
  getPrescriptionSignedPdfUrl,
};
