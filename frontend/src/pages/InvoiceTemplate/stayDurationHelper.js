

/**
 * Helper utilities for accurate stay duration calculation, formatting, and Excel export
 */

/**
 * Accurately parses date and time into a Date object
 */
export const parseStayDateTime = (dateVal, timeVal) => {
  if (!dateVal && !timeVal) return null;

  if (dateVal instanceof Date) {
    if (!Number.isNaN(dateVal.getTime())) return dateVal;
    return null;
  }

  const str = String(dateVal || "").trim();

  // If timeVal is NOT passed, and str already has a full timestamp with timezone
  if (!timeVal && (str.includes("GMT") || str.includes("India Standard Time"))) {
    const d = new Date(str);
    if (!Number.isNaN(d.getTime())) return d;
  }

  let year, month, day;
  // Match YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10) - 1;
    day = parseInt(isoMatch[3], 10);
  } else {
    // Match DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      day = parseInt(dmyMatch[1], 10);
      month = parseInt(dmyMatch[2], 10) - 1;
      year = parseInt(dmyMatch[3], 10);
    } else {
      const d = new Date(str);
      if (!Number.isNaN(d.getTime())) {
        year = d.getFullYear();
        month = d.getMonth();
        day = d.getDate();
      }
    }
  }

  if (year === undefined || month === undefined || day === undefined) {
    return null;
  }

  let hours = 12; // default checkout cutoff if time is missing
  let minutes = 0;

  const targetTimeStr = timeVal ? String(timeVal).trim() : str;
  // Check for AM/PM format (e.g. 11am, 12pm, 01:30 PM, 2:45 pm)
  const ampmMatch = targetTimeStr.match(/(\d{1,2})(?:[:.](\d{1,2}))?(?::\d{1,2})?\s*(am|pm)/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const period = ampmMatch[3].toLowerCase();
    if (period === "pm" && h < 12) h += 12;
    if (period === "am" && h === 12) h = 0;
    hours = h;
    minutes = m;
  } else {
    // Check for 24-hr or hr suffixes (e.g. 13hr, 13 hrs, 13:00, 13.30, 13)
    const hrMatch = targetTimeStr.match(/(\d{1,2})(?:[:.](\d{1,2}))?(?::\d{1,2})?\s*(?:hr|hrs|hours|h)?/i);
    if (hrMatch) {
      const h = parseInt(hrMatch[1], 10);
      const m = hrMatch[2] ? parseInt(hrMatch[2], 10) : 0;
      if (!Number.isNaN(h) && h >= 0 && h <= 24) {
        hours = h === 24 ? 0 : h;
        minutes = !Number.isNaN(m) && m >= 0 && m <= 59 ? m : 0;
      }
    }
  }

  return new Date(year, month, day, hours, minutes, 0, 0);
};

/**
 * Formats date into a simple, human-readable format that anyone can understand (e.g. "25 Sep 2026")
 */
export const formatHumanDate = (value) => {
  if (!value && value !== 0) return "-";
  try {
    const raw = String(value).trim();
    if (!raw || raw === "-" || raw.toLowerCase() === "null" || raw.toLowerCase() === "undefined") {
      return "-";
    }

    let d;
    const dmyMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      d = new Date(year, month, day);
    } else {
      const ymdMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (ymdMatch) {
        const year = parseInt(ymdMatch[1], 10);
        const month = parseInt(ymdMatch[2], 10) - 1;
        const day = parseInt(ymdMatch[3], 10);
        d = new Date(year, month, day);
      } else {
        d = new Date(raw);
      }
    }

    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    return raw;
  } catch {
    return String(value);
  }
};

/**
 * Formats time into clear 12-hour AM/PM format (e.g. "12:00 PM", "11:00 AM", "01:00 PM")
 * Never displays 24-hr like "13:00" or raw "13hr"
 */
