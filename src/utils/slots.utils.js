import { DateTime } from "luxon";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function normalizeDayKey(day) {
  const d = String(day || "")
    .trim()
    .toLowerCase();
  if (!d) return null;
  if (d.length >= 3) return d.slice(0, 3);
  return d;
}

export function getDayKeyForDate({ date, timezone }) {
  const dt = DateTime.fromFormat(String(date), "yyyy-MM-dd", {
    zone: timezone,
  });
  if (!dt.isValid) return null;
  // luxon weekday: 1=Mon..7=Sun
  const idx = dt.weekday % 7; // 0=Sun..6=Sat
  return DAY_KEYS[idx];
}

export function generateSlotsForDay({
  date,
  timezone,
  displayTimezone,
  availabilityForDay,
  slotMinutes = 30,
  bufferMinutes = 0,
}) {
  const slots = [];
  const slotM = Number(slotMinutes);
  const bufferM = Number(bufferMinutes);
  if (!Number.isFinite(slotM) || slotM <= 0) return slots;
  if (!Number.isFinite(bufferM) || bufferM < 0) return slots;

  for (const rule of availabilityForDay || []) {
    const startLocal = DateTime.fromFormat(
      `${date} ${rule.startTime}`,
      "yyyy-MM-dd HH:mm",
      { zone: timezone }
    );
    const endLocal = DateTime.fromFormat(
      `${date} ${rule.endTime}`,
      "yyyy-MM-dd HH:mm",
      { zone: timezone }
    );
    if (!startLocal.isValid || !endLocal.isValid) continue;
    if (endLocal <= startLocal) continue;

    let cursor = startLocal;
    while (cursor.plus({ minutes: slotM }) <= endLocal) {
      const s = cursor;
      const e = cursor.plus({ minutes: slotM });
      const outTz = displayTimezone || timezone;
      slots.push({
        startAtUtc: s.toUTC().toISO(),
        endAtUtc: e.toUTC().toISO(),
        // Times in the timezone the frontend wants to display.
        startAtLocal: s.setZone(outTz).toISO(),
        endAtLocal: e.setZone(outTz).toISO(),
      });
      cursor = cursor.plus({ minutes: slotM + bufferM });
    }
  }

  // Sort and de-dupe by UTC start
  slots.sort((a, b) => a.startAtUtc.localeCompare(b.startAtUtc));
  const seen = new Set();
  return slots.filter((x) => {
    const key = x.startAtUtc;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
//remove conflicting slots
//prevent double booking
export function filterSlotsByOverlaps(slots, appointments) {
  if (!Array.isArray(slots) || !Array.isArray(appointments)) return [];
  return slots.filter((slot) => {
    const s = DateTime.fromISO(slot.startAtUtc, { zone: "utc" });
    const e = DateTime.fromISO(slot.endAtUtc, { zone: "utc" });
    if (!s.isValid || !e.isValid) return false;

    const overlaps = appointments.some((a) => {
      const as = DateTime.fromJSDate(new Date(a.startAt), { zone: "utc" });
      const ae = DateTime.fromJSDate(new Date(a.endAt), { zone: "utc" });
      return as < e && ae > s;
    });
    return !overlaps;
  });
}

export function normalizeAvailabilityDay(day) {
  const key = normalizeDayKey(day);
  if (!key) return null;
  if (key === "thu") return "thu";
  if (key === "tue") return "tue";
  if (key === "wed") return "wed";
  if (key === "mon") return "mon";
  if (key === "fri") return "fri";
  if (key === "sat") return "sat";
  if (key === "sun") return "sun";
  return null;
}
 