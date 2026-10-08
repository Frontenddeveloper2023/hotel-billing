import React, { useState, useEffect } from "react";
import {
  computeExtraStayDetails,
  formatActualCheckOutDisplay,
  formatHumanDate,
  formatHumanTime,
  formatHumanDateTime,
  exportInvoicesToExcel,
} from "./stayDurationHelper.js";
import { getSettings } from "../../service/settingsService";
import { getAllBranches } from "../../service/branchApi";

/**
 * Parses any service / food item safely extracting a clean title and room number
 */
const parseServiceItem = (item, defaultRoomNumber = "") => {
  let rawName = String(item.description || item.name || item.foodName || item.serviceName || "Service Item").trim();
  let roomNum = String(item.roomNumber || item.room || "").trim();

  // If description has " - Room 102" or " - Room -" pattern
  const roomPatternMatch = rawName.match(/^(.*?)\s*-\s*room\s*([a-zA-Z0-9_-]*)/i);
  if (roomPatternMatch) {
    rawName = roomPatternMatch[1].trim();
    if (!roomNum || roomNum === "-") {
      const matchedNum = roomPatternMatch[2].trim();
      if (matchedNum && matchedNum !== "-") {
        roomNum = matchedNum;
      }
    }
  }

  // Fallback to default room number if only one room is in the invoice
  if ((!roomNum || roomNum === "-") && defaultRoomNumber) {
    roomNum = defaultRoomNumber;
  }

  const qty = Number(item.quantity || 1);
  const total = Number(item.total || ((item.unitPrice || item.price || item.fees || 0) * qty));
  const unitPrice = Number(item.unitPrice || item.price || item.fees || (total / (qty || 1)));

  return {
    name: rawName,
    roomNumber: roomNum && roomNum !== "-" ? roomNum : "",
    quantity: qty,
    unitPrice,
    total,
  };
};

/**
 * Robustly extracts Food and Room Services with their respective Room Numbers
 */
const extractCategorizedServices = (inv) => {
  const rooms = Array.isArray(inv?.rooms) ? inv.rooms : [];
  const defaultRoomNum = rooms.length === 1 ? (rooms[0]?.roomNumber || "") : "";

  let extractedFood = [];
  let extractedRoomServices = [];

  // 1. Check if rooms have foodServicesDetails / roomServicesDetails / foodServices / roomServices
  const hasNestedServices = rooms.some(
    (r) =>
      (Array.isArray(r.foodServicesDetails) && r.foodServicesDetails.length > 0) ||
      (Array.isArray(r.foodServices) && r.foodServices.length > 0) ||
      (Array.isArray(r.roomServicesDetails) && r.roomServicesDetails.length > 0) ||
      (Array.isArray(r.roomServices) && r.roomServices.length > 0)
  );

  if (hasNestedServices) {
    rooms.forEach((r, idx) => {
      const rNum = String(r.roomNumber || (idx + 1)).trim();

      const fList =
        Array.isArray(r.foodServicesDetails) && r.foodServicesDetails.length > 0
          ? r.foodServicesDetails
          : (Array.isArray(r.foodServices) ? r.foodServices : []);

      fList.forEach((f) => {
        const parsed = parseServiceItem(f, rNum);
        if (!parsed.roomNumber) parsed.roomNumber = rNum;
        extractedFood.push(parsed);
      });

      const sList =
        Array.isArray(r.roomServicesDetails) && r.roomServicesDetails.length > 0
          ? r.roomServicesDetails
          : (Array.isArray(r.roomServices) ? r.roomServices : []);

      sList.forEach((s) => {
        const parsed = parseServiceItem(s, rNum);
        if (!parsed.roomNumber) parsed.roomNumber = rNum;
        extractedRoomServices.push(parsed);
      });
    });

    return { foodItems: extractedFood, roomServiceItems: extractedRoomServices };
  }

  // 2. Fallback: Parse from inv.items
  const nonRoomItems = (inv?.items || []).filter((item) => {
    const desc = String(item.description || "").toLowerCase();
    return (
      !desc.startsWith("room rent") &&
      !desc.startsWith("extra night") &&
      !desc.startsWith("extra full day") &&
      !desc.startsWith("extra time stay") &&
      !desc.startsWith("checkout")
    );
  });

  nonRoomItems.forEach((rawItem) => {
    const parsed = parseServiceItem(rawItem, defaultRoomNum);

    // If still no room number, check if only 1 room or match with room list
    if (!parsed.roomNumber) {
      if (defaultRoomNum) {
        parsed.roomNumber = defaultRoomNum;
      } else if (rooms.length > 0) {
        parsed.roomNumber = rooms[0]?.roomNumber || "";
      }
    }

    const desc = String(parsed.name || "").toLowerCase();
    if (
      rawItem.category === "roomService" ||
      desc.includes("cleaning") ||
      desc.includes("laundry") ||
      desc.includes("room service") ||
      desc.includes("maintenance")
    ) {
      extractedRoomServices.push(parsed);
    } else {
      extractedFood.push(parsed);
    }
  });

  return { foodItems: extractedFood, roomServiceItems: extractedRoomServices };
};