export const formatHumanTime = (value) => {
  if (!value && value !== 0) return "-";
  try {
    const raw = String(value).trim();
    if (!raw || raw === "-" || raw.toLowerCase() === "null" || raw.toLowerCase() === "undefined") {
      return "-";
    }

    // 1. Full Date / ISO string with timezone
    if (raw.includes("T") || raw.includes("GMT") || raw.includes("India Standard Time")) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        return d
          .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
          .toUpperCase();
      }
    }

    // 2. Already has AM or PM (e.g. "12pm", "11am", "1pm", "12:30 pm", "11:00 AM", "01:00 PM")
    const ampmMatch = raw.match(/^(\d{1,2})(?:[:.](\d{1,2}))?(?::\d{1,2})?\s*(am|pm)$/i);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = ampmMatch[2] ? ampmMatch[2].padStart(2, "0") : "00";
      const period = ampmMatch[3].toUpperCase();
      if (hours > 12) {
        hours = hours % 12 || 12;
      } else if (hours === 0) {
        hours = 12;
      }
      return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
    }

    // 3. 24-hr format or hour suffix: "13hr", "13 hrs", "13h", "13:00", "13.30", "13", "09:00"
    const generalMatch = raw.match(/^(\d{1,2})(?:[:.](\d{1,2}))?(?::\d{1,2})?\s*(?:hr|hrs|hours|h)?$/i);
    if (generalMatch) {
      let hours = parseInt(generalMatch[1], 10);
      const minutes = generalMatch[2] ? generalMatch[2].padStart(2, "0") : "00";
      if (!Number.isNaN(hours) && hours >= 0 && hours <= 24) {
        const period = hours >= 12 && hours < 24 ? "PM" : "AM";
        hours = hours % 12 || 12;
        return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
      }
    }

    // 4. Fallback search for any HH:MM within the string
    const fallbackMatch = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (fallbackMatch) {
      let hours = parseInt(fallbackMatch[1], 10);
      const minutes = fallbackMatch[2];
      const period = fallbackMatch[4] ? fallbackMatch[4].toUpperCase() : (hours >= 12 && hours < 24 ? "PM" : "AM");
      hours = hours % 12 || 12;
      return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
    }

    return raw;
  } catch {
    return String(value);
  }
};

/**
 * Formats date and time together cleanly for spreadsheets and displays (e.g. "25 Sep 2026, 12:00 PM")
 */
export const formatHumanDateTime = (dateVal, timeVal, separator = ", ") => {
  if (!dateVal && !timeVal) return "-";

  const hasTimeVal = timeVal && String(timeVal).trim() && String(timeVal).trim() !== "-";
  if (hasTimeVal) {
    const dStr = formatHumanDate(dateVal);
    const tStr = formatHumanTime(timeVal);
    if (dStr !== "-" && tStr !== "-") return `${dStr}${separator}${tStr}`;
    if (dStr !== "-") return dStr;
    if (tStr !== "-") return tStr;
    return "-";
  }

  if (dateVal) {
    const raw = String(dateVal).trim();
    if (raw === "-" || !raw) return "-";

    if (raw.includes("T") || (raw.includes(" ") && raw.includes(":"))) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        const dStr = formatHumanDate(d);
        const tStr = formatHumanTime(d);
        if (dStr !== "-" && tStr !== "-") return `${dStr}${separator}${tStr}`;
      }
    }
    return formatHumanDate(dateVal);
  }

  return "-";
};

/**
 * Formats Actual Check-Out for clean, readable display (e.g. "25 Sep 2026 • 11:00 AM")
 * instead of raw JS Date strings like "Fri Sep 25 2026 11:00:00 GMT+0530 (India Standard Time)".
 */
export const formatActualCheckOutDisplay = (
  actualVal,
  actualDate,
  actualTime,
  formatDateFn = formatHumanDate,
  formatTimeFn = formatHumanTime,
  separator = " • "
) => {
  const getD = formatDateFn || formatHumanDate;
  const getT = formatTimeFn || formatHumanTime;

  if (actualDate && actualTime) {
    const dStr = getD(actualDate);
    const tStr = getT(actualTime);
    if (dStr && dStr !== "-" && tStr && tStr !== "-") {
      return `${dStr}${separator}${tStr}`;
    }
    if (dStr && dStr !== "-") return dStr;
    if (tStr && tStr !== "-") return tStr;
  }

  if (!actualVal || actualVal === "-" || String(actualVal).trim() === "") return "-";

  const rawStr = String(actualVal).trim();
  if (rawStr.includes("•")) {
    return separator === " • " ? rawStr : rawStr.replace(/\s*•\s*/g, separator);
  }

  const d = new Date(rawStr);
  if (!Number.isNaN(d.getTime())) {
    const dStr = getD(d);
    const tStr = getT(d);
    return `${dStr}${separator}${tStr}`;
  }

  return rawStr;
};

