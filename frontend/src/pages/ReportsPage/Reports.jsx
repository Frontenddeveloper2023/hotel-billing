import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Helmet } from "react-helmet-async";
import {
  FileText,
  Search,
  IndianRupee,
  FileSpreadsheet,
  Users,
  BarChart3,
  Loader2,
  CalendarDays,
  SearchX,
} from "lucide-react";
import { useToast } from "../../Context/ToastContext";
import { getReportsSummary } from "../../service/reportsApi";
import { formatHumanDate } from "../InvoiceTemplate/stayDurationHelper.js";
import "./reports.css";

// ============================================================
// STATIC CONFIG
// ============================================================

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const FILTER_TABS = [
  ["all", "All Time"],
  ["month", "Month Wise (Day-by-Day)"],
  ["year", "Year Wise (Jan-Dec)"],
];

const inr = (n) => Number(n || 0).toLocaleString("en-IN");

// ============================================================
// STYLES (only transform + opacity are animated)
// ============================================================

const CSS = `
@keyframes rp-rise {
  from { opacity: 0; transform: translate3d(0, 14px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes rp-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes rp-pop {
  from { opacity: 0; transform: scale(.94); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes rp-grow {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}
@keyframes rp-shine {
  from { transform: translate3d(-120%, 0, 0) skewX(-20deg); }
  to   { transform: translate3d(240%, 0, 0) skewX(-20deg); }
}

.rp-rise { opacity: 0; animation: rp-rise .55s cubic-bezier(.22,1,.36,1) forwards; }
.rp-fade { animation: rp-fade .3s ease-out both; }
.rp-pop  { animation: rp-pop .3s cubic-bezier(.22,1,.36,1) both; }
.rp-d1 { animation-delay: .04s; }
.rp-d2 { animation-delay: .12s; }
.rp-d3 { animation-delay: .2s; }
.rp-d4 { animation-delay: .28s; }
.rp-d5 { animation-delay: .36s; }

.rp-row {
  opacity: 0;
  animation: rp-rise .45s cubic-bezier(.22,1,.36,1) forwards;
  animation-delay: calc(var(--i, 0) * 30ms);
}
.rp-row td { transition: background-color .25s ease; }
.rp-row:hover td { background-color: rgba(219, 234, 254, .55); }

.rp-bar {
  transform-origin: bottom center;
  animation: rp-grow .7s cubic-bezier(.22,1,.36,1) both;
  animation-delay: calc(var(--i, 0) * 25ms);
  transition: filter .2s ease;
}
.rp-bar-wrap:hover .rp-bar { filter: brightness(1.12); }
.rp-tip {
  opacity: 0;
  transform: translate3d(-50%, 4px, 0);
  transition: opacity .2s ease, transform .2s ease;
}
.rp-bar-wrap:hover .rp-tip,
.rp-bar-wrap:focus-visible .rp-tip {
  opacity: 1;
  transform: translate3d(-50%, 0, 0);
}

.rp-card { content-visibility: auto; contain-intrinsic-size: auto 190px; }

@media (hover: hover) {
  .rp-lift { transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease; }
  .rp-lift:hover { transform: translate3d(0, -3px, 0); box-shadow: 0 18px 36px -20px rgba(15,42,99,.4); }
}

.rp-input {
  transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
}
.rp-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, .12);
  background-color: #fff;
}

.rp-btn {
  position: relative;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .25s ease, filter .2s ease, background-color .2s ease, color .2s ease, opacity .2s ease;
}
.rp-btn:active:not(:disabled) { transform: scale(.96); }
@media (hover: hover) {
  .rp-btn:hover:not(:disabled) { filter: brightness(1.07); }
  .rp-btn.rp-shine:hover:not(:disabled)::after {
    content: "";
    position: absolute;
    inset: 0;
    width: 40%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
    animation: rp-shine .8s ease-out;
  }
}

.rp-scroll { scrollbar-width: thin; overscroll-behavior-x: contain; }

@media (prefers-reduced-motion: reduce) {
  .rp-rise, .rp-fade, .rp-pop, .rp-row, .rp-bar {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .rp-lift, .rp-input, .rp-btn, .rp-row td, .rp-tip, .rp-bar {
    transition: none !important;
  }
  .rp-btn::after { display: none !important; }
}
`;