const InvoiceTemplate = ({
  activeInvoice,
  pdfInvoice,
  receiptRef,
  handleDownloadPDF,
  setActiveInvoice,
  formatDate = formatHumanDate,
  formatTime = formatHumanTime,
  hotelSettings = null,
}) => {
  const [settings, setSettings] = useState(hotelSettings || null);
  const [branchData, setBranchData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [settingsRes, branchesRes] = await Promise.all([
           !hotelSettings ? getSettings() : Promise.resolve({ success: true, data: hotelSettings }),
           getAllBranches()
        ]);
        
        if (isMounted) {
          if (settingsRes?.success && settingsRes.data) {
            setSettings(settingsRes.data);
          }
          if (branchesRes?.success && branchesRes.data?.length > 0) {
            const invoiceBranchId = activeInvoice?.branchId || pdfInvoice?.branchId;
            const bData = invoiceBranchId ? branchesRes.data.find(b => b._id === invoiceBranchId) : branchesRes.data[0];
            setBranchData(bData || branchesRes.data[0]);
          }
        }
      } catch (err) {
        console.warn("[InvoiceTemplate] Could not load hotel data:", err);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [hotelSettings, activeInvoice, pdfInvoice]);

  const cleanAddress = (addr) => {
    if (!addr) return "";
    const parts = String(addr)
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const uniqueParts = Array.from(new Set(parts));
    return uniqueParts.join(", ");
  };

  const formatBranchAddress = (addr) => {
    if (!addr) return "";
    if (typeof addr === "string") return cleanAddress(addr);
    const parts = [addr.street, addr.city, addr.state, addr.country, addr.pincode].filter(Boolean);
    return cleanAddress(parts.join(", "));
  };

  const hotelName = branchData?.branchName || settings?.companyName || "HOTEL BILLING";
  const hotelAddress = branchData?.address ? formatBranchAddress(branchData.address) : cleanAddress(settings?.address);
  const hotelPhone = branchData?.phone || (Array.isArray(settings?.phoneNumbers)
    ? settings.phoneNumbers.filter(Boolean).join(", ")
    : (settings?.phoneNumbers || settings?.phone || ""));
  const hotelEmail = branchData?.email || settings?.email || "";
  const hotelGst = settings?.gstNumber || "";

  return (
    <>
      {/* ============================================================
          ACTIVE INVOICE PREVIEW (MODAL)
      ============================================================ */}

      {activeInvoice &&
        !pdfInvoice &&
        (() => {
          const inv = activeInvoice;
          const c = inv.customer || {};
          const rooms = Array.isArray(inv.rooms) ? inv.rooms : [];
          const s = inv.staySummary || {};
          const f = inv.financials || {};
          const ec = inv.extraCharges || {};
          const p = inv.paymentInfo || {};

          // Extra charges & policy
          const checkoutPolicyCharge = Number(
            f.checkoutPolicyCharge ??
              ec.lateCheckoutCharge ??
              ec.checkoutPolicyCharge ??
              ec.checkoutPolicyAmount ??
              f.extraTimeCharge ??
              ec.extraTimeCharge ??
              0
          );

          const extraNightCharge = Number(
            f.extraNightCharge ?? ec.extraNightCharge ?? 0
          );

          const extraStay = computeExtraStayDetails(s, ec);

          // Payment values
          const advancePaid = Number(f.advancePaid || 0);
          const currentPayment = Number(f.currentPayment || 0);
          const grandTotal = Number(f.grandTotal || 0);
          const totalPaid = Number(
            f.totalPaid ?? advancePaid + currentPayment
          );
          const balanceDue = Math.max(
            0,
            Number(f.balanceDue ?? grandTotal - totalPaid)
          );

          // Summary breakdowns
          const totalRoomRent =
            rooms.length > 0
              ? rooms.reduce(
                  (sum, r) =>
                    sum +
                    (Number(r.roomRent) ||
                      Number(r.bookedNights || 1) *
                        Number(r.perNightRoomPrice || r.pricePerNight || 0)),
                  0
                )
              : Number(f.roomRent || 0);

          const totalExtraStay =
            rooms.length > 0
              ? rooms.reduce(
                  (sum, r) =>
                    sum +
                    (Number(r.extraFullDayCharge) ||
                      Number(r.extraFullDays || 0) *
                        Number(r.perNightRoomPrice || r.pricePerNight || 0)),
                  0
                )
              : Number(extraNightCharge || 0);

          const totalCheckoutCharge =
            rooms.length > 0
              ? rooms.reduce(
                  (sum, r) => sum + Number(r.checkoutPolicyCharge || 0),
                  0
                )
              : Number(checkoutPolicyCharge || 0);

          const foodTotal = Number(f.foodServices || 0);
          const roomServicesTotal = Number(f.roomServices || 0);
          const taxableSubtotal = Number(
            f.subTotal ||
              totalRoomRent +
                totalExtraStay +
                totalCheckoutCharge +
                foodTotal +
                roomServicesTotal
          );
          const gstRate = Number(f.gstPercentage || 0);
          const gstAmount = Number(f.gstAmount || 0);

          // Extract Food and Room Services with specific Room Numbers
          const { foodItems, roomServiceItems } = extractCategorizedServices(inv);

          return (
            <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 border border-gray-200 font-sans text-xs">
                {/* CLOSE BUTTON */}
                <div className="flex justify-end mb-1">
                  <button
                    type="button"
                    onClick={() => setActiveInvoice(null)}
                    className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none cursor-pointer"
                  >
                    &times;
                  </button>
                </div>

                {/* HOTEL HEADER */}
                <div className="text-center pb-3 space-y-0.5">
                  <h2 className="text-base font-extrabold text-gray-900 tracking-tight uppercase">
                    {hotelName}
                  </h2>
                  {hotelAddress && (
                    <p className="text-[11px] text-gray-600">
                      {hotelAddress}
                    </p>
                  )}
                  {hotelPhone && (
                    <p className="text-[11px] text-gray-600">
                      Phone: {hotelPhone}
                    </p>
                  )}
                  {hotelGst && (
                    <p className="text-[11px] font-semibold text-gray-700">
                      GSTIN: {hotelGst}
                    </p>
                  )}

                  <div className="pt-2">
                    <div className="border-t border-b border-gray-300 py-1 font-extrabold text-gray-800 text-[11px] tracking-wider uppercase">
                      RECEIPT / TAX INVOICE
                    </div>
                  </div>
                </div>

                {/* INVOICE & CUSTOMER META */}
                <div className="border-b border-gray-300 pb-2.5 mb-2.5 space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span>Invoice No: <strong>{inv.invoiceNo}</strong></span>
                    <span>Date: {formatDate(inv.invoiceDate || inv.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <strong className="text-gray-900">{c.customerName || "Walk-in Guest"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="text-gray-800">{c.phoneNumber || "-"}</span>
                  </div>
                  {c.idProofType && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID Proof:</span>
                      <span className="text-gray-800">{c.idProofType} {c.idProofNumber ? `(${c.idProofNumber})` : ""}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Address:</span>
                      <span className="text-gray-800 text-right">{c.address}</span>
                    </div>
                  )}
                </div>

                {/* ACCOMMODATION DETAILS */}
                <div className="border-b border-gray-300 pb-3 mb-3 space-y-3">
                  <div className="font-extrabold text-gray-900 text-[11px] uppercase tracking-wider">
                    ACCOMMODATION DETAILS
                  </div>

                  {(rooms.length > 0 ? rooms : [s]).map((room, idx) => {
                    const roomStay = {
                      bookedCheckIn: room.checkIn || s.bookedCheckIn || "",
                      bookedCheckInTime: room.checkInTime || s.bookedCheckInTime || "",
                      bookedCheckOut: room.checkOut || s.bookedCheckOut || "",
                      bookedCheckOutTime: room.checkOutTime || s.bookedCheckOutTime || "",
                      actualCheckOut: room.actualCheckoutDate || room.actualCheckout || s.actualCheckOutDate || s.actualCheckOut || "",
                      actualCheckOutDate: room.actualCheckoutDate || s.actualCheckOutDate || s.actualCheckOut || "",
                      actualCheckOutTime: room.actualCheckoutTime || s.actualCheckOutTime || "",
                      bookedNights: room.bookedNights ?? s.bookedNights,
                      extraFullDays: room.extraFullDays ?? (rooms.length === 1 ? extraStay.extraFullDays : 0),
                    };
                    const roomRate = Number(room.perNightRoomPrice ?? room.pricePerNight ?? room.roomPricePerNight ?? room.roomPrice ?? s.pricePerNight ?? 0);
                    const roomBookedNights = Number(roomStay.bookedNights || 1);
                    const bookedStayAmount = Number(room.roomRent ?? (roomBookedNights * roomRate));
                    const extraNights = Number(room.extraFullDays ?? 0);
                    const extraNightAmount = Number(room.extraFullDayCharge ?? (extraNights * roomRate));
                    const roomPolicyCharge = Number(room.checkoutPolicyCharge ?? (rooms.length === 1 ? checkoutPolicyCharge : 0));
                    const roomStayTotal = bookedStayAmount + extraNightAmount + roomPolicyCharge;

                    return (
                      <div key={idx} className={`${idx > 0 ? "pt-2.5 border-t border-dashed border-gray-200" : ""} space-y-1.5`}>
                        <div className="flex justify-between items-center font-bold text-gray-900 text-xs">
                          <span>Room {room.roomNumber || (idx + 1)} {room.roomType ? <span className="font-normal text-gray-500">({room.roomType})</span> : ""}</span>
                          <span>₹{roomRate.toLocaleString("en-IN")}/night</span>
                        </div>

                        <div className="space-y-0.5 text-[11px] text-gray-600">
                          <p className="flex justify-between">
                            <span className="text-gray-500">Check-in</span>
                            <span className="font-medium text-gray-900">{formatHumanDateTime(roomStay.bookedCheckIn, roomStay.bookedCheckInTime, ", ")}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-gray-500">Checkout</span>
                            <span className="font-medium text-gray-900">
                              {formatHumanDateTime(roomStay.bookedCheckOut, roomStay.bookedCheckOutTime || "11:00 AM", ", ")}
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-gray-500">Actual Checkout Date &amp; Time</span>
                            <span className="font-medium text-gray-900">
                              {formatActualCheckOutDisplay(
                                roomStay.actualCheckOut,
                                roomStay.actualCheckOutDate,
                                roomStay.actualCheckOutTime,
                                formatDate,
                                formatTime,
                                ", "
                              )}
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-gray-500">Stay</span>
                            <span>{roomBookedNights} Night{roomBookedNights !== 1 ? "s" : ""}{extraNights > 0 ? ` + ${extraNights} Extra Day${extraNights !== 1 ? "s" : ""}` : ""}</span>
                          </p>
                        </div>

                        <div className="pt-1 space-y-0.5 text-[11px]">
                          <p className="flex justify-between">
                            <span className="text-gray-600">Room Rent</span>
                            <span className="font-medium text-gray-900">₹{bookedStayAmount.toLocaleString("en-IN")}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-gray-600">Extra Night Stay Charge</span>
                            <span className="font-medium text-gray-900">₹{extraNightAmount.toLocaleString("en-IN")}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-gray-600">Extra Time Stay Charge</span>
                            <span className="font-medium text-gray-900">₹{roomPolicyCharge.toLocaleString("en-IN")}</span>
                          </p>
                          <p className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
                            <span>Room Total</span>
                            <span>₹{roomStayTotal.toLocaleString("en-IN")}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* FOOD SERVICES (IF ANY) */}
                {foodItems.length > 0 && (
                  <div className="border-b border-gray-300 pb-3 mb-3 space-y-2">
                    <div className="font-extrabold text-gray-900 text-[11px] uppercase tracking-wider">
                      FOOD SERVICES
                    </div>
                    <div className="space-y-1.5">
                      {foodItems.map((item, sIdx) => {
                        return (
                          <div key={sIdx} className="text-[11px]">
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="flex justify-between text-gray-500">
                              <span>{item.roomNumber ? `Room ${item.roomNumber} × ` : "Qty: "}{item.quantity}</span>
                              <span className="font-semibold text-gray-900">₹{item.total.toLocaleString("en-IN")}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ROOM SERVICES (IF ANY) */}
                {roomServiceItems.length > 0 && (
                  <div className="border-b border-gray-300 pb-3 mb-3 space-y-2">
                    <div className="font-extrabold text-gray-900 text-[11px] uppercase tracking-wider">
                      ROOM SERVICES
                    </div>
                    <div className="space-y-1.5">
                      {roomServiceItems.map((item, sIdx) => {
                        return (
                          <div key={sIdx} className="text-[11px]">
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="flex justify-between text-gray-500">
                              <span>{item.roomNumber ? `Room ${item.roomNumber} × ` : "Qty: "}{item.quantity}</span>
                              <span className="font-semibold text-gray-900">₹{item.total.toLocaleString("en-IN")}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* BILL SUMMARY */}
                <div className="border-b border-gray-300 pb-3 mb-3 space-y-2">
                  <div className="font-extrabold text-gray-900 text-[11px] uppercase tracking-wider">
                    BILL SUMMARY
                  </div>

                  <div className="space-y-1 text-[11px] text-gray-700">
                    <p className="flex justify-between">
                      <span className="text-gray-600">Room Rent</span>
                      <span className="font-medium">₹{totalRoomRent.toLocaleString("en-IN")}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-600">Extra Night Stay Charges</span>
                      <span className="font-medium">₹{totalExtraStay.toLocaleString("en-IN")}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-600">Extra Time Stay Charges</span>
                      <span className="font-medium">₹{totalCheckoutCharge.toLocaleString("en-IN")}</span>
                    </p>
                    {foodTotal > 0 && (
                      <p className="flex justify-between">
                        <span className="text-gray-600">Food</span>
                        <span className="font-medium">₹{foodTotal.toLocaleString("en-IN")}</span>
                      </p>
                    )}
                    {roomServicesTotal > 0 && (
                      <p className="flex justify-between">
                        <span className="text-gray-600">Room Services</span>
                        <span className="font-medium">₹{roomServicesTotal.toLocaleString("en-IN")}</span>
                      </p>
                    )}

                    <div className="border-t border-dashed border-gray-200 pt-1 mt-1 space-y-0.5">
                      <p className="flex justify-between font-semibold text-gray-900">
                        <span>Subtotal</span>
                        <span>₹{taxableSubtotal.toLocaleString("en-IN")}</span>
                      </p>
                      <p className="flex justify-between text-gray-600">
                        <span>GST ({gstRate}%)</span>
                        <span>₹{gstAmount.toLocaleString("en-IN")}</span>
                      </p>
                    </div>

                    <div className="border-t border-b border-gray-900 py-1.5 my-1.5">
                      <p className="flex justify-between font-extrabold text-sm text-gray-900">
                        <span>GRAND TOTAL</span>
                        <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="flex justify-between text-gray-600">
                        <span>Advance Paid {f.advancePaidVia ? `(${f.advancePaidVia})` : ""}</span>
                        <span>₹{advancePaid.toLocaleString("en-IN")}</span>
                      </p>
                      {currentPayment > 0 && (
                        <p className="flex justify-between text-gray-600">
                          <span>Current Payment</span>
                          <span>₹{currentPayment.toLocaleString("en-IN")}</span>
                        </p>
                      )}
                      <p className="flex justify-between font-bold text-gray-900 pt-1 border-t border-dashed border-gray-200">
                        <span>TOTAL PAID</span>
                        <span>₹{totalPaid.toLocaleString("en-IN")}</span>
                      </p>
                      <p className="flex justify-between font-bold text-gray-900">
                        <span>BALANCE DUE</span>
                        <span>₹{balanceDue.toLocaleString("en-IN")}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* PAYMENT INFO */}
                <div className="border-b border-gray-300 pb-2.5 mb-2.5 text-xs space-y-1">
                  <p className="flex justify-between">
                    <span className="text-gray-600">Payment Mode:</span>
                    <span className="font-bold text-gray-900 uppercase">{p.paymentMode || "CASH"}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className="font-bold text-emerald-700 uppercase">{p.paymentStatus || "PAID"}</span>
                  </p>
                </div>

                {/* FOOTER */}
                <div className="text-center py-1 text-xs text-gray-600 font-medium">
                  Thank You!
                </div>

                {/* ACTION BUTTONS */}
                <div className="mt-4 flex justify-end gap-3 border-t pt-3">
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF(inv)}
                    className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-teal-700 transition cursor-pointer"
                  >
                    Download PDF
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      exportInvoicesToExcel(
                        [inv],
                        `Invoice_${inv.invoiceNo || "Receipt"}.csv`
                      )
                    }
                    className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition cursor-pointer"
                  >
                    Export Excel / CSV
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveInvoice(null)}
                    className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-300 transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ============================================================
          PDF / PRINT RECEIPT (THERMAL & PDF EXPORT)
      ============================================================ */}

      {pdfInvoice &&
        (() => {
          const inv = pdfInvoice;
          const c = inv.customer || {};
          const rooms = Array.isArray(inv.rooms) ? inv.rooms : [];
          const s = inv.staySummary || {};
          const f = inv.financials || {};
          const ec = inv.extraCharges || {};
          const p = inv.paymentInfo || {};

          // Extra charges & policy
          const checkoutPolicyCharge = Number(
            f.checkoutPolicyCharge ??
              ec.lateCheckoutCharge ??
              ec.checkoutPolicyCharge ??
              ec.checkoutPolicyAmount ??
              f.extraTimeCharge ??
              ec.extraTimeCharge ??
              0
          );

          const extraNightCharge = Number(
            f.extraNightCharge ?? ec.extraNightCharge ?? 0
          );

          const extraStay = computeExtraStayDetails(s, ec);

          // Payment values
          const advancePaid = Number(f.advancePaid || 0);
          const currentPayment = Number(f.currentPayment || 0);
          const grandTotal = Number(f.grandTotal || 0);
          const totalPaid = Number(
            f.totalPaid ?? advancePaid + currentPayment
          );
          const balanceDue = Math.max(
            0,
            Number(f.balanceDue ?? grandTotal - totalPaid)
          );

          // Summary breakdowns
          const totalRoomRent =
            rooms.length > 0
              ? rooms.reduce(
                  (sum, r) =>
                    sum +
                    (Number(r.roomRent) ||
                      Number(r.bookedNights || 1) *
                        Number(
                          r.perNightRoomPrice || r.pricePerNight || 0
                        )),
                  0
                )
              : Number(f.roomRent || 0);

          const totalExtraStay =
            rooms.length > 0
              ? rooms.reduce(
                  (sum, r) =>
                    sum +
                    (Number(r.extraFullDayCharge) ||
                      Number(r.extraFullDays || 0) *
                        Number(
                          r.perNightRoomPrice || r.pricePerNight || 0
                        )),
                  0
                )
              : Number(extraNightCharge || 0);

          const totalCheckoutCharge =
            rooms.length > 0
              ? rooms.reduce(
                  (sum, r) => sum + Number(r.checkoutPolicyCharge || 0),
                  0
                )
              : Number(checkoutPolicyCharge || 0);

          const foodTotal = Number(f.foodServices || 0);
          const roomServicesTotal = Number(f.roomServices || 0);
          const taxableSubtotal = Number(
            f.subTotal ||
              totalRoomRent +
                totalExtraStay +
                totalCheckoutCharge +
                foodTotal +
                roomServicesTotal
          );
          const gstRate = Number(f.gstPercentage || 0);
          const gstAmount = Number(f.gstAmount || 0);

          // Extract Food and Room Services with specific Room Numbers
          const { foodItems, roomServiceItems } = extractCategorizedServices(inv);

          const row = {
            display: "flex",
            justifyContent: "space-between",
            padding: "2px 0",
            fontSize: "11px",
          };

          return (
            <div
              style={{
                position: "absolute",
                top: "-9999px",
                left: "-9999px",
              }}
            >
              <div
                ref={receiptRef}
                style={{
                  width: "320px",
                  padding: "16px",
                  background: "#ffffff",
                  fontFamily: "monospace, Courier New, sans-serif",
                  color: "#111827",
                  fontSize: "11px",
                  boxSizing: "border-box",
                }}
              >
                {/* HEADER */}
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: "8px",
                  }}
                >
                  <h2
                    style={{
                      margin: "0 0 4px 0",
                      fontSize: "16px",
                      fontWeight: 800,
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    {hotelName}
                  </h2>

                  {hotelAddress && (
                    <p
                      style={{
                        margin: "2px 0",
                        fontSize: "10px",
                        color: "#4b5563",
                        whiteSpace: "normal",
                      }}
                    >
                      {hotelAddress}
                    </p>
                  )}

                  {/* {hotelPhone && (
                    <p
                      style={{
                        margin: "2px 0",
                        fontSize: "10px",
                        color: "#4b5563",
                      }}
                    >
                      Phone: {hotelPhone}
                    </p>
                  )} */}

                  {hotelGst && (
                    <p
                      style={{
                        margin: "2px 0",
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#374151",
                      }}
                    >
                      GSTIN: {hotelGst}
                    </p>
                  )}

                  <div
                    style={{
                      textAlign: "center",
                      fontWeight: 800,
                      fontSize: "11px",
                      letterSpacing: "0.5px",
                      borderTop: "1px dashed #9ca3af",
                      borderBottom: "1px dashed #9ca3af",
                      padding: "4px 0",
                      margin: "6px 0 0 0",
                    }}
                  >
                    RECEIPT / TAX INVOICE
                  </div>
                </div>

                {/* CUSTOMER & INVOICE META */}
                <div
                  style={{
                    borderBottom: "1px dashed #9ca3af",
                    paddingBottom: "6px",
                    marginBottom: "6px",
                  }}
                >
                  <div style={row}>
                    <span>Invoice No: <strong>{inv.invoiceNo}</strong></span>
                    <span>Dt: {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })}</span>
                  </div>
                  <div style={row}>
                    <span style={{ color: "#4b5563" }}>Customer:</span>
                    <strong style={{ color: "#111827" }}>{c.customerName || "Walk-in Guest"}</strong>
                  </div>
                  <div style={row}>
                    <span style={{ color: "#4b5563" }}>Phone:</span>
                    <span>{c.phoneNumber || "-"}</span>
                  </div>
                  {c.address && (
                    <div style={row}>
                      <span style={{ color: "#4b5563" }}>Address:</span>
                      <span style={{ textAlign: "right", maxWidth: "180px" }}>{c.address}</span>
                    </div>
                  )}
                </div>

                {/* ACCOMMODATION DETAILS */}
                <div
                  style={{
                    borderBottom: "1px dashed #9ca3af",
                    paddingBottom: "6px",
                    marginBottom: "6px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: "#111827",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "6px",
                    }}
                  >
                    ACCOMMODATION DETAILS
                  </div>

                  {(rooms.length > 0 ? rooms : [s]).map((room, idx) => {
                    const roomStay = {
                      bookedCheckIn: room.checkIn || s.bookedCheckIn || "",
                      bookedCheckInTime: room.checkInTime || s.bookedCheckInTime || "",
                      bookedCheckOut: room.checkOut || s.bookedCheckOut || "",
                      bookedCheckOutTime: room.checkOutTime || s.bookedCheckOutTime || "",
                      actualCheckOut:
                        room.actualCheckoutDate ||
                        room.actualCheckout ||
                        s.actualCheckOutDate ||
                        s.actualCheckOut ||
                        "",
                      actualCheckOutDate:
                        room.actualCheckoutDate ||
                        s.actualCheckOutDate ||
                        s.actualCheckOut ||
                        "",
                      actualCheckOutTime:
                        room.actualCheckoutTime ||
                        s.actualCheckOutTime ||
                        "",
                      bookedNights: room.bookedNights ?? s.bookedNights,
                      extraFullDays:
                        room.extraFullDays ??
                        (rooms.length === 1 ? extraStay.extraFullDays : 0),
                    };

                    const roomRate = Number(
                      room.perNightRoomPrice ??
                        room.pricePerNight ??
                        room.roomPricePerNight ??
                        room.roomPrice ??
                        s.pricePerNight ??
                        0
                    );
                    const roomBookedNights = Number(roomStay.bookedNights || 1);
                    const bookedStayAmount = Number(
                      room.roomRent ?? roomBookedNights * roomRate
                    );
                    const extraNights = Number(room.extraFullDays ?? 0);
                    const extraNightAmount = Number(
                      room.extraFullDayCharge ?? extraNights * roomRate
                    );
                    const roomPolicyCharge = Number(
                      room.checkoutPolicyCharge ??
                        (rooms.length === 1 ? checkoutPolicyCharge : 0)
                    );
                    const roomStayTotal =
                      bookedStayAmount + extraNightAmount + roomPolicyCharge;

                    return (
                      <div
                        key={idx}
                        style={{
                          marginTop: idx > 0 ? "8px" : "0px",
                          paddingTop: idx > 0 ? "6px" : "0px",
                          borderTop: idx > 0 ? "1px dotted #d1d5db" : "none",
                        }}
                      >
                        {/* ROOM HEADER */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontWeight: 700,
                            fontSize: "11px",
                            marginBottom: "3px",
                          }}
                        >
                          <span>
                            Room {room.roomNumber || idx + 1}{" "}
                            {room.roomType ? (
                              <span style={{ fontWeight: 400, color: "#6b7280" }}>
                                ({room.roomType})
                              </span>
                            ) : (
                              ""
                            )}
                          </span>
                          <span>
                            ₹{roomRate.toLocaleString("en-IN")}/night
                          </span>
                        </div>

                        {/* DATES */}
                        <div style={{ color: "#4b5563", fontSize: "10px", marginBottom: "4px" }}>
                          <div style={row}>
                            <span>Check-in</span>
                            <span style={{ color: "#111827", fontWeight: 600 }}>
                              {formatHumanDateTime(
                                roomStay.bookedCheckIn,
                                roomStay.bookedCheckInTime,
                                ", "
                              )}
                            </span>
                          </div>
                          <div style={row}>
                            <span>Checkout</span>
                            <span style={{ color: "#111827", fontWeight: 600 }}>
                              {formatHumanDateTime(
                                roomStay.bookedCheckOut,
                                roomStay.bookedCheckOutTime || "11:00 AM",
                                ", "
                              )}
                            </span>
                          </div>
                          <div style={row}>
                            <span>Actual Checkout Date &amp; Time</span>
                            <span style={{ color: "#111827", fontWeight: 600 }}>
                              {formatActualCheckOutDisplay(
                                roomStay.actualCheckOut,
                                roomStay.actualCheckOutDate,
                                roomStay.actualCheckOutTime,
                                formatDate,
                                formatTime,
                                ", "
                              )}
                            </span>
                          </div>
                          <div style={row}>
                            <span>Stay</span>
                            <span style={{ color: "#111827" }}>
                              {roomBookedNights} Night{roomBookedNights !== 1 ? "s" : ""}
                              {extraNights > 0
                                ? ` + ${extraNights} Extra Day${extraNights !== 1 ? "s" : ""}`
                                : ""}
                            </span>
                          </div>
                        </div>

                        {/* ROOM CALCULATIONS */}
                        <div style={{ fontSize: "10.5px" }}>
                          <div style={row}>
                            <span style={{ color: "#4b5563" }}>Room Rent</span>
                            <span style={{ fontWeight: 600 }}>
                              ₹{bookedStayAmount.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div style={row}>
                            <span style={{ color: "#4b5563" }}>Extra Night Stay Charge</span>
                            <span style={{ fontWeight: 600 }}>
                              ₹{extraNightAmount.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div style={row}>
                            <span style={{ color: "#4b5563" }}>Extra Time Stay Charge</span>
                            <span style={{ fontWeight: 600 }}>
                              ₹{roomPolicyCharge.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div
                            style={{
                              ...row,
                              fontWeight: 700,
                              borderTop: "1px dotted #e5e7eb",
                              marginTop: "2px",
                              paddingTop: "2px",
                            }}
                          >
                            <span>Room Total</span>
                            <span>
                              ₹{roomStayTotal.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* FOOD SERVICES */}
                {foodItems.length > 0 && (
                  <div
                    style={{
                      borderBottom: "1px dashed #9ca3af",
                      paddingBottom: "6px",
                      marginBottom: "6px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "#111827",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "4px",
                      }}
                    >
                      FOOD SERVICES
                    </div>
                    {foodItems.map((item, sIdx) => {
                      return (
                        <div
                          key={sIdx}
                          style={{
                            marginBottom: "4px",
                            fontSize: "10.5px",
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>
                            {item.name}
                          </div>
                          <div style={row}>
                            <span style={{ color: "#6b7280" }}>
                              {item.roomNumber
                                ? `Room ${item.roomNumber} × `
                                : "Qty: "}
                              {item.quantity}
                            </span>
                            <span style={{ fontWeight: 600 }}>
                              ₹{item.total.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ROOM SERVICES */}
                {roomServiceItems.length > 0 && (
                  <div
                    style={{
                      borderBottom: "1px dashed #9ca3af",
                      paddingBottom: "6px",
                      marginBottom: "6px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "#111827",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "4px",
                      }}
                    >
                      ROOM SERVICES
                    </div>
                    {roomServiceItems.map((item, sIdx) => {
                      return (
                        <div
                          key={sIdx}
                          style={{
                            marginBottom: "4px",
                            fontSize: "10.5px",
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>
                            {item.name}
                          </div>
                          <div style={row}>
                            <span style={{ color: "#6b7280" }}>
                              {item.roomNumber
                                ? `Room ${item.roomNumber} × `
                                : "Qty: "}
                              {item.quantity}
                            </span>
                            <span style={{ fontWeight: 600 }}>
                              ₹{item.total.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* BILL SUMMARY */}
                <div
                  style={{
                    borderBottom: "1px dashed #9ca3af",
                    paddingBottom: "6px",
                    marginBottom: "6px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: "#111827",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "4px",
                    }}
                  >
                    BILL SUMMARY
                  </div>

                  <div style={row}>
                    <span style={{ color: "#4b5563" }}>Room Rent</span>
                    <span style={{ fontWeight: 600 }}>
                      ₹{totalRoomRent.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div style={row}>
                    <span style={{ color: "#4b5563" }}>Extra Night Stay Charges</span>
                    <span style={{ fontWeight: 600 }}>
                      ₹{totalExtraStay.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div style={row}>
                    <span style={{ color: "#4b5563" }}>Extra Time Stay Charges</span>
                    <span style={{ fontWeight: 600 }}>
                      ₹{totalCheckoutCharge.toLocaleString("en-IN")}
                    </span>
                  </div>
                  {foodTotal > 0 && (
                    <div style={row}>
                      <span style={{ color: "#4b5563" }}>Food</span>
                      <span style={{ fontWeight: 600 }}>
                        ₹{foodTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                  {roomServicesTotal > 0 && (
                    <div style={row}>
                      <span style={{ color: "#4b5563" }}>Room Services</span>
                      <span style={{ fontWeight: 600 }}>
                        ₹{roomServicesTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      borderTop: "1px dotted #d1d5db",
                      marginTop: "4px",
                      paddingTop: "4px",
                    }}
                  >
                    <div style={row}>
                      <span style={{ fontWeight: 600 }}>Subtotal</span>
                      <span style={{ fontWeight: 600 }}>
                        ₹{taxableSubtotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div style={row}>
                      <span style={{ color: "#4b5563" }}>GST ({gstRate}%)</span>
                      <span>₹{gstAmount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid #111827",
                      borderBottom: "1px solid #111827",
                      padding: "4px 0",
                      margin: "6px 0",
                    }}
                  >
                    <div
                      style={{
                        ...row,
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      <span>GRAND TOTAL</span>
                      <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div>
                    <div style={row}>
                      <span style={{ color: "#4b5563" }}>
                        Advance Paid {f.advancePaidVia ? `(${f.advancePaidVia})` : ""}
                      </span>
                      <span>₹{advancePaid.toLocaleString("en-IN")}</span>
                    </div>
                    {currentPayment > 0 && (
                      <div style={row}>
                        <span style={{ color: "#4b5563" }}>Current Payment</span>
                        <span>₹{currentPayment.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div
                      style={{
                        ...row,
                        fontWeight: 700,
                        borderTop: "1px dotted #d1d5db",
                        marginTop: "3px",
                        paddingTop: "3px",
                      }}
                    >
                      <span>TOTAL PAID</span>
                      <span>₹{totalPaid.toLocaleString("en-IN")}</span>
                    </div>
                    <div
                      style={{
                        ...row,
                        fontWeight: 700,
                      }}
                    >
                      {/* <span>BALANCE DUE</span>
                      <span>₹{balanceDue.toLocaleString("en-IN")}</span> */}
                    </div>
                  </div>
                </div>

                {/* PAYMENT INFO */}
                <div
                  style={{
                    borderBottom: "1px dashed #9ca3af",
                    paddingBottom: "6px",
                    marginBottom: "8px",
                  }}
                >
                  <div style={row}>
                    <span style={{ color: "#4b5563" }}>Payment Mode:</span>
                    <span style={{ fontWeight: 700, textTransform: "uppercase" }}>
                      {p.paymentMode || "CASH"}
                    </span>
                  </div>
                  <div style={row}>
                    <span style={{ color: "#4b5563" }}>Payment Status:</span>
                    <span style={{ fontWeight: 800, color: "#047857", textTransform: "uppercase" }}>
                      {p.paymentStatus || "PAID"}
                    </span>
                  </div>
                </div>

                {/* FOOTER */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "4px 0",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  Thank You!
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
};

export default InvoiceTemplate;