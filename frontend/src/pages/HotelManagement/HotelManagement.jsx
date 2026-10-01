import React, { useState } from "react";
import { DoorOpen, LogIn, BedDouble } from "lucide-react";

import RoomAvailability from "./RoomAvailability/RoomAvailability";
import AddBooking from "./Booking/AddBooking";
import CurrentStays from "./CurrentStays/CurrentStays";
import Checkout from "../HotelManagement/Checkout/Checkout";

const styles = `
@keyframes hm-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes hm-fade{from{opacity:0}to{opacity:1}}
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

    // CLOSE CHECKOUT
    const handleCloseCheckout = () => {
        setSelectedStay(null);
        setActivePage("currentStays");
    };

    const tabHandlers = {
        availability: handleAvailability,
        booking: handleNewBooking,
        currentStays: handleCurrentStays,
    };

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
        </div>
    );
}