/**
 * Calculates extra stay details following the 24-hr threshold rule:
 * - If extra stay < 24 hours: extraFullDays = 0, extraHours and extraMinutes show elapsed time (e.g. 13h 0m)
 * - If extra stay >= 24 hours: extraFullDays = floor(totalHours / 24), extraHours = remaining hours (e.g. 26h -> 1 day, 2h 0m)
 */
export const computeExtraStayDetails = (s = {}, ec = {}) => {
  const staySummary = s || {};
  const extraCharges = ec || {};

  let totalExtraMinutes = null;

  const bookedCheckoutDt = parseStayDateTime(
    staySummary.bookedCheckOut,
    staySummary.bookedCheckOutTime
  );

  const actualCheckoutDt =
    parseStayDateTime(
      staySummary.actualCheckOutDate || staySummary.actualCheckOut,
      staySummary.actualCheckOutTime
    ) || parseStayDateTime(staySummary.actualCheckOut);

  if (bookedCheckoutDt && actualCheckoutDt) {
    const diffMs = actualCheckoutDt.getTime() - bookedCheckoutDt.getTime();
    totalExtraMinutes = diffMs > 0 ? Math.floor(diffMs / 60000) : 0;
  }

  // Fallback 1: If s.totalExtraStayMinutes is explicitly saved
  if (
    totalExtraMinutes === null &&
    typeof staySummary.totalExtraStayMinutes === "number" &&
    staySummary.totalExtraStayMinutes >= 0
  ) {
    totalExtraMinutes = staySummary.totalExtraStayMinutes;
  }

  // Fallback 2: Parse from extraTime or extraHoursStayed/extraMinutesStayed
  if (totalExtraMinutes === null) {
    const extraTimeStr = String(extraCharges.extraTime || staySummary.extraTime || "");
    const timeMatch = extraTimeStr.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i);
    let parsedH = 0;
    let parsedM = 0;
    if (timeMatch && (timeMatch[1] || timeMatch[2])) {
      parsedH = parseInt(timeMatch[1] || "0", 10);
      parsedM = parseInt(timeMatch[2] || "0", 10);
    } else {
      parsedH = Number(extraCharges.extraHoursStayed ?? staySummary.extraHours ?? 0);
      parsedM = Number(extraCharges.extraMinutesStayed ?? staySummary.extraMinutes ?? 0);
    }

    const extraN = Number(staySummary.extraNights ?? extraCharges.extraNightsStayed ?? 0);
    totalExtraMinutes = (extraN * 24 + parsedH) * 60 + parsedM;
  }

  totalExtraMinutes = Math.max(0, totalExtraMinutes || 0);

  // 24-hr threshold calculation:
  // 1 day = 1440 minutes (24 hours)
  const extraFullDays = Math.floor(totalExtraMinutes / 1440);
  const remainderMinutes = totalExtraMinutes % 1440;
  const extraHours = Math.floor(remainderMinutes / 60);
  const extraMinutes = remainderMinutes % 60;

  const extraTimeFormatted = `${extraHours}h ${extraMinutes}m`;

  let overstayParts = [];
  if (extraFullDays > 0) {
    overstayParts.push(`${extraFullDays} extra full day${extraFullDays > 1 ? "s" : ""}`);
  }
  if (extraHours > 0) {
    overstayParts.push(`${extraHours} hour${extraHours > 1 ? "s" : ""}`);
  }
  if (extraMinutes > 0) {
    overstayParts.push(`${extraMinutes} minute${extraMinutes > 1 ? "s" : ""}`);
  }

  const overstayLabel = overstayParts.length > 0 ? overstayParts.join(" and ") : "No extra stay";

  const hasExtraStay = extraFullDays > 0 || extraHours > 0 || extraMinutes > 0;

  // Short badge summary for tables: e.g. "1d 2h", "13h", or "1d 2h 0m"
  let badgeText = "-";
  if (hasExtraStay) {
    const parts = [];
    if (extraFullDays > 0) parts.push(`${extraFullDays}d`);
    if (extraHours > 0 || (extraFullDays === 0 && extraMinutes === 0)) parts.push(`${extraHours}h`);
    if (extraMinutes > 0) parts.push(`${extraMinutes}m`);
    badgeText = parts.join(" ");
  }

  return {
    totalExtraMinutes,
    extraFullDays,
    extraHours,
    extraMinutes,
    extraTimeFormatted,
    overstayLabel,
    hasExtraStay,
    badgeText,
  };
};

