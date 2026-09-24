import React, { useState } from "react";

import RoomAvailability from "./RoomAvailability/RoomAvailability";
import AddBooking from "./Booking/AddBooking";
import CurrentStays from "./CurrentStays/CurrentStays";
import Checkout from "../HotelManagement/Checkout/Checkout";

export default function HotelManagement() {
    const [activePage, setActivePage] = useState("availability");

    const [selectedStay, setSelectedStay] = useState(null);

    // =====================================================
    // BOOKING COMPLETED
    // =====================================================
    const handleBookingComplete = (booking) => {
        console.log("Booking completed:", booking);

        setSelectedStay(null);
        setActivePage("availability");
    };

    // =====================================================
    // CURRENT STAY -> CHECKOUT
    // =====================================================
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

    // =====================================================
    // BACK TO AVAILABILITY
    // =====================================================
    const handleAvailability = () => {
        setSelectedStay(null);
        setActivePage("availability");
    };

    // =====================================================
    // NEW BOOKING
    // =====================================================
    const handleNewBooking = () => {
        setSelectedStay(null);
        setActivePage("booking");
    };

    // =====================================================
    // BACK TO CURRENT STAYS
    // =====================================================
    const handleCurrentStays = () => {
        setSelectedStay(null);
        setActivePage("currentStays");
    };

    // =====================================================
    // CLOSE CHECKOUT
    // =====================================================
    const handleCloseCheckout = () => {
        setSelectedStay(null);
        setActivePage("currentStays");
    };

    return (
        <div className="min-h-screen bg-slate-50">

            {/* =====================================================
                TOP NAVIGATION
            ===================================================== */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">

                    <div className="flex  items-center gap-1 overflow-x-auto">

                        {/* ROOM AVAILABILITY */}
                        <button
                            type="button"
                            onClick={handleAvailability}
                            className={`px-5 py-4 text-sm cursor-pointer font-semibold whitespace-nowrap border-b-2 transition ${
                                activePage === "availability"
                                    ? "text-[var(--teal-dark,#065b62)] border-[var(--teal-dark,#065b62)]"
                                    : "text-slate-500 border-transparent hover:text-slate-800"
                            }`}
                        >
                            Room Availability
                        </button>

                        {/* CHECK-IN */}
                        <button
                            type="button"
                            onClick={handleNewBooking}
                            className={`px-5 py-4 text-sm cursor-pointer font-semibold whitespace-nowrap border-b-2 transition ${
                                activePage === "booking"
                                    ? "text-[var(--teal-dark,#065b62)] border-[var(--teal-dark,#065b62)]"
                                    : "text-slate-500 border-transparent hover:text-slate-800"
                            }`}
                        >
                            Check-In
                        </button>

                        {/* CURRENT STAYS */}
                        <button
                            type="button"
                            onClick={handleCurrentStays}
                            className={`px-5 py-4 text-sm cursor-pointer font-semibold whitespace-nowrap border-b-2 transition ${
                                activePage === "currentStays"
                                    ? "text-[var(--teal-dark,#065b62)] border-[var(--teal-dark,#065b62)]"
                                    : "text-slate-500 border-transparent hover:text-slate-800"
                            }`}
                        >
                            Current Stays
                        </button>

                    </div>
                </div>
            </div>

            {/* =====================================================
                MAIN CONTENT
            ===================================================== */}
            <main className="max-w-7xl ">

                {/* ROOM AVAILABILITY */}
                {activePage === "availability" && (
                    <RoomAvailability
                        onNewBooking={handleNewBooking}
                    />
                )}

                {/* ADD BOOKING */}
                {activePage === "booking" && (
                    <AddBooking
                        onComplete={handleBookingComplete}
                        onCancel={handleAvailability}
                    />
                )}

                {/* CURRENT STAYS */}
                {activePage === "currentStays" && (
                    <CurrentStays
                        onCheckout={handleCheckout}
                    />
                )}

                {/* CHECKOUT / BILL */}
                {activePage === "checkout" && selectedStay && (
                    <Checkout
                        stay={selectedStay}
                        onClose={handleCloseCheckout}
                    />
                )}

            </main>
        </div>
    );
}