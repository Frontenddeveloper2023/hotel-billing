import React, { useState, useEffect, useMemo } from "react";
import {
  deleteCustomer,
  updateCustomer,
} from "../../service/customersService";
import { getCustomerManagementData } from "../../service/customersApi";

import {
  Search,
  Edit3,
  Trash2,
  X,
  Save,
  UserRound,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // =========================================================
  // SEARCH / FILTER / PAGINATION STATE
  // =========================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;

  // Current date/time is refreshed every minute so an active booking
  // automatically changes from Staying -> Overstaying.
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  // =========================================================
  // EDIT CUSTOMER
  // =========================================================

  const [editingCustomer, setEditingCustomer] = useState(null);

  const [editForm, setEditForm] = useState({
    customerName: "",
    phoneNumber: "",
    alternativePhone: "",
    email: "",
    address: "",
    idProofType: "",
    idProofNumber: "",
  });

  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // =========================================================
  // FETCH CUSTOMERS + BOOKINGS
  // =========================================================

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      // Uses /customers/management-data — requires only `customer` permission
      // (does NOT call /bookings, so no roomsBooking permission needed)
      const response = await getCustomerManagementData();

      const customerData = response?.data?.customers || [];
      const bookingData  = response?.data?.bookings  || [];

      setCustomers(customerData);
      setBookings(bookingData);
    } catch (err) {
      console.error("Customer/booking fetch error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch customer and booking records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // =========================================================
  // BOOKING HELPERS
  // =========================================================

  const normalizeId = (value) => {
    if (!value) return "";

    if (typeof value === "object") {
      return String(
        value?._id ||
          value?.id ||
          value?.$oid ||
          ""
      );
    }

    return String(value);
  };

  const getCustomerBookings = (customer) => {
    const customerId = normalizeId(customer?._id);

    if (!customerId) return [];

    return bookings.filter(
      (booking) =>
        normalizeId(booking?.customerId) === customerId
    );
  };

  const getCustomerRooms = (customer) => {
    return getCustomerBookings(customer).flatMap(
      (booking) =>
        Array.isArray(booking?.rooms)
          ? booking.rooms.map((room) => ({
              ...room,
              bookingId: booking?._id,
              bookingStatus: booking?.bookingStatus,
            }))
          : []
    );
  };

  const getLatestBooking = (customer) => {
    const customerBookings = getCustomerBookings(customer);

    if (!customerBookings.length) return null;

    return [...customerBookings].sort((a, b) => {
      const aDate = new Date(
        a?.updatedAt || a?.createdAt || 0
      ).getTime();

      const bDate = new Date(
        b?.updatedAt || b?.createdAt || 0
      ).getTime();

      return bDate - aDate;
    })[0];
  };

  const getCustomerStatus = (customer) => {
    const customerBookings = getCustomerBookings(customer);

    if (!customerBookings.length) {
      return "Unknown";
    }

    const hasOverstayed = customerBookings.some((booking) =>
      (booking?.rooms || []).some(
        (room) => room?.checkoutStatus === "Overstaying"
      )
    );

    if (hasOverstayed) {
      return "Overstayed";
    }

    const hasActive = customerBookings.some((booking) => {
      if (
        booking?.bookingStatus === "Active" ||
        booking?.bookingStatus === "Partially Checked Out"
      ) {
        return true;
      }

      return (booking?.rooms || []).some(
        (room) =>
          room?.checkoutStatus === "Staying" ||
          room?.checkoutStatus === "Active"
      );
    });

    if (hasActive) {
      return "Staying";
    }

    const allRoomsCheckedOut = customerBookings.every((booking) => {
      const rooms = Array.isArray(booking?.rooms)
        ? booking.rooms
        : [];

      return (
        rooms.length > 0 &&
        rooms.every(
          (room) =>
            room?.checkoutStatus === "Checked Out"
        )
      );
    });

    if (allRoomsCheckedOut) {
      return "Checked Out";
    }

    if (
      customerBookings.some(
        (booking) => booking?.bookingStatus === "Completed"
      )
    ) {
      return "Checked Out";
    }

    return "Unknown";
  };

  const getRoomNumbers = (customer) => {
    const rooms = getCustomerRooms(customer);

    return rooms
      .map((room) => room?.roomNumber)
      .filter(Boolean);
  };

  const getPrimaryRoom = (customer) => {
    const rooms = getCustomerRooms(customer);

    if (!rooms.length) return null;

    return rooms[rooms.length - 1];
  };

  const getPrimaryStayDate = (customer, field, timeField) => {
    const room = getPrimaryRoom(customer);

    if (!room) {
      return {
        date: "-",
        time: "",
      };
    }

    const value = room?.[field];

    let date = "-";

    if (value) {
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        date = parsed.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    }

    return {
      date,
      time: room?.[timeField] || "",
    };
  };

  // =========================================================
  // SEARCH / FILTER
  // IMPORTANT:
  // A customer can have MANY bookings.
  // Each booking must be displayed as its own row.
  // Do NOT merge all historical rooms into one customer row.
  // =========================================================

  const parseDateTime = (dateValue, timeValue) => {
    if (!dateValue) return null;

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;

    if (!timeValue) return date;

    const time = String(timeValue).trim().toUpperCase();

    // 12-hour time: 11:00 AM / 06:10 PM
    const twelveHour = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (twelveHour) {
      let hours = Number(twelveHour[1]);
      const minutes = Number(twelveHour[2]);
      const period = twelveHour[3];

      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      date.setHours(hours, minutes, 0, 0);
      return date;
    }

    // 24-hour time: 11:17 / 16:40
    const twentyFourHour = time.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHour) {
      date.setHours(
        Number(twentyFourHour[1]),
        Number(twentyFourHour[2]),
        0,
        0
      );
    }

    return date;
  };

  // =========================================================
  // CURRENT BOOKING STATUS
  // =========================================================

  const getRoomCurrentStatus = (room) => {
    if (!room) return "Unknown";

    // Once actual checkout has happened, the stay is finished.
    if (room?.actualCheckoutDate && room?.actualCheckoutTime) {
      return "Checked Out";
    }

    const bookedCheckOut = parseDateTime(
      room?.checkOut,
      room?.checkOutTime
    );

    if (!bookedCheckOut) {
      return "Unknown";
    }

    return currentDateTime.getTime() > bookedCheckOut.getTime()
      ? "Overstaying"
      : "Staying";
  };

  const getBookingStatus = (booking) => {
    const rooms = Array.isArray(booking?.rooms)
      ? booking.rooms
      : [];

    if (!rooms.length) {
      return booking?.bookingStatus === "Completed"
        ? "Checked Out"
        : booking?.bookingStatus === "Active"
        ? "Staying"
        : "Unknown";
    }

    const roomStatuses = rooms.map((room) =>
      getRoomCurrentStatus(room)
    );

    // Any room still has no actual checkout and has crossed
    // its booked checkout time.
    if (roomStatuses.some((status) => status === "Overstaying")) {
      return "Overstaying";
    }

    // Any room without actual checkout is still staying.
    if (roomStatuses.some((status) => status === "Staying")) {
      return "Staying";
    }

    // All rooms have actual checkout.
    if (
      roomStatuses.length > 0 &&
      roomStatuses.every((status) => status === "Checked Out")
    ) {
      return "Checked Out";
    }

    return "Unknown";
  };

    const formatTime12 = (value) => {
    if (!value) return "-";

    const str = String(value).trim();

    if (/am|pm/i.test(str)) {
      return str.toUpperCase();
    }

    const parts = str.split(":");
    if (parts.length < 2) return str;

    let hours = Number(parts[0]);
    const minutes = String(parts[1]).replace(/\D/g, "").padStart(2, "0");

    if (Number.isNaN(hours)) return str;

    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
  };

  const formatStayDateTime = (date, time) => {
    const dateText = formatDate(date);
    const timeText = formatTime12(time);

    if (dateText === "-" && timeText === "-") return "-";

    return `${dateText}${timeText !== "-" ? ` • ${timeText}` : ""}`;
  };

  const filteredCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return customers.filter((customer) => {
      const customerBookings = getCustomerBookings(customer);

      const roomNumbers = customerBookings
        .flatMap((booking) =>
          Array.isArray(booking?.rooms) ? booking.rooms : []
        )
        .map((room) => room?.roomNumber)
        .filter(Boolean);

      const customerName = String(
        customer?.customerName || ""
      ).toLowerCase();

      const phoneNumber = String(
        customer?.phoneNumber || ""
      ).toLowerCase();

      const alternativePhone = String(
        customer?.alternativePhone || ""
      ).toLowerCase();

      const email = String(
        customer?.email || ""
      ).toLowerCase();

      const idProofNumber = String(
        customer?.idProofNumber || ""
      ).toLowerCase();

      const bookingSearchText = customerBookings
        .flatMap((booking) => {
          const rooms = Array.isArray(booking?.rooms)
            ? booking.rooms
            : [];

          return [
            normalizeId(booking?._id),
            booking?.bookingStatus,
            ...rooms.flatMap((room) => [
              room?.roomNumber,
              room?.roomType,
              room?.bedType,
              room?.checkIn,
              room?.checkInTime,
              room?.checkOut,
              room?.checkOutTime,
              room?.actualCheckoutDate,
              room?.actualCheckoutTime,
              room?.checkoutStatus,
            ]),
          ];
        })
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        customerName.includes(query) ||
        phoneNumber.includes(query) ||
        alternativePhone.includes(query) ||
        email.includes(query) ||
        idProofNumber.includes(query) ||
        roomNumbers.join(" ").toLowerCase().includes(query) ||
        bookingSearchText.includes(query);

      // Status filter is checked against ANY booking belonging
      // to this customer. Individual rows below still show
      // the correct status for each booking.
      const matchesStatus =
        statusFilter === "All" ||
        customerBookings.some(
          (booking) => getBookingStatus(booking) === statusFilter
        );

      return matchesSearch && matchesStatus;
    });
  }, [customers, bookings, searchTerm, statusFilter]);

  // =========================================================
  // INDIVIDUAL BOOKING ROWS
  // =========================================================

  const bookingRows = useMemo(() => {
    const rows = [];

    filteredCustomers.forEach((customer) => {
      const customerBookings = getCustomerBookings(customer);

      customerBookings.forEach((booking) => {
        const status = getBookingStatus(booking);

        // When a status filter is selected, show only
        // bookings having that exact status.
        if (
          statusFilter !== "All" &&
          status !== statusFilter
        ) {
          return;
        }

        rows.push({
          customer,
          booking,
          status,
        });
      });
    });

    // Newest booking first.
    return rows.sort((a, b) => {
      const aDate = new Date(
        a.booking?.updatedAt ||
          a.booking?.createdAt ||
          0
      ).getTime();

      const bDate = new Date(
        b.booking?.updatedAt ||
          b.booking?.createdAt ||
          0
      ).getTime();

      return bDate - aDate;
    });
  }, [filteredCustomers, bookings, statusFilter]);

  // =========================================================
  // DELETE CUSTOMER
  // =========================================================

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this customer record?"
      )
    ) {
      return;
    }

    try {
      await deleteCustomer(id);

      setCustomers((prev) =>
        prev.filter((customer) => customer._id !== id)
      );
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete customer."
      );
    }
  };

  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================

  const openEditModal = (customer) => {
    setEditingCustomer(customer);

    setEditForm({
      customerName: customer?.customerName || "",
      phoneNumber: customer?.phoneNumber || "",
      alternativePhone: customer?.alternativePhone || "",
      email: customer?.email || "",
      address: customer?.address || "",
      idProofType: customer?.idProofType || "",
      idProofNumber: customer?.idProofNumber || "",
    });

    setEditError("");
  };

  // =========================================================
  // CLOSE EDIT MODAL
  // =========================================================

  const closeEditModal = () => {
    if (savingEdit) return;

    setEditingCustomer(null);

    setEditForm({
      customerName: "",
      phoneNumber: "",
      alternativePhone: "",
      email: "",
      address: "",
      idProofType: "",
      idProofNumber: "",
    });

    setEditError("");
  };

  // =========================================================
  // EDIT INPUT CHANGE
  // =========================================================

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // =========================================================
  // UPDATE CUSTOMER
  // =========================================================

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();

    if (!editingCustomer?._id) {
      setEditError("Customer ID is missing.");
      return;
    }

    // Required fields
    if (!editForm.customerName.trim()) {
      setEditError("Customer name is required.");
      return;
    }

    if (!editForm.phoneNumber.trim()) {
      setEditError("Phone number is required.");
      return;
    }

    if (!editForm.address.trim()) {
      setEditError("Address is required.");
      return;
    }

    if (!editForm.idProofType.trim()) {
      setEditError("ID proof type is required.");
      return;
    }

    if (!editForm.idProofNumber.trim()) {
      setEditError("ID proof number is required.");
      return;
    }

    try {
      setSavingEdit(true);
      setEditError("");

      const response = await updateCustomer(
        editingCustomer._id,
        {
          customerName: editForm.customerName.trim(),
          phoneNumber: editForm.phoneNumber.trim(),
          alternativePhone: editForm.alternativePhone.trim(),
          email: editForm.email.trim(),
          address: editForm.address.trim(),
          idProofType: editForm.idProofType.trim(),
          idProofNumber: editForm.idProofNumber.trim(),
        }
      );

      const updatedCustomer =
        response?.data || response;

      if (!updatedCustomer) {
        throw new Error("Updated customer data was not returned.");
      }

      // Update only the customer record in local state
      setCustomers((prev) =>
        prev.map((customer) =>
          customer._id === editingCustomer._id
            ? {
                ...customer,
                ...updatedCustomer,
              }
            : customer
        )
      );

      closeEditModal();

      alert("Customer details updated successfully.");
    } catch (err) {
      console.error("Update customer error:", err);

      setEditError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update customer."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // =========================================================
  // PAGINATION
  // =========================================================

  const totalPages =
    Math.ceil(bookingRows.length / rowsPerPage) || 1;

  const paginatedBookingRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;

    return bookingRows.slice(
      start,
      start + rowsPerPage
    );
  }, [bookingRows, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // =========================================================
  // DATE FORMAT
  // =========================================================

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // =========================================================
  // STATUS STYLE
  // =========================================================

  const getStatusClass = (status) => {
    if (status === "Staying") {
      return "bg-emerald-50 text-emerald-700 border border-emerald-300";
    }

    if (status === "Overstaying") {
      return "bg-rose-50 text-rose-700 border border-rose-300";
    }

    if (status === "Checked Out") {
      return "bg-gray-100 text-black border border-gray-300";
    }

    return "bg-gray-100 text-black border border-gray-300";
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-white font-['Inter']">
      <div className="max-w-7xl mx-auto">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5 sm:mb-6">

          <div>
          

            <h1 className=" text-2xl font-bold text-black mt-1 ">
              Customer Management
            </h1>

            <p className="text-xs sm:text-sm text-black mt-1">
              Manage customer information and records
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="inline-flex items-center gap-2 bg-teal-700 text-white px-3.5 sm:px-4 py-2.5 rounded-xl shadow-sm">
              <UserRound className="w-4 h-4" />

              <span className="text-xs font-bold whitespace-nowrap">
                {bookingRows.length} Bookings
              </span>
            </div>

           
          </div>
        </div>

        {/* ================================================= */}
        {/* SEARCH / FILTER */}
        {/* ================================================= */}

        <div className="bg-white border border-gray-300 rounded-2xl p-3 sm:p-4 mb-5 shadow-sm">

          <div className="flex flex-col lg:flex-row gap-3">

            {/* SEARCH */}

            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              <input
                type="text"
                placeholder="Search name, phone, email, room or ID proof..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
              />
            </div>

            {/* STATUS */}

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-black whitespace-nowrap">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className="w-full sm:w-auto min-w-[150px] px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm text-black focus:outline-none focus:border-teal-600 cursor-pointer"
              >
                <option value="All">
                  All Statuses
                </option>

                <option value="Staying">
                  Staying
                </option>

                <option value="Overstaying">
                  Overstaying
                </option>

                <option value="Checked Out">
                  Checked Out
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && (
          <div className="mb-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* ================================================= */}
        {/* LOADING */}
        {/* ================================================= */}

        {loading && (
          <div className="bg-white border border-gray-300 rounded-2xl p-10 sm:p-12 text-center shadow-sm">
            <div className="w-8 h-8 border-2 border-teal-600/20 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />

            <p className="text-xs sm:text-sm font-semibold text-black">
              Loading customer and booking records...
            </p>
          </div>
        )}

        {/* ================================================= */}
        {/* TABLE */}
        {/* ================================================= */}

        {!loading && !error && (
          <div className="bg-white border border-gray-300 rounded-2xl shadow-sm overflow-hidden">

            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full text-left">

                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>

                    <th className="px-4 sm:px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-black whitespace-nowrap">
                      Room
                    </th>

                    <th className="px-4 sm:px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-black whitespace-nowrap">
                      Customer
                    </th>

                    <th className="px-4 sm:px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-black whitespace-nowrap">
                      Phone
                    </th>

                    <th className="px-4 sm:px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-black whitespace-nowrap">
                      Check-In
                    </th>

                    <th className="px-4 sm:px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-black whitespace-nowrap">
                      Check-Out
                    </th>

                    <th className="px-4 sm:px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-black text-right whitespace-nowrap">
                      Actions
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">

                  {paginatedBookingRows.length > 0 ? (
                    paginatedBookingRows.map(
                      ({ customer, booking, status }) => {
                        const rooms = Array.isArray(booking?.rooms)
                          ? booking.rooms
                          : [];

                        return (
                          <tr
                            key={`${booking?._id}-${customer?._id}`}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            {/* ROOM */}
                            <td className="px-4 sm:px-5 py-4 align-top">
                              {rooms.length > 0 ? (
                                <div className="space-y-2.5">
                                  {rooms.map((room, index) => (
                                    <div
                                      key={room?._id || index}
                                      className={
                                        index > 0
                                          ? "pt-2.5 border-t border-gray-200"
                                          : ""
                                      }
                                    >
                                      <div className="text-sm font-bold text-black whitespace-nowrap">
                                        Room {room?.roomNumber || "-"}
                                      </div>

                                      <div className="text-[10px] text-black mt-0.5 whitespace-nowrap">
                                        {room?.roomType || "-"} •{" "}
                                        {room?.bedType || "-"}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-black">-</span>
                              )}
                            </td>

                            {/* CUSTOMER */}
                            <td className="px-4 sm:px-5 py-4 align-top">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200">
                                  <UserRound className="w-4 h-4" />
                                </div>

                                <div>
                                  <p className="text-sm font-bold text-black whitespace-nowrap">
                                    {customer?.customerName || "-"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* PHONE */}
                            <td className="px-4 sm:px-5 py-4 align-top">
                              <div className="flex items-center gap-2 text-sm text-black whitespace-nowrap">
                                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                {customer?.phoneNumber || "-"}
                              </div>
                            </td>

                            {/* CHECK IN */}
                            <td className="px-4 sm:px-5 py-4 align-top">
                              <div className="space-y-2">
                                {rooms.length > 0 ? (
                                  rooms.map((room, index) => (
                                    <div
                                      key={room?._id || index}
                                      className={
                                        index > 0
                                          ? "pt-2 border-t border-gray-200"
                                          : ""
                                      }
                                    >
                                      <p className="text-sm font-semibold text-black whitespace-nowrap">
                                        {formatDate(room?.checkIn)}
                                      </p>

                                      <p className="text-[12px] text-black mt-0.5 whitespace-nowrap">
                                        {formatTime12(room?.checkInTime)}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-black">-</span>
                                )}
                              </div>
                            </td>

                            {/* CHECK OUT */}
                            <td className="px-4 sm:px-5 py-4 align-top">
                              <div className="space-y-2.5">
                                {rooms.length > 0 ? (
                                  rooms.map((room, index) => {
                                    const roomStatus =
                                      getRoomCurrentStatus(room);

                                    return (
                                      <div
                                        key={room?._id || index}
                                        className={
                                          index > 0
                                            ? "pt-2.5 border-t border-gray-200"
                                            : ""
                                        }
                                      >
                                        {/* Booked checkout date + time */}
                                        <p className="text-sm font-semibold text-black whitespace-nowrap">
                                          {formatDate(room?.checkOut)}
                                        </p>

                                        <p className="text-[12px] text-black mt-0.5 whitespace-nowrap">
                                          {formatTime12(room?.checkOutTime)}
                                        </p>

                                        {/* Actual checkout, only after checkout */}
                                        {room?.actualCheckoutDate &&
                                        room?.actualCheckoutTime ? (
                                          <p className="text-[12px] font-bold text-emerald-700 mt-1 whitespace-nowrap">
                                            Actual:{" "}
                                            {formatDate(
                                              room?.actualCheckoutDate
                                            )}{" "}
                                            •{" "}
                                            {formatTime12(
                                              room?.actualCheckoutTime
                                            )}
                                          </p>
                                        ) : null}

                                        {/* Live status is shown inside Check-Out column */}
                                        <p
                                          className={`inline-flex items-center px-2.5 py-1 mt-1.5 rounded-full text-[11px] font-bold whitespace-nowrap ${getStatusClass(
                                            roomStatus
                                          )}`}
                                        >
                                          {roomStatus}
                                        </p>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <span className="text-black">-</span>
                                )}
                              </div>
                            </td>

                            {/* ACTIONS */}
                            <td className="px-4 sm:px-5 py-4 align-top">
                              <div className="flex justify-end items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditModal(customer)
                                  }
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition-colors border border-teal-200"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDelete(customer?._id)
                                  }
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors border border-rose-200"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="py-14 sm:py-16 text-center"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                          <UserRound className="w-5 h-5 text-gray-400" />
                        </div>

                        <p className="text-sm font-bold text-black">
                          No booking records found
                        </p>

                        <p className="text-xs text-black mt-1">
                          Try changing your search or filter.
                        </p>
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>
            </div>

          </div>
        )}

        {/* ================================================= */}
        {/* PAGINATION */}
        {/* ================================================= */}

        {!loading && !error && totalPages > 1 && (

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-5">

            <p className="text-xs sm:text-sm text-black text-center sm:text-left">
              Showing{" "}
              <span className="font-bold">
                {(currentPage - 1) * rowsPerPage + 1}
              </span>{" "}
              -{" "}
              <span className="font-bold">
                {Math.min(
                  currentPage * rowsPerPage,
                  bookingRows.length
                )}
              </span>{" "}
              of{" "}
              <span className="font-bold">
                {bookingRows.length}
              </span>
            </p>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.max(prev - 1, 1)
                  )
                }
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-bold text-black hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <span className="px-3 py-2 rounded-lg bg-teal-700 text-white text-xs font-bold whitespace-nowrap">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(prev + 1, totalPages)
                  )
                }
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-bold text-black hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

            </div>

          </div>
        )}

      </div>

      {/* =================================================== */}
      {/* EDIT CUSTOMER MODAL */}
      {/* =================================================== */}

      {editingCustomer && (

        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeEditModal();
            }
          }}
        >

          <div className="w-full max-w-2xl max-h-[94vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-300">

            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 sm:px-6 py-4 flex items-center justify-between">

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700">
                  Customer Management
                </p>

                <h2 className="text-base sm:text-lg font-extrabold text-black mt-0.5">
                  Edit Customer
                </h2>

                <p className="text-[10px] text-black mt-0.5">
                  Update customer personal information
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingEdit}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-black hover:bg-gray-100 disabled:opacity-40 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={handleUpdateCustomer}
              className="p-4 sm:p-6"
            >

              {/* ERROR */}

              {editError && (
                <div className="mb-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* CUSTOMER NAME */}

                <div className="sm:col-span-2">

                  <label className="block text-[11px] font-bold text-black mb-1.5">
                    Customer Name *
                  </label>

                  <div className="relative">

                    <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                    <input
                      type="text"
                      value={editForm.customerName}
                      onChange={(e) =>
                        handleEditChange(
                          "customerName",
                          e.target.value
                        )
                      }
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
                      placeholder="Enter customer name"
                    />

                  </div>
                </div>

                {/* PHONE */}

                <div>

                  <label className="block text-[11px] font-bold text-black mb-1.5">
                    Phone Number *
                  </label>

                  <div className="relative">

                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                    <input
                      type="text"
                      value={editForm.phoneNumber}
                      onChange={(e) =>
                        handleEditChange(
                          "phoneNumber",
                          e.target.value
                        )
                      }
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
                      placeholder="Enter phone number"
                    />

                  </div>
                </div>

                {/* ALTERNATIVE PHONE */}

                <div>

                  <label className="block text-[11px] font-bold text-black mb-1.5">
                    Alternative Phone
                  </label>

                  <div className="relative">

                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                    <input
                      type="text"
                      value={editForm.alternativePhone}
                      onChange={(e) =>
                        handleEditChange(
                          "alternativePhone",
                          e.target.value
                        )
                      }
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
                      placeholder="Alternative phone"
                    />

                  </div>
                </div>

                {/* EMAIL */}

                <div className="sm:col-span-2">

                  <label className="block text-[11px] font-bold text-black mb-1.5">
                    Email
                  </label>

                  <div className="relative">

                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        handleEditChange(
                          "email",
                          e.target.value
                        )
                      }
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
                      placeholder="customer@example.com"
                    />

                  </div>
                </div>

                {/* ADDRESS */}

                <div className="sm:col-span-2">

                  <label className="block text-[11px] font-bold text-black mb-1.5">
                    Address *
                  </label>

                  <div className="relative">

                    <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />

                    <textarea
                      rows="3"
                      value={editForm.address}
                      onChange={(e) =>
                        handleEditChange(
                          "address",
                          e.target.value
                        )
                      }
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-black placeholder:text-gray-400 resize-none focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
                      placeholder="Enter customer address"
                    />

                  </div>
                </div>

                {/* ID PROOF TYPE */}

                <div>
                  <label className="block text-[11px] font-bold text-black mb-1.5">
                    ID Proof Type *
                  </label>

                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />

                    <select
                      value={editForm.idProofType}
                      onChange={(e) =>
                        handleEditChange(
                          "idProofType",
                          e.target.value
                        )
                      }
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-300 bg-white text-sm text-black appearance-none cursor-pointer focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
                    >
                      <option value="">
                        Select ID Proof
                      </option>

                      <option value="Aadhaar Card">
                        Aadhaar Card
                      </option>

                      <option value="PAN Card">
                        PAN Card
                      </option>

                      <option value="Driving License">
                        Driving License
                      </option>

                      <option value="Passport">
                        Passport
                      </option>

                      <option value="Voter ID">
                        Voter ID
                      </option>
                    </select>

                    {/* Custom dropdown arrow */}
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-black"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m6 9 6 6 6-6"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* ID PROOF NUMBER */}

                <div>

                  <label className="block text-[11px] font-bold text-black mb-1.5">
                    ID Proof Number *
                  </label>

                  <input
                    type="text"
                    value={editForm.idProofNumber}
                    onChange={(e) =>
                      handleEditChange(
                        "idProofNumber",
                        e.target.value
                      )
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
                    placeholder="Enter ID proof number"
                  />

                </div>

              </div>

              {/* BUTTONS */}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 mt-6 pt-5 border-t border-gray-200">

                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-black text-xs font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold disabled:opacity-60 transition-colors"
                >
                  {savingEdit ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save Changes
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
};

export default CustomerManagement;