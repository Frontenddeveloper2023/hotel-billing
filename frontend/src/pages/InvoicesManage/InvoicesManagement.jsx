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
  Search,
  Eye,
  Trash2,
  FileDown,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Receipt,
  IndianRupee,
  Clock,
  Loader2,
  Phone,
  CalendarDays,
  X,
  AlertCircle,
  RefreshCw,
  SearchX,
} from "lucide-react";
import { getAllInvoices, deleteInvoice } from "../../service/invoiceApi.js";
import InvoiceTemplate from "../InvoiceTemplate/InvoiceTemplate.jsx";
import {
  computeExtraStayDetails,
  formatHumanDate,
  formatHumanTime,
  exportInvoicesToExcel,
} from "../InvoiceTemplate/stayDurationHelper.js";

// ============================================================
// STATIC CONFIG
// ============================================================

const ITEMS_PER_PAGE = 8;

const FIELD_OPTIONS = [
  ["all", "All Fields"],
  ["name", "Customer Name"],
  ["phone", "Phone Number"],
  ["email", "Email"],
  ["room", "Room Number"],
  ["invoice", "Invoice Number"],
];

const SORT_OPTIONS = [
  ["newest", "Newest Invoice"],
  ["oldest", "Oldest Invoice"],
  ["customerAsc", "Customer A → Z"],
  ["customerDesc", "Customer Z → A"],
  ["totalHigh", "Grand Total High → Low"],
  ["totalLow", "Grand Total Low → High"],
];

const formatDate = (value) => formatHumanDate(value);
const formatTime = (value) => formatHumanTime(value);

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// ============================================================
// STYLES (transform + opacity only = smooth and cheap)
// ============================================================

const CSS = `
@keyframes iv-rise {
  from { opacity: 0; transform: translate3d(0, 14px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes iv-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes iv-pop {
  from { opacity: 0; transform: scale(.94); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes iv-shine {
  from { transform: translate3d(-120%, 0, 0) skewX(-20deg); }
  to   { transform: translate3d(240%, 0, 0) skewX(-20deg); }
}
@keyframes iv-float {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50%      { transform: translate3d(0, -6px, 0); }
}

.iv-rise { opacity: 0; animation: iv-rise .55s cubic-bezier(.22,1,.36,1) forwards; }
.iv-fade { animation: iv-fade .3s ease-out both; }
.iv-pop  { animation: iv-pop .3s cubic-bezier(.22,1,.36,1) both; }
.iv-float { animation: iv-float 4s ease-in-out infinite; }
.iv-d1 { animation-delay: .04s; }
.iv-d2 { animation-delay: .12s; }
.iv-d3 { animation-delay: .2s; }
.iv-d4 { animation-delay: .28s; }

/* Row / card stagger via --i */
.iv-row {
  opacity: 0;
  animation: iv-rise .45s cubic-bezier(.22,1,.36,1) forwards;
  animation-delay: calc(var(--i, 0) * 45ms);
}
.iv-row td { transition: background-color .25s ease; }
.iv-row:hover td { background-color: rgba(219, 234, 254, .55); }

.iv-card {
  transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease;
}
@media (hover: hover) {
  .iv-card:hover {
    transform: translate3d(0, -3px, 0);
    box-shadow: 0 18px 36px -20px rgba(15, 42, 99, .4);
  }
  .iv-lift { transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease; }
  .iv-lift:hover { transform: translate3d(0, -3px, 0); box-shadow: 0 18px 36px -20px rgba(15,42,99,.4); }
}

.iv-input {
  transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
}
.iv-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, .12);
  background-color: #fff;
}

.iv-btn {
  position: relative;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .25s ease, filter .2s ease, background-color .2s ease, opacity .2s ease;
}
.iv-btn:active:not(:disabled) { transform: scale(.95); }
@media (hover: hover) {
  .iv-btn:hover:not(:disabled) { filter: brightness(1.07); }
  .iv-btn.iv-shine:hover:not(:disabled)::after {
    content: "";
    position: absolute;
    inset: 0;
    width: 40%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
    animation: iv-shine .8s ease-out;
  }
}

.iv-scroll { scrollbar-width: thin; overscroll-behavior-x: contain; }

@media (prefers-reduced-motion: reduce) {
  .iv-rise, .iv-fade, .iv-pop, .iv-row, .iv-float {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .iv-card, .iv-lift, .iv-input, .iv-btn, .iv-row td {
    transition: none !important;
  }
  .iv-btn::after { display: none !important; }
}
`;

// ============================================================
// SMALL MEMOIZED PIECES
// ============================================================

