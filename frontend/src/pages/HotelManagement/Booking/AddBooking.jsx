import React, { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    CheckCircle2,
    BedDouble,
    Mail,
    Phone,
    User,
    CreditCard,
    Filter,
    MapPin,
    Plus,
    X,
} from "lucide-react";

import InitialPayment from "./InitialPayment";

import {
    getAllCustomers,
    createCustomer,
    updateCustomer,
} from "../../../service/customersService";

import { listRooms } from "../../../service/roomService";

import { createBooking } from "../../../service/bookingApi";

const idProofOptions = [
    "Aadhaar Card",
    "PAN Card",
    "Driving License",
    "Passport",
    "Voter ID",
];

const getRoomPrice = (room) =>
    Number(
        room?.pricePerNight ??
        room?.perNightRoomPrice ??
        room?.price ??
        0
    );

const getRoomNumber = (room) =>
    String(room?.roomNumber ?? room?.number ?? "").trim();

const getRoomType = (room) =>
    String(room?.roomType ?? room?.type ?? "").trim();

const getBedType = (room) =>
    String(room?.bedType ?? room?.bed ?? "").trim();

const getApiArray = (response, keys = []) => {
    if (Array.isArray(response)) return response;

    for (const key of keys) {
        if (Array.isArray(response?.[key])) return response[key];
    }

    return [];
};

const getRoomCheckIn = (room, form) =>
    room?.checkIn || form?.checkIn || "";

const getRoomCheckInTime = (room, form) =>
    room?.checkInTime || form?.checkInTime || "";

const getRoomCheckOut = (room, form) =>
    room?.checkOut || form?.checkOut || "";

const getRoomCheckOutTime = (room, form) =>
    room?.checkOutTime || form?.checkOutTime || "";

const calculateRoomNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;

    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end <= start
    ) {
        return 0;
    }

    return Math.ceil(
        (end.getTime() - start.getTime()) / 86400000
    );
};

export default function AddBooking({ onComplete, onCancel }) {
    const [form, setForm] = useState({
        customerName: "",
        phoneNumber: "",
        alternativePhone: "",
        email: "",
        idProofType: "",
        idProofNumber: "",
        address: "",
        checkIn: "",
        checkInTime: "",
        checkOut: "",
        checkOutTime: "",
        adults: 1,
        children: 0,
    });


    const [rooms, setRooms] = useState([]);
    const [existingCustomers, setExistingCustomers] = useState([]);

    const [selectedRooms, setSelectedRooms] = useState([]);

    const [loadingRooms, setLoadingRooms] = useState(true);
    const [loadingCustomers, setLoadingCustomers] = useState(true);

    const [error, setError] = useState("");

    const [customerSuggestions, setCustomerSuggestions] = useState([]);
    const [showCustomerSuggestions, setShowCustomerSuggestions] =
        useState(false);
    const [isExistingCustomer, setIsExistingCustomer] = useState(false);

    const [roomFilter, setRoomFilter] = useState("all");
    const [bedFilter, setBedFilter] = useState("all");

    const [showInitialPayment, setShowInitialPayment] = useState(false);
    const [savingBooking, setSavingBooking] = useState(false);

    const [fieldErrors, setFieldErrors] = useState({});
const [touchedFields, setTouchedFields] = useState({});
    
    // ============================================================
    // LOAD ROOMS + CUSTOMERS
    // ============================================================

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoadingRooms(true);
                setLoadingCustomers(true);
                setError("");

                const roomResponse = await listRooms();

                const roomData = getApiArray(roomResponse, [
                    "data",
                    "rooms",
                ]);

                setRooms(roomData);

                const customerResponse = await getAllCustomers();

                const customerData = getApiArray(customerResponse, [
                    "data",
                    "customers",
                ]);

                setExistingCustomers(customerData);
            } catch (err) {
                console.error("Failed to load booking data:", err);

                setError(
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to load rooms and customers."
                );
            } finally {
                setLoadingRooms(false);
                setLoadingCustomers(false);
            }
        };

        loadData();
    }, []);

    // ============================================================
    // PHONE SEARCH
    // ============================================================
const handlePhoneChange = (e) => {
    const value = e.target.value
        .replace(/\D/g, "")
        .slice(0, 10);

    setForm((prev) => ({
        ...prev,
        phoneNumber: value,
    }));

    setIsExistingCustomer(false);

    if (!value.trim() || value.length < 3) {
        setCustomerSuggestions([]);
        setShowCustomerSuggestions(false);
    } else {
        const matches = existingCustomers.filter(
            (customer) =>
                String(customer?.phoneNumber || "")
                    .includes(value)
        );

        setCustomerSuggestions(matches);
        setShowCustomerSuggestions(true);
    }

    if (touchedFields.phoneNumber) {
        setFieldErrors((prev) => ({
            ...prev,
            phoneNumber: validateField(
                "phoneNumber",
                value,
                {
                    ...form,
                    phoneNumber: value,
                }
            ),
        }));
    }

    setError("");
};

    // ============================================================
    // SELECT EXISTING CUSTOMER
    // ============================================================

    const handleExistingCustomerSelect = (customer) => {
        setForm((prev) => ({
            ...prev,
            phoneNumber: customer?.phoneNumber || "",
            email: customer?.email || "",
            customerName: customer?.customerName || "",
            alternativePhone: customer?.alternativePhone || "",
            address: customer?.address || "",
            idProofType: customer?.idProofType || "",
            idProofNumber: customer?.idProofNumber || "",
        }));

        setIsExistingCustomer(true);
        setShowCustomerSuggestions(false);
        setCustomerSuggestions([]);
        setError("");
    };

    // ============================================================
    // ADD NEW CUSTOMER
    // ============================================================

    const handleAddNewCustomer = () => {
        setForm((prev) => ({
            ...prev,
            customerName: "",
            email: "",
            alternativePhone: "",
            address: "",
            idProofType: "",
            idProofNumber: "",
        }));

        setIsExistingCustomer(false);
        setShowCustomerSuggestions(false);
        setCustomerSuggestions([]);
        setError("");
    };

    // ============================================================
    // INPUT
    // ============================================================

