import React, {
    memo,
    useCallback,
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
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
    CalendarDays,
    Users,
    Loader2,
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

const STAY_FIELDS = ["checkIn", "checkInTime", "checkOut", "checkOutTime"];

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

// ============================================================
// FIELD VALIDATION (pure)
// ============================================================

const validateField = (name, value, currentForm) => {
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
}

// ============================================================
// TAILWIND-ONLY MOTION HELPERS (no CSS file, no <style>)
// ============================================================

function useEntered() {
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        let r2;
        const r1 = requestAnimationFrame(() => {
            r2 = requestAnimationFrame(() => setEntered(true));
        });
        return () => {
            cancelAnimationFrame(r1);
            cancelAnimationFrame(r2);
        };
    }, []);

    return entered;
}

function Reveal({ delay = 0, className = "", children }) {
    const entered = useEntered();

    return (
        <div
            style={{ transitionDelay: entered ? `${delay}ms` : "0ms" }}
            className={`transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            } ${className}`}
        >
            {children}
        </div>
    );
}

function SectionCard({ icon: Icon, title, subtitle, right, delay, className = "", children }) {
    return (
        <Reveal delay={delay} className={className}>
            <section className="w-full rounded-2xl border border-[#dbe6f8] bg-white p-4 sm:p-5 lg:p-6 space-y-5 shadow-[0_8px_30px_-16px_rgba(15,42,99,.3)]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-[#12306b] text-white shadow-md shadow-blue-600/25 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm sm:text-base font-bold text-[#0a1a3f]">
                            {title}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                            {subtitle}
                        </p>
                    </div>

                    {right}
                </div>

                {children}
            </section>
        </Reveal>
    );
}

// dropdown that eases in
function SuggestionPanel({ children }) {
    const entered = useEntered();

    return (
        <div
            className={`absolute left-0 right-0 top-full z-30 mt-1.5 origin-top bg-white border border-[#dbe6f8] rounded-xl shadow-2xl shadow-[#0a1a3f]/20 overflow-hidden transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
                entered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1.5"
            }`}
        >
            {children}
        </div>
    );
}

// ============================================================
// ROOM CARD (memoized: selecting one room re-renders only that card)
// ============================================================

