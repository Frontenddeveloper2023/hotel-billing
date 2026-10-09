import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  deleteCustomer,
  updateCustomer,
} from "../../service/customersService";
import { getCustomerManagementData } from "../../service/customersApi";
import { useToast } from "../../Context/ToastContext";

import {
  History,
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
  Loader2,
  AlertCircle,
  RefreshCw,
  SearchX,
  BedDouble,
  LogIn,
  LogOut,
} from "lucide-react";

// ============================================================
// STATIC CONFIG + PURE HELPERS (outside component = created once)
// ============================================================

const ROWS_PER_PAGE = 8;

const EMPTY_FORM = {
  customerName: "",
  phoneNumber: "",
  alternativePhone: "",
  email: "",
  address: "",
  idProofType: "",
  idProofNumber: "",
};

const STATUS_TABS = ["All"];

const ID_PROOF_OPTIONS = [
  "Aadhaar Card",
  "PAN Card",
  "Driving License",
  "Passport",
  "Voter ID",
];

const normalizeId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value?._id || value?.id || value?.$oid || "");
  }

  return String(value);
};

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
    date.setHours(Number(twentyFourHour[1]), Number(twentyFourHour[2]), 0, 0);
  }

  return date;
};

// Current booking status (per room)
const getRoomCurrentStatus = (room, now) => {
  if (!room) return "Unknown";

  // Once actual checkout has happened, the stay is finished.
  if (room?.actualCheckoutDate && room?.actualCheckoutTime) {
    return "Checked Out";
  }

  const bookedCheckOut = parseDateTime(room?.checkOut, room?.checkOutTime);

  if (!bookedCheckOut) return "Unknown";

  return now.getTime() > bookedCheckOut.getTime() ? "Overstaying" : "Staying";
};

