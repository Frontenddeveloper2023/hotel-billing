import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import InvoiceTemplate from "../InvoiceTemplate/InvoiceTemplate";
import { DoorOpen, LogIn, BedDouble, CheckCircle2, Printer, Receipt } from "lucide-react";

import RoomAvailability from "./RoomAvailability/RoomAvailability";
import AddBooking from "./Booking/AddBooking";
import CurrentStays from "./CurrentStays/CurrentStays";
import Checkout from "../HotelManagement/Checkout/Checkout";

const styles = `
@keyframes hm-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes hm-fade{from{opacity:0}to{opacity:1}}
@keyframes successPopIn{0%{opacity:0;transform:translateY(12px) scale(0.96)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes successIconPop{0%{opacity:0;transform:scale(0.45)}65%{opacity:1;transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
.hm-in{animation:hm-up .4s cubic-bezier(.2,.7,.2,1) both}
.hm-fade{animation:hm-fade .3s ease-out both}
.hm-scroll{scrollbar-width:none}
.hm-scroll::-webkit-scrollbar{display:none}
@media (prefers-reduced-motion:reduce){.hm-in,.hm-fade{animation:none}}
`;

const tabs = [
    { key: "availability", label: "Room Availability", icon: DoorOpen },
    { key: "booking", label: "Check-In", icon: LogIn },
    { key: "currentStays", label: "Current Stays", icon: BedDouble },
];