const RoomCard = memo(function RoomCard({ room, selected, index, onSelect }) {
    const isAvailable = room.status === "available";
    const roomNumber = getRoomNumber(room);
    const roomType = getRoomType(room);
    const bedType = getBedType(room);
    const price = getRoomPrice(room);

    return (
        <Reveal delay={Math.min(index, 8) * 40}>
            <button
                type="button"
                disabled={!isAvailable}
                aria-pressed={selected}
                onClick={() => onSelect(room)}
                className={`group relative w-full text-left border rounded-xl p-4 transition-all duration-300 motion-reduce:transition-none ${
                    !isAvailable
                        ? "border-red-200 bg-red-50 cursor-not-allowed opacity-80"
                        : selected
                          ? "border-blue-500 bg-[#eff6ff] ring-2 ring-blue-200 shadow-lg shadow-blue-600/15 cursor-pointer"
                          : "border-[#dbe6f8] bg-white hover:border-blue-300 hover:shadow-md hover:shadow-blue-600/10 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer"
                }`}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                                !isAvailable
                                    ? "bg-red-100 text-red-500"
                                    : selected
                                      ? "bg-gradient-to-br from-blue-500 to-[#12306b] text-white"
                                      : "bg-[#eff6ff] text-blue-500 group-hover:bg-blue-100"
                            }`}
                        >
                            <BedDouble className="w-5 h-5" />
                        </div>

                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-slate-400">
                                Room
                            </p>

                            <p className="text-xl font-bold text-[#0a1a3f] leading-tight truncate">
                                {roomNumber}
                            </p>
                        </div>
                    </div>

                    <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                            isAvailable
                                ? selected
                                    ? "bg-blue-600 text-white"
                                    : "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                        }`}
                    >
                        {isAvailable
                            ? selected
                                ? "SELECTED"
                                : "AVAILABLE"
                            : "BOOKED"}
                    </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-white/70 border border-[#dbe6f8] text-xs font-semibold text-slate-600">
                        {roomType || "-"}
                    </span>

                    <span className="px-2.5 py-1 rounded-md bg-white/70 border border-[#dbe6f8] text-xs font-semibold text-slate-600">
                        {bedType || "-"}
                    </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[#dbe6f8] flex items-end justify-between">
                    <div>
                        <p className="text-xs text-slate-400">Per night</p>

                        <p className="text-lg font-bold text-[#0a1a3f]">
                            ₹{price.toLocaleString("en-IN")}
                        </p>
                    </div>

                    <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                            selected
                                ? "bg-blue-600 text-white scale-100 opacity-100"
                                : "scale-50 opacity-0"
                        }`}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                    </span>
                </div>
            </button>
        </Reveal>
    );
});

const labelCls = "block text-xs sm:text-sm font-bold text-slate-700 mb-1.5";

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

    // latest form for stable callbacks
    const formRef = useRef(form);
    formRef.current = form;

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

        const updatedForm = {
            ...form,
            [name]: value,
        };

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Keep stay details synchronized with selected rooms
        if (STAY_FIELDS.includes(name)) {
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

    // plain render helper (not a component, so it never remounts)
    const renderFieldError = (name) => {
        if (!touchedFields[name] || !fieldErrors[name]) {
            return null;
        }

        return (
            <p
                id={`${name}-error`}
                role="alert"
                className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold leading-5 text-red-700"
            >
                <span className="shrink-0 font-bold">•</span>
                <span>{fieldErrors[name]}</span>
            </p>
        );
    };

    const hasError = (name) =>
        Boolean(touchedFields[name] && fieldErrors[name]);

    const inputCls = (name, pad = "px-3") =>
        `w-full ${pad} py-2.5 sm:py-3 border rounded-xl text-sm text-[#0a1a3f] placeholder:text-slate-400 outline-none transition-all duration-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 ${
            hasError(name)
                ? "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-100"
                : "border-[#dbe6f8] bg-[#eff6ff]/40 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        }`;

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

    const filteredRooms = useMemo(
        () =>
            rooms.filter((room) => {
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
            }),
        [rooms, roomFilter, bedFilter]
    );

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // (stable callback so memoized room cards don't re-render)
    // ============================================================

    const handleRoomSelect = useCallback((room) => {
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

        setSelectedRooms((prev) => {
            const alreadySelected = prev.some(
                (selected) =>
                    String(selected?._id || selected?.id || "") === roomId ||
                    getRoomNumber(selected) === roomNumber
            );

            if (alreadySelected) {
                return prev.filter(
                    (selected) =>
                        String(selected?._id || selected?.id || "") !==
                            roomId &&
                        getRoomNumber(selected) !== roomNumber
                );
            }

            const f = formRef.current;

            return [
                ...prev,
                {
                    ...room,
                    checkIn: f.checkIn,
                    checkInTime: f.checkInTime,
                    checkOut: f.checkOut,
                    checkOutTime: f.checkOutTime,
                },
            ];
        });

        setError("");
    }, []);

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

    const selectedKeys = useMemo(() => {
        const ids = new Set();
        const nums = new Set();

        selectedRooms.forEach((selected) => {
            ids.add(String(selected?._id || selected?.id || ""));
            nums.add(getRoomNumber(selected));
        });

        return { ids, nums };
    }, [selectedRooms]);

    const isRoomSelected = (room) =>
        selectedKeys.ids.has(String(room?._id || room?.id || "")) ||
        selectedKeys.nums.has(getRoomNumber(room));

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

    // keeps the suggestion list from blocking typing on big customer lists
    const deferredSuggestions = useDeferredValue(customerSuggestions);

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="w-full max-w-5xl mx-auto pb-4 space-y-5 sm:space-y-6"
        >
            {/* HEADER (self-contained navy banner: works on any page background) */}
            <Reveal>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1a3f] via-[#12306b] to-blue-600 p-5 sm:p-6 text-white shadow-xl shadow-[#0a1a3f]/25">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-300/20 blur-2xl" />

                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="hidden sm:flex shrink-0 w-12 h-12 items-center justify-center rounded-2xl bg-white/15 border border-white/20">
                                <BedDouble className="w-6 h-6" />
                            </div>

                            <div className="min-w-0">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                                    New Room Booking
                                </h1>

                                <p className="text-xs sm:text-sm text-blue-100/85 mt-1">
                                    Enter guest details and select one or
                                    multiple available rooms.
                                </p>
                            </div>
                        </div>

                     
                    </div>
                </div>
            </Reveal>

            {/* LOADING */}
            {isLoading && (
                <div
                    role="status"
                    className="flex items-center gap-2 bg-[#eff6ff] border border-blue-200 text-blue-700 rounded-xl px-4 py-3 text-sm font-medium"
                >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading rooms and customers...
                </div>
            )}

            {/* ERROR */}
            {error && (
                <div
                    role="alert"
                    className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm"
                >
                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={() => setError("")}
                        aria-label="Dismiss error"
                        className="shrink-0 rounded-lg p-1 hover:bg-red-100 active:scale-95 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* CUSTOMER DETAILS
                (relative z-20 keeps the phone dropdown above later sections) */}
            <SectionCard
                icon={User}
                title="Customer Details"
                subtitle="Search an existing guest or enter a new customer."
                delay={60}
                className="relative z-20"
            >
                {isExistingCustomer && (
                    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />

                        <p className="text-xs sm:text-sm font-semibold text-emerald-800">
                            Existing customer selected. You can edit the
                            customer details below.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {/* PHONE NUMBER */}
                    <div className="relative">
                        <label htmlFor="phoneNumber" className={labelCls}>
                            Phone Number <span className="text-red-600">*</span>
                        </label>

                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />

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
                                aria-invalid={hasError("phoneNumber")}
                                aria-describedby="phoneNumber-error"
                                className={inputCls("phoneNumber", "pl-9 pr-3")}
                            />
                        </div>

                        {renderFieldError("phoneNumber")}

                        {showCustomerSuggestions && (
                            <SuggestionPanel>
                                <button
                                    type="button"
                                    onClick={handleAddNewCustomer}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[#dbe6f8] hover:bg-[#eff6ff] transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#eff6ff] flex items-center justify-center shrink-0">
                                        <Plus className="w-4 h-4 text-blue-600" />
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-xs sm:text-sm font-bold text-[#0a1a3f]">
                                            Add New Customer
                                        </p>

                                        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                            Enter customer details manually
                                        </p>
                                    </div>
                                </button>

                                {deferredSuggestions.length > 0 ? (
                                    <div className="max-h-56 overflow-y-auto overscroll-contain">
                                        <div className="px-3 py-2 bg-[#eff6ff]/70 border-b border-[#dbe6f8]">
                                            <p className="text-[11px] font-semibold text-slate-500">
                                                Existing customers
                                            </p>
                                        </div>

                                        {deferredSuggestions.map((customer) => (
                                            <button
                                                key={customer._id}
                                                type="button"
                                                onClick={() =>
                                                    handleExistingCustomerSelect(customer)
                                                }
                                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#eff6ff] active:bg-blue-100 transition-colors border-b border-slate-100"
                                            >
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-[#12306b] flex items-center justify-center shrink-0">
                                                    <User className="w-4 h-4 text-white" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                                        <p className="text-xs sm:text-sm font-bold text-[#0a1a3f] truncate">
                                                            {customer.customerName}
                                                        </p>

                                                        <p className="text-[11px] sm:text-xs font-semibold text-blue-700 shrink-0">
                                                            {customer.phoneNumber}
                                                        </p>
                                                    </div>

                                                    {customer.email && (
                                                        <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                                                            {customer.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="px-4 py-3">
                                        <p className="text-xs sm:text-sm text-slate-500">
                                            No existing customer found for this number.
                                        </p>
                                    </div>
                                )}
                            </SuggestionPanel>
                        )}
                    </div>

                    {/* CUSTOMER NAME */}
                    <div>
                        <label htmlFor="customerName" className={labelCls}>
                            Customer Name <span className="text-red-600">*</span>
                        </label>

                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />

                            <input
                                id="customerName"
                                type="text"
                                name="customerName"
                                value={form.customerName}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Enter customer name"
                                autoComplete="name"
                                aria-invalid={hasError("customerName")}
                                aria-describedby="customerName-error"
                                className={inputCls("customerName", "pl-9 pr-3")}
                            />
                        </div>

                        {renderFieldError("customerName")}
                    </div>

                    {/* EMAIL */}
                    <div>
                        <label htmlFor="email" className={labelCls}>
                            Email
                        </label>

                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />

                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Enter email address"
                                autoComplete="email"
                                aria-invalid={hasError("email")}
                                aria-describedby="email-error"
                                className={inputCls("email", "pl-9 pr-3")}
                            />
                        </div>

                        {renderFieldError("email")}
                    </div>

                    {/* ALTERNATIVE PHONE */}
                    <div>
                        <label htmlFor="alternativePhone" className={labelCls}>
                            Alternative Phone Number
                        </label>

                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />

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
                                aria-invalid={hasError("alternativePhone")}
                                aria-describedby="alternativePhone-error"
                                className={inputCls("alternativePhone", "pl-9 pr-3")}
                            />
                        </div>

                        {renderFieldError("alternativePhone")}
                    </div>

                    {/* ID PROOF TYPE */}
                    <div>
                        <label htmlFor="idProofType" className={labelCls}>
                            ID Proof <span className="text-red-600">*</span>
                        </label>

                        <div className="relative">
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none z-10" />

                            <select
                                id="idProofType"
                                name="idProofType"
                                value={form.idProofType}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                aria-invalid={hasError("idProofType")}
                                aria-describedby="idProofType-error"
                                className={`${inputCls("idProofType", "pl-9 pr-8")} cursor-pointer`}
                            >
                                <option value="">Select ID Proof</option>

                                {idProofOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {renderFieldError("idProofType")}
                    </div>

                    {/* ID PROOF NUMBER */}
                    <div>
                        <label htmlFor="idProofNumber" className={labelCls}>
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
                            aria-invalid={hasError("idProofNumber")}
                            aria-describedby="idProofNumber-error"
                            className={inputCls("idProofNumber")}
                        />

                        {renderFieldError("idProofNumber")}
                    </div>

                    {/* ADDRESS */}
                    <div className="md:col-span-2">
                        <label htmlFor="address" className={labelCls}>
                            Address <span className="text-red-600">*</span>
                        </label>

                        <div className="relative">
                            <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-blue-400 pointer-events-none" />

                            <textarea
                                id="address"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                rows={3}
                                placeholder="Enter complete customer address"
                                aria-invalid={hasError("address")}
                                aria-describedby="address-error"
                                className={`${inputCls("address", "pl-9 pr-3")} resize-none`}
                            />
                        </div>

                        {renderFieldError("address")}
                    </div>
                </div>
            </SectionCard>

            {/* ROOM SECTION */}
            <SectionCard
                icon={BedDouble}
                title="Select Rooms"
                delay={100}
                right={
                    <div className="hidden sm:block px-3 py-2 rounded-lg bg-[#eff6ff] text-[#12306b] text-xs font-bold shrink-0">
                        {selectedRooms.length} room
                        {selectedRooms.length === 1 ? "" : "s"} selected
                    </div>
                }
            >
                {/* FILTERS */}
                <div className="rounded-xl border border-[#dbe6f8] bg-[#eff6ff]/50 p-3.5 sm:p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Filter className="w-4 h-4 text-blue-600" />
                            Filters
                        </div>

                        <span className="sm:hidden text-[11px] font-bold text-[#12306b]">
                            {selectedRooms.length} selected
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                Room Type
                            </label>

                            <select
                                value={roomFilter}
                                onChange={(e) => setRoomFilter(e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-[#dbe6f8] rounded-lg text-xs font-medium text-slate-700 outline-none cursor-pointer transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="all">All Room Types</option>
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
                                onChange={(e) => setBedFilter(e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-[#dbe6f8] rounded-lg text-xs font-medium text-slate-700 outline-none cursor-pointer transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="all">All Bed Types</option>

                                {bedTypes.map((bedType) => (
                                    <option key={bedType} value={bedType}>
                                        {bedType}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* ROOMS */}
                {loadingRooms ? (
                    <div
                        aria-busy="true"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse"
                    >
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="h-40 rounded-xl border border-[#dbe6f8] bg-[#eff6ff]/60"
                            />
                        ))}
                    </div>
                ) : filteredRooms.length > 0 ? (
                    <div className="grid grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {filteredRooms.map((room, index) => (
                            <RoomCard
                                key={room._id || room.id || getRoomNumber(room)}
                                room={room}
                                index={index}
                                selected={isRoomSelected(room)}
                                onSelect={handleRoomSelect}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-10 text-center border border-dashed border-[#dbe6f8] rounded-xl bg-[#eff6ff]/40">
                        <BedDouble className="w-8 h-8 mx-auto text-blue-300" />

                        <p className="text-sm font-semibold text-slate-600 mt-3">
                            No rooms found
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                            Try changing the room or bed type filter.
                        </p>
                    </div>
                )}
            </SectionCard>

            {/* STAY DETAILS */}
            <SectionCard
                icon={CalendarDays}
                title="Stay Details"
                subtitle="Dates, times and guests per room."
                delay={140}
            >
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    <div>
                        <label htmlFor="checkIn" className={labelCls}>
                            Check-in Date *
                        </label>

                        <input
                            id="checkIn"
                            type="date"
                            name="checkIn"
                            value={form.checkIn}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            aria-invalid={hasError("checkIn")}
                            aria-describedby="checkIn-error"
                            className={inputCls("checkIn")}
                        />

                        {renderFieldError("checkIn")}
                    </div>

                    <div>
                        <label htmlFor="checkInTime" className={labelCls}>
                            Check-in Time *
                        </label>

                        <input
                            id="checkInTime"
                            type="time"
                            name="checkInTime"
                            value={form.checkInTime}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            aria-invalid={hasError("checkInTime")}
                            aria-describedby="checkInTime-error"
                            className={inputCls("checkInTime")}
                        />

                        {renderFieldError("checkInTime")}
                    </div>

                    <div>
                        <label htmlFor="checkOut" className={labelCls}>
                            Check-out Date *
                        </label>

                        <input
                            id="checkOut"
                            type="date"
                            name="checkOut"
                            value={form.checkOut}
                            min={form.checkIn || undefined}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            aria-invalid={hasError("checkOut")}
                            aria-describedby="checkOut-error"
                            className={inputCls("checkOut")}
                        />

                        {renderFieldError("checkOut")}
                    </div>

                    <div>
                        <label htmlFor="checkOutTime" className={labelCls}>
                            Check-out Time *
                        </label>

                        <input
                            id="checkOutTime"
                            type="time"
                            name="checkOutTime"
                            value={form.checkOutTime}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            aria-invalid={hasError("checkOutTime")}
                            aria-describedby="checkOutTime-error"
                            className={inputCls("checkOutTime")}
                        />

                        {renderFieldError("checkOutTime")}
                    </div>

                    <div>
                        <label htmlFor="adults" className={labelCls}>
                            Adults Per Room
                        </label>

                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />

                            <input
                                id="adults"
                                type="number"
                                min="1"
                                name="adults"
                                value={form.adults}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                aria-invalid={hasError("adults")}
                                aria-describedby="adults-error"
                                className={inputCls("adults", "pl-9 pr-3")}
                            />
                        </div>

                        {renderFieldError("adults")}
                    </div>

                    <div>
                        <label htmlFor="children" className={labelCls}>
                            Children Per Room
                        </label>

                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />

                            <input
                                id="children"
                                type="number"
                                min="0"
                                name="children"
                                value={form.children}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                aria-invalid={hasError("children")}
                                aria-describedby="children-error"
                                className={inputCls("children", "pl-9 pr-3")}
                            />
                        </div>

                        {renderFieldError("children")}
                    </div>
                </div>
            </SectionCard>

            {/* BOOKING SUMMARY */}
            <div
                className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none ${
                    selectedRooms.length > 0
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                }`}
            >
                <div className="overflow-hidden min-h-0">
                    <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-[#eff6ff] to-white p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-400">
                                    Booking total
                                </p>

                                <p className="text-sm text-slate-600 mt-1">
                                    {selectedRooms.length} room
                                    {selectedRooms.length === 1 ? "" : "s"}
                                    {" × "}
                                    {nights} {nights === 1 ? "night" : "nights"}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {selectedRooms.map((room) => (
                                        <span
                                            key={
                                                room?._id ||
                                                room?.id ||
                                                getRoomNumber(room)
                                            }
                                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-white border border-blue-200 text-xs font-bold text-[#12306b]"
                                        >
                                            Room {getRoomNumber(room)}

                                            <button
                                                type="button"
                                                onClick={() => removeSelectedRoom(room)}
                                                aria-label={`Remove room ${getRoomNumber(room)}`}
                                                className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 active:scale-90 transition"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="text-left sm:text-right shrink-0">
                                <p className="text-2xl font-bold text-[#0a1a3f]">
                                    ₹{roomTotal.toLocaleString("en-IN")}
                                </p>

                                <p className="text-xs text-slate-400 mt-1">
                                    Total room charges
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* ACTION BUTTONS (sticky so they stay reachable on long forms) */}
            <div className="sticky bottom-3 z-10">
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2.5 rounded-2xl border border-[#dbe6f8] bg-white/90 backdrop-blur-md p-2.5 shadow-xl shadow-[#0a1a3f]/15">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={savingBooking}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-[#dbe6f8] bg-white rounded-xl text-sm font-bold text-slate-700 hover:bg-[#eff6ff] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
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
                        className="inline-flex cursor-pointer items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#12306b] to-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/25 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 motion-reduce:transform-none disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Proceed to Initial Payment
                    </button>
                </div>
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