const inputClass =
  "iv-input w-full px-3 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 bg-slate-50/70 outline-none";

const StatusBadge = memo(function StatusBadge({ status }) {
  const value = status || "PAID";
  const paid = String(value).toUpperCase() === "PAID";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] sm:text-xs rounded-full font-bold whitespace-nowrap border ${
        paid
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          paid ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {value}
    </span>
  );
});

const ExtraStay = memo(function ExtraStay({ invoice }) {
  const extraStay = computeExtraStayDetails(
    invoice.staySummary,
    invoice.extraCharges
  );

  if (!extraStay.hasExtraStay) {
    return <span className="text-slate-300 text-xs">-</span>;
  }

  return (
    <div className="flex flex-col text-xs leading-tight gap-0.5">
      {extraStay.extraFullDays > 0 && (
        <span className="font-bold text-amber-700">
          {extraStay.extraFullDays}{" "}
          {extraStay.extraFullDays === 1 ? "day" : "days"} extra
        </span>
      )}
      {(extraStay.extraHours > 0 || extraStay.extraMinutes > 0) && (
        <span className="font-semibold text-blue-700 inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {extraStay.extraHours}h {extraStay.extraMinutes}m extra
        </span>
      )}
    </div>
  );
});

const Rooms = memo(function Rooms({ rooms }) {
  if (!Array.isArray(rooms) || rooms.length === 0) return "-";

  return (
    <div className="space-y-1">
      {rooms.map((room, index) => (
        <div key={room._id || index} className="whitespace-nowrap">
          <span className="font-semibold">Room {room.roomNumber || "-"}</span>
          <span className="text-slate-500"> ({room.roomType || "-"})</span>
        </div>
      ))}
    </div>
  );
});

