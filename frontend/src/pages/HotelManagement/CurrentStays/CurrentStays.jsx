import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  BedDouble,
  CalendarDays,
  LogOut,
  PlusCircle,
  CheckCircle2,
  Clock,
  X,
  AlertCircle,
  CheckSquare,
  Square,
} from "lucide-react";
import AddServiceModal from "./Components/AddServiceModal";
import { getActiveBookings } from "../../../service/bookingApi";

export default function CurrentStays({ onCheckout }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [activeService, setActiveService] = useState(null);
  const [checkoutCustomer, setCheckoutCustomer] = useState(null);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [checkoutTime, setCheckoutTime] = useState("11:00");
  const [checkoutAmPm, setCheckoutAmPm] = useState("AM");
  const [showTimePicker, setShowTimePicker] = useState(false);

  const money = (v) => Number(v || 0);

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (value) => {
    if (!value) return "-";
    const text = String(value).trim().toUpperCase();

    const ampm = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (ampm) {
      return `${String(Number(ampm[1])).padStart(2, "0")}:${ampm[2]} ${ampm[3]}`;
    }

    const m = text.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return text;

    let h = Number(m[1]);
    const min = m[2];
    const period = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${String(h).padStart(2, "0")}:${min} ${period}`;
  };

  const parseMinutes = (value) => {
    const text = String(value || "").trim().toUpperCase();
    const m = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (m) {
      let h = Number(m[1]);
      const min = Number(m[2]);
      if (m[3] === "AM" && h === 12) h = 0;
      if (m[3] === "PM" && h !== 12) h += 12;
      return h * 60 + min;
    }

    const m24 = text.match(/^(\d{1,2}):(\d{2})$/);
    return m24 ? Number(m24[1]) * 60 + Number(m24[2]) : 0;
  };

  const dateOnly = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  };

  const combineDateTime = (dateValue, timeValue) => {
    const d = dateOnly(dateValue);
    if (!d || !timeValue) return null;
    const mins = parseMinutes(timeValue);
    return new Date(Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      Math.floor(mins / 60),
      mins % 60,
      0,
      0
    ));
  };

  const todayIndiaISO = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const get = (t) => parts.find((p) => p.type === t)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  };

  const getTodayDisplay = () => formatDate(`${todayIndiaISO()}T00:00:00Z`);

  const nightsBetween = (checkIn, checkOut) => {
    const a = dateOnly(checkIn);
    const b = dateOnly(checkOut);
    if (!a || !b) return 1;
    return Math.max(1, Math.round((b - a) / 86400000));
  };

  const activeRoom = (room) => {
    const status = String(room?.checkoutStatus || "").toLowerCase();
    return status === "staying" || status === "overstayed";
  };

  // Booking API is now the source for current stays.
  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getActiveBookings();
      const list =
        response?.data ||
        response?.bookings ||
        response ||
        [];
      setBookings(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(
        err?.message ||
          err?.response?.data?.message ||
          "Failed to load current stays."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
    const timer = setInterval(loadBookings, 60000);
    return () => clearInterval(timer);
  }, []);

  // Flatten Booking.rooms into customer groups.
  // A room keeps bookingId so checkout can work with multiple bookings.
  const customerGroups = useMemo(() => {
    const map = new Map();

    bookings.forEach((booking) => {
      const customer = booking?.customerId || {};
      const customerId =
        typeof customer === "object" ? customer?._id : customer;

      const key = String(customerId || booking?._id || "");

      const rooms = Array.isArray(booking?.rooms)
        ? booking.rooms.filter(activeRoom)
        : [];

      if (!rooms.length) return;

      if (!map.has(key)) {
        map.set(key, {
          customerId,
          customer:
            typeof customer === "object"
              ? customer
              : {
                  _id: customerId,
                  customerName: booking?.customerName || "-",
                  phoneNumber: booking?.phoneNumber || "",
                },
          bookings: [],
          rooms: [],
        });
      }

      const group = map.get(key);

      group.bookings.push(booking);

      rooms.forEach((room) => {
        group.rooms.push({
          ...room,
          bookingId: booking._id,
          booking,
          customer:
            typeof customer === "object" ? customer : group.customer,
          initialPaidAmount: money(booking.initialPaidAmount),
          initialPaidUsedAmount: money(booking.initialPaidUsedAmount),
          initialPaidAvailable: Math.max(
            0,
            money(booking.initialPaidAmount) -
              money(booking.initialPaidUsedAmount)
          ),
        });
      });
    });

    return Array.from(map.values());
  }, [bookings]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customerGroups;

    return customerGroups.filter((group) => {
      const c = group.customer || {};
      return (
        String(c.customerName || "").toLowerCase().includes(q) ||
        String(c.phoneNumber || "").includes(q) ||
        group.rooms.some((r) =>
          String(r.roomNumber || "").toLowerCase().includes(q)
        )
      );
    });
  }, [customerGroups, searchQuery]);

  const roomKey = (room) =>
    `${String(room.bookingId)}:${String(room._id || room.roomId)}`;

  const isSelected = (room) =>
    selectedRooms.some((r) => roomKey(r) === roomKey(room));

  const toggleRoom = (room) => {
    setSelectedRooms((prev) =>
      isSelected(room)
        ? prev.filter((r) => roomKey(r) !== roomKey(room))
        : [...prev, room]
    );
  };

  const toggleAll = (rooms) => {
    const allSelected = rooms.every(isSelected);

    if (allSelected) {
      const keys = new Set(rooms.map(roomKey));
      setSelectedRooms((prev) => prev.filter((r) => !keys.has(roomKey(r))));
    } else {
      setSelectedRooms((prev) => {
        const existing = new Set(prev.map(roomKey));
        return [
          ...prev,
          ...rooms.filter((r) => !existing.has(roomKey(r))),
        ];
      });
    }
  };

  const openCheckout = (group) => {
    setCheckoutCustomer(group);
    setSelectedRooms([]);
    setCheckoutTime("11:00");
    setCheckoutAmPm("AM");
    setShowTimePicker(false);
  };

  const prepareCheckout = () => {
    if (!checkoutCustomer) return;

    if (!selectedRooms.length) {
      alert("Please select at least one room to checkout.");
      return;
    }

    const actualDate = todayIndiaISO();
    const actualTime = `${checkoutTime} ${checkoutAmPm}`;

    const selected = selectedRooms.map((room) => {
      const bookedNights = nightsBetween(room.checkIn, room.checkOut);

      const bookedOut = combineDateTime(
        room.checkOut,
        room.checkOutTime
      );
      const actualOut = combineDateTime(actualDate, actualTime);

      let extraMinutes = 0;
      if (bookedOut && actualOut) {
        extraMinutes = Math.max(
          0,
          Math.floor((actualOut - bookedOut) / 60000)
        );
      }

      const extraNights = Math.floor(extraMinutes / 1440);
      const remaining = extraMinutes % 1440;
      const extraHours = Math.floor(remaining / 60);
      const extraMins = remaining % 60;

      const rate = money(room.pricePerNight);
      const roomRent = rate * bookedNights;
      const extraNightCharge = rate * extraNights;

      let extraTimeCharge = 0;
      let extraTimeChargeType = "No extra time charge";
      if (extraHours > 0 || extraMins > 0) {
        if (parseMinutes(actualTime) < 720) {
          extraTimeCharge = rate * 0.5;
          extraTimeChargeType = "50% Before 12 PM";
        } else {
          extraTimeCharge = rate;
          extraTimeChargeType = "100% After 12 PM";
        }
      }

      const foodServices = Array.isArray(room.foodServices)
        ? room.foodServices
        : [];
      const roomServices = Array.isArray(room.roomServices)
        ? room.roomServices
        : [];

      const foodTotal = foodServices.reduce(
        (sum, item) => sum + money(item.total ?? money(item.price) * money(item.quantity || 1)),
        0
      );

      const roomServiceTotal = roomServices.reduce(
        (sum, item) => sum + money(item.total ?? money(item.fees) * money(item.quantity || 1)),
        0
      );

      const extraChargeTotal =
        extraNightCharge + extraTimeCharge;

      return {
        ...room,
        bookingId: room.bookingId,
        roomId: room.roomId || room._id,
        roomNumber: room.roomNumber,
        bookedNights,
        roomRent,
        extraNights,
        extraHours,
        extraMinutes: extraMins,
        extraNightCharge,
        extraTimeCharge,
        extraChargeTotal,
        extraTimeChargeType,
        foodServices,
        roomServices,
        foodTotal,
        roomServiceTotal,
        totalBeforeAdvance:
          roomRent +
          foodTotal +
          roomServiceTotal +
          extraChargeTotal,
      };
    });

    // IMPORTANT:
    // Initial payment belongs to BOOKING, not room.
    // Therefore one booking's remaining advance is applied only once,
    // even when multiple rooms from that booking are selected.
    const bookingMap = new Map();

    selected.forEach((room) => {
      const key = String(room.bookingId);
      if (!bookingMap.has(key)) {
        const booking = room.booking || {};
        bookingMap.set(key, {
          bookingId: room.bookingId,
          booking,
          rooms: [],
          initialPaidAmount: money(booking.initialPaidAmount),
          initialPaidUsedAmount: money(booking.initialPaidUsedAmount),
        });
      }
      bookingMap.get(key).rooms.push(room);
    });

    const checkoutBookings = Array.from(bookingMap.values()).map((item) => {
      const availableAdvance = Math.max(
        0,
        item.initialPaidAmount - item.initialPaidUsedAmount
      );

      const subtotal = item.rooms.reduce(
        (sum, room) => sum + money(room.totalBeforeAdvance),
        0
      );

      return {
        ...item,
        availableAdvance,
        subtotal,
        balanceAfterAdvance: Math.max(
          0,
          subtotal - availableAdvance
        ),
      };
    });

    const totalSubtotal = checkoutBookings.reduce(
      (sum, b) => sum + b.subtotal,
      0
    );
    const totalAdvance = checkoutBookings.reduce(
      (sum, b) => sum + b.availableAdvance,
      0
    );
    const totalDue = Math.max(0, totalSubtotal - totalAdvance);

    const paymentDetails = {
      customerId: checkoutCustomer.customerId,
      customer: checkoutCustomer.customer,
      selectedRooms: selected,
      rooms: selected,
      checkoutBookings,
      actualCheckoutDate: actualDate,
      actualCheckoutTime: actualTime,
      actualCheckoutDateTime: `${actualDate}T00:00:00.000Z`,
      billing: {
        subtotal: totalSubtotal,
        roomSubtotal: selected.reduce(
          (sum, r) => sum + money(r.roomRent),
          0
        ),
        foodTotal: selected.reduce(
          (sum, r) => sum + money(r.foodTotal),
          0
        ),
        roomServiceTotal: selected.reduce(
          (sum, r) => sum + money(r.roomServiceTotal),
          0
        ),
        extraChargeTotal: selected.reduce(
          (sum, r) => sum + money(r.extraChargeTotal),
          0
        ),
        advancePaid: totalAdvance,
        grandTotal: totalSubtotal,
        balanceDue: totalDue,
      },
    };

    if (typeof onCheckout !== "function") {
      console.error("CurrentStays: onCheckout prop is missing.");
      return;
    }

    onCheckout(paymentDetails, totalDue);
    setCheckoutCustomer(null);
    setSelectedRooms([]);
  };

  return (
    <div className="max-w-7xl  space-y-3 font-['Inter']">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
       
          <h1 className="mt-2 text-[clamp(1.4rem,1rem+1.4vw,2rem)] font-extrabold tracking-[-0.03em] text-white">
            Current Stays
          </h1>
        
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9aabc0]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, room, phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#f6f9fe] border border-[#dbe6f5] rounded-xl text-sm text-[#0e2a4a] placeholder:text-[#9aabc0] focus:outline-none focus:bg-white focus:border-[#3b82f0] focus:ring-2 focus:ring-[#3b82f0]/20 transition"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

{/* ==========================================
    CURRENT STAYS - PROFESSIONAL HOTEL UI
========================================== */}

<div className="space-y-5">

  


  {/* ==========================================
      LOADING
  ========================================== */}

  {loading ? (
    <div className="bg-white border border-[#dbe6f5] rounded-2xl shadow-[0_2px_8px_rgba(6,20,52,0.08)] p-12 text-center">

      <div className="relative mx-auto w-10 h-10">
        <div className="h-10 w-10 rounded-full border-[3px] border-[#dbe6f5]" />
        <div className="absolute inset-0 h-10 w-10 rounded-full border-[3px] border-transparent border-t-[#2568e0] animate-spin" />
      </div>

      <p className="mt-4 text-sm font-semibold text-[#6b7f99]">
        Loading current stays...
      </p>

      <p className="mt-1 text-xs text-[#9aabc0]">
        Please wait while we fetch active guests.
      </p>

    </div>
  ) : !filteredGroups.length ? (

    /* ==========================================
        EMPTY STATE
    ========================================== */

    <div className="bg-white border border-[#dbe6f5] rounded-2xl shadow-[0_2px_8px_rgba(6,20,52,0.08)] p-12 text-center">

      <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f4f8fd] border border-[#dbe6f5] flex items-center justify-center">
        <BedDouble className="w-7 h-7 text-[#9aabc0]" />
      </div>

      <h3 className="mt-4 text-sm font-bold text-[#0e2a4a]">
        No active stays
      </h3>

      <p className="mt-1 text-xs text-[#6b7f99]">
        There are currently no guests staying at the hotel.
      </p>

    </div>

  ) : (

    /* ==========================================
        CUSTOMER CARDS
    ========================================== */

    <div className="space-y-5">

      {filteredGroups.map((group) => (

        <div
          key={String(group.customerId)}
          className="bg-white border border-[#dbe6f5] rounded-3xl shadow-[0_18px_45px_rgba(6,20,52,0.16)] overflow-hidden transition-all duration-300 hover:shadow-[0_24px_55px_rgba(6,20,52,0.22)] hover:-translate-y-1 group"
        >

          {/* ==================================
              CUSTOMER HEADER
          ================================== */}

          <div className="relative px-5 sm:px-6 py-4 bg-gradient-to-r from-[#f4f8fd] to-white border-b border-[#e7eff8] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />

            <div className="flex items-center gap-3">

              {/* CUSTOMER AVATAR */}

            


              {/* CUSTOMER INFO */}

              <div>

                <div className="flex flex-wrap items-center gap-2">

                  <h3 className="text-sm sm:text-base font-bold text-[#0e2a4a]">
                    {group.customer?.customerName || "-"}
                  </h3>

                  <span className="
                    inline-flex
                    items-center
                    gap-1.5
                    px-2
                    py-1
                    rounded-full
                    bg-emerald-50
                    border border-emerald-100
                    text-[10px]
                    font-bold
                    text-emerald-700
                    uppercase
                    tracking-wide
                  ">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Staying
                  </span>

                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">

                  <span className="text-xs text-[#6b7f99]">
                    {group.customer?.phoneNumber || "No phone number"}
                  </span>

                  <span className="text-xs text-[#9aabc0]">
                    {group.rooms.length} room
                    {group.rooms.length !== 1 ? "s" : ""}
                  </span>

                </div>

              </div>

            </div>


            {/* CHECKOUT BUTTON */}

            <button
              type="button"
              onClick={() => openCheckout(group)}
              className="
                group/co
                w-full sm:w-auto
                relative overflow-hidden
                inline-flex items-center justify-center gap-2
                px-5 py-2.5
                rounded-xl
                bg-gradient-to-r from-orange-500 via-orange-500 to-amber-400
                hover:from-orange-600 hover:via-orange-500 hover:to-amber-500
                active:scale-[0.97]
                text-white text-xs font-bold
                cursor-pointer
                shadow-[0_4px_14px_rgba(249,115,22,0.4)]
                hover:shadow-[0_6px_20px_rgba(249,115,22,0.55)]
                transition-all duration-200
              "
            >
              {/* shimmer sweep on hover */}
              <span className="absolute inset-0 translate-x-[-100%] group-hover/co:translate-x-[100%] transition-transform duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              <LogOut className="w-4 h-4 transition-transform duration-200 group-hover/co:translate-x-0.5" />
              Checkout Guest
            </button>

          </div>


          {/* ==================================
              DESKTOP COLUMN HEADER
          ================================== */}

          <div className="
            hidden
            lg:grid
            grid-cols-[1.1fr_1.3fr_1.2fr_1.1fr_190px]
            gap-4
            px-5
            py-3
            bg-[#f4f8fd]/70
            border-b border-[#e7eff8]
            text-[10px]
            font-bold
            uppercase
            tracking-wider
            text-[#9aabc0]
          ">

            <div>Room</div>
            <div>Room Details</div>
            <div>Check-In</div>
            <div>Check-Out</div>
            <div className="text-right">Actions</div>

          </div>


          {/* ==================================
              ROOM ROWS
          ================================== */}

          <div className="divide-y divide-[#e7eff8]">

            {group.rooms.map((room) => {

              const over =
                String(room.checkoutStatus || "").toLowerCase() ===
                "overstayed";

              return (

                <div
                  key={roomKey(room)}
                  className="
                    px-5 sm:px-6
                    py-5
                    hover:bg-[#f4f8fd]/60
                    transition
                  "
                >

                  {/* ==========================
                      DESKTOP
                  ========================== */}

                  <div className="
                    hidden
                    lg:grid
                    grid-cols-[1.1fr_1.3fr_1.2fr_1.1fr_190px]
                    gap-4
                    items-center
                  ">

                    {/* ROOM */}

                    <div>

                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] shadow-md shadow-blue-500/25">

                        <BedDouble className="w-4 h-4 text-white" />

                        <span className="text-sm font-extrabold text-white">
                          {room.roomNumber}
                        </span>

                      </div>

                    </div>


                    {/* ROOM DETAILS */}

                    <div>

                      <p className="text-sm font-bold text-[#0e2a4a]">
                        {room.roomType || "-"}
                      </p>

                      <p className="text-xs text-[#9aabc0] mt-1">
                        {room.bedType || "-"}
                      </p>

                    </div>


                    {/* CHECK IN */}

                    <div>

                      <div className="flex items-start gap-2">

                        <CalendarDays className="w-4 h-4 mt-0.5 text-[#2568e0] shrink-0" />

                        <div>

                          <p className="text-xs font-bold text-[#0e2a4a]">
                            {formatDate(room.checkIn)}
                          </p>

                          <p className="text-xs text-[#6b7f99] mt-0.5">
                            {formatTime(room.checkInTime)}
                          </p>

                        </div>

                      </div>

                    </div>


                    {/* CHECK OUT */}

                    <div>

                      <div className="flex items-start gap-2">

                        <CalendarDays className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" />

                        <div>

                          <p className="text-xs font-bold text-[#0e2a4a]">
                            {formatDate(room.checkOut)}
                          </p>

                          <p className="text-xs text-[#6b7f99] mt-0.5">
                            {formatTime(room.checkOutTime)}
                          </p>

                        </div>

                      </div>

                    </div>


                    {/* ACTIONS */}

                    <div className="flex flex-col items-end gap-2">

                      {/* STATUS */}

                      <span
                        className={`
                          inline-flex
                          items-center
                          gap-1.5
                          px-3
                          py-1.5
                          rounded-full
                          text-[10px]
                          font-bold
                          border
                          ${
                            over
                              ? "bg-amber-500 text-white border-amber-200"
                              : "bg-emerald-500 text-white border-emerald-200"
                          }
                        `}
                      >

                        {over ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}

                        {over ? "Overstayed" : "Staying"}

                      </span>


                      {/* ADD SERVICE */}

                      <button
                        type="button"
                        onClick={() =>
                          setActiveService({
                            customer: group.customer,
                            room,
                            bookingId: room.bookingId,
                          })
                        }
                        className="
                          w-full
                          cursor-pointer
                          inline-flex
                          items-center
                          justify-center
                          gap-1.5
                          px-3
                          py-2.5
                          rounded-xl
                          bg-[#2568e0]
                          hover:bg-[#1d56c4]
                          active:bg-[#17429e]
                          text-white
                          text-[11px]
                          font-bold
                          transition
                          shadow-[0_2px_8px_rgba(6,20,52,0.08)]
                        "
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Add Service
                      </button>

                    </div>

                  </div>


                  {/* ==========================
                      MOBILE / TABLET
                  ========================== */}

                  <div className="lg:hidden">

                    {/* ROOM + STATUS */}

                    <div className="
                      flex
                      items-center
                      justify-between
                      gap-3
                    ">

                      <div className="flex items-center gap-3">

                        <div className="
                          w-10 h-10
                          rounded-xl
                          bg-[#eaf3ff]
                          border border-[#dbe6f5]
                          flex items-center justify-center
                        ">
                          <BedDouble className="w-4 h-4 text-[#2568e0]" />
                        </div>

                        <div>

                          <p className="text-sm font-extrabold text-[#0e2a4a]">
                            Room {room.roomNumber}
                          </p>

                          <p className="text-xs text-[#6b7f99]">
                            {room.roomType || "-"} • {room.bedType || "-"}
                          </p>

                        </div>

                      </div>


                      <span
                        className={`
                          inline-flex
                          items-center
                          gap-1
                          px-2.5
                          py-1.5
                          rounded-full
                          text-[10px]
                          font-bold
                          border
                          shrink-0
                          ${
                            over
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }
                        `}
                      >

                        {over ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}

                        {over ? "Overstayed" : "Staying"}

                      </span>

                    </div>


                    {/* DATES */}

                    <div className="
                      grid
                      grid-cols-2
                      gap-3
                      mt-4
                    ">

                      <div className="
                        p-3
                        rounded-xl
                        bg-[#f4f8fd]
                        border border-[#e7eff8]
                      ">

                        <p className="
                          text-[9px]
                          uppercase
                          tracking-wider
                          font-bold
                          text-[#9aabc0]
                        ">
                          Check-In
                        </p>

                        <p className="mt-1 text-xs font-bold text-[#0e2a4a]">
                          {formatDate(room.checkIn)}
                        </p>

                        <p className="text-xs text-[#6b7f99]">
                          {formatTime(room.checkInTime)}
                        </p>

                      </div>


                      <div className="
                        p-3
                        rounded-xl
                        bg-[#f4f8fd]
                        border border-[#e7eff8]
                      ">

                        <p className="
                          text-[9px]
                          uppercase
                          tracking-wider
                          font-bold
                          text-[#9aabc0]
                        ">
                          Check-Out
                        </p>

                        <p className="mt-1 text-xs font-bold text-[#0e2a4a]">
                          {formatDate(room.checkOut)}
                        </p>

                        <p className="text-xs text-[#6b7f99]">
                          {formatTime(room.checkOutTime)}
                        </p>

                      </div>

                    </div>


                    {/* ADD SERVICE */}

                    <button
                      type="button"
                      onClick={() =>
                        setActiveService({
                          customer: group.customer,
                          room,
                          bookingId: room.bookingId,
                        })
                      }
                      className="
                        mt-3
                        w-full
                        inline-flex
                        items-center
                        justify-center
                        gap-2
                        px-4
                        py-3
                        rounded-xl
                        bg-[#2568e0]
                        hover:bg-[#1d56c4]
                        text-white
                        text-xs
                        font-bold
                        transition
                      "
                    >
                      <PlusCircle className="w-4 h-4" />
                      Add Service • Room {room.roomNumber}
                    </button>

                  </div>

                </div>

              );
            })}

          </div>


          {/* ==================================
              CUSTOMER FOOTER
          ================================== */}

          <div className="
            px-5 sm:px-6
            py-3
            bg-[#f4f8fd]/70
            border-t border-[#e7eff8]
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-2
          ">

          

            <p className="text-[11px] font-semibold text-[#6b7f99]">
              {group.rooms.length} active room
              {group.rooms.length !== 1 ? "s" : ""}
            </p>

          </div>

        </div>

      ))}

    </div>

  )}

</div>

{checkoutCustomer && (
    <div
        className="
            fixed inset-0 z-[100]
            bg-[#040e24]/60
            backdrop-blur-sm
            flex items-end sm:items-center justify-center
            p-0 sm:p-4
        "
        onClick={() => {
            setCheckoutCustomer(null);
            setShowTimePicker(false);
        }}
    >
        <div
            className="
                relative
                w-full
                sm:max-w-xl
                max-h-[96vh]
                sm:max-h-[92vh]
                bg-white
                rounded-t-3xl
                sm:rounded-3xl
                shadow-2xl
                border border-[#dbe6f5]
                overflow-hidden
                flex flex-col
            "
            onClick={(e) => e.stopPropagation()}
        >
            {/* =====================================================
                HEADER
            ====================================================== */}
            <div
                className="
                    shrink-0
                    px-4 sm:px-6
                    py-4 sm:py-5
                    border-b border-[#dbe6f5]
                    bg-white
                "
            >
                <div className="flex items-start justify-between gap-3">
                    {/* TITLE */}
                    <div className="flex items-start gap-3 min-w-0">
                        <div
                            className="
                                w-10 h-10
                                sm:w-11 sm:h-11
                                rounded-xl
                                bg-[#eaf3ff]
                                border border-[#dbe6f5]
                                flex items-center justify-center
                                shrink-0
                            "
                        >
                            <CheckCircle2
                                className="
                                    w-5 h-5
                                    text-[#2568e0]
                                "
                            />
                        </div>

                        <div className="min-w-0">
                            <h3
                                className="
                                    text-base
                                    sm:text-lg
                                    font-bold
                                    text-[#0e2a4a]
                                "
                            >
                                Confirm Guest Checkout
                            </h3>

                            <p
                                className="
                                    text-xs
                                    sm:text-sm
                                    font-semibold
                                    text-[#3d5473]
                                    mt-1
                                    truncate
                                "
                            >
                               Guest Name : {checkoutCustomer.customer?.customerName ||
                                    "Guest"}
                            </p>

                            <p
                                className="
                                    text-[11px]
                                    sm:text-xs
                                    text-[#6b7f99]
                                    mt-0.5
                                "
                            >
                                Review the room and checkout details
                                before generating the bill.
                            </p>
                        </div>
                    </div>

                    {/* CLOSE */}
                    <button
                        type="button"
                        onClick={() => {
                            setCheckoutCustomer(null);
                            setShowTimePicker(false);
                        }}
                        aria-label="Close checkout"
                        className="
                            w-9 h-9
                            sm:w-10 sm:h-10
                            rounded-xl
                            bg-[#eaf3ff]
                            border border-[#dbe6f5]
                            flex items-center justify-center
                            text-[#6b7f99]
                            hover:bg-[#dbe6f5]
                            hover:text-[#0e2a4a]
                            transition
                            shrink-0
                        "
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>
            </div>

            {/* =====================================================
                SCROLLABLE CONTENT
            ====================================================== */}
            <div
                className="
                    flex-1
                    overflow-y-auto
                    overscroll-contain
                    p-4 sm:p-5 lg:p-6
                    space-y-5
                "
            >
                {/* =================================================
                    STEP INDICATOR
                ================================================== */}
                <div
                    className="
                        flex items-center gap-3
                        rounded-xl
                        bg-[#eaf3ff]
                        border border-[#dbe6f5]
                        px-3.5 py-3
                    "
                >
                   

                    <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-[#0e2a4a]">
                            Checkout Details
                        </p>

                        <p className="text-[11px] sm:text-xs text-[#6b7f99] mt-0.5">
                            Select the room(s) and confirm the checkout time.
                        </p>
                    </div>
                </div>

                {/* =================================================
                    ROOM SELECTION
                ================================================== */}
                <section>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div>
                            <label
                                className="
                                    block
                                    text-sm
                                    font-bold
                                    text-[#0e2a4a]
                                "
                            >
                                Select Room(s)
                                <span className="text-red-600 ml-1">
                                    *
                                </span>
                            </label>

                            <p
                                className="
                                    text-xs
                                    text-[#6b7f99]
                                    mt-1
                                "
                            >
                                Choose the room(s) this guest is checking
                                out from.
                            </p>
                        </div>

                        {/* SELECT ALL */}
                        {checkoutCustomer.rooms?.length > 0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    toggleAll(checkoutCustomer.rooms)
                                }
                                className="
                                    shrink-0
                                    cursor-pointer
                                    px-3
                                    py-1.5
                                    rounded-lg
                                    bg-[#eaf3ff]
                                    border border-[#dbe6f5]
                                    text-xs
                                    font-bold
                                    text-[#0e2a4a]
                                    hover:bg-[#dbe6f5]
                                    transition
                                "
                            >
                                {checkoutCustomer.rooms.every(isSelected)
                                    ? "Unselect All"
                                    : "Select All"}
                            </button>
                        )}
                    </div>

                    {/* ROOM CARDS */}
                    <div
                        className="
                            grid
                            grid-cols-1
                            min-[400px]:grid-cols-2
                            gap-2.5
                        "
                    >
                        {checkoutCustomer.rooms.map((room) => {
                            const selected = isSelected(room);

                            return (
                                <button
                                    key={roomKey(room)}
                                    type="button"
                                    onClick={() => toggleRoom(room)}
                                    className={`
                                        w-full cursor-pointer
                                        min-h-[68px]
                                        flex
                                        items-center
                                        justify-between
                                        gap-3
                                        px-3.5
                                        py-3
                                        rounded-xl
                                        border
                                        text-left
                                        transition-all
                                        active:scale-[0.98]
                                        ${
                                            selected
                                                ? `
                                                    bg-[#eaf3ff]
                                                    border-[#2568e0]
                                                    ring-2
                                                    ring-[#dbe6f5]
                                                `
                                                : `
                                                    bg-white
                                                    border-[#c7d8f0]
                                                    hover:border-[#5b9bf5]
                                                    hover:bg-[#f4f8fd]
                                                `
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* ROOM ICON */}
                                        <div
                                            className={`
                                                w-9 h-9
                                                rounded-lg
                                                flex items-center justify-center
                                                shrink-0
                                                ${
                                                    selected
                                                        ? "bg-[#2568e0] text-white"
                                                        : "bg-[#eaf3ff] text-[#6b7f99]"
                                                }
                                            `}
                                        >
                                            <span className="text-xs font-bold">
                                                {room.roomNumber}
                                            </span>
                                        </div>

                                        <div className="min-w-0">
                                            <p
                                                className={`
                                                    text-sm
                                                    font-bold
                                                    truncate
                                                    ${
                                                        selected
                                                            ? "text-[#0e2a4a]"
                                                            : "text-[#0e2a4a]"
                                                    }
                                                `}
                                            >
                                                Room {room.roomNumber}
                                            </p>

                                            {room.roomType && (
                                                <p
                                                    className="
                                                        text-[11px]
                                                        text-[#6b7f99]
                                                        mt-0.5
                                                        truncate
                                                    "
                                                >
                                                    {room.roomType}
                                                    {room.bedType
                                                        ? ` • ${room.bedType}`
                                                        : ""}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* CHECKBOX */}
                                    <div className="shrink-0">
                                        {selected ? (
                                            <CheckSquare
                                                className="
                                                    w-5 h-5
                                                    text-[#2568e0]
                                                "
                                            />
                                        ) : (
                                            <Square
                                                className="
                                                    w-5 h-5
                                                    text-[#9aabc0]
                                                "
                                            />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* SELECTED COUNT */}
                    <div
                        className={`
                            mt-3
                            px-3.5
                            py-2.5
                            rounded-xl
                            border
                            flex items-center justify-between gap-3
                            ${
                                selectedRooms.length > 0
                                    ? "bg-[#eaf3ff] border-[#c7d8f0]"
                                    : "bg-red-50 border-red-200"
                            }
                        `}
                    >
                        <div className="flex items-center gap-2">
                            {selectedRooms.length > 0 ? (
                                <CheckCircle2 className="w-4 h-4 text-[#2568e0] shrink-0" />
                            ) : (
                                <X className="w-4 h-4 text-red-700 shrink-0" />
                            )}

                            <p
                                className={`
                                    text-xs
                                    sm:text-sm
                                    font-semibold
                                    ${
                                        selectedRooms.length > 0
                                            ? "text-[#0e2a4a]"
                                            : "text-red-800"
                                    }
                                `}
                            >
                                {selectedRooms.length > 0
                                    ? `${selectedRooms.length} room${
                                          selectedRooms.length > 1
                                              ? "s"
                                              : ""
                                      } selected`
                                    : "Please select at least one room"}
                            </p>
                        </div>
                    </div>
                </section>

                {/* =================================================
                    CHECKOUT DATE
                ================================================== */}
                <section>
                    <label
                        className="
                            block
                            text-sm
                            font-bold
                            text-[#0e2a4a]
                            mb-2
                        "
                    >
                        Checkout Date
                    </label>

                    <div
                        className="
                            flex
                            items-center
                            gap-3
                            px-3.5
                            py-3.5
                            bg-[#f4f8fd]
                            border border-[#dbe6f5]
                            rounded-xl
                        "
                    >
                        <div
                            className="
                                w-9 h-9
                                rounded-lg
                                bg-white
                                border border-[#dbe6f5]
                                flex items-center justify-center
                                shrink-0
                            "
                        >
                            <CalendarDays className="w-4 h-4 text-[#2568e0]" />
                        </div>

                        <div>
                            <p className="text-sm font-bold text-[#0e2a4a]">
                                {getTodayDisplay()}
                            </p>

                            <p className="text-xs text-[#6b7f99] mt-0.5">
                                Today
                            </p>
                        </div>
                    </div>
                </section>

                {/* =================================================
                    CHECKOUT TIME
                ================================================== */}
                <section className="relative">
                    <label
                        className="
                            block
                            text-sm
                            font-bold
                            text-[#0e2a4a]
                            mb-2
                        "
                    >
                        Checkout Time
                        <span className="text-red-600 ml-1">*</span>
                    </label>

                    <p
                        className="
                            text-xs
                            text-[#6b7f99]
                            mb-2
                        "
                    >
                        Select the time when the guest is checking out.
                    </p>

                    {/* TIME BUTTON */}
                    <button
                        type="button"
                        onClick={() =>
                            setShowTimePicker((value) => !value)
                        }
                        className={`
                            w-full
                            min-h-[50px]
                            px-3.5
                            py-3
                            rounded-xl
                            border
                            bg-white
                            flex
                            items-center
                            justify-between
                            gap-3
                            text-left
                            transition-all
                            ${
                                showTimePicker
                                    ? `
                                        border-[#2568e0]
                                        ring-2
                                        ring-[#dbe6f5]
                                    `
                                    : `
                                        border-[#c7d8f0]
                                        hover:border-slate-400
                                    `
                            }
                        `}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div
                                className="
                                    w-9 h-9
                                    rounded-lg
                                    bg-[#eaf3ff]
                                    flex items-center justify-center
                                    shrink-0
                                "
                            >
                                <Clock className="w-4 h-4 text-[#2568e0]" />
                            </div>

                            <div>
                                <p className="text-sm font-bold text-[#0e2a4a]">
                                    {checkoutTime} {checkoutAmPm}
                                </p>

                                <p className="text-[11px] text-[#6b7f99] mt-0.5">
                                    Tap to change time
                                </p>
                            </div>
                        </div>

                        <div
                            className="
                                px-2.5 py-1.5
                                rounded-lg
                                bg-[#eaf3ff]
                                text-[11px]
                                font-bold
                                text-[#3d5473]
                                shrink-0
                            "
                        >
                            Change
                        </div>
                    </button>

                    {/* =================================================
                        TIME PICKER
                    ================================================== */}
                    {showTimePicker && (
    <div
        className="
            absolute
            left-0
            right-0
            bottom-full
            mb-2
            z-[120]
            bg-white
            border border-[#dbe6f5]
            rounded-2xl
            shadow-2xl
            overflow-hidden
        "
    >
        {/* =====================================================
            PICKER HEADER
        ====================================================== */}
        <div
            className="
                px-4
                sm:px-5
                py-3.5
                bg-[#f4f8fd]
                border-b border-[#dbe6f5]
            "
        >
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0e2a4a]">
                        Checkout Time
                    </p>

                    <p className="text-xs text-[#6b7f99] mt-0.5">
                        Select the time for guest checkout
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowTimePicker(false)}
                    aria-label="Close time picker"
                    className="
                        w-8 h-8
                        rounded-lg
                        bg-white
                        border border-[#dbe6f5]
                        flex items-center justify-center
                        text-[#6b7f99]
                        hover:bg-[#eaf3ff]
                        hover:text-[#0e2a4a]
                        transition
                        shrink-0
                    "
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* =====================================================
            CURRENT SELECTED TIME
        ====================================================== */}
        <div className="px-4 sm:px-5 pt-4">
            <div
                className="
                    rounded-xl
                    bg-[#eaf3ff]
                    border border-[#c7d8f0]
                    px-4
                    py-3
                "
            >
                <p
                    className="
                        text-[10px]
                        uppercase
                        tracking-wider
                        font-bold
                        text-[#0e2a4a]
                    "
                >
                    Selected Checkout Time
                </p>

                <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-5 h-5 text-[#2568e0]" />

                    <span
                        className="
                            text-xl
                            sm:text-2xl
                            font-bold
                            text-[#0e2a4a]
                        "
                    >
                        {checkoutTime}
                    </span>

                    <span
                        className="
                            text-sm
                            sm:text-base
                            font-bold
                            text-[#0e2a4a]
                        "
                    >
                        {checkoutAmPm}
                    </span>
                </div>
            </div>
        </div>

        {/* =====================================================
            TIME SELECTION
        ====================================================== */}
        <div className="p-4 sm:p-5">
            <div
                className="
                    grid
                    grid-cols-2
                    sm:grid-cols-3
                    gap-3
                "
            >
                {/* =================================================
                    HOUR
                ================================================== */}
                <div className="min-w-0">
                    <p
                        className="
                            text-xs
                            font-bold
                            text-[#0e2a4a]
                            mb-2
                        "
                    >
                        Hour
                    </p>

                    <div
                        className="
                            h-40
                            sm:h-44
                            overflow-y-auto
                            rounded-xl
                            border border-[#dbe6f5]
                            bg-[#f4f8fd]
                            p-1.5
                        "
                    >
                        <div className="grid grid-cols-3 gap-1">
                            {Array.from(
                                { length: 12 },
                                (_, i) =>
                                    String(i + 1).padStart(2, "0")
                            ).map((h) => {
                                const selected =
                                    checkoutTime.startsWith(h);

                                return (
                                    <button
                                        key={h}
                                        type="button"
                                        onClick={() =>
                                            setCheckoutTime(
                                                `${h}:${
                                                    checkoutTime.split(
                                                        ":"
                                                    )[1] || "00"
                                                }`
                                            )
                                        }
                                        className={`
                                            min-h-[38px]
                                            rounded-lg
                                            text-xs
                                            font-bold
                                            transition-all
                                            ${
                                                selected
                                                    ? `
                                                        bg-[#2568e0]
                                                        text-white
                                                        shadow-[0_2px_8px_rgba(6,20,52,0.08)]
                                                    `
                                                    : `
                                                        bg-white
                                                        text-[#3d5473]
                                                        hover:bg-[#eaf3ff]
                                                        hover:text-[#0e2a4a]
                                                    `
                                            }
                                        `}
                                    >
                                        {h}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* =================================================
                    MINUTE
                ================================================== */}
                <div className="min-w-0">
                    <p
                        className="
                            text-xs
                            font-bold
                            text-[#0e2a4a]
                            mb-2
                        "
                    >
                        Minute
                    </p>

                    <div
                        className="
                            h-40
                            sm:h-44
                            overflow-y-auto
                            rounded-xl
                            border border-[#dbe6f5]
                            bg-[#f4f8fd]
                            p-1.5
                        "
                    >
                        <div className="grid grid-cols-3 gap-1">
                            {Array.from(
                                { length: 60 },
                                (_, i) =>
                                    String(i).padStart(2, "0")
                            ).map((m) => {
                                const selected =
                                    checkoutTime.endsWith(`:${m}`);

                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() =>
                                            setCheckoutTime(
                                                `${
                                                    checkoutTime.split(
                                                        ":"
                                                    )[0] || "11"
                                                }:${m}`
                                            )
                                        }
                                        className={`
                                            min-h-[38px]
                                            rounded-lg
                                            text-xs
                                            font-bold
                                            transition-all
                                            ${
                                                selected
                                                    ? `
                                                        bg-[#2568e0]
                                                        text-white
                                                        shadow-[0_2px_8px_rgba(6,20,52,0.08)]
                                                    `
                                                    : `
                                                        bg-white
                                                        text-[#3d5473]
                                                        hover:bg-[#eaf3ff]
                                                        hover:text-[#0e2a4a]
                                                    `
                                            }
                                        `}
                                    >
                                        {m}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* =================================================
                    AM / PM
                ================================================== */}
                <div className="col-span-2 sm:col-span-1">
                    <p
                        className="
                            text-xs
                            font-bold
                            text-[#0e2a4a]
                            mb-2
                        "
                    >
                        Period
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                        {["AM", "PM"].map((period) => {
                            const selected =
                                checkoutAmPm === period;

                            return (
                                <button
                                    key={period}
                                    type="button"
                                    onClick={() =>
                                        setCheckoutAmPm(period)
                                    }
                                    className={`
                                        min-h-[48px]
                                        rounded-xl
                                        border
                                        text-sm
                                        font-bold
                                        transition-all
                                        ${
                                            selected
                                                ? `
                                                    bg-[#2568e0]
                                                    text-white
                                                    border-[#2568e0]
                                                    shadow-[0_2px_8px_rgba(6,20,52,0.08)]
                                                `
                                                : `
                                                    bg-white
                                                    text-[#3d5473]
                                                    border-[#c7d8f0]
                                                    hover:bg-[#eaf3ff]
                                                    hover:border-teal-300
                                                    hover:text-[#0e2a4a]
                                                `
                                        }
                                    `}
                                >
                                    {period}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>


            {/* =====================================================
                DONE BUTTON
            ====================================================== */}
            <button
                type="button"
                onClick={() => setShowTimePicker(false)}
                className="
                    w-full
                    mt-4
                    min-h-[46px]
                    rounded-xl
                    bg-[#2568e0]
                    hover:bg-[#1d56c4]
                    active:bg-[#17429e]
                    text-white
                    text-sm
                    font-bold
                    flex
                    items-center
                    justify-center
                    gap-2
                    transition
                    shadow-[0_2px_8px_rgba(6,20,52,0.08)]
                "
            >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Checkout Time
            </button>
        </div>
    </div>
)}

                </section>
            </div>

            {/* =====================================================
                FOOTER
            ====================================================== */}
            <div
                className="
                    shrink-0
                    px-4 sm:px-5 lg:px-6
                    py-4
                    border-t border-[#dbe6f5]
                    bg-white
                "
            >
                <div
                    className="
                        flex
                        flex-col-reverse
                        sm:flex-row
                        gap-2.5
                    "
                >
                    {/* CANCEL */}
                    <button
                        type="button"
                        onClick={() => {
                            setCheckoutCustomer(null);
                            setShowTimePicker(false);
                        }}
                        className="
                            w-full
                            sm:w-1/3
                            min-h-[46px]
                            px-4
                            py-3
                            rounded-xl
                            bg-[#eaf3ff]
                            hover:bg-[#dbe6f5]
                            border border-[#dbe6f5]
                            text-sm
                            font-bold
                            text-[#0e2a4a]
                            transition
                        "
                    >
                        Cancel
                    </button>

                    {/* PROCEED */}
                    <button
                        type="button"
                        onClick={prepareCheckout}
                        disabled={selectedRooms.length === 0}
                        className="
                            w-full
                            sm:flex-1
                            min-h-[46px]
                            px-4
                            py-3
                            rounded-xl
                            bg-[#2568e0]
                            hover:bg-[#1d56c4]
                            text-white
                            text-sm
                            font-bold
                            transition
                            flex
                            items-center
                            justify-center
                            gap-2
                            disabled:bg-slate-300
                            disabled:text-[#6b7f99]
                            disabled:cursor-not-allowed
                        "
                    >
                        <CheckCircle2 className="w-4 h-4" />

                        {selectedRooms.length > 0
                            ? "Proceed to Bill"
                            : "Select a Room First"}
                    </button>
                </div>
            </div>
        </div>
    </div>
)}

      {activeService && (
        <AddServiceModal
          customer={activeService.customer}
          room={activeService.room}
          roomNumber={activeService.room.roomNumber}
          bookingId={activeService.bookingId}
          onClose={() => {
            setActiveService(null);
            loadBookings();
          }}
        />
      )}
    </div>
  );
}
