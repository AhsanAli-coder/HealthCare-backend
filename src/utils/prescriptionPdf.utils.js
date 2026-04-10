import fs from "fs";
import path from "path";
import os from "os";
import PDFDocument from "pdfkit";
import { cloudinary } from "./cloudinary.js";

const CLINIC_NAME = process.env.CLINIC_NAME || "HealthCare Clinic";

/**
 * Build a simple branded PDF buffer, upload to Cloudinary as raw, return secure_url + metadata.
 */
export async function generateAndUploadPrescriptionPdf({
  diagnosis,
  medicines,
  advice,
  patientName,
  doctorName,
  appointmentId,
}) {
  const tmpPath = path.join(
    os.tmpdir(),
    `rx-${appointmentId}-${Date.now()}.pdf`
  );

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(tmpPath);
    doc.pipe(stream);

    doc.fontSize(18).text(CLINIC_NAME, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text("Prescription", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Patient: ${patientName || "—"}`);
    doc.text(`Doctor: ${doctorName || "—"}`);
    doc.text(`Date: ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown();
    doc.fontSize(11).text("Diagnosis", { underline: true });
    doc.fontSize(10).text(diagnosis || "—");
    doc.moveDown();
    doc.fontSize(11).text("Medicines", { underline: true });
    (medicines || []).forEach((m, i) => {
      doc
        .fontSize(10)
        .text(
          `${i + 1}. ${m.name} — ${m.dosage} — ${m.duration}${m.instructions ? ` (${m.instructions})` : ""}`
        );
    });
    if (advice) {
      doc.moveDown();
      doc.fontSize(11).text("Advice", { underline: true });
      doc.fontSize(10).text(advice);
    }
    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  try {
    const uploaded = await cloudinary.uploader.upload(tmpPath, {
      resource_type: "raw",
      folder: "prescriptions",
      use_filename: true,
      unique_filename: true,
    });
    return {
      pdfUrl: uploaded.secure_url,
      cloudinaryPublicId: uploaded.public_id,
      cloudinaryResourceType: uploaded.resource_type || "raw",
      cloudinaryType: uploaded.type || "upload",
      cloudinaryFormat: uploaded.format || "pdf",
    };
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  }
}
