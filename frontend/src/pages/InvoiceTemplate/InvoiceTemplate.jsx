import React from "react";
import {
  computeExtraStayDetails,
  formatActualCheckOutDisplay,
  formatHumanDate,
  formatHumanTime,
  formatHumanDateTime,
  exportInvoicesToExcel,
} from "./stayDurationHelper.js";

const InvoiceTemplate = ({
  activeInvoice,
  pdfInvoice,
  receiptRef,
  handleDownloadPDF,
  setActiveInvoice,
  formatDate = formatHumanDate,
  formatTime = formatHumanTime,
}) => {
  return (
    <>
      {/* ============================================================
          ACTIVE INVOICE PREVIEW
      ============================================================ */}

      {activeInvoice &&
        !pdfInvoice &&
        (() => {
          const inv = activeInvoice;
          const c = inv.customer || {};
          const rooms = Array.isArray(inv.rooms)
            ? inv.rooms
            : [];
          const s = inv.staySummary || {};
          const f = inv.financials || {};
          const ec = inv.extraCharges || {};
          const p = inv.paymentInfo || {};

          // ========================================================
          // CHECKOUT TIME POLICY
          // ========================================================
          //
          // This is the charge calculated by the backend according
          // to the checkout policy.
          //
          // Example:
          // Room price = ₹250
          // Before 12 PM = 50%
          // Policy charge = ₹125
          //
          // This must NOT be added again to roomRent because the
          // backend roomRent already contains the charge.
          // ========================================================

          const checkoutPolicyCharge = Number(
            ec.checkoutPolicyCharge ??
              ec.lateCheckoutCharge ??
              ec.checkoutPolicyAmount ??
              0
          );

          // ========================================================
          // REAL EXTRA NIGHT CHARGE
          // ========================================================
          //
          // This is only for an actual additional full night.
          // It is different from the checkout time policy.
          // ========================================================

          const extraNightCharge = Number(
            ec.extraNightCharge ?? 0
          );

          const extraTimeCharge = Number(
            ec.extraTimeCharge ?? 0
          );

          const extraStay = computeExtraStayDetails(s, ec);
          const extraNightsStayed = extraStay.extraFullDays;
          const extraHoursStayed = extraStay.extraHours;
          const extraMinutesStayed = extraStay.extraMinutes;
          const extraTimeText = extraStay.extraTimeFormatted;

          // ========================================================
          // CHECKOUT POLICY LABEL
          // ========================================================

          const getCheckoutPolicyLabel = () => {
            const type = String(
              ec.checkoutPolicyType ||
                ec.policyType ||
                ""
            ).toLowerCase();

            const value = Number(
              ec.checkoutPolicyValue ??
                ec.policyValue ??
                ec.extraTimeRatePercentage ??
                0
            );

            if (
              type === "percentage" ||
              type === "percent"
            ) {
              return `${value}% of room rate`;
            }

            if (
              type === "fixed" ||
              type === "flat" ||
              type === "amount"
            ) {
              return `₹${value.toLocaleString(
                "en-IN"
              )} fixed`;
            }

            if (
              type === "before12pm"
            ) {
              return "Before 12 PM";
            }

            if (
              type === "after12pm"
            ) {
              return "After 12 PM";
            }

            if (
              type === "none" ||
              type === "disabled" ||
              type === "nocharge"
            ) {
              return "No charge";
            }

            if (
              checkoutPolicyCharge > 0
            ) {
              // If the policy type was not persisted, derive the
              // label from the actual checkout time.
              const actualTime = String(
                s.actualCheckOutTime || ""
              ).trim().toLowerCase();

              const timeMatch = actualTime.match(
                /(\d{1,2}):(\d{2})\s*(am|pm)?/
              );

              if (timeMatch) {
                let hour = Number(timeMatch[1]);
                const period = timeMatch[3];

                if (period === "pm" && hour < 12) hour += 12;
                if (period === "am" && hour === 12) hour = 0;

                return hour < 12
                  ? "Before 12 PM"
                  : "After 12 PM";
              }

              return "Checkout time policy";
            }

            return "No charge";
          };

          const checkoutPolicyLabel =
            getCheckoutPolicyLabel();

          // ========================================================
          // PAYMENT VALUES
          // ========================================================

          const advancePaid = Number(
            f.advancePaid || 0
          );

          const currentPayment = Number(
            f.currentPayment ??
              0
          );

          const totalPaid = Number(
            f.totalPaid ??
              advancePaid +
                currentPayment
          );

          const grandTotal = Number(
            f.grandTotal || 0
          );

          const balanceDue = Math.max(
            0,
            Number(
              f.balanceDue ??
                grandTotal -
                  totalPaid
            )
          );

          // ========================================================
          // OVERSTAY INFORMATION
          // ========================================================

          const overstayLabel = extraStay.overstayLabel;

          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="flex justify-between items-center border-b pb-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Receipt / Tax Invoice
                    </h2>

                    <p className="text-xs text-teal-600 font-semibold">
                      JAYAM HOTEL —{" "}
                      {inv.invoiceNo}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveInvoice(null)
                    }
                    className="text-gray-400 hover:text-gray-600 font-bold text-xl"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-4 text-sm text-gray-700">

                  {/* ==================================================
                      CUSTOMER DETAILS
                  ================================================== */}

                  <div className="bg-gray-50 p-4 rounded-lg border space-y-1">

                    <p className="flex justify-between">
                      <span className="text-gray-500">
                        Name:
                      </span>

                      <strong>
                        {c.customerName ||
                          "-"}
                      </strong>
                    </p>

                    {/* ROOM DETAILS */}

                    <div className="space-y-3 mt-3">
                      <div className="text-[10px] font-extrabold text-teal-700 uppercase tracking-wider">
                        Room Details
                      </div>

                      {rooms.length >
                      0 ? (
                        rooms.map(
                          (
                            room,
                            index
                          ) => (
                            <div
                              key={
                                room._id ||
                                index
                              }
                              className="border border-gray-200 rounded-lg bg-white p-3"
                            >
                              <p className="font-bold text-gray-800 mb-2">
                                Room{" "}
                                {index +
                                  1}
                              </p>

                              <div className="space-y-1">

                                <p className="flex justify-between">
                                  <span className="text-gray-500">
                                    Room No:
                                  </span>

                                  <strong>
                                    {room.roomNumber ||
                                      "-"}
                                  </strong>
                                </p>

                                <p className="flex justify-between">
                                  <span className="text-gray-500">
                                    Room Type:
                                  </span>

                                  <span>
                                    {room.roomType ||
                                      "-"}
                                  </span>
                                </p>

                                <p className="flex justify-between">
                                  <span className="text-gray-500">
                                    Bed Type:
                                  </span>

                                  <span>
                                    {room.bedType ||
                                      "-"}
                                  </span>
                                </p>

                                <p className="flex justify-between">
                                  <span className="text-gray-500">
                                    Price / Night:
                                  </span>

                                  <span>
                                    ₹
                                    {Number(
                                      room.perNightRoomPrice ||
                                        0
                                    ).toLocaleString(
                                      "en-IN"
                                    )}
                                  </span>
                                </p>

                              </div>
                            </div>
                          )
                        )
                      ) : (
                        <p className="text-gray-500">
                          No room details
                          available.
                        </p>
                      )}
                    </div>

                    <p className="flex justify-between">
                      <span className="text-gray-500">
                        Phone:
                      </span>

                      <span>
                        {c.phoneNumber ||
                          "-"}
                      </span>
                    </p>

                    {c.alternativePhone && (
                      <p className="flex justify-between">
                        <span className="text-gray-500">
                          Alt Phone:
                        </span>

                        <span>
                          {
                            c.alternativePhone
                          }
                        </span>
                      </p>
                    )}

                    {c.email && (
                      <p className="flex justify-between">
                        <span className="text-gray-500">
                          Email:
                        </span>

                        <span>
                          {c.email}
                        </span>
                      </p>
                    )}

                    <p className="flex justify-between">
                      <span className="text-gray-500">
                        ID Proof:
                      </span>

                      <span>
                        {c.idProofType ||
                          "-"}{" "}
                        {c.idProofNumber
                          ? `- ${c.idProofNumber}`
                          : ""}
                      </span>
                    </p>

                    <p className="flex justify-between gap-4">
                      <span className="text-gray-500 shrink-0">
                        Address:
                      </span>

                      <span className="text-right">
                        {c.address ||
                          "-"}
                      </span>
                    </p>

                    <p className="flex justify-between">
                      <span className="text-gray-500">
                        Invoice No:
                      </span>

                      <strong>
                        {inv.invoiceNo}
                      </strong>
                    </p>

                    <p className="flex justify-between">
                      <span className="text-gray-500">
                        Invoice Date:
                      </span>

                      <span>
                        {formatDate(inv.invoiceDate || inv.createdAt)}
                      </span>
                    </p>
                  </div>

                  {/* ==================================================
                      STAY SUMMARY
                  ================================================== */}

                  <div className="border-t border-b border-dashed border-gray-300 py-3">

                    <div className="text-[10px] font-extrabold text-teal-700 uppercase tracking-wider mb-2">
                      Stay Summary
                    </div>

                    <p className="flex justify-between">
                      <span className="text-gray-500">
                        Booked Check-In:
                      </span>

                      <span>
                        {formatHumanDateTime(
                          s.bookedCheckIn,
                          s.bookedCheckInTime,
                          " • "
                        )}
                      </span>
                    </p>

                    <p className="flex justify-between">
                      <span className="text-gray-500">
                        Booked Check-Out:
                      </span>

                      <span>
                        {formatHumanDateTime(
                          s.bookedCheckOut,
                          s.bookedCheckOutTime,
                          " • "
                        )}
                      </span>
                    </p>

                    <p className="flex justify-between">
                      <span className="text-gray-500">
                        Actual Check-Out:
                      </span>

                      <span className="font-bold text-emerald-700">
                        {formatActualCheckOutDisplay(
                          s.actualCheckOut,
                          s.actualCheckOutDate,
                          s.actualCheckOutTime,
                          formatDate,
                          formatTime
                        )}
                      </span>
                    </p>

                    <p className="flex justify-between">
                      <span className="text-gray-500">
                        Booked Nights:
                      </span>

                      <span>
                        {s.bookedNights ??
                          0}
                      </span>
                    </p>

                    <p className="flex justify-between">
                      <span className="text-gray-500">
                        Extra Full Days:
                      </span>

                      <span>
                        {extraStay.extraFullDays}
                      </span>
                    </p>

                    <p className="flex justify-between">
                      <span className="text-gray-500">
                        Extra Time:
                      </span>

                      <span>
                        {extraStay.extraTimeFormatted}
                      </span>
                    </p>

                    <p className="flex justify-between font-extrabold border-t border-gray-200 mt-1 pt-1">
                      <span>
                        Total Nights
                        Stayed:
                      </span>

                      <span>
                        {Number(s.bookedNights || 0) + extraStay.extraFullDays}
                      </span>
                    </p>

                    {(
                      extraStay.hasExtraStay ||
                      checkoutPolicyCharge >
                        0
                    ) && (
                      <div className="mt-2 p-2 rounded-md bg-orange-50 text-orange-800 text-xs">
                        <strong>
                          Checkout:
                        </strong>{" "}
                        {extraStay.hasExtraStay
                          ? extraStay.overstayLabel
                          : "Checkout time policy charge applied"}
                      </div>
                    )}
                  </div>

                  {/* ==================================================
                      ITEMIZED CHARGES
                  ================================================== */}

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Itemized Charges
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-200 text-xs">

                        <thead>
                          <tr className="bg-gray-100 text-left">
                            <th className="p-2 border">
                              Description
                            </th>

                            <th className="p-2 border">
                              Unit Price
                            </th>

                            <th className="p-2 border">
                              Qty
                            </th>

                            <th className="p-2 border">
                              Total
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {inv.items?.map(
                            (
                              item,
                              idx
                            ) => (
                              <tr
                                key={idx}
                              >
                                <td className="p-2 border">
                                  {
                                    item.description
                                  }
                                </td>

                                <td className="p-2 border">
                                  ₹
                                  {Number(
                                    item.unitPrice ||
                                      0
                                  ).toFixed(
                                    2
                                  )}
                                </td>

                                <td className="p-2 border">
                                  {
                                    item.quantity
                                  }
                                </td>

                                <td className="p-2 border font-semibold">
                                  ₹
                                  {Number(
                                    item.total ||
                                      0
                                  ).toFixed(
                                    2
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Additional charges are included in the itemized
                      invoice items so each charge appears exactly once. */}

                  {/* ==================================================
                      TOTALS
                  ================================================== */}

                  <div className="bg-gray-50 p-4 rounded-lg border space-y-1 text-xs">

                    {/* When itemized items are not present, fallback to summary rows */}
                    {(!inv.items || inv.items.length === 0) && (
                      <>
                        {Number(f.roomRent || 0) > 0 && (
                          <p className="flex justify-between">
                            <span className="text-gray-500">Room base rent:</span>
                            <span>₹{Number(f.roomRent || 0).toFixed(2)}</span>
                          </p>
                        )}
                        {extraNightCharge > 0 && (
                          <p className="flex justify-between text-orange-700">
                            <span>Extra full day:</span>
                            <span>₹{extraNightCharge.toFixed(2)}</span>
                          </p>
                        )}
                        {checkoutPolicyCharge > 0 && (
                          <p className="flex justify-between text-orange-700">
                            <span>Checkout policy charge:</span>
                            <span>₹{checkoutPolicyCharge.toFixed(2)}</span>
                          </p>
                        )}
                        {extraTimeCharge > 0 && checkoutPolicyCharge === 0 && (
                          <p className="flex justify-between text-orange-700">
                            <span>Extra time stay:</span>
                            <span>₹{extraTimeCharge.toFixed(2)}</span>
                          </p>
                        )}
                      </>
                    )}

                    {Number(f.foodServices || 0) > 0 && (
                      <p className="flex justify-between">
                        <span className="text-gray-500">Food:</span>
                        <span>₹{Number(f.foodServices || 0).toFixed(2)}</span>
                      </p>
                    )}
                    {Number(f.roomServices || 0) > 0 && (
                      <p className="flex justify-between">
                        <span className="text-gray-500">Room service:</span>
                        <span>₹{Number(f.roomServices || 0).toFixed(2)}</span>
                      </p>
                    )}

                    <p className="flex justify-between font-semibold border-t border-dashed border-gray-400 pt-2 mt-2">
                      <span className="text-gray-500">
                        Taxable subtotal:
                      </span>

                      <span>
                        ₹
                        {Number(
                          f.subTotal ||
                            0
                        ).toFixed(
                          2
                        )}
                      </span>
                    </p>

                    <p className="flex justify-between">
                      <span className="text-gray-500">
                        GST (
                        {Number(
                          f.gstPercentage ||
                            0
                        )}
                        %):
                      </span>

                      <span>
                        ₹
                        {Number(
                          f.gstAmount ||
                            0
                        ).toFixed(
                          2
                        )}
                      </span>
                    </p>

                    <h3 className="flex justify-between text-base font-bold text-teal-700 pt-2 border-t border-dashed border-gray-400">
                      <span>
                        Grand Total:
                      </span>

                      <span>
                        ₹
                        {grandTotal.toFixed(
                          2
                        )}
                      </span>
                    </h3>

                    <p className="flex justify-between mt-4">
                      <span className="text-gray-500">
                        Advance already paid{" "}
                        {f.advancePaidVia
                          ? `(${f.advancePaidVia})`
                          : ""}
                        :
                      </span>

                      <span>
                        ₹
                        {advancePaid.toFixed(
                          2
                        )}
                      </span>
                    </p>

                    <p className="flex justify-between">
                      <span className="text-gray-500">
                        Current Payment:
                      </span>

                      <span>
                        ₹
                        {currentPayment.toFixed(
                          2
                        )}
                      </span>
                    </p>

                    <p className="flex justify-between font-bold">
                      <span>
                        Total Paid:
                      </span>

                      <span>
                        ₹
                        {totalPaid.toFixed(
                          2
                        )}
                      </span>
                    </p>

                    <p className="flex justify-between font-extrabold border-t border-dashed border-gray-400 pt-2 mt-2">
                      <span>
                        Balance Due:
                      </span>

                      <span>
                        ₹
                        {balanceDue.toFixed(
                          2
                        )}
                      </span>
                    </p>

                  </div>

                  {/* ==================================================
                      PAYMENT
                  ================================================== */}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-teal-50 border border-teal-200 p-3 rounded-lg gap-2">

                    <div>
                      <p className="text-xs text-teal-800 font-semibold">
                        Payment Mode:{" "}
                        {p.paymentMode ||
                          "-"}
                      </p>

                      <p className="text-xs text-teal-600">
                        Paid At:{" "}
                        {formatActualCheckOutDisplay(
                          p.paidAt,
                          null,
                          null,
                          formatDate,
                          formatTime
                        )}
                      </p>
                    </div>

                    <span className="px-3 py-1 text-xs font-bold bg-green-600 text-white rounded-full">
                      {p.paymentStatus ||
                        "PAID"}
                    </span>

                  </div>

                  <p className="text-center text-xs text-gray-400 pt-2">
                    Thank you for staying
                    with Jayam Hotel. We
                    look forward to
                    welcoming you again!
                  </p>

                </div>

                {/* ==================================================
                    ACTION BUTTONS
                ================================================== */}

                <div className="mt-6 flex justify-end gap-3 border-t pt-4">

                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadPDF(
                        inv
                      )
                    }
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition cursor-pointer"
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
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition cursor-pointer"
                  >
                    Export Excel / CSV
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveInvoice(
                        null
                      )
                    }
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-400 transition cursor-pointer"
                  >
                    Close
                  </button>

                </div>

              </div>
            </div>
          );
        })()}

      {/* ============================================================
          PDF / PRINT RECEIPT
      ============================================================ */}

      {pdfInvoice &&
        (() => {
          const inv = pdfInvoice;
          const c = inv.customer || {};
          const rooms = Array.isArray(
            inv.rooms
          )
            ? inv.rooms
            : [];
          const s = inv.staySummary || {};
          const f = inv.financials || {};
          const ec = inv.extraCharges || {};
          const p = inv.paymentInfo || {};

          // ========================================================
          // CHECKOUT POLICY
          // ========================================================

          const checkoutPolicyCharge =
            Number(
              ec.lateCheckoutCharge ??
                ec.checkoutPolicyCharge ??
                ec.checkoutPolicyAmount ??
                0
            );

          // ========================================================
          // EXTRA NIGHT
          // ========================================================

          const extraNightCharge =
            Number(
              ec.extraNightCharge || 0
            );

          // ========================================================
          // EXTRA TIME
          // ========================================================

          const extraTimeCharge =
            Number(
              ec.extraTimeCharge || 0
            );

          const extraStay = computeExtraStayDetails(s, ec);
          const extraNightsStayed = extraStay.extraFullDays;
          const extraHoursStayed = extraStay.extraHours;
          const extraMinutesStayed = extraStay.extraMinutes;
          const extraTimeText = extraStay.extraTimeFormatted;

          // ========================================================
          // CHECKOUT POLICY LABEL
          // ========================================================

          const getCheckoutPolicyLabel =
            () => {
              const type = String(
                ec.checkoutPolicyType ||
                  ec.policyType ||
                  ""
              ).toLowerCase();

              const value = Number(
                ec.checkoutPolicyValue ??
                  ec.policyValue ??
                  ec.extraTimeRatePercentage ??
                  0
              );

              if (
                type ===
                  "percentage" ||
                type === "percent"
              ) {
                return `${value}% of room rate`;
              }

              if (
                type === "fixed" ||
                type === "flat" ||
                type === "amount"
              ) {
                return `₹${value.toLocaleString(
                  "en-IN"
                )} fixed`;
              }

              if (
                type ===
                "before12pm"
              ) {
                return "Before 12 PM";
              }

              if (
                type ===
                "after12pm"
              ) {
                return "After 12 PM";
              }

              if (
                type === "none" ||
                type ===
                  "disabled" ||
                type === "nocharge"
              ) {
                return "No charge";
              }

              if (
                checkoutPolicyCharge >
                0
              ) {
                return "Checkout time policy";
              }

              return "No charge";
            };

          const checkoutPolicyLabel =
            getCheckoutPolicyLabel();

          // ========================================================
          // PAYMENT VALUES
          // ========================================================

          const advancePaid = Number(
            f.advancePaid || 0
          );

          const currentPayment =
            Number(
              f.currentPayment || 0
            );

          const grandTotal = Number(
            f.grandTotal || 0
          );

          const totalPaid = Number(
            f.totalPaid ??
              advancePaid +
                currentPayment
          );

          const balanceDue =
            Math.max(
              0,
              Number(
                f.balanceDue ??
                  grandTotal -
                    totalPaid
              )
            );

          // ========================================================
          // OVERSTAY LABEL
          // ========================================================

          const overstayLabel = extraStay.overstayLabel;

          const row = {
            display: "flex",
            justifyContent:
              "space-between",
            padding: "2px 0",
            fontSize: "11px",
          };

          return (
            <div
              style={{
                position:
                  "absolute",
                top: "-9999px",
                left: "-9999px",
              }}
            >
              <div
                ref={receiptRef}
                style={{
                  width: "320px",
                  padding: "20px",
                  background:
                    "#ffffff",
                  fontFamily:
                    "monospace",
                  color: "#111827",
                  fontSize: "11px",
                }}
              >

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div
                  style={{
                    textAlign:
                      "center",
                    marginBottom:
                      "10px",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize:
                        "18px",
                      fontWeight: 800,
                      letterSpacing:
                        "1px",
                    }}
                  >
                    JAYAM HOTEL
                  </h2>

                  <p
                    style={{
                      margin:
                        "2px 0",
                      fontSize:
                        "10px",
                      color:
                        "#6b7280",
                    }}
                  >
                    From The Land Of
                    Chikmagalur
                  </p>

                  <p
                    style={{
                      margin:
                        "6px 0 0 0",
                      fontWeight: 600,
                      color:
                        "#374151",
                    }}
                  >
                    The Jayam House
                  </p>

                  <p
                    style={{
                      margin: 0,
                      fontSize:
                        "10px",
                      color:
                        "#6b7280",
                    }}
                  >
                    45, North Mada
                    Street, Mylapore,
                    Chennai 600004
                  </p>
                </div>

                <div
                  style={{
                    textAlign:
                      "center",
                    fontWeight: 800,
                    fontSize:
                      "12px",
                    letterSpacing:
                      "1px",
                    borderTop:
                      "1px dashed #d1d5db",
                    borderBottom:
                      "1px dashed #d1d5db",
                    padding:
                      "6px 0",
                    margin:
                      "8px 0",
                  }}
                >
                  RECEIPT / TAX INVOICE
                </div>

                {/* ==================================================
                    CUSTOMER / ROOM META
                ================================================== */}

                <div>

                  <div style={row}>
                    <span>
                      Name:
                    </span>

                    <strong>
                      {c.customerName ||
                        "-"}
                    </strong>
                  </div>

                  <div
                    style={{
                      margin:
                        "4px 0 6px 0",
                      padding:
                        "5px 0",
                      borderTop:
                        "1px dashed #d1d5db",
                      borderBottom:
                        "1px dashed #d1d5db",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize:
                          "9px",
                        color:
                          "#0f766e",
                        marginBottom:
                          "4px",
                        textTransform:
                          "uppercase",
                      }}
                    >
                      Room Details
                    </div>

                    {rooms.length >
                    0 ? (
                      rooms.map(
                        (
                          room,
                          index
                        ) => (
                          <div
                            key={
                              room._id ||
                              index
                            }
                            style={{
                              padding:
                                "4px 0",
                              borderBottom:
                                index <
                                rooms.length -
                                  1
                                  ? "1px dotted #d1d5db"
                                  : "none",
                            }}
                          >

                            <div
                              style={{
                                ...row,
                                fontWeight: 700,
                              }}
                            >
                              <span>
                                Room{" "}
                                {index +
                                  1}
                                :
                              </span>

                              <span>
                                {room.roomNumber ||
                                  "-"}
                              </span>
                            </div>

                            <div
                              style={row}
                            >
                              <span>
                                Type:
                              </span>

                              <span>
                                {room.roomType ||
                                  "-"}
                              </span>
                            </div>

                            <div
                              style={row}
                            >
                              <span>
                                Bed:
                              </span>

                              <span>
                                {room.bedType ||
                                  "-"}
                              </span>
                            </div>

                            <div
                              style={row}
                            >
                              <span>
                                Price /
                                Night:
                              </span>

                              <span>
                                ₹
                                {Number(
                                  room.perNightRoomPrice ||
                                    0
                                ).toFixed(
                                  2
                                )}
                              </span>
                            </div>

                          </div>
                        )
                      )
                    ) : (
                      <div
                        style={{
                          ...row,
                          color:
                            "#6b7280",
                        }}
                      >
                        <span>
                          No room
                          details
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={row}>
                    <span>
                      Phone:
                    </span>

                    <span>
                      {c.phoneNumber ||
                        "-"}
                    </span>
                  </div>

                  {c.alternativePhone && (
                    <div style={row}>
                      <span>
                        Alt Phone:
                      </span>

                      <span>
                        {
                          c.alternativePhone
                        }
                      </span>
                    </div>
                  )}

                  {c.email && (
                    <div style={row}>
                      <span>
                        Email:
                      </span>

                      <span>
                        {c.email}
                      </span>
                    </div>
                  )}

                  <div style={row}>
                    <span>
                      Address:
                    </span>

                    <span
                      style={{
                        textAlign:
                          "right",
                        maxWidth:
                          "180px",
                      }}
                    >
                      {c.address ||
                        "-"}
                    </span>
                  </div>



                  <div style={row}>
                    <span>
                      Invoice No:
                    </span>

                    <strong>
                      {inv.invoiceNo}
                    </strong>
                  </div>

                  <div style={row}>
                    <span>
                      Invoice Date:
                    </span>

                    <span>
                      {formatDate(inv.invoiceDate || inv.createdAt)}
                    </span>
                  </div>

                </div>

                {/* ==================================================
                    STAY SUMMARY
                ================================================== */}

                <div
                  style={{
                    marginTop:
                      "10px",
                    padding:
                      "10px 0",
                    borderTop:
                      "1px dashed #d1d5db",
                    borderBottom:
                      "1px dashed #d1d5db",
                  }}
                >

                  <div
                    style={{
                      fontSize:
                        "9px",
                      fontWeight: 800,
                      color:
                        "#0f766e",
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        "1px",
                      marginBottom:
                        "6px",
                    }}
                  >
                    Stay Summary
                  </div>

                  <div style={row}>
                    <span>
                      Booked Check-In:
                    </span>

                    <span>
                      {formatHumanDateTime(
                        s.bookedCheckIn,
                        s.bookedCheckInTime,
                        " • "
                      )}
                    </span>
                  </div>

                  <div style={row}>
                    <span>
                      Booked Check-Out:
                    </span>

                    <span>
                      {formatHumanDateTime(
                        s.bookedCheckOut,
                        s.bookedCheckOutTime,
                        " • "
                      )}
                    </span>
                  </div>

                  <div style={row}>
                    <span>
                      Actual Check-Out:
                    </span>

                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          "#047857",
                      }}
                    >
                      {formatActualCheckOutDisplay(
                        s.actualCheckOut,
                        s.actualCheckOutDate,
                        s.actualCheckOutTime,
                        formatDate,
                        formatTime
                      )}
                    </span>
                  </div>

                  <div style={row}>
                    <span>
                      Booked Nights:
                    </span>

                    <span>
                      {s.bookedNights ??
                        0}
                    </span>
                  </div>

                  <div style={row}>
                    <span>
                      Extra Full Days:
                    </span>

                    <span>
                      {extraStay.extraFullDays}
                    </span>
                  </div>

                  <div style={row}>
                    <span>
                      Extra Time:
                    </span>

                    <span>
                      {extraStay.extraTimeFormatted}
                    </span>
                  </div>

                  <div
                    style={{
                      ...row,
                      fontWeight: 800,
                      borderTop:
                        "1px solid #e5e7eb",
                      marginTop:
                        "4px",
                      paddingTop:
                        "5px",
                    }}
                  >
                    <span>
                      Total Nights
                      Stayed:
                    </span>

                    <span>
                      {Number(s.bookedNights || 0) + extraStay.extraFullDays}
                    </span>
                  </div>

                  {(
                    extraStay.hasExtraStay ||
                    checkoutPolicyCharge >
                      0
                  ) && (
                    <div
                      style={{
                        marginTop:
                          "6px",
                        padding:
                          "7px 8px",
                        borderRadius:
                          "6px",
                        background:
                          "#fff7ed",
                        color:
                          "#9a3412",
                        fontSize:
                          "10px",
                        lineHeight:
                          1.4,
                      }}
                    >
                      <strong>
                        Checkout:
                      </strong>{" "}
                      {extraStay.hasExtraStay
                        ? extraStay.overstayLabel
                        : "Checkout time policy charge applied"}
                    </div>
                  )}

                </div>

                {/* ==================================================
                    ITEMS TABLE
                ================================================== */}

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "6fr 2fr 4fr",
                    fontWeight: 700,
                    fontSize:
                      "10px",
                    padding:
                      "6px 0",
                    borderBottom:
                      "1px solid #e5e7eb",
                  }}
                >
                  <span>
                    Item
                  </span>

                  <span
                    style={{
                      textAlign:
                        "center",
                    }}
                  >
                    Qty
                  </span>

                  <span
                    style={{
                      textAlign:
                        "right",
                    }}
                  >
                    Total
                  </span>
                </div>

                <div
                  style={{
                    padding:
                      "6px 0",
                    borderBottom:
                      "1px dashed #d1d5db",
                  }}
                >
                  {inv.items?.length >
                  0 ? (
                    inv.items.map(
                      (
                        item,
                        idx
                      ) => (
                        <div
                          key={idx}
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "6fr 2fr 4fr",
                            padding:
                              "4px 0",
                          }}
                        >
                          <div>
                            <p
                              style={{
                                margin: 0,
                                fontWeight: 600,
                                color:
                                  "#111827",
                              }}
                            >
                              {
                                item.description
                              }
                            </p>

                            <p
                              style={{
                                margin: 0,
                                fontSize:
                                  "9px",
                                color:
                                  "#6b7280",
                              }}
                            >
                              ₹
                              {Number(
                                item.unitPrice ||
                                  0
                              ).toFixed(
                                2
                              )}
                            </p>
                          </div>

                          <div
                            style={{
                              textAlign:
                                "center",
                              fontWeight: 500,
                            }}
                          >
                            {
                              item.quantity
                            }
                          </div>

                          <div
                            style={{
                              textAlign:
                                "right",
                              fontWeight: 600,
                            }}
                          >
                            ₹
                            {Number(
                              item.total ||
                                0
                            ).toFixed(
                              2
                            )}
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <div
                      style={{
                        textAlign:
                          "center",
                        padding:
                          "10px",
                        fontSize:
                          "10px",
                        color:
                          "#9ca3af",
                      }}
                    >
                      No billing
                      items
                    </div>
                  )}
                </div>

                {/* ==================================================
                    SERVICE / BILLING SUMMARY
                ================================================== */}

                <div
                  style={{
                    marginTop:
                      "8px",
                  }}
                >

                  {/* When itemized items are not present, fallback to summary rows */}
                  {(!inv.items || inv.items.length === 0) && (
                    <>
                      {Number(f.roomRent || 0) > 0 && (
                        <div style={row}>
                          <span>Room base rent:</span>
                          <span>₹{Number(f.roomRent || 0).toFixed(2)}</span>
                        </div>
                      )}
                      {extraNightCharge > 0 && (
                        <div style={row}>
                          <span>Extra full day:</span>
                          <span>₹{extraNightCharge.toFixed(2)}</span>
                        </div>
                      )}
                      {checkoutPolicyCharge > 0 && (
                        <div style={row}>
                          <span>Checkout policy charge:</span>
                          <span>₹{checkoutPolicyCharge.toFixed(2)}</span>
                        </div>
                      )}
                      {extraTimeCharge > 0 && checkoutPolicyCharge === 0 && (
                        <div style={row}>
                          <span>Extra time stay:</span>
                          <span>₹{extraTimeCharge.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {Number(f.foodServices || 0) > 0 && (
                    <div style={row}>
                      <span>Food:</span>
                      <span>₹{Number(f.foodServices || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(f.roomServices || 0) > 0 && (
                    <div style={row}>
                      <span>Room service:</span>
                      <span>₹{Number(f.roomServices || 0).toFixed(2)}</span>
                    </div>
                  )}

                  <div
                    style={{
                      ...row,
                      fontWeight: 700,
                      borderTop:
                        "1px dashed #d1d5db",
                      paddingTop:
                        "6px",
                      marginTop:
                        "6px"
                    }}
                  >
                    <span>
                      Taxable subtotal:
                    </span>

                    <span>
                      ₹
                      {Number(
                        f.subTotal ||
                          0
                      ).toFixed(
                        2
                      )}
                    </span>
                  </div>

                  <div style={row}>
                    <span>
                      GST (
                      {Number(
                        f.gstPercentage ||
                          0
                      )}
                      %):
                    </span>

                    <span>
                      ₹
                      {Number(
                        f.gstAmount ||
                          0
                      ).toFixed(
                        2
                      )}
                    </span>
                  </div>

                </div>

                {/* ==================================================
                    GRAND TOTAL
                ================================================== */}

                <div
                  style={{
                    marginTop:
                      "10px",
                    paddingTop:
                      "8px",
                    borderTop:
                      "2px solid #111827",
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    gap: "3px",
                  }}
                >

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      fontWeight: 800,
                      fontSize:
                        "13px",
                      borderBottom:
                        "1px dashed #d1d5db",
                      paddingBottom:
                        "8px",
                      marginBottom:
                        "8px"
                    }}
                  >
                    <span>
                      GRAND TOTAL
                    </span>

                    <span
                      style={{
                        color:
                          "#065f46",
                      }}
                    >
                      ₹
                      {grandTotal.toFixed(
                        2
                      )}
                    </span>
                  </div>

                  <div style={row}>
                    <span>
                      Advance already paid
                      {f.advancePaidVia
                        ? ` (${f.advancePaidVia})`
                        : ""}
                    </span>

                    <span>
                      ₹
                      {advancePaid.toFixed(
                        2
                      )}
                    </span>
                  </div>

                  <div style={row}>
                    <span>
                      Current Payment
                    </span>

                    <span>
                      ₹
                      {currentPayment.toFixed(
                        2
                      )}
                    </span>
                  </div>

                  <div
                    style={{
                      ...row,
                      fontWeight: 700,
                    }}
                  >
                    <span>
                      Total Paid
                    </span>

                    <span>
                      ₹
                      {totalPaid.toFixed(
                        2
                      )}
                    </span>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      fontWeight: 800,
                      borderTop:
                        "1px dashed #d1d5db",
                      paddingTop:
                        "6px",
                    }}
                  >
                    <span>
                      BALANCE DUE
                    </span>

                    <span>
                      ₹
                      {balanceDue.toFixed(
                        2
                      )}
                    </span>
                  </div>

                </div>

                {/* ==================================================
                    PAYMENT INFO
                ================================================== */}

                <div
                  style={{
                    marginTop:
                      "10px",
                  }}
                >

                  <div style={row}>
                    <span>
                      Payment Mode:
                    </span>

                    <span
                      style={{
                        fontWeight: 700,
                        textTransform:
                          "uppercase",
                      }}
                    >
                      {p.paymentMode ||
                        "-"}
                    </span>
                  </div>

                  <div style={row}>
                    <span>
                      Payment Status:
                    </span>

                    <span
                      style={{
                        color:
                          "#059669",
                        fontWeight: 800,
                      }}
                    >
                      {p.paymentStatus ||
                        "PAID"}
                    </span>
                  </div>

                  <div style={row}>
                    <span>
                      Paid At:
                    </span>

                    <span>
                      {formatActualCheckOutDisplay(
                        p.paidAt,
                        null,
                        null,
                        formatDate,
                        formatTime
                      )}
                    </span>
                  </div>

                </div>

                <div
                  style={{
                    textAlign:
                      "center",
                    marginTop:
                      "14px",
                    fontSize:
                      "10px",
                    color:
                      "#6b7280",
                  }}
                >
                  <p
                    style={{
                      margin:
                        "2px 0",
                    }}
                  >
                    Thank you for
                    visiting.
                  </p>

                  <p
                    style={{
                      margin:
                        "2px 0",
                    }}
                  >
                    We hope to serve
                    you again soon!
                  </p>
                </div>

              </div>
            </div>
          );
        })()}
    </>
  );
};

export default InvoiceTemplate;