// ============================================================
// SMALL MEMOIZED PIECES
// ============================================================

// Count-up lives in its own component so only the number re-renders
const AnimatedNumber = memo(function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  locale = false,
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      setDisplay(value);
      prev.current = value;
      return;
    }

    const from = prev.current;
    const start = performance.now();
    const duration = 700;
    let raf;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));

      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = value;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <>
      {prefix}
      {locale ? inr(display) : display}
      {suffix}
    </>
  );
});

const StatCard = memo(function StatCard({
  icon: Icon,
  label,
  children,
  valueClass,
  delay,
}) {
  return (
    <div
      className={`rp-rise ${delay} rp-lift bg-white rounded-2xl p-4 sm:p-5 border border-blue-100/80 shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] flex items-center justify-between gap-3`}
    >
      <div className="min-w-0">
        <p className="text-[11px] sm:text-xs font-semibold text-slate-500">
          {label}
        </p>
        <h3
          className={`text-xl sm:text-2xl font-extrabold mt-1 tabular-nums truncate ${valueClass}`}
        >
          {children}
        </h3>
      </div>
      <div className="shrink-0 p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-600/25">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
    </div>
  );
});

const StatusBadge = memo(function StatusBadge({ status }) {
  const s = String(status).toUpperCase();
  const tone =
    s === "PAID"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "REFUNDED" || s === "CANCELLED"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
  const dot =
    s === "PAID"
      ? "bg-emerald-500"
      : s === "REFUNDED" || s === "CANCELLED"
        ? "bg-rose-500"
        : "bg-amber-500";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${tone}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
});

const ServiceCell = memo(function ServiceCell({ row }) {
  const items = row.roomItems || [];

  return (
    <div className="text-xs text-slate-800 space-y-1">
      {items.length > 0 ? (
        items.map((item, index) => (
          <div
            key={`${item.roomNumber || "room"}-${index}`}
            className="font-semibold text-[#0f2a63]"
          >
            {item.description}
          </div>
        ))
      ) : (
        <div className="font-semibold text-[#0f2a63]">
          {row.type || "Room Stay"}
        </div>
      )}
    </div>
  );
});

const ReportRow = memo(function ReportRow({ row, index }) {
  return (
    <tr style={{ "--i": Math.min(index, 14) }} className="rp-row">
      <td className="px-4 lg:px-6 py-4 font-bold text-blue-700 tabular-nums whitespace-nowrap">
        {row.id}
      </td>
      <td className="px-4 lg:px-6 py-4 font-bold text-[#0f2a63]">
        {row.customer}
      </td>
      <td className="px-4 lg:px-6 py-4">
        <ServiceCell row={row} />
      </td>
      <td className="px-4 lg:px-6 py-4 font-semibold text-slate-700 tabular-nums whitespace-nowrap">
        {formatHumanDate(row.date)}
      </td>
      <td className="px-4 lg:px-6 py-4 font-bold text-[#0f2a63] tabular-nums whitespace-nowrap">
        ₹ {inr(row.amount)}
      </td>
      <td className="px-4 lg:px-6 py-4">
        <StatusBadge status={row.status} />
      </td>
    </tr>
  );
});

const ReportCard = memo(function ReportCard({ row, index }) {
  return (
    <article
      style={{ "--i": Math.min(index, 14) }}
      className="rp-row rp-card bg-white border border-blue-100/80 rounded-2xl p-4 shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-blue-700 tabular-nums">
            {row.id}
          </p>
          <p className="text-base font-bold text-[#0f2a63] truncate">
            {row.customer}
          </p>
        </div>
        <StatusBadge status={row.status} />
      </div>

      <div className="bg-blue-50/60 rounded-xl p-3">
        <ServiceCell row={row} />
      </div>

      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 tabular-nums">
          <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
          {formatHumanDate(row.date)}
        </span>
        <span className="text-lg font-extrabold text-[#0f2a63] tabular-nums">
          ₹ {inr(row.amount)}
        </span>
      </div>
    </article>
  );
});