const getBookingStatus = (booking, now) => {
  const rooms = Array.isArray(booking?.rooms) ? booking.rooms : [];

  if (!rooms.length) {
    return booking?.bookingStatus === "Completed"
      ? "Checked Out"
      : booking?.bookingStatus === "Active"
      ? "Staying"
      : "Unknown";
  }

  const roomStatuses = rooms.map((room) => getRoomCurrentStatus(room, now));

  if (roomStatuses.some((s) => s === "Overstaying")) return "Overstaying";
  if (roomStatuses.some((s) => s === "Staying")) return "Staying";

  if (roomStatuses.length > 0 && roomStatuses.every((s) => s === "Checked Out")) {
    return "Checked Out";
  }

  return "Unknown";
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime12 = (value) => {
  if (!value) return "-";

  const str = String(value).trim();

  if (/am|pm/i.test(str)) return str.toUpperCase();

  const parts = str.split(":");
  if (parts.length < 2) return str;

  let hours = Number(parts[0]);
  const minutes = String(parts[1]).replace(/\D/g, "").padStart(2, "0");

  if (Number.isNaN(hours)) return str;

  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
};

const bookingTime = (booking) =>
  new Date(booking?.updatedAt || booking?.createdAt || 0).getTime();

// ============================================================
// STYLES (only transform + opacity are animated)
// ============================================================

const CSS = `
@keyframes cm-rise {
  from { opacity: 0; transform: translate3d(0, 14px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes cm-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes cm-modal {
  from { opacity: 0; transform: translate3d(0, 22px, 0) scale(.96); }
  to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
@keyframes cm-pop {
  from { opacity: 0; transform: scale(.94); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes cm-shine {
  from { transform: translate3d(-120%, 0, 0) skewX(-20deg); }
  to   { transform: translate3d(240%, 0, 0) skewX(-20deg); }
}

.cm-rise  { opacity: 0; animation: cm-rise .55s cubic-bezier(.22,1,.36,1) forwards; }
.cm-fade  { animation: cm-fade .25s ease-out both; }
.cm-modal { animation: cm-modal .35s cubic-bezier(.22,1,.36,1) both; }
.cm-pop   { animation: cm-pop .3s cubic-bezier(.22,1,.36,1) both; }
.cm-d1 { animation-delay: .04s; }
.cm-d2 { animation-delay: .12s; }
.cm-d3 { animation-delay: .2s; }

.cm-row {
  opacity: 0;
  animation: cm-rise .45s cubic-bezier(.22,1,.36,1) forwards;
  animation-delay: calc(var(--i, 0) * 45ms);
}
.cm-row td { transition: background-color .25s ease; }
.cm-row:hover td { background-color: rgba(219, 234, 254, .5); }

.cm-card {
  content-visibility: auto;
  contain-intrinsic-size: auto 260px;
}
@media (hover: hover) {
  .cm-lift { transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease; }
  .cm-lift:hover { transform: translate3d(0, -3px, 0); box-shadow: 0 18px 36px -20px rgba(15,42,99,.4); }
}

.cm-input {
  transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
}
.cm-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, .12);
  background-color: #fff;
}

.cm-btn {
  position: relative;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .25s ease, filter .2s ease, background-color .2s ease, color .2s ease, opacity .2s ease;
}
.cm-btn:active:not(:disabled) { transform: scale(.95); }
@media (hover: hover) {
  .cm-btn:hover:not(:disabled) { filter: brightness(1.06); }
  .cm-btn.cm-shine:hover:not(:disabled)::after {
    content: "";
    position: absolute;
    inset: 0;
    width: 40%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
    animation: cm-shine .8s ease-out;
  }
}

.cm-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
.cm-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
.cm-scroll::-webkit-scrollbar-track { background: transparent; border-radius: 8px; }
.cm-scroll::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 8px; border: 2px solid transparent; background-clip: content-box; }
.cm-scroll::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }

@media (prefers-reduced-motion: reduce) {
  .cm-rise, .cm-fade, .cm-modal, .cm-pop, .cm-row {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .cm-lift, .cm-input, .cm-btn, .cm-row td {
    transition: none !important;
  }
  .cm-btn::after { display: none !important; }
}
`;

// ============================================================
// SMALL MEMOIZED PIECES
// ============================================================

const inputClass =
  "cm-input w-full rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 outline-none";

const STATUS_STYLE = {
  Staying: {
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  Overstaying: {
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  "Checked Out": {
    chip: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  Unknown: {
    chip: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
};

const StatusChip = memo(function StatusChip({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Unknown;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border ${s.chip}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {status === "Overstaying" && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${s.dot} opacity-60 animate-ping motion-reduce:animate-none`}
          />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${s.dot}`} />
      </span>
      {status}
    </span>
  );
});

const Avatar = memo(function Avatar() {
  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/25">
      <UserRound className="w-4 h-4" />
    </div>
  );
});

const ActualCheckout = ({ room }) =>
  room?.actualCheckoutDate && room?.actualCheckoutTime ? (
    <p className="text-[12px] font-bold text-emerald-700 mt-1 whitespace-nowrap">
      Actual: {formatDate(room.actualCheckoutDate)} •{" "}
      {formatTime12(room.actualCheckoutTime)}
    </p>
  ) : null;

const divider = (index) =>
  index > 0 ? "pt-2.5 border-t border-slate-100" : "";

// Desktop / tablet table row
const BookingRow = memo(function BookingRow({
  customer,
  bookings,
  index,
  now,
  onEdit,
  onDelete,
  onViewHistory,
}) {
  return (
    <tr style={{ "--i": Math.min(index, 10) }} className="cm-row">
      <td className="px-4 lg:px-5 py-4 align-top">
        <div className="flex items-center gap-2.5">
          <Avatar />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0f2a63] whitespace-nowrap">
              {customer?.customerName || "-"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 lg:px-5 py-4 align-top">
        <div className="flex items-center gap-2 text-sm text-slate-800 whitespace-nowrap">
          <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          {customer?.phoneNumber || "-"}
        </div>
      </td>
      <td className="px-4 lg:px-5 py-4 align-top">
        <div className="flex items-center gap-2 text-sm text-slate-800 whitespace-nowrap">
          <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          {customer?.email || "-"}
        </div>
      </td>
      <td className="px-4 lg:px-5 py-4 align-top">
        <div className="text-sm text-slate-800 max-w-[200px] truncate">
          {customer?.address || "-"}
        </div>
      </td>
      <td className="px-4 lg:px-5 py-4 align-top">
        <div className="text-sm font-bold text-slate-800">
          {bookings?.length || 0} Bookings
        </div>
      </td>
      <td className="px-4 lg:px-5 py-4 align-top">
        <div className="flex justify-end items-center gap-2">
          <button
            type="button"
            onClick={() => onViewHistory(customer, bookings)}
            className="cm-btn cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200"
          >
            <History className="w-3.5 h-3.5" />
            History
          </button>
          <button
            type="button"
            onClick={() => onEdit(customer)}
            className="cm-btn cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(customer?._id)}
            className="cm-btn cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold border border-rose-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
});

const BookingCard = memo(function BookingCard({
  customer,
  bookings,
  index,
  now,
  onEdit,
  onDelete,
  onViewHistory,
}) {
  return (
    <article style={{ "--i": Math.min(index, 10) }} className="cm-row bg-white border border-blue-100/80 rounded-2xl p-4 sm:p-5 shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] cm-card space-y-4">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Avatar />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#0f2a63] whitespace-nowrap">
              {customer?.customerName || "-"}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {customer?.email || "No Email"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
         <div>
            <p className="text-[11px] font-semibold text-slate-500">Phone</p>
            <p className="text-xs font-bold text-slate-800">{customer?.phoneNumber || "-"}</p>
         </div>
         <div>
            <p className="text-[11px] font-semibold text-slate-500">Bookings</p>
            <p className="text-xs font-bold text-slate-800">{bookings?.length || 0} Bookings</p>
         </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onViewHistory(customer, bookings)}
          className="cm-btn cursor-pointer flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200"
        >
          <History className="w-3.5 h-3.5" />
          History
        </button>
        <button
          type="button"
          onClick={() => onEdit(customer)}
          className="cm-btn cursor-pointer flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(customer?._id)}
          className="cm-btn cursor-pointer flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold border border-rose-200"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </article>
  );
});

const Field = memo(function Field({ label, className = "", children }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
});

const EditModal = memo(function EditModal({
  form,
  error,
  saving,
  onChange,
  onSubmit,
  onClose,
}) {
  return (
    <div
      className="cm-fade fixed inset-0 z-50 bg-[#0a1a3f]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="cm-modal cm-scroll w-full sm:max-w-2xl max-h-[94vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-blue-100">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-600/25">
              <Edit3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-[#0f2a63]">
                Edit Customer
              </h2>
              <p className="text-xs text-slate-500">
                Update customer personal information
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="cm-btn cursor-pointer w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={onSubmit} className="p-4 sm:p-6">
          {error && (
            <div className="cm-pop mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Customer Name *" className="sm:col-span-2">
              <div className="relative">
                <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={form.customerName}
                  onChange={(e) => onChange("customerName", e.target.value)}
                  className={`${inputClass} pl-10 pr-3.5 py-2.5`}
                  placeholder="Enter customer name"
                />
              </div>
            </Field>

            <Field label="Phone Number *">
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
                <input
                  type="text"
                  value={form.phoneNumber}
                  onChange={(e) => onChange("phoneNumber", e.target.value)}
                  className={`${inputClass} pl-10 pr-3.5 py-2.5`}
                  placeholder="Enter phone number"
                />
              </div>
            </Field>

            <Field label="Alternative Phone">
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
                <input
                  type="text"
                  value={form.alternativePhone}
                  onChange={(e) => onChange("alternativePhone", e.target.value)}
                  className={`${inputClass} pl-10 pr-3.5 py-2.5`}
                  placeholder="Alternative phone"
                />
              </div>
            </Field>

            <Field label="Email" className="sm:col-span-2">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => onChange("email", e.target.value)}
                  className={`${inputClass} pl-10 pr-3.5 py-2.5`}
                  placeholder="customer@example.com"
                />
              </div>
            </Field>

            <Field label="Address *" className="sm:col-span-2">
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-blue-400 pointer-events-none" />
                <textarea
                  rows="3"
                  value={form.address}
                  onChange={(e) => onChange("address", e.target.value)}
                  className={`${inputClass} pl-10 pr-3.5 py-2.5 resize-none`}
                  placeholder="Enter customer address"
                />
              </div>
            </Field>

            <Field label="ID Proof Type *">
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 z-10 pointer-events-none" />
                <select
                  value={form.idProofType}
                  onChange={(e) => onChange("idProofType", e.target.value)}
                  className={`${inputClass} cursor-pointer pl-10 pr-9 py-2.5 appearance-none`}
                >
                  <option value="">Select ID Proof</option>
                  {ID_PROOF_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </Field>

            <Field label="ID Proof Number *">
              <input
                type="text"
                value={form.idProofNumber}
                onChange={(e) => onChange("idProofNumber", e.target.value)}
                className={`${inputClass} px-3.5 py-2.5`}
                placeholder="Enter ID proof number"
              />
            </Field>
          </div>

          {/* BUTTONS */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 mt-6 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="cm-btn cursor-pointer w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="cm-btn cm-shine cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-700/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
  );
});

// ============================================================
// MAIN COMPONENT
// ============================================================

const CustomerManagement = () => {
  const tableScrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - tableScrollRef.current.offsetLeft);
    setScrollLeft(tableScrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - tableScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    tableScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingHistoryFor, setViewingHistoryFor] = useState(null);

  // SEARCH / FILTER / PAGINATION STATE
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Typing stays smooth: filtering runs on a deferred copy
  const deferredSearch = useDeferredValue(searchTerm);

  // Current date/time is refreshed every minute so an active booking
  // automatically changes from Staying -> Overstaying.
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  // EDIT CUSTOMER
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // ============================================================
  // FETCH CUSTOMERS + BOOKINGS
  // ============================================================

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Uses /customers/management-data — requires only `customer` permission
      // (does NOT call /bookings, so no roomsBooking permission needed)
      const response = await getCustomerManagementData();

      setCustomers(response?.data?.customers || []);
      setBookings(response?.data?.bookings || []);
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================================
  // BOOKINGS INDEXED BY CUSTOMER (one pass instead of a filter
  // over ALL bookings for every customer, every render)
  // ============================================================

  const bookingsByCustomer = useMemo(() => {
    const map = new Map();

    bookings.forEach((booking) => {
      const id = normalizeId(booking?.customerId);
      if (!id) return;

      const list = map.get(id);
      if (list) list.push(booking);
      else map.set(id, [booking]);
    });

    return map;
  }, [bookings]);

  // Lower-cased search text per customer (built once per data change,
  // not on every keystroke)
  const searchIndex = useMemo(() => {
    const index = new Map();

    customers.forEach((customer) => {
      const customerBookings =
        bookingsByCustomer.get(normalizeId(customer?._id)) || [];

      const bookingText = customerBookings
        .flatMap((booking) => {
          const rooms = Array.isArray(booking?.rooms) ? booking.rooms : [];

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
        .join(" ");

      index.set(
        customer?._id,
        [
          customer?.customerName,
          customer?.phoneNumber,
          customer?.alternativePhone,
          customer?.email,
          customer?.idProofNumber,
          bookingText,
        ]
          .map((v) => String(v || ""))
          .join(" ")
          .toLowerCase()
      );
    });

    return index;
  }, [customers, bookingsByCustomer]);

  // ============================================================
  // INDIVIDUAL BOOKING ROWS
  // A customer can have MANY bookings. Each booking is its own row.
  // ============================================================

  
  const allRows = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    const rows = [];

    customers.forEach((customer) => {
      if (query && !(searchIndex.get(customer?._id) || "").includes(query)) {
        return;
      }
      const customerBookings =
        bookingsByCustomer.get(normalizeId(customer?._id)) || [];
      rows.push({
        customer,
        bookings: customerBookings,
      });
    });

    return rows;
  }, [customers, searchIndex, deferredSearch, bookingsByCustomer]);


  const bookingRows = useMemo(
    () =>
      statusFilter === "All"
        ? allRows
        : allRows.filter((row) => row.status === statusFilter),
    [allRows, statusFilter]
  );

  
  const statusCounts = useMemo(() => {
    return { All: allRows.length }; // simplified
  }, [allRows]);


  // ============================================================
  // PAGINATION
  // ============================================================

  const totalPages = Math.ceil(bookingRows.length / ROWS_PER_PAGE) || 1;

  const paginatedBookingRows = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return bookingRows.slice(start, start + ROWS_PER_PAGE);
  }, [bookingRows, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, statusFilter]);

  // Keep the page valid if a delete shrinks the list
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // ============================================================
  // DELETE CUSTOMER
  // ============================================================

  const handleDelete = useCallback((id) => {
    toast.confirm(
      "Are you sure you want to delete this customer record?",
      async () => {
        try {
          await deleteCustomer(id);
          setCustomers((prev) => prev.filter((customer) => customer._id !== id));
          toast.success("Customer record deleted successfully.");
        } catch (err) {
          toast.error(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to delete customer."
          );
        }
      },
      {
        title: "Delete Customer",
        confirmText: "Delete",
        cancelText: "Cancel",
      }
    );
  }, [toast]);

  // ============================================================
  // EDIT MODAL
  // ============================================================

  const openEditModal = useCallback((customer) => {
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
  }, []);

  const closeEditModal = useCallback(() => {
    if (savingEdit) return;

    setEditingCustomer(null);
    setEditForm(EMPTY_FORM);
    setEditError("");
  }, [savingEdit]);

  const handleEditChange = useCallback((field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Lock background scroll + close on Escape while the modal is open
  useEffect(() => {
    if (!editingCustomer) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") closeEditModal();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [editingCustomer, closeEditModal]);

  // ============================================================
  // UPDATE CUSTOMER
  // ============================================================

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

      const response = await updateCustomer(editingCustomer._id, {
        customerName: editForm.customerName.trim(),
        phoneNumber: editForm.phoneNumber.trim(),
        alternativePhone: editForm.alternativePhone.trim(),
        email: editForm.email.trim(),
        address: editForm.address.trim(),
        idProofType: editForm.idProofType.trim(),
        idProofNumber: editForm.idProofNumber.trim(),
      });

      const updatedCustomer = response?.data || response;

      if (!updatedCustomer) {
        throw new Error("Updated customer data was not returned.");
      }

      // Update only the customer record in local state
      setCustomers((prev) =>
        prev.map((customer) =>
          customer._id === editingCustomer._id
            ? { ...customer, ...updatedCustomer }
            : customer
        )
      );

      // saving flag must be off before closing (closeEditModal checks it)
      setSavingEdit(false);
      setEditingCustomer(null);
      setEditForm(EMPTY_FORM);
      setEditError("");

      toast.success("Customer details updated successfully.");
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

  // ============================================================
  // UI
  // ============================================================

  const pageKey = `${currentPage}-${statusFilter}`;

  
const CustomerHistoryModal = memo(function CustomerHistoryModal({ customerData, onClose, now }) {
  if (!customerData) return null;
  const { customer, bookings } = customerData;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0b1d3d]/60 backdrop-blur-sm cm-fade">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden cm-modal">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0f2a63]">
                {customer?.customerName || 'Customer'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">Booking History</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto cm-scroll p-5 sm:p-6 space-y-4 bg-slate-50">
          {bookings && bookings.length > 0 ? (
            bookings.map((booking, i) => {
              const rooms = Array.isArray(booking?.rooms) ? booking.rooms : [];
              return (
                <div key={booking?._id || i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                     <span className="text-sm font-bold text-slate-800">Booking #{booking?.bookingId || booking?._id?.substring(0,6)}</span>
                     <StatusChip status={getBookingStatus(booking, now)} />
                  </div>
                  {rooms.length > 0 ? (
                    <div className="space-y-3">
                      {rooms.map((room, ri) => (
                        <div key={ri} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                           <div>
                              <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><BedDouble className="w-4 h-4 text-blue-500"/> Room {room?.roomNumber}</p>
                              <p className="text-[11px] text-slate-500">{room?.roomType} • {room?.bedType}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-xs font-semibold text-slate-700">Check-in: {formatDate(room?.checkIn)}</p>
                              <p className="text-xs font-semibold text-slate-700">Check-out: {formatDate(room?.checkOut)}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-slate-500">No rooms found for this booking.</p>}
                </div>
              );
            })
          ) : (
            <div className="text-center py-10">
               <p className="text-sm text-slate-500 font-bold">No bookings found for this customer.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const thClass =
    "px-4 lg:px-5 py-3.5 text-[11px] font-bold tracking-wide whitespace-nowrap";

  return (
    <div className="font-['Inter']">
      <style>{CSS}</style>

      <div className="max-w-7xl w-full mx-auto space-y-5 sm:space-y-6 pb-8">
        {/* HEADER */}
        <header className="cm-rise cm-d1 flex flex-col md:flex-row md:items-center md:justify-between gap-4  shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)]">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
           

            <div className="min-w-0">
            

<h1 className="text-[12px] sm:text-[20px] lg:text-[25px] leading-tight font-extrabold tracking-[-0.035em] text-white">                Customer Management
              </h1>
            
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0f2a63] to-blue-700 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-blue-900/20 self-start md:self-auto">
            <UserRound className="w-4 h-4" />
            <span className="text-xs font-bold whitespace-nowrap tabular-nums">
              {bookingRows.length} Bookings
            </span>
          </div>
        </header>

        {/* SEARCH / FILTER */}
      <section
  className="
    cm-rise
    cm-d2
    flex
    w-full
    min-w-0
    flex-col
    gap-3
    overflow-hidden
    rounded-2xl
    border
    border-blue-100/80
    bg-white
    p-3
    shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)]
    sm:gap-4
    sm:p-4
    lg:flex-row
    lg:items-center
    lg:justify-between
  "
>
  {/* Search */}
  <div
    className="
      relative
      w-full
      min-w-0
      lg:max-w-md
      lg:flex-1
    "
  >
    <Search
      className="
        pointer-events-none
        absolute
        left-3
        top-1/2
        h-4
        w-4
        -translate-y-1/2
        text-blue-400
        sm:left-3.5
      "
    />

    <input
      type="text"
      placeholder="Search name, phone, email, room or ID proof..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className={`
        ${inputClass}
        h-10
        w-full
        min-w-0
        pl-10
        pr-3
        py-2.5
        text-xs
        sm:h-11
        sm:pl-11
        sm:pr-4
        sm:text-sm
      `}
    />
  </div>

  {/* Status Filters */}
  <div
    className="
      w-full
      min-w-0
      overflow-hidden
      lg:w-auto
      lg:max-w-full
    "
  >
    <div
      className="
        cm-scroll
        flex
        w-full
        min-w-0
        items-center
        gap-1
        overflow-x-auto
        rounded-xl
        bg-blue-50
        p-1
        [scrollbar-width:none]
        [-ms-overflow-style:none]
        lg:w-auto
      "
    >
      {STATUS_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => setStatusFilter(tab)}
          className={`
            cm-btn
            inline-flex
            shrink-0
            cursor-pointer
            items-center
            gap-1.5
            whitespace-nowrap
            rounded-lg
            px-3
            py-2
            text-xs
            font-semibold
            transition-all
            duration-200
            sm:px-4
            sm:py-2.5
            ${
              statusFilter === tab
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:bg-white/60 hover:text-blue-700"
            }
          `}
        >
          {tab === "All" ? "Customers" : tab}

          <span
            className={`
              rounded-md
              px-1.5
              py-0.5
              text-[10px]
              tabular-nums
              ${
                statusFilter === tab
                  ? "bg-blue-100 text-blue-700"
                  : "bg-white/70 text-slate-500"
              }
            `}
          >
            {statusCounts[tab]}
          </span>
        </button>
      ))}
    </div>
  </div>
</section>

        {/* ERROR */}
        {error && (
          <div className="cm-pop rounded-2xl border border-rose-200 bg-white px-4 py-4 shadow-lg shadow-blue-900/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-rose-700 font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
            <button
              type="button"
              onClick={fetchData}
              className="cm-btn cm-shine cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-700 to-blue-600 shadow-md shadow-blue-700/25"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="cm-pop bg-white border border-blue-100/80 rounded-2xl p-10 sm:p-14 text-center shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)]">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-xs sm:text-sm font-semibold text-slate-600">
              Loading customer and booking records...
            </p>
          </div>
        )}

        {/* LIST */}
        {!loading && !error && (
          <section className="cm-rise cm-d3">
            {paginatedBookingRows.length === 0 ? (
              <div className="cm-pop bg-white border border-blue-100/80 rounded-2xl py-14 sm:py-16 text-center shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)]">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3 text-blue-500">
                  <SearchX className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-[#0f2a63]">
                  No booking records found
                </p>
                
              </div>
            ) : (
              <>
                {/* Mobile: cards */}
                <div key={`m-${pageKey}`} className="md:hidden space-y-4">
                  {
                  paginatedBookingRows.map(({ customer, bookings }, index) => (
                    <BookingCard
                      key={`${customer?._id}`}
                      customer={customer}
                      bookings={bookings}
                      index={index}
                      now={currentDateTime}
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                      onViewHistory={setViewingHistoryFor}
                    />
                  ))
}
                </div>

                {/* Tablet / desktop: table */}
                <div className="hidden md:block bg-white border border-blue-100/80 rounded-2xl shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] overflow-hidden">
                  <div className={`cm-scroll overflow-x-auto ${isDragging ? "cursor-grabbing" : "cursor-grab"}`} ref={tableScrollRef} onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
                    <table className="min-w-[980px] w-full text-left">
                      <thead>
                        <tr className="bg-gradient-to-r from-[#0f2a63] to-blue-800 text-white">
                          
                          <th className={thClass}>Customer</th>
                          <th className={thClass}>Phone</th>
                          <th className={thClass}>Email</th>
                          <th className={thClass}>Address</th>
                          <th className={thClass}>Total Bookings</th>
                          <th className={`${thClass} text-right`}>Actions</th>

                        </tr>
                      </thead>

                      <tbody
                        key={`t-${pageKey}`}
                        className="divide-y divide-slate-100"
                      >
                        {paginatedBookingRows.map(
                          ({ customer, bookings }, index) => (
                            <BookingRow
                              key={`${customer?._id}`}
                              customer={customer}
                              bookings={bookings}
                              index={index}
                              now={currentDateTime}
                              onEdit={openEditModal}
                              onDelete={handleDelete}
                              onViewHistory={setViewingHistoryFor}
                            />
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {viewingHistoryFor && (
          <CustomerHistoryModal
            customerData={{ customer: viewingHistoryFor, bookings: viewingHistoryFor ? (bookingsByCustomer.get(normalizeId(viewingHistoryFor._id)) || []) : [] }}
            onClose={() => setViewingHistoryFor(null)}
            now={currentDateTime}
          />
        )}
        
        {/* PAGINATION */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white border border-blue-100/80 rounded-2xl p-3 sm:p-4 shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)]">
            <p className="text-xs sm:text-sm text-slate-600 text-center sm:text-left">
              Showing{" "}
              <span className="font-bold text-[#0f2a63]">
                {(currentPage - 1) * ROWS_PER_PAGE + 1}
              </span>{" "}
              -{" "}
              <span className="font-bold text-[#0f2a63]">
                {Math.min(currentPage * ROWS_PER_PAGE, bookingRows.length)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-[#0f2a63]">
                {bookingRows.length}
              </span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="cm-btn cursor-pointer inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#0f2a63] hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <span className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0f2a63] to-blue-700 text-white text-xs font-bold whitespace-nowrap tabular-nums">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="cm-btn cursor-pointer inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#0f2a63] hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* EDIT CUSTOMER MODAL (mounted only when open) */}
      {editingCustomer && (
        <EditModal
          form={editForm}
          error={editError}
          saving={savingEdit}
          onChange={handleEditChange}
          onSubmit={handleUpdateCustomer}
          onClose={closeEditModal}
        />
      )}
    </div>
  );
};

export default CustomerManagement;