const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
        const updatedForm = {
            ...prev,
            [name]: value,
        };

        // Keep stay details synchronized with selected rooms
        if (
            name === "checkIn" ||
            name === "checkInTime" ||
            name === "checkOut" ||
            name === "checkOutTime"
        ) {
            setSelectedRooms((prevRooms) =>
                prevRooms.map((room) => ({
                    ...room,
                    [name]: value,
                }))
            );
        }

        // Validate the changed field if user has already touched it
        if (touchedFields[name]) {
            const message = validateField(
                name,
                value,
                updatedForm
            );

            setFieldErrors((prevErrors) => ({
                ...prevErrors,
                [name]: message,
            }));
        }

        return updatedForm;
    });

    setError("");
};



const handleBlur = (e) => {
    const { name, value } = e.target;

    setTouchedFields((prev) => ({
        ...prev,
        [name]: true,
    }));

    const message = validateField(
        name,
        value,
        form
    );

    setFieldErrors((prev) => ({
        ...prev,
        [name]: message,
    }));
};


const FieldError = ({ name }) => {
    if (!touchedFields[name] || !fieldErrors[name]) {
        return null;
    }

    return (
        <p
            className="
                mt-1.5
                flex
                items-start
                gap-1.5
                text-xs
                font-semibold
                leading-5
                text-red-700
            "
        >
            <span className="shrink-0 font-bold">
                •
            </span>

            <span>
                {fieldErrors[name]}
            </span>
        </p>
    );
};

    const updateSelectedRoomStay = (room, field, value) => {
        const roomId = String(room?._id || room?.id || "");
        const roomNumber = getRoomNumber(room);

        setSelectedRooms((prev) =>
            prev.map((selected) => {
                const sameRoom =
                    String(selected?._id || selected?.id || "") === roomId ||
                    getRoomNumber(selected) === roomNumber;

                return sameRoom
                    ? {
                          ...selected,
                          [field]: value,
                      }
                    : selected;
            })
        );

        setError("");
    };

    // ============================================================
    // FILTER ROOMS
    // ============================================================

const filteredRooms = rooms.filter((room) => {
  if (room.status !== "available") {
    return false;
  }

  if (
    roomFilter !== "all" &&
    getRoomType(room) !== roomFilter
  ) {
    return false;
  }

  if (
    bedFilter !== "all" &&
    getBedType(room) !== bedFilter
  ) {
    return false;
  }

  return true;
});

    // ============================================================
    // NIGHTS
    // ============================================================

    const nights = useMemo(() => {
        if (!form.checkIn || !form.checkOut) return 0;

        const start = new Date(`${form.checkIn}T00:00:00`);
        const end = new Date(`${form.checkOut}T00:00:00`);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return 0;
        }

        return Math.max(
            0,
            Math.ceil((end.getTime() - start.getTime()) / 86400000)
        );
    }, [form.checkIn, form.checkOut]);

    // ============================================================
    // TOTAL FOR ALL SELECTED ROOMS
    // ============================================================

    const roomBreakdown = useMemo(() => {
        return selectedRooms.map((room) => {
            const checkIn = getRoomCheckIn(room, form);
            const checkInTime = getRoomCheckInTime(room, form);
            const checkOut = getRoomCheckOut(room, form);
            const checkOutTime = getRoomCheckOutTime(room, form);
            const roomNights = calculateRoomNights(checkIn, checkOut);
            const rate = getRoomPrice(room);

            return {
                ...room,
                checkIn,
                checkInTime,
                checkOut,
                checkOutTime,
                bookedNights: roomNights,
                roomSubtotal: rate * roomNights,
            };
        });
    }, [
        selectedRooms,
        form.checkIn,
        form.checkInTime,
        form.checkOut,
        form.checkOutTime,
    ]);

    const roomTotal = useMemo(() => {
        return roomBreakdown.reduce(
            (total, room) => total + Number(room.roomSubtotal || 0),
            0
        );
    }, [roomBreakdown]);

    // ============================================================
    // SELECT / DESELECT ROOM
    // ============================================================

    const handleRoomSelect = (room) => {
        const roomId = String(room?._id || room?.id || "");
        const roomNumber = getRoomNumber(room);

        if (!roomId && !roomNumber) {
            setError("Selected room is invalid.");
            return;
        }

        if (room?.status !== "available") {
            setError(`Room ${roomNumber || ""} is already booked.`);
            return;
        }

        const alreadySelected = selectedRooms.some(
            (selected) =>
                String(selected?._id || selected?.id || "") === roomId ||
                getRoomNumber(selected) === roomNumber
        );

        if (alreadySelected) {
            setSelectedRooms((prev) =>
                prev.filter(
                    (selected) =>
                        String(selected?._id || selected?.id || "") !==
                            roomId &&
                        getRoomNumber(selected) !== roomNumber
                )
            );
        } else {
            setSelectedRooms((prev) => [
                ...prev,
                {
                    ...room,
                    checkIn: form.checkIn,
                    checkInTime: form.checkInTime,
                    checkOut: form.checkOut,
                    checkOutTime: form.checkOutTime,
                },
            ]);
        }

        setError("");
    };

    const removeSelectedRoom = (room) => {
        const roomId = String(room?._id || room?.id || "");
        const roomNumber = getRoomNumber(room);

        setSelectedRooms((prev) =>
            prev.filter(
                (selected) =>
                    String(selected?._id || selected?.id || "") !== roomId &&
                    getRoomNumber(selected) !== roomNumber
            )
        );
    };

    const isRoomSelected = (room) => {
        const roomId = String(room?._id || room?.id || "");
        const roomNumber = getRoomNumber(room);

        return selectedRooms.some(
            (selected) =>
                String(selected?._id || selected?.id || "") === roomId ||
                getRoomNumber(selected) === roomNumber
        );
    };


    const validateField = (name, value, currentForm = form) => {
    const cleanValue =
        typeof value === "string"
            ? value.trim()
            : value;

    switch (name) {
        case "customerName":
            if (!cleanValue) {
                return "Please enter the customer's name. Example: John Kumar.";
            }

            if (cleanValue.length < 2) {
                return "Customer name should contain at least 2 characters.";
            }

            if (!/^[a-zA-Z\s.'-]+$/.test(cleanValue)) {
                return "Please enter a valid customer name using letters only.";
            }

            return "";

        case "phoneNumber":
            if (!cleanValue) {
                return "Please enter the customer's phone number.";
            }

            if (!/^\d{10}$/.test(String(cleanValue))) {
                return "Please enter a valid 10-digit phone number.";
            }

            return "";

        case "alternativePhone":
            if (
                cleanValue &&
                !/^\d{10}$/.test(String(cleanValue))
            ) {
                return "Alternative phone number must contain 10 digits.";
            }

            return "";

        case "email":
            if (
                cleanValue &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanValue)
            ) {
                return "Please enter a valid email address. Example: guest@email.com.";
            }

            return "";

        case "idProofType":
            if (!cleanValue) {
                return "Please select an ID proof type.";
            }

            return "";

        case "idProofNumber":
            if (!currentForm.idProofType) {
                return "Please select an ID proof type first.";
            }

            if (!cleanValue) {
                return `Please enter the ${currentForm.idProofType} number.`;
            }

            if (String(cleanValue).length < 4) {
                return `Please enter a valid ${currentForm.idProofType} number.`;
            }

            return "";

        case "address":
            if (!cleanValue) {
                return "Please enter the customer's address.";
            }

            if (cleanValue.length < 5) {
                return "Please enter a complete customer address.";
            }

            return "";

        case "checkIn":
            if (!cleanValue) {
                return "Please select a check-in date.";
            }

            return "";

        case "checkInTime":
            if (!cleanValue) {
                return "Please select a check-in time.";
            }

            return "";

        case "checkOut":
            if (!cleanValue) {
                return "Please select a check-out date.";
            }

            if (
                currentForm.checkIn &&
                cleanValue <= currentForm.checkIn
            ) {
                return "Check-out date must be after check-in date.";
            }

            return "";

        case "checkOutTime":
            if (!cleanValue) {
                return "Please select a check-out time.";
            }

            return "";

        case "adults":
            if (
                cleanValue === "" ||
                Number(cleanValue) < 1
            ) {
                return "At least 1 adult is required.";
            }

            return "";

        case "children":
            if (
                cleanValue === "" ||
                Number(cleanValue) < 0
            ) {
                return "Children count cannot be negative.";
            }

            return "";

        default:
            return "";
    }
};

    // ============================================================
    // FORM VALIDATION
    // ============================================================