const Bar = memo(function Bar({ item, index, max }) {
  const pct = Math.round((item.value / max) * 100);

  return (
    <div
      tabIndex={0}
      className="rp-bar-wrap w-9 sm:w-12 md:w-14 flex flex-col items-center gap-2 h-full justify-end relative shrink-0 outline-none cursor-pointer"
    >
      <div className="rp-tip absolute bottom-full left-1/2 mb-2 bg-[#0a1a3f] text-white text-[10px] py-1 px-2 rounded-md pointer-events-none whitespace-nowrap shadow-lg z-30">
        {item.subLabel}: ₹{inr(item.value)}
      </div>

      <div
        style={{
          height: `${Math.max(pct, 3)}%`,
          "--i": Math.min(index, 20),
        }}
        className={`rp-bar w-full rounded-t-md ${item.value > 0
            ? "bg-gradient-to-t from-blue-700 to-sky-400"
            : "bg-slate-100"
          }`}
      />

      <span className="text-[10px] font-bold text-slate-700 truncate">
        {item.label}
      </span>
    </div>
  );
});

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Reports() {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const pdfRef = useRef(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Dynamic API Data States
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [filterType, setFilterType] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Keeps typing smooth: filtering runs on a deferred copy
  const deferredSearch = useDeferredValue(searchTerm);

  // Fetch report summary from dedicated /reports/summary endpoint
  // (uses `reports` permission only – no invoice permission required)
  useEffect(() => {
    let cancelled = false;

    const fetchDatabaseRecords = async () => {
      setIsLoading(true);
      try {
        const response = await getReportsSummary();

        const transactions = response?.data?.recentTransactions || [];

        const formattedReports = transactions.map((inv) => {
          const customerName =
            inv.customer?.customerName || "Walk-in Guest";

          const rooms = Array.isArray(inv.rooms) ? inv.rooms : [];

          const roomNum =
            inv.roomNumber ||
            (rooms.length > 0
              ? rooms.map((r) => r.roomNumber).filter(Boolean).join(", ")
              : "N/A");

          const rawDate = String(inv.invoiceDate || "").trim();
          let d = rawDate ? new Date(rawDate) : new Date();
          if (isNaN(d.getTime())) d = new Date();
          const itemDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

          const rawStatus = String(inv.status || "").toUpperCase();
          const status =
            rawStatus === "CANCELLED" || rawStatus === "REFUNDED"
              ? rawStatus
              : "PAID";

          return {
            id: inv.invoiceNo || inv._id,
            customer: customerName,
            room: roomNum,
            rooms,
            roomItems: [],
            amount: Number(inv.grandTotal || 0),
            date: itemDate,
            status: status,
            type: "Room Stay",
          };
        });

        if (!cancelled) setReportData(formattedReports);
      } catch (error) {
        console.error("Failed to fetch hotel reports data:", error);
        toastRef.current.error("Failed to load reports data from database.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchDatabaseRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  // Filter table records dynamically
  const filteredReports = useMemo(() => {
    const q = deferredSearch.toLowerCase();

    return reportData.filter((item) => {
      const matchesSearch =
        item.customer.toLowerCase().includes(q) ||
        String(item.id).toLowerCase().includes(q) ||
        String(item.room).includes(deferredSearch);

      if (!matchesSearch) return false;

      if (filterType === "month" && selectedMonth) {
        return item.date.startsWith(selectedMonth);
      }
      if (filterType === "year" && selectedYear) {
        return item.date.startsWith(selectedYear);
      }

      return true;
    });
  }, [reportData, filterType, selectedMonth, selectedYear, deferredSearch]);

  // Aggregate metrics
  const totalRevenue = useMemo(() => {
    return filteredReports.reduce((sum, item) => {
      const isPaid = String(item.status).toUpperCase() === "PAID";
      return isPaid ? sum + Number(item.amount) : sum;
    }, 0);
  }, [filteredReports]);

  const totalTransactions = filteredReports.length;

  const totalCustomers = useMemo(() => {
    const uniqueNames = new Set(filteredReports.map((item) => item.customer));
    return uniqueNames.size;
  }, [filteredReports]);



  // Year options come only from real data
  const yearOptions = useMemo(() => {
    const years = new Set(
      reportData
        .map((r) => {
          const date = new Date(r.date);
          return !isNaN(date.getTime())
            ? String(date.getFullYear())
            : null;
        })
        .filter(Boolean)
    );

    return [...years].sort((a, b) => Number(b) - Number(a));
  }, [reportData]);

  // Dynamic chart data generator
  const chartData = useMemo(() => {
    if (filterType === "month" && selectedMonth) {
      const [yearStr, monthStr] = selectedMonth.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const totalDays = new Date(year, month, 0).getDate();

      const daysMap = {};
      reportData.forEach((item) => {
        const isPaid = String(item.status).toUpperCase() === "PAID";
        if (isPaid && item.date.startsWith(selectedMonth)) {
          const dayParts = item.date.split("-");
          const dayNum = parseInt(dayParts[2] || dayParts[0], 10);
          if (!isNaN(dayNum)) {
            daysMap[dayNum] = (daysMap[dayNum] || 0) + Number(item.amount);
          }
        }
      });

      const result = [];
      for (let d = 1; d <= totalDays; d++) {
        result.push({
          label: `${d}`,
          subLabel: `Day ${d}`,
          value: daysMap[d] || 0,
        });
      }
      return result;
    }

    if (filterType === "year" && selectedYear) {
      const monthsMap = {};

      reportData.forEach((item) => {
        const isPaid = String(item.status).toUpperCase() === "PAID";
        if (isPaid && item.date.startsWith(selectedYear)) {
          const monthIndex = parseInt(item.date.split("-")[1], 10) - 1;
          if (!isNaN(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
            monthsMap[monthIndex] =
              (monthsMap[monthIndex] || 0) + Number(item.amount);
          }
        }
      });

      return MONTH_NAMES.map((name, index) => ({
        label: name,
        subLabel: name,
        value: monthsMap[index] || 0,
      }));
    }

    const yearsMap = {};
    reportData.forEach((item) => {
      const isPaid = String(item.status).toUpperCase() === "PAID";
      if (isPaid && item.date) {
        const year = item.date.split("-")[0];
        if (year) {
          yearsMap[year] = (yearsMap[year] || 0) + Number(item.amount);
        }
      }
    });

    const activeYears = Object.keys(yearsMap).sort();
    const defaultYears =
      activeYears.length > 0 ? activeYears : ["2024", "2025", "2026"];

    return defaultYears.map((year) => ({
      label: year,
      subLabel: year,
      value: yearsMap[year] || 0,
    }));
  }, [reportData, filterType, selectedMonth, selectedYear]);

  const maxChartValue = useMemo(
    () => Math.max(...chartData.map((d) => d.value), 5000),
    [chartData]
  );

  // Excel / CSV Download Handler
  const handleDownloadExcel = useCallback(() => {
    if (filteredReports.length === 0) {
      toastRef.current.error("No records available to export.");
      return;
    }

    const headers = [
      "Bill ID",
      "Guest Name",
      "Room / Service",
      "Date",
      "Amount (INR)",
      "Status",
    ];

    const csvRows = [headers.join(",")];

    filteredReports.forEach((item) => {
      const roomServiceText =
        item.roomItems?.length > 0
          ? item.roomItems
            .map((roomItem) => roomItem.description)
            .filter(Boolean)
            .join(" | ")
          : item.type || "Room Stay";

      const row = [
        `"${item.id || ""}"`,
        `"${item.customer || ""}"`,
        `"${roomServiceText.replace(/"/g, '""')}"`,
        `"${formatHumanDate(item.date) || item.date || ""}"`,
        item.amount ?? 0,
        `"${item.status || ""}"`,
      ];

      csvRows.push(row.join(","));
    });

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvRows.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `SS_Residency_Reports_${filterType}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toastRef.current.success("Excel/CSV report downloaded successfully!");
  }, [filteredReports, filterType]);

  // Professional PDF Download Handler
  // (PDF libs load on first click; hidden print table mounts only while exporting)
  const handleDownloadPDF = useCallback(async () => {
    if (filteredReports.length === 0) {
      toastRef.current.error("No records available for PDF generation.");
      return;
    }

    setIsExportingPdf(true);

    try {
      const libsPromise = Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      // let React mount the hidden print container
      await new Promise((resolve) => setTimeout(resolve, 120));

      const element = pdfRef.current;
      if (!element) throw new Error("Print area not ready.");

      const [{ default: html2canvas }, { jsPDF }] = await libsPromise;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // First page (same 10mm top offset as before)
      let position = 10;
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      let heightLeft = pdfHeight - (pageHeight - position);

      // Extra pages so long reports are no longer cut off
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `SS_Residency_Financial_Report_${filterType}_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      );

      toastRef.current.success("PDF report generated successfully!");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toastRef.current.error("Failed to generate PDF document.");
    } finally {
      setIsExportingPdf(false);
    }
  }, [filteredReports, filterType]);

  const chartTitle =
    filterType === "month"
      ? `Daily Revenue Trend (${selectedMonth})`
      : filterType === "year"
        ? `Monthly Revenue Trend (${selectedYear})`
        : "Overall Revenue Breakdown";

  const chartBadge =
    filterType === "month"
      ? selectedMonth
      : filterType === "year"
        ? selectedYear
        : "All Time";

  const thClass =
    "px-4 lg:px-6 py-3.5 text-[11px] font-bold tracking-wide whitespace-nowrap";

  return (
    <>
      <style>{CSS}</style>

      <Helmet>
        <title>Billing Reports — SatylioHotel Management</title>
        <meta
          name="description"
          content="Generate and download hotel room billing, revenue, and transaction reports."
        />
      </Helmet>

      <main className="w-full max-w-7xl mx-auto space-y-5 sm:space-y-6 pb-8">
        {/* HEADER */}
        <header className="rp-rise rp-d1 flex flex-col gap-3 pb-4 sm:pb-5 border-b border-white/20">


          <div>
            <h1 className="text-[12px] sm:text-[20px] lg:text-[25px] leading-tight font-extrabold tracking-[-0.035em] text-white">              Billing & Revenue Reports
            </h1>

          </div>
        </header>

        {/* SUMMARY METRICS */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          <StatCard
            icon={FileText}
            label="Filtered Records Count"
            valueClass="text-[#0f2a63]"
            delay="rp-d2"
          >
            <AnimatedNumber value={totalTransactions} suffix=" Bills" />
          </StatCard>

          <StatCard
            icon={IndianRupee}
            label="Total Paid Revenue"
            valueClass="text-emerald-600"
            delay="rp-d3"
          >
            <AnimatedNumber value={totalRevenue} prefix="₹" locale />
          </StatCard>

          <StatCard
            icon={Users}
            label="Total Customers"
            valueClass="text-blue-600"
            delay="rp-d4"
          >
            <AnimatedNumber value={totalCustomers} />
          </StatCard>
        </section>

        {/* FILTERS */}
        <section
          className="
    rp-rise
    rp-d3
    w-full
    overflow-hidden
    rounded-2xl
    border
    border-blue-100/80
    bg-white
    p-3
    shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)]
    sm:p-4
    md:p-5
    lg:p-6
    space-y-4
  "
        >
          {/* TOP CONTROLS */}
          <div
            className="
      flex
      w-full
      min-w-0
      flex-col
      gap-4
      lg:flex-row
      lg:items-center
      lg:justify-between
    "
          >
            {/* SORT SECTION */}
            <div
              className="
        flex
        min-w-0
        w-full
        flex-col
        gap-2
        sm:flex-row
        sm:items-center
        sm:gap-3
        lg:w-auto
      "
            >
              <span
                className="
          shrink-0
          text-xs
          font-semibold
          text-slate-700
          sm:text-sm
        "
              >
                Sort by
              </span>

              {/* FILTER TABS */}
              <div
                className="
          rp-scroll
          flex
          min-w-0
          w-full
          max-w-full
          items-center
          gap-1
          overflow-x-auto
          rounded-xl
          bg-blue-50
          p-1
          [scrollbar-width:none]
          sm:w-auto
        "
              >
                {FILTER_TABS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilterType(value)}
                    className={`
              rp-btn
              shrink-0
              cursor-pointer
              whitespace-nowrap
              rounded-lg
              px-3
              py-2
              text-xs
              font-semibold
              transition-all
              duration-200
              sm:px-4
              ${filterType === value
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-600 hover:bg-white/60 hover:text-blue-700"
                      }
            `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* SEARCH */}
            <div
              className="
        relative
        w-full
        min-w-0
        lg:w-72
        xl:w-80
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
                placeholder="Search guest, room, bill id..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="
          rp-input
          h-10
          w-full
          min-w-0
          rounded-xl
          border
          border-slate-200
          bg-slate-50/70
          pl-10
          pr-3
          text-xs
          font-medium
          text-slate-900
          outline-none
          transition-all
          duration-200
          placeholder:text-slate-400
          hover:border-blue-200
          focus:border-blue-400
          focus:bg-white
          focus:ring-4
          focus:ring-blue-100
          sm:h-11
          sm:pl-11
          sm:pr-4
          sm:text-sm
        "
              />
            </div>
          </div>

          {/* MONTH FILTER */}
          {filterType === "month" && (
            <div
              className="
        rp-pop
        flex
        w-full
        min-w-0
        flex-col
        gap-3
        border-t
        border-slate-100
        pt-3
        sm:flex-row
        sm:flex-wrap
        sm:items-center
        sm:gap-3
      "
            >
              <span
                className="
          shrink-0
          text-xs
          font-semibold
          text-slate-700
          sm:text-sm
        "
              >
                Select month & year
              </span>

              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="
          rp-input
          h-10
          w-full
          max-w-full
          cursor-pointer
          rounded-xl
          border
          border-slate-200
          bg-slate-50/70
          px-3
          py-2
          text-xs
          font-semibold
          text-slate-900
          outline-none
          transition-all
          duration-200
          hover:border-blue-200
          focus:border-blue-400
          focus:bg-white
          focus:ring-4
          focus:ring-blue-100
          sm:w-auto
          sm:min-w-[170px]
          sm:text-sm
        "
              />
            </div>
          )}

          {/* YEAR FILTER */}
          {filterType === "year" && (
            <div
              className="
        rp-pop
        flex
        w-full
        min-w-0
        flex-col
        gap-3
        border-t
        border-slate-100
        pt-3
        sm:flex-row
        sm:flex-wrap
        sm:items-center
        sm:gap-3
      "
            >
              <span
                className="
          shrink-0
          text-xs
          font-semibold
          text-slate-700
          sm:text-sm
        "
              >
                Select year
              </span>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="
          rp-input
          h-10
          w-full
          max-w-full
          cursor-pointer
          rounded-xl
          border
          border-slate-200
          bg-slate-50/70
          px-3
          py-2
          text-xs
          font-semibold
          text-slate-900
          outline-none
          transition-all
          duration-200
          hover:border-blue-200
          focus:border-blue-400
          focus:bg-white
          focus:ring-4
          focus:ring-blue-100
          sm:w-auto
          sm:min-w-[130px]
          sm:text-sm
        "
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* REVENUE TREND CHART */}
        <section className="rp-rise rp-d4 bg-white rounded-2xl border border-blue-100/80 p-4 sm:p-6 shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 p-2.5 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl shadow-md shadow-blue-600/25">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-[#0f2a63]">
                  {chartTitle}
                </h2>

              </div>
            </div>

            <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
              {chartBadge}
            </span>
          </div>

          <div className="rp-scroll pt-10 pb-2 overflow-x-auto">
            {/* key re-triggers the grow animation when the period changes */}
            <div
              key={`${filterType}-${selectedMonth}-${selectedYear}`}
              className={`h-56 sm:h-60 flex items-end gap-2 sm:gap-3 px-2 border-b border-slate-200 bg-[linear-gradient(to_top,rgba(148,163,184,.22)_1px,transparent_1px)] bg-[length:100%_25%] ${filterType === "month"
                  ? "min-w-max"
                  : "w-full justify-around"
                }`}
            >
              {chartData.map((item, index) => (
                <Bar
                  key={item.subLabel}
                  item={item}
                  index={index}
                  max={maxChartValue}
                />
              ))}
            </div>
          </div>
        </section>

        {/* REPORT LINE ITEMS */}
        <section className="rp-rise rp-d5 bg-white rounded-2xl border border-blue-100/80 overflow-hidden shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)]">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#0f2a63]">
                Reports
              </h2>

            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="rp-btn rp-shine cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/25"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Download Excel
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isExportingPdf}
                className="rp-btn rp-shine cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-700/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {isExportingPdf ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="rp-pop px-6 py-14 flex items-center justify-center gap-2 text-[#0f2a63]">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="font-semibold text-sm">
                Loading database records...
              </span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="rp-pop px-6 py-14 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                <SearchX className="w-7 h-7" />
              </div>
              <span className="font-bold text-sm text-[#0f2a63] mt-4">
                No report records found
              </span>

            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div
                key={`m-${filterType}-${selectedMonth}-${selectedYear}`}
                className="md:hidden p-3 sm:p-4 space-y-3"
              >
                {filteredReports.map((row, index) => (
                  <ReportCard key={row.id} row={row} index={index} />
                ))}
              </div>

              {/* Tablet / desktop: table */}
              <div className="hidden md:block rp-scroll overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#0f2a63] to-blue-800 text-white">
                      <th className={thClass}>Bill ID</th>
                      <th className={thClass}>Guest Name</th>
                      <th className={thClass}>Room / Service Type</th>
                      <th className={thClass}>Date</th>
                      <th className={thClass}>Amount</th>
                      <th className={thClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody
                    key={`t-${filterType}-${selectedMonth}-${selectedYear}`}
                    className="divide-y divide-slate-100 text-xs sm:text-sm"
                  >
                    {filteredReports.map((row, index) => (
                      <ReportRow key={row.id} row={row} index={index} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* HIDDEN PRINT / PDF CONTAINER (mounted only while exporting) */}
        {isExportingPdf && (
          <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
            <div ref={pdfRef} className="pdf-export-container">
              <div className="pdf-header">
                <div className="pdf-title">
                  <h1>Satylio- Financial & Revenue Report</h1>
                </div>
                <div className="pdf-meta">
                  <p>
                    <strong>Generated On:</strong>{" "}
                    {new Date().toLocaleDateString("en-IN")}
                  </p>
                  <p>SatylioHotel Management System</p>
                </div>
              </div>

              <div className="pdf-summary-grid">
                <div className="pdf-summary-card">
                  <span>Total Bills</span>
                  <h3>{totalTransactions} Records</h3>
                </div>
                <div className="pdf-summary-card">
                  <span>Total Revenue</span>
                  <h3>₹{totalRevenue.toLocaleString("en-IN")}</h3>
                </div>
              </div>

              <table className="pdf-table">
                <thead>
                  <tr>
                    <th>Bill ID</th>
                    <th>Guest Name</th>
                    <th>Service / Room</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.id}</strong>
                      </td>
                      <td>{row.customer}</td>
                      <td>
                        {(row.roomItems || []).length > 0 ? (
                          row.roomItems.map((item, index) => (
                            <div key={`${item.roomNumber || "room"}-${index}`}>
                              {item.description}
                            </div>
                          ))
                        ) : (
                          <div>{row.type || "Room Stay"}</div>
                        )}
                      </td>
                      <td>{row.date}</td>
                      <td>
                        <strong>
                          ₹{Number(row.amount).toLocaleString("en-IN")}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`pdf-badge ${String(
                            row.status
                          ).toLowerCase()}`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}