export default function HotelManagement() {
    const [activePage, setActivePage] = useState("availability");
    const [selectedStay, setSelectedStay] = useState(null);
    const [successData, setSuccessData] = useState(null);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const receiptRef = useRef(null);

    // GENERATE PDF
    useEffect(() => {
        if (!successData || successData.pdfBlob || !receiptRef.current) return;

        let cancelled = false;

        const generatePdf = async () => {
            try {
                const canvas = await html2canvas(receiptRef.current, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                });
                if (cancelled) return;

                const imgData = canvas.toDataURL("image/png");
                const pdfWidth = 80;
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                
                const pdf = new jsPDF({
                    orientation: "portrait",
                    unit: "mm",
                    format: [pdfWidth, pdfHeight],
                });

                pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                const generatedBlob = pdf.output("blob");

                if (!cancelled && generatedBlob.size > 0) {
                    setSuccessData(prev => ({ ...prev, pdfBlob: generatedBlob }));
                }
            } catch (error) {
                console.error("PDF Generation error:", error);
            }
        };

        // Small delay to ensure styles and images are loaded in InvoiceTemplate
        const timer = setTimeout(generatePdf, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [successData]);

    // BOOKING COMPLETED
    const handleBookingComplete = (booking) => {
        console.log("Booking completed:", booking);
        setSelectedStay(null);
        setActivePage("availability");
    };

    // CURRENT STAY -> CHECKOUT
    const handleCheckout = (stay) => {
        console.log("=================================");
        console.log("PROCEED TO BILL");
        console.log("CHECKOUT DATA:", stay);
        console.log("ROOMS:", stay?.rooms);
        console.log("=================================");

        if (!stay) {
            console.error("Cannot proceed to bill: stay data is missing.");
            return;
        }

        setSelectedStay(stay);
        setActivePage("checkout");
    };

    // BACK TO AVAILABILITY
    const handleAvailability = () => {
        setSelectedStay(null);
        setActivePage("availability");
    };

    // NEW BOOKING
    const handleNewBooking = () => {
        setSelectedStay(null);
        setActivePage("booking");
    };

    // BACK TO CURRENT STAYS
    const handleCurrentStays = () => {
        setSelectedStay(null);
        setActivePage("currentStays");
    };

    // CLOSE CHECKOUT — payment done, show success overlay
    const handleCloseCheckout = (data) => {
        setSelectedStay(null);
        setActivePage("currentStays");
        if (data?.invoice) {
            setSuccessData(data);
        }
    };

    // CLOSE SUCCESS POPUP
    const handleCloseSuccess = () => {
        setSuccessData(null);
    };

    // EMAIL SHARE
    const handleSendEmail = async () => {
        const customer = successData?.customer || {};
        const invoice = successData?.invoice || {};
        const pdfBlob = successData?.pdfBlob;
        const email = customer?.email || "";
        const invoiceNo = invoice?.invoiceNo || "N/A";
        const name = customer?.customerName || "Guest";

        const amount = Number(
            successData?.grandTotal ??
            invoice?.grandTotal ??
            invoice?.totalAmount ??
            0
        ).toFixed(2);

        const method = (successData?.paymentMethod || "CASH").toUpperCase();

        if (!email.trim()) {
            alert("Customer email address is not available.");
            return;
        }

        if (!pdfBlob) {
            alert("Invoice PDF is not available. Please wait a moment and try again.");
            return;
        }

        if (!pdfBlob.size || pdfBlob.size <= 0) {
            alert("Invoice PDF is empty. Please generate the invoice again.");
            return;
        }

        try {
            setIsSendingEmail(true);

            const formData = new FormData();
            formData.append("email", email.trim());
            formData.append("customerName", name);
            formData.append("invoiceNo", invoiceNo);
            formData.append("amount", amount);
            formData.append("paymentMethod", method);
            formData.append("pdf", pdfBlob, `Invoice_${invoiceNo}.pdf`);

            const baseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

            const response = await fetch(`${baseUrl}/api/invoice-management/send-email`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || "Failed to send invoice email.");
            }

            alert(`Invoice PDF sent successfully to ${email}.`);
        } catch (error) {
            console.error("[HotelManagement] Invoice email error:", error);
            alert(error?.message || "Failed to send invoice email.");
        } finally {
            setIsSendingEmail(false);
        }
    };


    const tabHandlers = {
        availability: handleAvailability,
        booking: handleNewBooking,
        currentStays: handleCurrentStays,
    };

    const customer = successData?.customer || {};
    const invoice = successData?.invoice || {};

    return (
        <div className="min-h-screen font-['Inter']">
            <style>{styles}</style>

            {/* TOP NAVIGATION */}
            <div className="hm-in rounded-3xl bg-white shadow-[0_14px_36px_rgba(6,20,52,0.14)] mb-5 overflow-hidden">
                <div className="px-2 sm:px-4">
                    <div className="flex items-center gap-1 overflow-x-auto hm-scroll">
                        {tabs.map(({ key, label, icon: Icon }) => {
                            const active = activePage === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={tabHandlers[key]}
                                    className={`relative inline-flex items-center gap-2 px-4 sm:px-5 py-4 text-sm cursor-pointer font-semibold whitespace-nowrap transition-colors ${
                                        active ? "text-[#2568e0]" : "text-[#6b7f99] hover:text-[#0e2a4a]"
                                    }`}
                                >
                                    <Icon size={16} className={active ? "text-[#2568e0]" : "text-[#8fa2ba]"} />
                                    {label}
                                    <span
                                        className={`absolute left-3 right-3 -bottom-px h-[3px] rounded-full bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] transition-transform duration-300 origin-left ${
                                            active ? "scale-x-100" : "scale-x-0"
                                        }`}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <main key={activePage} className="hm-fade max-w-7xl">
                {activePage === "availability" && (
                    <RoomAvailability onNewBooking={handleNewBooking} />
                )}

                {activePage === "booking" && (
                    <AddBooking onComplete={handleBookingComplete} onCancel={handleAvailability} />
                )}

                {activePage === "currentStays" && (
                    <CurrentStays onCheckout={handleCheckout} />
                )}

                {activePage === "checkout" && selectedStay && (
                    <Checkout stay={selectedStay} onClose={handleCloseCheckout} />
                )}
            </main>

            {/* ============================================================
                SUCCESS POPUP — shown after payment, outside Checkout tree
            ============================================================ */}

            {/* Hidden invoice used for PDF rendering */}
            {successData && !successData.pdfBlob && (
                <div className="pointer-events-none fixed -left-[10000px] top-0 z-[-1]">
                    <InvoiceTemplate
                        activeInvoice={null}
                        pdfInvoice={successData.invoice}
                        receiptRef={receiptRef}
                    />
                </div>
            )}

            {successData && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#040e24]/50 p-4 backdrop-blur-[6px]">
                    <div
                        className="w-full max-w-[440px] overflow-hidden rounded-[20px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.28)]"
                        style={{ animation: "successPopIn .32s ease-out" }}
                    >
                        <div className="px-6 pb-7 pt-8 text-center">

                            {/* ICON */}
                            <div
                                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#83E8DD]"
                                style={{ animation: "successIconPop .42s cubic-bezier(.2,.8,.2,1)" }}
                            >
                                <CheckCircle2 className="h-8 w-8 text-[#00796B]" strokeWidth={2.7} />
                            </div>

                            {/* TITLE */}
                            <h2 className="mt-4 text-[22px] font-bold tracking-tight text-[#0e2a4a]">
                                Checkout Successful!
                            </h2>
                            <p className="mt-1 text-[12px] text-[#6b7f99]">
                                Invoice{" "}
                                <span className="font-semibold text-[#0e2a4a]">{invoice.invoiceNo || "—"}</span>{" "}
                                generated successfully.
                            </p>

                            {/* GUEST INFO */}
                            <div className="mt-5 rounded-[14px] bg-gradient-to-br from-[#EAF3FF] to-[#F0F4FF] border border-[#DBEAFE] px-4 py-3.5 text-left">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#2568e0] mb-2.5">Guest Information</p>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#DBEAFE] text-[9px] shrink-0">👤</span>
                                        <span className="text-[12px] font-semibold text-[#0e2a4a] truncate">{customer.customerName || "—"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#DBEAFE] text-[9px] shrink-0">✉</span>
                                        <span className="text-[11px] text-[#4b5563] truncate">{customer.email || "No email on record"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#DBEAFE] text-[9px] shrink-0">📞</span>
                                        <span className="text-[11px] text-[#4b5563]">{customer.phoneNumber || "No phone on record"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* SEND INVOICE — PRIMARY */}
                            <div className="mt-5">
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#6b7f99]">Send Invoice To Guest</p>
                                <div className="grid gap-3">
                                    <button
                                        type="button"
                                        onClick={handleSendEmail}
                                        disabled={isSendingEmail}
                                        className="
                                            flex h-12 items-center justify-center gap-2
                                            rounded-xl bg-orange-500
                                            text-[13px] font-bold text-white
                                            shadow-[0_4px_14px_rgba(245,158,11,0.35)]
                                            transition
                                            hover:bg-[#d97706]
                                            disabled:cursor-not-allowed
                                            disabled:opacity-60
                                        "
                                    >
                                        {isSendingEmail ? (
                                            <>
                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                Sending invoice...
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-[20px]">📧</span>
                                                Send invoice to Email
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* CLOSE */}
                            <button
                                type="button"
                                onClick={handleCloseSuccess}
                                className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-[#E5E7EB] text-[13px] font-semibold text-[#0e2a4a] transition hover:bg-[#DDE0E4]"
                            >
                                Close
                            </button>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}