const ActionButtons = memo(function ActionButtons({
  invoice,
  isDownloading,
  onView,
  onDownload,
  onDelete,
  full,
}) {
  const base = `iv-btn cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/25 disabled:cursor-not-allowed disabled:opacity-75 ${
    full ? "flex-1 py-2.5" : "px-3 py-1.5"
  }`;

  return (
    <div
      className={`flex items-center gap-1.5 sm:gap-2 ${
        full ? "w-full" : "justify-center"
      }`}
    >
      <button
        type="button"
        onClick={() => onView(invoice)}
        className={`${base} bg-blue-600 hover:bg-blue-700`}
      >
        <Eye className="w-3.5 h-3.5" />
        View
      </button>

      <button
        type="button"
        onClick={() => onDownload(invoice)}
        disabled={isDownloading}
        className={`${base} bg-gradient-to-r from-[#0f2a63] to-blue-700`}
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Downloading...</span>
          </>
        ) : (
          <>
            <FileDown className="w-3.5 h-3.5" />
            PDF
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => onDelete(invoice._id)}
        className={`${base} bg-rose-600 hover:bg-rose-700`}
        aria-label={`Delete invoice ${invoice.invoiceNo}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    </div>
  );
});

// Desktop / tablet table row
const InvoiceRow = memo(function InvoiceRow({
  invoice,
  index,
  isDownloading,
  onView,
  onDownload,
  onDelete,
}) {
  return (
    <tr style={{ "--i": index }} className="iv-row">
      <td className="p-3 sm:p-4 font-bold text-blue-700 whitespace-nowrap">
        {invoice.invoiceNo}
      </td>
      <td className="p-3 sm:p-4 whitespace-nowrap">
        {formatDate(invoice.invoiceDate || invoice.createdAt)}
      </td>
      <td className="p-3 sm:p-4 font-semibold text-[#0f2a63] whitespace-nowrap">
        {invoice.customer?.customerName}
      </td>
      <td className="p-3 sm:p-4 whitespace-nowrap">
        {invoice.customer?.phoneNumber}
      </td>
      <td className="p-3 sm:p-4">
        <Rooms rooms={invoice.rooms} />
      </td>
      <td className="p-3 sm:p-4 whitespace-nowrap">
        <ExtraStay invoice={invoice} />
      </td>
      <td className="p-3 sm:p-4 font-bold text-[#0f2a63] whitespace-nowrap">
        ₹{invoice.financials?.grandTotal?.toLocaleString()}
      </td>
      <td className="p-3 sm:p-4">
        <StatusBadge status={invoice.paymentInfo?.paymentStatus} />
      </td>
      <td className="p-3 sm:p-4 whitespace-nowrap">
        <ActionButtons
          invoice={invoice}
          isDownloading={isDownloading}
          onView={onView}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
});

// Mobile card
const InvoiceCard = memo(function InvoiceCard({
  invoice,
  index,
  isDownloading,
  onView,
  onDownload,
  onDelete,
}) {
  return (
    <article
      style={{ "--i": index }}
      className="iv-row iv-card bg-white border border-blue-100/80 rounded-2xl p-4 shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-blue-700">
            {invoice.invoiceNo}
          </p>
          <p className="text-base font-bold text-[#0f2a63] truncate">
            {invoice.customer?.customerName || "-"}
          </p>
        </div>
        <StatusBadge status={invoice.paymentInfo?.paymentStatus} />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <CalendarDays className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate">
            {formatDate(invoice.invoiceDate || invoice.createdAt)}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate">
            {invoice.customer?.phoneNumber || "-"}
          </span>
        </span>
      </div>

      <div className="flex items-start justify-between gap-3 text-xs text-slate-700 bg-blue-50/60 rounded-xl p-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 mb-1">
            Rooms
          </p>
          <Rooms rooms={invoice.rooms} />
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] font-semibold text-slate-500 mb-1">
            Extra stay
          </p>
          <ExtraStay invoice={invoice} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">Total</span>
        <span className="text-lg font-extrabold text-[#0f2a63]">
          ₹{invoice.financials?.grandTotal?.toLocaleString()}
        </span>
      </div>

      <ActionButtons
        full
        invoice={invoice}
        isDownloading={isDownloading}
        onView={onView}
        onDownload={onDownload}
        onDelete={onDelete}
      />
    </article>
  );
});

const StatTile = memo(function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="iv-lift bg-white border border-blue-100/80 rounded-2xl p-4 shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] flex items-center gap-3 min-w-0">
      <div className="shrink-0 p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-600/25">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] sm:text-xs font-semibold text-slate-500">
          {label}
        </p>
        <p className="text-lg sm:text-xl font-extrabold text-[#0f2a63] tabular-nums truncate">
          {value}
        </p>
      </div>
    </div>
  );
});

const FilterLabel = ({ children }) => (
  <span className="block text-xs font-semibold text-slate-700 mb-1.5">
    {children}
  </span>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

const InvoicesManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const [currentPage, setCurrentPage] = useState(1);

  const [activeInvoice, setActiveInvoice] = useState(null);
  const [pdfInvoice, setPdfInvoice] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const receiptRef = useRef();

  // Filtering runs on a deferred copy so typing never lags
  const deferredQuery = useDeferredValue(searchQuery);

  // ============================================================
  // FETCH
  // ============================================================

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getAllInvoices();
      const result =
        response?.data?.success !== undefined ? response.data : response;

      if (result?.success) {
        setInvoices(Array.isArray(result.data) ? result.data : []);
      } else {
        throw new Error(result?.message || "Failed to load invoices.");
      }
    } catch (err) {
      setError(err.message || "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = useCallback(async (id) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        await deleteInvoice(id);
        setInvoices((prev) => prev.filter((inv) => inv._id !== id));
      } catch (err) {
        alert(err.message || "Failed to delete invoice.");
      }
    }
  }, []);

  // ============================================================
  // FILTER + SORT (memoized: only recomputed when inputs change)
  // ============================================================

  const filteredInvoices = useMemo(() => {
    const query = deferredQuery.trim().toLowerCase();

    return invoices
      .filter((inv) => {
        if (!query) return true;

        const c = inv.customer || {};
        const rooms = Array.isArray(inv.rooms) ? inv.rooms : [];

        const values = {
          name: c.customerName,
          phone: c.phoneNumber,
          email: c.email,
          room: rooms
            .map((room) => room.roomNumber)
            .filter(Boolean)
            .join(" "),
          invoice: inv.invoiceNo,
        };

        if (searchField !== "all") {
          return String(values[searchField] || "")
            .toLowerCase()
            .includes(query);
        }

        return Object.values(values).some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );
      })
      .filter((inv) => {
        if (!filterDate && !filterMonth) return true;

        const invoiceDate = new Date(inv.invoiceDate);

        if (Number.isNaN(invoiceDate.getTime())) {
          return false;
        }

        // Exact date filter
        if (filterDate) {
          const selectedDate = new Date(`${filterDate}T00:00:00`);

          return (
            invoiceDate.getFullYear() === selectedDate.getFullYear() &&
            invoiceDate.getMonth() === selectedDate.getMonth() &&
            invoiceDate.getDate() === selectedDate.getDate()
          );
        }

        // Month + Year filter
        if (filterMonth) {
          const [year, month] = filterMonth.split("-").map(Number);

          return (
            invoiceDate.getFullYear() === year &&
            invoiceDate.getMonth() + 1 === month
          );
        }

        return true;
      });
  }, [invoices, deferredQuery, searchField, filterDate, filterMonth]);

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (
            Number(a.invoiceYear || 0) - Number(b.invoiceYear || 0) ||
            Number(a.invoiceSequence || 0) - Number(b.invoiceSequence || 0)
          );
        case "customerAsc":
          return String(a.customer?.customerName || "").localeCompare(
            String(b.customer?.customerName || "")
          );
        case "customerDesc":
          return String(b.customer?.customerName || "").localeCompare(
            String(a.customer?.customerName || "")
          );
        case "totalHigh":
          return (
            Number(b.financials?.grandTotal || 0) -
            Number(a.financials?.grandTotal || 0)
          );
        case "totalLow":
          return (
            Number(a.financials?.grandTotal || 0) -
            Number(b.financials?.grandTotal || 0)
          );
        case "newest":
        default:
          return (
            Number(b.invoiceYear || 0) - Number(a.invoiceYear || 0) ||
            Number(b.invoiceSequence || 0) - Number(a.invoiceSequence || 0) ||
            String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
          );
      }
    });
  }, [filteredInvoices, sortBy]);

  const totalPages = Math.ceil(sortedInvoices.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const currentInvoices = useMemo(
    () => sortedInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE),
    [sortedInvoices, startIndex]
  );

  // Keep the page valid if a delete/filter shrinks the list
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const totalRevenue = useMemo(
    () =>
      filteredInvoices.reduce(
        (sum, inv) => sum + Number(inv.financials?.grandTotal || 0),
        0
      ),
    [filteredInvoices]
  );

  // ============================================================
  // PDF (libraries load only when first needed = faster page load)
  // ============================================================

  const handleDownloadPDF = useCallback(async (invoice) => {
    setPdfInvoice(invoice);

    // Start loading the heavy libs while the hidden receipt renders
    const libsPromise = Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 150));

    const input = receiptRef.current;

    if (!input) {
      setPdfInvoice(null);
      return;
    }

    try {
      const [{ default: html2canvas }, { jsPDF }] = await libsPromise;

      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = 80;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoice.invoiceNo}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setPdfInvoice(null);
    }
  }, []);

  const handleDownloadClick = useCallback(
    async (inv) => {
      try {
        setDownloadingId(inv._id);
        await handleDownloadPDF(inv);
      } finally {
        setDownloadingId(null);
      }
    },
    [handleDownloadPDF]
  );

  const handleDownloadExcel = () => {
    if (filteredInvoices.length === 0) {
      alert("No data available to export.");
      return;
    }

    exportInvoicesToExcel(
      sortedInvoices,
      `Hotel_Invoices_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const clearDateFilters = () => {
    setFilterDate("");
    setFilterMonth("");
    setCurrentPage(1);
  };

  // ============================================================
  // LOADING / ERROR
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <style>{CSS}</style>
        <div className="iv-pop flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-7 shadow-lg shadow-blue-900/10 border border-blue-100">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm font-medium text-slate-500">
            Loading invoices...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <style>{CSS}</style>
        <div className="iv-pop max-w-md w-full bg-white border border-rose-100 rounded-2xl p-6 text-center shadow-lg shadow-blue-900/10">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-rose-700 font-semibold text-sm sm:text-base">
            Error: {error}
          </p>
          <button
            type="button"
            onClick={fetchInvoices}
            className="iv-btn iv-shine cursor-pointer mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 shadow-lg shadow-blue-700/30"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  const hasDateFilter = filterDate || filterMonth;

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="max-w-7xl w-full mx-auto font-['Inter'] space-y-4 sm:space-y-6 pb-8">
      <style>{CSS}</style>

      {/* HEADER */}
      <header className="iv-rise iv-d1 flex flex-col md:flex-row md:justify-between md:items-center gap-3 sm:gap-4  shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)]">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
         

          <div className="min-w-0">
           

<h1 className="text-[12px] sm:text-[20px] lg:text-[25px] leading-tight font-extrabold tracking-[-0.035em] text-white">    Hotel Invoice Management
            </h1>
           
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadExcel}
          className="iv-btn iv-shine cursor-pointer inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-600/25 w-full md:w-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export Excel / CSV
        </button>
      </header>

      {/* STATS */}
      <section className="iv-rise iv-d2 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatTile
          icon={Receipt}
          label="Matching invoices"
          value={filteredInvoices.length}
        />
        <StatTile
          icon={IndianRupee}
          label="Total value"
          value={money(totalRevenue)}
        />
       
      </section>

      {/* FILTERS */}
      <section className="iv-rise iv-d3 bg-white p-4 sm:p-5 rounded-2xl border border-blue-100/80 shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <label className="block">
          <FilterLabel>Search Field</FilterLabel>
          <select
            value={searchField}
            onChange={(e) => {
              setSearchField(e.target.value);
              setCurrentPage(1);
            }}
            className={`${inputClass} cursor-pointer`}
          >
            {FIELD_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <FilterLabel>Search</FilterLabel>
          <div className="relative">
            <Search className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Name, phone, email, room, invoice..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={`${inputClass} pl-9`}
            />
          </div>
        </label>

        <label className="block">
          <FilterLabel>Sort Invoices</FilterLabel>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            className={`${inputClass} cursor-pointer`}
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <label className="block">
            <FilterLabel>Filter by Date</FilterLabel>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setFilterMonth("");
                setCurrentPage(1);
              }}
              className={`${inputClass} cursor-pointer`}
            />
          </label>

          {hasDateFilter && (
            <button
              type="button"
              onClick={clearDateFilters}
              className="iv-pop cursor-pointer mt-2 inline-flex items-center gap-1 text-[11px] sm:text-xs text-rose-600 hover:text-rose-700 font-bold transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear Date / Month Filter
            </button>
          )}
        </div>
      </section>

      {/* LIST */}
      <section className="iv-rise iv-d4">
        {currentInvoices.length === 0 ? (
          <div className="iv-pop bg-white rounded-2xl border border-blue-100/80 shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] p-10 sm:p-16 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
              <SearchX className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-[#0f2a63] mt-4">
              No invoices found
            </h3>
           
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div
              key={`m-${currentPage}-${sortBy}`}
              className="md:hidden space-y-4"
            >
              {currentInvoices.map((inv, index) => (
                <InvoiceCard
                  key={inv._id}
                  invoice={inv}
                  index={index}
                  isDownloading={downloadingId === (inv._id || inv.id)}
                  onView={setActiveInvoice}
                  onDownload={handleDownloadClick}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Tablet / desktop: table */}
            <div className="hidden md:block bg-white rounded-2xl border border-blue-100/80 shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] overflow-hidden">
              <div className="iv-scroll overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[860px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#0f2a63] to-blue-800 text-white text-[11px] font-bold">
                      <th className="p-3 sm:p-4 whitespace-nowrap">Invoice No</th>
                      <th className="p-3 sm:p-4 whitespace-nowrap">Date</th>
                      <th className="p-3 sm:p-4 whitespace-nowrap">Customer Name</th>
                      <th className="p-3 sm:p-4 whitespace-nowrap">Phone</th>
                      <th className="p-3 sm:p-4 whitespace-nowrap">Room</th>
                      <th className="p-3 sm:p-4 whitespace-nowrap">Extra Stay</th>
                      <th className="p-3 sm:p-4 whitespace-nowrap">Total (₹)</th>
                      <th className="p-3 sm:p-4 whitespace-nowrap">Status</th>
                      <th className="p-3 sm:p-4 text-center whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody
                    key={`t-${currentPage}-${sortBy}`}
                    className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-800"
                  >
                    {currentInvoices.map((inv, index) => (
                      <InvoiceRow
                        key={inv._id}
                        invoice={inv}
                        index={index}
                        isDownloading={downloadingId === (inv._id || inv.id)}
                        onView={setActiveInvoice}
                        onDownload={handleDownloadClick}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* PAGINATION */}
       <div className="mt-3 p-2 sm:p-3 flex items-center justify-end shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)]">
  <div className="flex items-center gap-1.5">
    <button
      type="button"
      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
      className="iv-btn cursor-pointer inline-flex items-center gap-0.5 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] sm:text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <ChevronLeft className="w-3.5 h-3.5" />
      Previous
    </button>

    <span className="px-2 py-1 text-[11px] sm:text-xs font-bold text-white whitespace-nowrap tabular-nums">
      {currentPage} / {totalPages}
    </span>

    <button
      type="button"
      onClick={() =>
        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
      }
      disabled={currentPage === totalPages}
      className="iv-btn cursor-pointer inline-flex items-center gap-0.5 px-2 py-1.5 border border-white rounded-lg text-[11px] sm:text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Next
      <ChevronRight className="w-3.5 h-3.5" />
    </button>
  </div>
</div>

      </section>

      <InvoiceTemplate
        activeInvoice={activeInvoice}
        pdfInvoice={pdfInvoice}
        receiptRef={receiptRef}
        handleDownloadPDF={handleDownloadPDF}
        setActiveInvoice={setActiveInvoice}
        formatDate={formatDate}
        formatTime={formatTime}
      />
    </div>
  );
};

export default InvoicesManagement;