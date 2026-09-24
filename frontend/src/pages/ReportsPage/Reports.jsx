import React, { useState, useMemo, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { 
  FileText, 
  Search, 
  IndianRupee, 
  FileSpreadsheet, 
  Users,
  BarChart3,
  Loader2
} from "lucide-react";
import { useToast } from "../../Context/ToastContext";
import { getReportsSummary } from "../../service/reportsApi";
import "./reports.css";

export default function Reports() {
  const toast = useToast();
  const pdfRef = useRef(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Dynamic API Data States
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [filterType, setFilterType] = useState("all"); 
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); 
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));          
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch report summary from dedicated /reports/summary endpoint
  // (uses `reports` permission only – no invoice permission required)
  useEffect(() => {
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

          const itemDate = inv.invoiceDate
            ? String(inv.invoiceDate).slice(0, 10)
            : new Date().toISOString().slice(0, 10);

          return {
            id: inv.invoiceNo || inv._id,
            customer: customerName,
            room: roomNum,
            rooms,
            roomItems: [],
            amount: Number(inv.grandTotal || 0),
            date: itemDate,
            status: inv.status || "ISSUED",
            type: "Room Stay",
          };
        });

        setReportData(formattedReports);
      } catch (error) {
        console.error("Failed to fetch hotel reports data:", error);
        toast.error("Failed to load reports data from database.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatabaseRecords();
  }, [toast]);

  // Filter table records dynamically
  const filteredReports = useMemo(() => {
    return reportData.filter((item) => {
      const matchesSearch = 
        item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.room).includes(searchTerm);

      if (!matchesSearch) return false;

      if (filterType === "month" && selectedMonth) {
        return item.date.startsWith(selectedMonth);
      }
      if (filterType === "year" && selectedYear) {
        return item.date.startsWith(selectedYear);
      }

      return true;
    });
  }, [reportData, filterType, selectedMonth, selectedYear, searchTerm]);

  // Aggregate metrics
  const totalRevenue = useMemo(() => {
    return filteredReports.reduce((sum, item) => {
      const isPaid = String(item.status).toUpperCase() === "PAID";
      return isPaid ? sum + Number(item.amount) : sum;
    }, 0);
  }, [filteredReports]);

  const totalTransactions = filteredReports.length;

  const totalCustomers = useMemo(() => {
    const uniqueNames = new Set(filteredReports.map(item => item.customer));
    return uniqueNames.size;
  }, [filteredReports]);

  // Dynamic chart data generator
  const chartData = useMemo(() => {
    if (filterType === "month" && selectedMonth) {
      const [yearStr, monthStr] = selectedMonth.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const totalDays = new Date(year, month, 0).getDate();

      const daysMap = {};
      reportData.forEach(item => {
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
          value: daysMap[d] || 0
        });
      }
      return result;
    } 
    
    if (filterType === "year" && selectedYear) {
      const monthsNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthsMap = {};

      reportData.forEach(item => {
        const isPaid = String(item.status).toUpperCase() === "PAID";
        if (isPaid && item.date.startsWith(selectedYear)) {
          const monthIndex = parseInt(item.date.split("-")[1], 10) - 1;
          if (!isNaN(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
            monthsMap[monthIndex] = (monthsMap[monthIndex] || 0) + Number(item.amount);
          }
        }
      });

      return monthsNames.map((name, index) => ({
        label: name,
        subLabel: name,
        value: monthsMap[index] || 0
      }));
    }

    const yearsMap = {};
    reportData.forEach(item => {
      const isPaid = String(item.status).toUpperCase() === "PAID";
      if (isPaid && item.date) {
        const year = item.date.split("-")[0];
        if (year) {
          yearsMap[year] = (yearsMap[year] || 0) + Number(item.amount);
        }
      }
    });

    const activeYears = Object.keys(yearsMap).sort();
    const defaultYears = activeYears.length > 0 ? activeYears : ["2024", "2025", "2026"];

    return defaultYears.map(year => ({
      label: year,
      subLabel: year,
      value: yearsMap[year] || 0
    }));
  }, [reportData, filterType, selectedMonth, selectedYear]);

  const maxChartValue = Math.max(...chartData.map(d => d.value), 5000);

  // Excel / CSV Download Handler
  const handleDownloadExcel = () => {
    if (filteredReports.length === 0) {
      toast.error("No records available to export.");
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
        `"${item.date || ""}"`,
        item.amount ?? 0,
        `"${item.status || ""}"`,
      ];

      csvRows.push(row.join(","));
    });

    const blob = new Blob(
      [csvRows.join("\n")],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `SS_Residency_Reports_${filterType}_${new Date().toISOString().slice(0, 10)}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Excel/CSV report downloaded successfully!");
  };

  // Professional PDF Download Handler
  const handleDownloadPDF = async () => {
    if (filteredReports.length === 0) {
      toast.error("No records available for PDF generation.");
      return;
    }

    setIsExportingPdf(true);
    const element = pdfRef.current;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
      pdf.save(`SS_Residency_Financial_Report_${filterType}_${new Date().toISOString().slice(0, 10)}.pdf`);
      
      toast.success("PDF report generated successfully!");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF document.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Billing Reports — SS Residency Hotel Management</title>
        <meta name="description" content="Generate and download hotel room billing, revenue, and transaction reports." />
      </Helmet>

      <main className="max-w-6xl  space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl  font-bold tracking-tight text-slate-900">Billing & Revenue Reports</h1>
            <p className="text-xs sm:text-sm text-slate-700 mt-1">Analyze professional hotel financial performance from database records, trend charts, and export data.</p>
          </div>
        </div>

        {/* Quick Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider">Filtered Records Count</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{totalTransactions} Bills</h3>
            </div>
            <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-teal-700">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider">Total Paid Revenue</p>
              <h3 className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">₹{totalRevenue.toLocaleString("en-IN")}</h3>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
              <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider">Total Customers</p>
              <h3 className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">{totalCustomers}</h3>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Filters and Sorting Control Panel */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider mr-2">Sort By:</span>
              <button onClick={() => setFilterType("all")} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterType === "all" ? "bg-teal-700 text-white shadow-xs" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}>All Time</button>
              <button onClick={() => setFilterType("month")} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterType === "month" ? "bg-teal-700 text-white shadow-xs" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}>Month Wise (Day-by-Day)</button>
              <button onClick={() => setFilterType("year")} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterType === "year" ? "bg-teal-700 text-white shadow-xs" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}>Year Wise (Jan-Dec)</button>
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Search guest, room, bill id..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-600 outline-none font-medium text-slate-900" />
            </div>
          </div>

          {filterType === "month" && (
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Select Month & Year:</span>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-1.5 text-xs sm:text-sm bg-slate-50/50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-900" />
            </div>
          )}

          {filterType === "year" && (
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Select Year:</span>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="px-3 py-1.5 text-xs sm:text-sm bg-slate-50/50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-900">
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          )}
        </div>

        {/* Revenue Trend Chart Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {filterType === "month" ? `Daily Revenue Trend (${selectedMonth})` : filterType === "year" ? `Monthly Revenue Trend (${selectedYear})` : "Overall Revenue Breakdown"}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-700">Complete financial timeline showing active business performance across all periods.</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-full">
              {filterType === "month" ? selectedMonth : filterType === "year" ? selectedYear : "All Time"}
            </span>
          </div>

          <div className="pt-10 pb-2 overflow-x-auto">
            <div className={`h-60 flex items-end gap-3 px-2 border-b border-slate-200 ${
              filterType === "month" ? "min-w-max" : "w-full justify-around"
            }`}>
              {chartData.map((item, index) => {
                const heightPercentage = Math.round((item.value / maxChartValue) * 100);
                return (
                  <div key={index} className="w-12 sm:w-14 flex flex-col items-center gap-2 h-full justify-end group relative shrink-0">
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md pointer-events-none whitespace-nowrap shadow-lg z-30">
                      {item.subLabel}: ₹{item.value.toLocaleString("en-IN")}
                    </div>
                    <div 
                      style={{ height: `${Math.max(heightPercentage, 3)}%` }} 
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        item.value > 0 ? "bg-teal-700 hover:bg-teal-800" : "bg-slate-100"
                      }`}
                    ></div>
                    <span className="text-[10px] font-bold text-slate-900 truncate">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reports Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Report Line Items</h2>
              <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5">Showing invoice breakdown based on current sorting criteria.</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button onClick={handleDownloadExcel} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer">
                <FileSpreadsheet className="w-4 h-4" />
                Download Excel
              </button>
              <button onClick={handleDownloadPDF} disabled={isExportingPdf} className="flex items-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50">
                <FileText className="w-4 h-4" />
                {isExportingPdf ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200">
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-900 tracking-wider uppercase">Bill ID</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-900 tracking-wider uppercase">Guest Name</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-900 tracking-wider uppercase">Room / Service Type</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-900 tracking-wider uppercase">Date</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-900 tracking-wider uppercase">Amount</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-900 tracking-wider uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-900">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-teal-700" />
                        <span className="font-semibold text-sm">Loading database records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredReports.length > 0 ? (
                  filteredReports.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 tabular-nums">{row.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{row.customer}</td>
                      <td className="px-6 py-4">
                        <div className="block text-xs text-slate-800 space-y-1">
                          {(row.roomItems || []).length > 0 ? (
                            row.roomItems.map((item, index) => (
                              <div
                                key={`${item.roomNumber || "room"}-${index}`}
                                className="font-bold text-slate-900"
                              >
                                {item.description}
                              </div>
                            ))
                          ) : (
                            <div className="font-bold text-slate-900">
                              {row.type || "Room Stay"}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900 tabular-nums">{row.date}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 tabular-nums">₹ {Number(row.amount).toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide border ${
                          String(row.status).toUpperCase() === "PAID" ? "bg-emerald-500 text-white border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>{row.status}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-900">
                      <span className="font-bold text-sm">No report records found in database for the selected filter.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* HIDDEN PRINT / PDF CONTAINER */}
        <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
          <div ref={pdfRef} className="pdf-export-container">
            <div className="pdf-header">
              <div className="pdf-title">
                <h1>SS Residency - Financial & Revenue Report</h1>
              </div>
              <div className="pdf-meta">
                <p><strong>Generated On:</strong> {new Date().toLocaleDateString("en-IN")}</p>
                <p>SS Residency Hotel Management System</p>
              </div>
            </div>

            <div className="pdf-summary-grid">
              <div className="pdf-summary-card">
                <span>Total Bills</span>
                <h3>{totalTransactions} Records</h3>
              </div>
              <div className="pdf-summary-card">
                <span>Total Paid Revenue</span>
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
                    <td><strong>{row.id}</strong></td>
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
                    <td><strong>₹{Number(row.amount).toLocaleString("en-IN")}</strong></td>
                    <td>
                      <span className={`pdf-badge ${String(row.status).toLowerCase()}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}