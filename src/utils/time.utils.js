import { DateTime } from "luxon";
import { ApiError } from "./ApiError.js";

export function parseDateTimeFromClient({
  date,
  startTime,
  endTime,
  startAt,
  endAt,
  timezone
}) {
  const tz = timezone || "UTC";

  // Preferred: ISO timestamps with offset or Z
  if (startAt && endAt) {
    const s = DateTime.fromISO(String(startAt), { setZone: true });
    const e = DateTime.fromISO(String(endAt), { setZone: true });
    if (!s.isValid || !e.isValid) {
      throw new ApiError(400, "Invalid startAt/endAt ISO format");
    }
    return { startAtUtc: s.toUTC().toJSDate(), endAtUtc: e.toUTC().toJSDate() };
  }

  // Backwards compatible: date + HH:mm times in user's timezone
  if (!date || !startTime || !endTime) {
    throw new ApiError(400, "Provide either (startAt,endAt) or (date,startTime,endTime)");
  }

  const s = DateTime.fromFormat(`${date} ${startTime}`, "yyyy-MM-dd HH:mm", { zone: tz });
  const e = DateTime.fromFormat(`${date} ${endTime}`, "yyyy-MM-dd HH:mm", { zone: tz });

  if (!s.isValid || !e.isValid) {
    throw new ApiError(400, "Invalid date/time format. Expected date=YYYY-MM-DD and time=HH:mm");
  }

  return { startAtUtc: s.toUTC().toJSDate(), endAtUtc: e.toUTC().toJSDate() };
}

export function assertValidTimeRange(startAtUtc, endAtUtc) {
  if (!(startAtUtc instanceof Date) || Number.isNaN(startAtUtc.getTime())) {
    throw new ApiError(400, "Invalid appointment start time");
  }
  if (!(endAtUtc instanceof Date) || Number.isNaN(endAtUtc.getTime())) {
    throw new ApiError(400, "Invalid appointment end time");
  }
  if (endAtUtc <= startAtUtc) {
    throw new ApiError(400, "end time must be after start time");
  }
   const now = new Date();

  if (startAtUtc < now) {
    throw new ApiError(400, "start time cannot be in the past");
  }
}