const validateBooking = () => {
    const errors = {};

    const fieldsToValidate = [
        "customerName",
        "phoneNumber",
        "alternativePhone",
        "email",
        "idProofType",
        "idProofNumber",
        "address",
        "checkIn",
        "checkInTime",
        "checkOut",
        "checkOutTime",
        "adults",
        "children",
    ];

    fieldsToValidate.forEach((field) => {
        const message = validateField(
            field,
            form[field],
            form
        );

        if (message) {
            errors[field] = message;
        }
    });

    if (selectedRooms.length === 0) {
        errors.rooms =
            "Please select at least one available room.";
    }

    for (const room of roomBreakdown) {
        const roomNumber =
            getRoomNumber(room) || "selected room";

        if (!room.checkIn) {
            errors.rooms =
                `Please select a check-in date for room ${roomNumber}.`;
            break;
        }

        if (!room.checkInTime) {
            errors.rooms =
                `Please select a check-in time for room ${roomNumber}.`;
            break;
        }

        if (!room.checkOut) {
            errors.rooms =
                `Please select a check-out date for room ${roomNumber}.`;
            break;
        }

        if (!room.checkOutTime) {
            errors.rooms =
                `Please select a check-out time for room ${roomNumber}.`;
            break;
        }

        if (room.bookedNights <= 0) {
            errors.rooms =
                `Check-out date must be after check-in date for room ${roomNumber}.`;
            break;
        }

        if (getRoomPrice(room) < 0) {
            errors.rooms =
                `Invalid room price for room ${roomNumber}.`;
            break;
        }

        if (room.status !== "available") {
            errors.rooms =
                `Room ${roomNumber} is no longer available. Please select another room.`;
            break;
        }
    }

    if (roomTotal <= 0 && selectedRooms.length > 0) {
        errors.rooms =
            "The booking total must be greater than ₹0.";
    }

    return errors;
};

    // ============================================================
    // SUBMIT -> INITIAL PAYMENT
    // ============================================================