/**
 * Professional, human-friendly Excel/CSV export for hotel invoices
 * Formats every field so that any non-technical or uneducated person can easily understand it.
 * Uses UTF-8 BOM (\uFEFF) to ensure Microsoft Excel correctly displays currency and date text.
 */
export const exportInvoicesToExcel = (invoices = [], customFilename = "") => {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return false;
  }

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headers = [
    "Invoice No",
    "Invoice Date",
    "Customer Name",
    "Phone Number",
    "Alternative Phone",
    "Email Address",
    "Customer Address",
    "ID Proof Type",
    "ID Proof Number",
    "Room Number(s)",
    "Room Type(s)",
    "Bed Type(s)",
    "Total Adults",
    "Total Children",
    "Check-In Date & Time",
    "Check-Out Date & Time",
    "Actual Check-Out Date & Time",
    "Booked Nights",
    "Extra Full Days",
    "Extra Overstay Time",
    "Total Nights Stayed",
    "Room Sub Total (₹)",
    "GST Rate (%)",
    "GST Amount (₹)",
    "Extra Night Charge (₹)",
    "Checkout Policy Charge (₹)",
    "Extra Time Charge (₹)",
    "Other Charges (₹)",
    "Total Extra Charges (₹)",
    "Grand Total Amount (₹)",
    "Advance Paid (₹)",
    "Advance Paid Via",
    "Current Payment (₹)",
    "Total Amount Paid (₹)",
    "Remaining Balance Due (₹)",
    "Payment Due Status",
    "Payment Mode",
    "Payment Status",
    "Paid Date & Time",
  ];

  const rows = invoices.map((inv) => {
    const c = inv.customer || {};
    const rooms = Array.isArray(inv.rooms) ? inv.rooms : [];
    const roomNumbers = rooms.map((r) => r.roomNumber).filter(Boolean).join(" / ") || "-";
    const roomTypes = rooms.map((r) => r.roomType).filter(Boolean).join(" / ") || "-";
    const bedTypes = rooms.map((r) => r.bedType).filter(Boolean).join(" / ") || "-";
    const adults = rooms.reduce((acc, r) => acc + (Number(r.adults) || 0), 0);
    const children = rooms.reduce((acc, r) => acc + (Number(r.children) || 0), 0);

    const s = inv.staySummary || {};
    const f = inv.financials || {};
    const ec = inv.extraCharges || {};
    const p = inv.paymentInfo || {};

    const extraStay = computeExtraStayDetails(s, ec);

    // Human-readable Check-In and Check-Out (12-hr format: e.g. 25 Sep 2026, 12:00 PM)
    const bookedCheckInFormatted = formatHumanDateTime(s.bookedCheckIn, s.bookedCheckInTime, ", ");
    const bookedCheckOutFormatted = formatHumanDateTime(s.bookedCheckOut, s.bookedCheckOutTime, ", ");

    // Actual Check-Out (e.g. 26 Sep 2026, 01:30 PM or Not Checked Out)
    const actualCheckOutFormatted =
      s.actualCheckOut || s.actualCheckOutDate
        ? formatActualCheckOutDisplay(
            s.actualCheckOut,
            s.actualCheckOutDate,
            s.actualCheckOutTime,
            formatHumanDate,
            formatHumanTime,
            ", "
          )
        : "Not Checked Out";

    const totalNightsStayed = Number(s.bookedNights || 0) + extraStay.extraFullDays;

    // Extra Time / Overstay: e.g. "1 hr 30 mins" or "0 hrs (No Overstay)"
    let extraTimeText = "0 hrs (No Overstay)";
    if (extraStay.hasExtraStay && (extraStay.extraHours > 0 || extraStay.extraMinutes > 0)) {
      const parts = [];
      if (extraStay.extraHours > 0) parts.push(`${extraStay.extraHours} hr${extraStay.extraHours > 1 ? "s" : ""}`);
      if (extraStay.extraMinutes > 0) parts.push(`${extraStay.extraMinutes} min${extraStay.extraMinutes > 1 ? "s" : ""}`);
      extraTimeText = parts.join(" ");
    }

    // Financial calculations
    const grandTotal = Number(f.grandTotal || 0);
    const advancePaid = Number(f.advancePaid || 0);
    const currentPayment = Number(f.currentPayment || 0);
    const totalPaid = Number(f.totalPaid ?? (advancePaid + currentPayment));
    const balanceDue = Number(f.balanceDue ?? Math.max(0, grandTotal - totalPaid));
    const isPaid = (p.paymentStatus || "").toUpperCase() === "PAID" || balanceDue <= 0;
    const dueStatus = isPaid ? "FULLY PAID (NIL)" : `BALANCE DUE (₹${balanceDue.toFixed(2)})`;

    // Payment Date & Time
    const paymentDateTimeFormatted = formatHumanDateTime(p.paidAt || inv.invoiceDate || inv.createdAt, null, ", ");

    return [
      escapeCsv(inv.invoiceNo || "-"),
      escapeCsv(formatHumanDate(inv.invoiceDate || inv.createdAt)),
      escapeCsv(c.customerName || "Walk-in Guest"),
      escapeCsv(c.phoneNumber || "-"),
      escapeCsv(c.alternativePhone || "-"),
      escapeCsv(c.email || "-"),
      escapeCsv(c.address || "-"),
      escapeCsv(c.idProofType || "-"),
      escapeCsv(c.idProofNumber || "-"),
      escapeCsv(roomNumbers),
      escapeCsv(roomTypes),
      escapeCsv(bedTypes),
      escapeCsv(adults || "-"),
      escapeCsv(children || "0"),
      escapeCsv(bookedCheckInFormatted),
      escapeCsv(bookedCheckOutFormatted),
      escapeCsv(actualCheckOutFormatted),
      escapeCsv(Number(s.bookedNights || 0)),
      escapeCsv(extraStay.extraFullDays),
      escapeCsv(extraTimeText),
      escapeCsv(totalNightsStayed),
      escapeCsv(Number(f.roomRent || f.subTotal || 0).toFixed(2)),
      escapeCsv(Number(f.gstPercentage || 0)),
      escapeCsv(Number(f.gstAmount || 0).toFixed(2)),
      escapeCsv(Number(ec.extraNightCharge || 0).toFixed(2)),
      escapeCsv(Number(ec.checkoutPolicyCharge || ec.lateCheckoutCharge || 0).toFixed(2)),
      escapeCsv(Number(ec.extraTimeCharge || 0).toFixed(2)),
      escapeCsv(Number(ec.otherCharges || 0).toFixed(2)),
      escapeCsv(Number(ec.total || 0).toFixed(2)),
      escapeCsv(grandTotal.toFixed(2)),
      escapeCsv(advancePaid.toFixed(2)),
      escapeCsv(f.advancePaidVia ? String(f.advancePaidVia).toUpperCase() : "-"),
      escapeCsv(currentPayment.toFixed(2)),
      escapeCsv(totalPaid.toFixed(2)),
      escapeCsv(balanceDue.toFixed(2)),
      escapeCsv(dueStatus),
      escapeCsv(p.paymentMode ? String(p.paymentMode).toUpperCase() : "-"),
      escapeCsv(p.paymentStatus ? String(p.paymentStatus).toUpperCase() : "PAID"),
      escapeCsv(paymentDateTimeFormatted),
    ].join(",");
  });

  // UTF-8 BOM (\uFEFF) ensures Microsoft Excel displays characters and currency symbols cleanly
  const BOM = "\uFEFF";
  const csvContent = BOM + headers.map(escapeCsv).join(",") + "\r\n" + rows.join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = customFilename || `Hotel_Invoices_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};