const handleSubmit = (e) => {
    e.preventDefault();

    const errors = validateBooking();

    setTouchedFields((prev) => ({
        ...prev,
        customerName: true,
        phoneNumber: true,
        alternativePhone: true,
        email: true,
        idProofType: true,
        idProofNumber: true,
        address: true,
        checkIn: true,
        checkInTime: true,
        checkOut: true,
        checkOutTime: true,
        adults: true,
        children: true,
    }));

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
        const firstField = Object.keys(errors)[0];

        const element = document.querySelector(
            `[name="${firstField}"]`
        );

        if (element) {
            element.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });

            setTimeout(() => {
                element.focus();
            }, 350);
        }

        setError(
            errors[firstField]
        );

        return;
    }

    setError("");
    setShowInitialPayment(true);
};
    // ============================================================
    // CREATE / UPDATE CUSTOMER + OCCUPY ALL ROOMS
    // ============================================================

    const handlePaymentConfirm = async (paymentData) => {
        setSavingBooking(true);
        setError("");

        try {
            const paidAmount = Number(paymentData?.amount || 0);
            const paymentMethod =
                paymentData?.paymentMethod || "cash";

            if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
                throw new Error("Invalid initial payment amount.");
            }

            if (paidAmount > roomTotal) {
                throw new Error(
                    "Initial payment cannot be greater than the booking total."
                );
            }

            // ---------------------------------------------------------
            // 1. Re-check room availability before creating booking.
            // ---------------------------------------------------------
            const latestRoomResponse = await listRooms();

            const latestRooms = getApiArray(latestRoomResponse, [
                "data",
                "rooms",
            ]);

            const roomsToBook = selectedRooms.map((selectedRoom) => {
                const selectedId = String(
                    selectedRoom?._id || selectedRoom?.id || ""
                );
                const roomNumber = getRoomNumber(selectedRoom);

                const latestRoom = latestRooms.find(
                    (room) =>
                        String(room?._id || "") === selectedId ||
                        getRoomNumber(room) === roomNumber
                );

                if (!latestRoom) {
                    throw new Error(
                        `Room ${roomNumber || selectedId} could not be found.`
                    );
                }

                if (latestRoom.status !== "available") {
                    throw new Error(
                        `Room ${roomNumber} is already booked. Please select another room.`
                    );
                }

                return latestRoom;
            });

            // ---------------------------------------------------------
            // 2. Create/update ONLY the customer.
            //    Room/payment/booking fields do NOT go into Customer DB.
            // ---------------------------------------------------------
            const customerData = {
                customerName: form.customerName.trim(),
                phoneNumber: form.phoneNumber.trim(),
                alternativePhone:
                    form.alternativePhone?.trim() || "",
                email: form.email?.trim() || "",
                address: form.address.trim(),
                idProofType: form.idProofType.trim(),
                idProofNumber: form.idProofNumber.trim(),
            };

            let customerResponse;

            const existingCustomer = existingCustomers.find(
                (customer) =>
                    String(customer?.phoneNumber || "").trim() ===
                    String(form.phoneNumber || "").trim()
            );

            if (existingCustomer?._id) {
                customerResponse = await updateCustomer(
                    existingCustomer._id,
                    customerData
                );
            } else {
                customerResponse = await createCustomer(customerData);
            }

            const savedCustomer =
                customerResponse?.data?.customer ||
                customerResponse?.data ||
                customerResponse?.customer ||
                customerResponse;

            const customerId = savedCustomer?._id;

            if (!customerId) {
                throw new Error(
                    "Customer was saved but customer ID was not returned."
                );
            }

            // ---------------------------------------------------------
            // 3. Build Booking DB rooms.
            //
            // IMPORTANT:
            // The initial payment belongs to the WHOLE BOOKING.
            // If rooms 106 + 104 are selected together and ₹100 is paid,
            // Booking DB stores initialPaidAmount: 100 ONCE.
            // ---------------------------------------------------------
            const bookingRooms = roomsToBook.map((room) => {
                const selectedRoom =
                    selectedRooms.find(
                        (selected) =>
                            String(
                                selected?._id || selected?.id || ""
                            ) === String(room?._id || "") ||
                            getRoomNumber(selected) ===
                                getRoomNumber(room)
                    ) || room;

                const checkIn = getRoomCheckIn(
                    selectedRoom,
                    form
                );
                const checkInTime = getRoomCheckInTime(
                    selectedRoom,
                    form
                );
                const checkOut = getRoomCheckOut(
                    selectedRoom,
                    form
                );
                const checkOutTime = getRoomCheckOutTime(
                    selectedRoom,
                    form
                );

                return {
                    roomId: room._id,
                    roomNumber: getRoomNumber(room),
                    roomType: getRoomType(room),
                    bedType: getBedType(room),
                    pricePerNight: getRoomPrice(room),

                    adults: Number(form.adults),
                    children: Number(form.children),

                    checkIn,
                    checkInTime,
                    checkOut,
                    checkOutTime,

                    actualCheckoutDate: "",
                    actualCheckoutTime: "",
                    checkoutStatus: "Staying",

                    foodServices: [],
                    roomServices: [],
                };
            });

            // ---------------------------------------------------------
            // 4. Create the Booking.
            //
            // createBooking() backend is responsible for saving the
            // booking and changing physical Room status to booked.
            // ---------------------------------------------------------
            const bookingData = {
                customerId,

                rooms: bookingRooms,

                bookingStatus: "Active",

                // Shared advance for this complete booking.
                initialPaidAmount: paidAmount,
                initialPaidVia: paymentMethod,
                initialPaidUsedAmount: 0,
            };

            console.log(
                "BOOKING DATA BEING SENT:",
                JSON.stringify(bookingData, null, 2)
            );

            const bookingResponse =
                await createBooking(bookingData);

            const savedBooking =
                bookingResponse?.data?.booking ||
                bookingResponse?.data ||
                bookingResponse?.booking ||
                bookingResponse;

            if (!savedBooking?._id) {
                throw new Error(
                    "Booking was created but booking ID was not returned."
                );
            }

            // ---------------------------------------------------------
            // 5. Update local room list only.
            //    Backend has already changed DB room status.
            // ---------------------------------------------------------
            const bookedRoomIds = new Set(
                roomsToBook.map((room) => String(room._id))
            );

            setRooms((prevRooms) =>
                prevRooms.map((room) =>
                    bookedRoomIds.has(String(room?._id))
                        ? {
                              ...room,
                              status: "occupied",
                          }
                        : room
                )
            );

            // ---------------------------------------------------------
            // 6. Build the object needed by the parent UI.
            // ---------------------------------------------------------
            const completedBooking = {
                ...savedBooking,

                customerId,

                customer: savedCustomer,

                customerName: form.customerName.trim(),
                phoneNumber: form.phoneNumber.trim(),
                alternativePhone:
                    form.alternativePhone?.trim() || "",
                email: form.email?.trim() || "",
                address: form.address.trim(),
                idProofType: form.idProofType,
                idProofNumber: form.idProofNumber.trim(),

                rooms: bookingRooms,

                roomTotal,

                initialPayment: paidAmount,
                initialPaymentMethod: paymentMethod,

                paymentStatus:
                    paidAmount >= roomTotal
                        ? "Paid"
                        : "Partial",

                remainingAmount: Math.max(
                    roomTotal - paidAmount,
                    0
                ),
            };

            console.log(
                "COMPLETED BOOKING:",
                completedBooking
            );

            setSelectedRooms([]);
            setShowInitialPayment(false);

            if (typeof onComplete === "function") {
                onComplete(completedBooking);
            }
        } catch (err) {
            console.error(
                "========== CHECK-IN ERROR ==========",
                err
            );

            console.error(
                "SERVER RESPONSE:",
                err?.response?.data
            );

            setError(
                err?.response?.data?.message ||
                    err?.response?.data?.error ||
                    err?.message ||
                    "Failed to complete booking."
            );

            throw err;
        } finally {
            setSavingBooking(false);
        }
    };

    const isLoading =
        loadingRooms || loadingCustomers;

    const bedTypes = useMemo(
        () => [
            ...new Set(
                rooms
                    .map((room) => getBedType(room))
                    .filter(Boolean)
            ),
        ],
        [rooms]
    );

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="max-w-5xl pb-4 bg-white space-y-6"
        >
            {/* HEADER */}
            <div>
                <h1 className="text-2xl pt-5  font-bold text-slate-900">
                    New Room Booking
                </h1>

                <p className="text-sm text-slate-500 mt-1">
                    Enter guest details and select one or multiple
                    available rooms.
                </p>
            </div>

            {/* LOADING */}
            {isLoading && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg px-4 py-3 text-sm">
                    Loading rooms and customers...
                </div>
            )}

            {/* ERROR */}
            {error && (
                <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={() => setError("")}
                        className="shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* CUSTOMER DETAILS */}
       <section className="w-full bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 lg:p-6 space-y-5">
    {/* SECTION HEADER */}
    <div>
        <h2 className="text-sm sm:text-base font-bold text-slate-900">
            Customer Details
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Search an existing guest or enter a new customer.
        </p>
    </div>

    {/* EXISTING CUSTOMER MESSAGE */}
    {isExistingCustomer && (
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-green-50 border border-green-200">
            <CheckCircle2 className="w-4 h-4 text-green-700 mt-0.5 shrink-0" />

            <p className="text-xs sm:text-sm font-semibold text-green-800">
                Existing customer selected. You can edit the customer
                details below.
            </p>
        </div>
    )}

    {/* CUSTOMER FORM */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">

        {/* =========================================================
            PHONE NUMBER
        ========================================================= */}
        <div className="relative">
            <label
                htmlFor="phoneNumber"
                className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
            >
                Phone Number <span className="text-red-600">*</span>
            </label>

            {/* ONLY INPUT + ICON INSIDE RELATIVE */}
            <div className="relative">
                <Phone
                    className="
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        w-4
                        h-4
                        text-slate-500
                        pointer-events-none
                    "
                />

                <input
                    id="phoneNumber"
                    type="tel"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handlePhoneChange}
                    onBlur={handleBlur}
                    onFocus={() => {
                        if (form.phoneNumber.length >= 3) {
                            setShowCustomerSuggestions(true);
                        }
                    }}
                    maxLength={10}
                    inputMode="numeric"
                    autoComplete="new-password"
                    placeholder="Enter 10-digit phone number"
                    aria-invalid={
                        touchedFields.phoneNumber &&
                        !!fieldErrors.phoneNumber
                    }
                    aria-describedby="phoneNumber-error"
                    className={`
                        w-full
                        pl-9
                        pr-3
                        py-2.5
                        sm:py-3
                        border
                        rounded-xl
                        text-sm
                        text-slate-900
                        placeholder:text-slate-500
                        outline-none
                        transition-all
                        ${
                            touchedFields.phoneNumber &&
                            fieldErrors.phoneNumber
                                ? `
                                    border-red-500
                                    bg-red-50
                                    focus:border-red-600
                                    focus:ring-2
                                    focus:ring-red-100
                                `
                                : `
                                    border-slate-300
                                    bg-white
                                    focus:border-[var(--teal,#08838d)]
                                    focus:ring-2
                                    focus:ring-teal-100
                                `
                        }
                    `}
                />
            </div>

            {/* ERROR IS OUTSIDE RELATIVE DIV */}
            <FieldError name="phoneNumber" />

            {/* CUSTOMER SUGGESTIONS */}
            {showCustomerSuggestions && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">

                    {/* ADD NEW CUSTOMER */}
                    <button
                        type="button"
                        onClick={handleAddNewCustomer}
                        className="
                            w-full
                            flex
                            items-center
                            gap-3
                            px-4
                            py-3
                            text-left
                            border-b
                            border-slate-200
                            hover:bg-slate-50
                            transition
                        "
                    >
                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                            <Plus className="w-4 h-4 text-[var(--teal,#08838d)]" />
                        </div>

                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-900">
                                Add New Customer
                            </p>

                            <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                                Enter customer details manually
                            </p>
                        </div>
                    </button>

                    {/* EXISTING CUSTOMERS */}
                    {customerSuggestions.length > 0 ? (
                        <div className="max-h-56 overflow-y-auto">

                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-slate-600">
                                    Existing Customers
                                </p>
                            </div>

                            {customerSuggestions.map((customer) => (
                                <button
                                    key={customer._id}
                                    type="button"
                                    onClick={() =>
                                        handleExistingCustomerSelect(customer)
                                    }
                                    className="
                                        w-full
                                        flex
                                        items-center
                                        gap-3
                                        px-4
                                        py-3
                                        text-left
                                        hover:bg-teal-50
                                        transition
                                        border-b
                                        border-slate-100
                                    "
                                >
                                    {/* USER ICON */}
                                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                        <User className="w-4 h-4 text-slate-600" />
                                    </div>

                                    {/* CUSTOMER INFO */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">

                                            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                                {customer.customerName}
                                            </p>

                                            <p className="text-[11px] sm:text-xs font-semibold text-slate-700 shrink-0">
                                                {customer.phoneNumber}
                                            </p>
                                        </div>

                                        {customer.email && (
                                            <p className="text-[11px] sm:text-xs text-slate-600 truncate mt-0.5">
                                                {customer.email}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-3">
                            <p className="text-xs sm:text-sm text-slate-600">
                                No existing customer found for this number.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>


        {/* =========================================================
            CUSTOMER NAME
        ========================================================= */}
        <div>
            <label
                htmlFor="customerName"
                className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
            >
                Customer Name <span className="text-red-600">*</span>
            </label>

            <div className="relative">
                <User
                    className="
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        w-4
                        h-4
                        text-slate-500
                        pointer-events-none
                    "
                />

                <input
                    id="customerName"
                    type="text"
                    name="customerName"
                    value={form.customerName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter customer name"
                    autoComplete="name"
                    aria-invalid={
                        touchedFields.customerName &&
                        !!fieldErrors.customerName
                    }
                    aria-describedby="customerName-error"
                    className={`
                        w-full
                        pl-9
                        pr-3
                        py-2.5
                        sm:py-3
                        border
                        rounded-xl
                        text-sm
                        text-slate-900
                        placeholder:text-slate-500
                        outline-none
                        transition-all
                        ${
                            touchedFields.customerName &&
                            fieldErrors.customerName
                                ? `
                                    border-red-500
                                    bg-red-50
                                    focus:border-red-600
                                    focus:ring-2
                                    focus:ring-red-100
                                `
                                : `
                                    border-slate-300
                                    bg-white
                                    focus:border-[var(--teal,#08838d)]
                                    focus:ring-2
                                    focus:ring-teal-100
                                `
                        }
                    `}
                />
            </div>

            {/* ERROR OUTSIDE RELATIVE */}
            <FieldError name="customerName" />
        </div>


        {/* =========================================================
            EMAIL
        ========================================================= */}
        <div>
            <label
                htmlFor="email"
                className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
            >
                Email
            </label>

            <div className="relative">
                <Mail
                    className="
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        w-4
                        h-4
                        text-slate-500
                        pointer-events-none
                    "
                />

                <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter email address"
                    autoComplete="email"
                    aria-invalid={
                        touchedFields.email &&
                        !!fieldErrors.email
                    }
                    aria-describedby="email-error"
                    className={`
                        w-full
                        pl-9
                        pr-3
                        py-2.5
                        sm:py-3
                        border
                        rounded-xl
                        text-sm
                        text-slate-900
                        placeholder:text-slate-500
                        outline-none
                        transition-all
                        ${
                            touchedFields.email &&
                            fieldErrors.email
                                ? `
                                    border-red-500
                                    bg-red-50
                                    focus:border-red-600
                                    focus:ring-2
                                    focus:ring-red-100
                                `
                                : `
                                    border-slate-300
                                    bg-white
                                    focus:border-[var(--teal,#08838d)]
                                    focus:ring-2
                                    focus:ring-teal-100
                                `
                        }
                    `}
                />
            </div>

            <FieldError name="email" />
        </div>


        {/* =========================================================
            ALTERNATIVE PHONE
        ========================================================= */}
        <div>
            <label
                htmlFor="alternativePhone"
                className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
            >
                Alternative Phone Number
            </label>

            <div className="relative">
                <Phone
                    className="
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        w-4
                        h-4
                        text-slate-500
                        pointer-events-none
                    "
                />

                <input
                    id="alternativePhone"
                    type="tel"
                    name="alternativePhone"
                    value={form.alternativePhone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="Enter 10-digit phone number"
                    autoComplete="tel"
                    aria-invalid={
                        touchedFields.alternativePhone &&
                        !!fieldErrors.alternativePhone
                    }
                    aria-describedby="alternativePhone-error"
                    className={`
                        w-full
                        pl-9
                        pr-3
                        py-2.5
                        sm:py-3
                        border
                        rounded-xl
                        text-sm
                        text-slate-900
                        placeholder:text-slate-500
                        outline-none
                        transition-all
                        ${
                            touchedFields.alternativePhone &&
                            fieldErrors.alternativePhone
                                ? `
                                    border-red-500
                                    bg-red-50
                                    focus:border-red-600
                                    focus:ring-2
                                    focus:ring-red-100
                                `
                                : `
                                    border-slate-300
                                    bg-white
                                    focus:border-[var(--teal,#08838d)]
                                    focus:ring-2
                                    focus:ring-teal-100
                                `
                        }
                    `}
                />
            </div>

            <FieldError name="alternativePhone" />
        </div>


        {/* =========================================================
            ID PROOF TYPE
        ========================================================= */}
        <div>
            <label
                htmlFor="idProofType"
                className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
            >
                ID Proof <span className="text-red-600">*</span>
            </label>

            <div className="relative">
                <CreditCard
                    className="
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        w-4
                        h-4
                        text-slate-500
                        pointer-events-none
                        z-10
                    "
                />

                <select
                    id="idProofType"
                    name="idProofType"
                    value={form.idProofType}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={
                        touchedFields.idProofType &&
                        !!fieldErrors.idProofType
                    }
                    aria-describedby="idProofType-error"
                    className={`
                        w-full
                        pl-9
                        pr-8
                        py-2.5
                        sm:py-3
                        border
                        rounded-xl
                        text-sm
                        text-slate-900
                        bg-white
                        outline-none
                        transition-all
                        ${
                            touchedFields.idProofType &&
                            fieldErrors.idProofType
                                ? `
                                    border-red-500
                                    bg-red-50
                                    focus:border-red-600
                                    focus:ring-2
                                    focus:ring-red-100
                                `
                                : `
                                    border-slate-300
                                    focus:border-[var(--teal,#08838d)]
                                    focus:ring-2
                                    focus:ring-teal-100
                                `
                        }
                    `}
                >
                    <option value="">
                        Select ID Proof
                    </option>

                    {idProofOptions.map((option) => (
                        <option
                            key={option}
                            value={option}
                        >
                            {option}
                        </option>
                    ))}
                </select>
            </div>

            <FieldError name="idProofType" />
        </div>


        {/* =========================================================
            ID PROOF NUMBER
        ========================================================= */}
        <div>
            <label
                htmlFor="idProofNumber"
                className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
            >
                ID Proof Number <span className="text-red-600">*</span>
            </label>

            <input
                id="idProofNumber"
                type="text"
                name="idProofNumber"
                value={form.idProofNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={!form.idProofType}
                placeholder={
                    form.idProofType
                        ? `Enter ${form.idProofType} number`
                        : "Select ID proof first"
                }
                aria-invalid={
                    touchedFields.idProofNumber &&
                    !!fieldErrors.idProofNumber
                }
                aria-describedby="idProofNumber-error"
                className={`
                    w-full
                    px-3
                    py-2.5
                    sm:py-3
                    border
                    rounded-xl
                    text-sm
                    text-slate-900
                    placeholder:text-slate-500
                    outline-none
                    transition-all
                    ${
                        touchedFields.idProofNumber &&
                        fieldErrors.idProofNumber
                            ? `
                                border-red-500
                                bg-red-50
                                focus:border-red-600
                                focus:ring-2
                                focus:ring-red-100
                            `
                            : `
                                border-slate-300
                                bg-white
                                focus:border-[var(--teal,#08838d)]
                                focus:ring-2
                                focus:ring-teal-100
                            `
                    }
                    disabled:bg-slate-100
                    disabled:text-slate-500
                    disabled:cursor-not-allowed
                    disabled:border-slate-200
                `}
            />

            <FieldError name="idProofNumber" />
        </div>


        {/* =========================================================
            ADDRESS
        ========================================================= */}
        <div className="md:col-span-2">
            <label
                htmlFor="address"
                className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
            >
                Address <span className="text-red-600">*</span>
            </label>

            <div className="relative">
                <MapPin
                    className="
                        absolute
                        left-3
                        top-3.5
                        w-4
                        h-4
                        text-slate-500
                        pointer-events-none
                    "
                />

                <textarea
                    id="address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    rows={3}
                    placeholder="Enter complete customer address"
                    aria-invalid={
                        touchedFields.address &&
                        !!fieldErrors.address
                    }
                    aria-describedby="address-error"
                    className={`
                        w-full
                        pl-9
                        pr-3
                        py-3
                        border
                        rounded-xl
                        text-sm
                        text-slate-900
                        placeholder:text-slate-500
                        outline-none
                        resize-none
                        transition-all
                        ${
                            touchedFields.address &&
                            fieldErrors.address
                                ? `
                                    border-red-500
                                    bg-red-50
                                    focus:border-red-600
                                    focus:ring-2
                                    focus:ring-red-100
                                `
                                : `
                                    border-slate-300
                                    bg-white
                                    focus:border-[var(--teal,#08838d)]
                                    focus:ring-2
                                    focus:ring-teal-100
                                `
                        }
                    `}
                />
            </div>

            <FieldError name="address" />
        </div>

    </div>
</section>

            {/* ROOM SECTION */}
            <section className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            Select Rooms
                        </h2>

                        <p className="text-xs text-slate-500 mt-0.5">
                            Select one or multiple available rooms.
                        </p>
                    </div>

                    <div className="px-3 py-2 rounded-lg bg-teal-50 text-[var(--teal-dark,#065b62)] text-xs font-bold">
                        {selectedRooms.length} room
                        {selectedRooms.length === 1 ? "" : "s"} selected
                    </div>
                </div>

                {/* FILTERS */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 max-w-md">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-3">
                        <Filter className="w-4 h-4 text-[var(--teal,#08838d)]" />
                        Filters
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                Room Type
                            </label>

                            <select
                                value={roomFilter}
                                onChange={(e) =>
                                    setRoomFilter(e.target.value)
                                }
                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                            >
                                <option value="all">
                                    All Room Types
                                </option>

                                <option value="AC">AC</option>
                                <option value="Non-AC">Non-AC</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                Bed Type
                            </label>

                            <select
                                value={bedFilter}
                                onChange={(e) =>
                                    setBedFilter(e.target.value)
                                }
                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                            >
                                <option value="all">
                                    All Bed Types
                                </option>

                                {bedTypes.map((bedType) => (
                                    <option
                                        key={bedType}
                                        value={bedType}
                                    >
                                        {bedType}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* ROOMS */}
                {loadingRooms ? (
                    <div className="py-10 text-center">
                        <p className="text-sm font-semibold text-slate-600">
                            Loading rooms...
                        </p>
                    </div>
                ) : filteredRooms.length > 0 ? (
                    <div className="grid cursor-pointer grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRooms.map((room) => {
    const isAvailable =
        room.status === "available";

    const selected =
        isRoomSelected(room);

    const roomNumber =
        getRoomNumber(room);

    const roomType =
        getRoomType(room);

    const bedType =
        getBedType(room);

    const price =
        getRoomPrice(room);

    return (
        <button
            key={
                room._id ||
                room.id ||
                roomNumber
            }
            type="button"
            disabled={!isAvailable}
            onClick={() =>
                handleRoomSelect(room)
            }
            className={`
                text-left border cursor-pointer rounded-xl p-4 transition
                ${
                    !isAvailable
                        ? "border-red-200 bg-red-50 cursor-not-allowed opacity-80"
                        : selected
                            ? "border-[var(--teal,#08838d)] bg-teal-50 ring-1 ring-[var(--teal,#08838d)]"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }
            `}
        >
            <div className="flex items-start  justify-between">

                <div className="flex items-center gap-3">

                    <div
                        className={`
                            w-10 h-10 cursor-pointer rounded-lg flex items-center justify-center
                            ${
                                !isAvailable
                                    ? "bg-red-100 text-red-500"
                                    : selected
                                        ? "bg-[var(--teal-dark,#065b62)] text-white"
                                        : "bg-slate-100 text-slate-500"
                            }
                        `}
                    >
                        <BedDouble className="w-5 h-5" />
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-slate-400">
                            ROOM
                        </p>

                        <p className="text-xl font-bold text-slate-900">
                            {roomNumber}
                        </p>
                    </div>

                </div>

                <span
                    className={`
                        px-2.5 py-1 rounded-full text-[10px] font-bold
                        ${
                            isAvailable
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                        }
                    `}
                >
                    {isAvailable
                        ? selected
                            ? "SELECTED"
                            : "AVAILABLE"
                        : "BOOKED"}
                </span>

            </div>

            <div className="mt-4 flex flex-wrap gap-2">

                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-600">
                    {roomType || "-"}
                </span>

                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-600">
                    {bedType || "-"}
                </span>

            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">

                <p className="text-xs text-slate-400">
                    Per Night
                </p>

                <p className="text-lg font-bold text-slate-900">
                    ₹
                    {price.toLocaleString(
                        "en-IN"
                    )}
                </p>

            </div>

        </button>
    );
})}
                    </div>
                ) : (
                    <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl">
                        <BedDouble className="w-8 h-8 mx-auto text-slate-300" />

                        <p className="text-sm font-semibold text-slate-600 mt-3">
                            No rooms found
                        </p>
                    </div>
                )}
            </section>



            {/* STAY DETAILS */}
            <section className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-5">
                    Stay Details
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Check-in Date *
                        </label>

                        <input
                            type="date"
                            name="checkIn"
                            value={form.checkIn}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Check-in Time *
                        </label>

                        <input
                            type="time"
                            name="checkInTime"
                            value={form.checkInTime}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Check-out Date *
                        </label>

                        <input
    type="date"
    name="checkOut"
    value={form.checkOut}
    min={form.checkIn || undefined}
    onChange={handleChange}
    onBlur={handleBlur}
    className={`
        w-full
        px-3
        py-2.5
        border
        rounded-xl
        text-sm
        text-slate-900
        outline-none
        ${
            touchedFields.checkOut &&
            fieldErrors.checkOut
                ? "border-red-400 bg-red-50/30"
                : "border-slate-300"
        }
        focus:border-[var(--teal,#08838d)]
        focus:ring-2
        focus:ring-teal-50
    `}
/>

<FieldError name="checkOut" />

                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Check-out Time *
                        </label>

                        <input
                            type="time"
                            name="checkOutTime"
                            value={form.checkOutTime}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Adults Per Room
                        </label>

                        <input
                            type="number"
                            min="1"
                            name="adults"
                            value={form.adults}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Children Per Room
                        </label>

                        <input
                            type="number"
                            min="0"
                            name="children"
                            value={form.children}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none"
                        />
                    </div>
                </div>
            </section>

            {/* BOOKING SUMMARY */}
            {selectedRooms.length > 0 && (
                <section className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold text-slate-400">
                                BOOKING TOTAL
                            </p>

                            <p className="text-sm text-slate-500 mt-1">
                                {selectedRooms.length} room
                                {selectedRooms.length === 1
                                    ? ""
                                    : "s"}
                                {" × "}
                                {nights}{" "}
                                {nights === 1
                                    ? "night"
                                    : "nights"}
                            </p>
                        </div>

                        <div className="text-left sm:text-right">
                            <p className="text-2xl font-bold text-slate-900">
                                ₹
                                {roomTotal.toLocaleString(
                                    "en-IN"
                                )}
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                                Total room charges
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={savingBooking}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-200 bg-white rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={
                        savingBooking ||
                        selectedRooms.length === 0 ||
                        nights <= 0
                    }
                    className="inline-flex cursor-pointer items-center justify-center gap-2 px-6 py-2.5 bg-[var(--teal-dark,#065b62)] text-white rounded-lg text-sm font-bold hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <CheckCircle2 className="w-4 h-4" />
                    Proceed to Initial Payment
                </button>
            </div>

            {/* INITIAL PAYMENT */}
            {showInitialPayment && (
                <InitialPayment
                    booking={{
                        ...form,

                        customerName: form.customerName,
                        phoneNumber: form.phoneNumber,
                        alternativePhone: form.alternativePhone,
                        email: form.email,
                        address: form.address,
                        idProofType: form.idProofType,
                        idProofNumber: form.idProofNumber,

                        rooms: roomBreakdown,
                        selectedRooms: roomBreakdown,

                        nights,
                        roomTotal,
                        initialPaidAmount: 0,
                        initialPaidUsedAmount: 0,
                    }}
                    onCancel={() => {
                        if (!savingBooking) {
                            setShowInitialPayment(false);
                        }
                    }}
                    onConfirm={handlePaymentConfirm}
                />
            )}
        </form>
    );
}
