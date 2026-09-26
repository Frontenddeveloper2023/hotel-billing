import React, { useState, useEffect, useRef } from "react";
import { getAllInvoices, deleteInvoice } from "../../service/invoiceApi.js";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import InvoiceTemplate from "../InvoiceTemplate/InvoiceTemplate.jsx";
import {
  computeExtraStayDetails,
  formatActualCheckOutDisplay,
  formatHumanDate,
  formatHumanTime,
  formatHumanDateTime,
  exportInvoicesToExcel,
} from "../InvoiceTemplate/stayDurationHelper.js";

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
  const itemsPerPage = 8;

  const [activeInvoice, setActiveInvoice] = useState(null);
  const [pdfInvoice, setPdfInvoice] = useState(null);
  const receiptRef = useRef();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await getAllInvoices();
      const result =
        response?.data?.success !== undefined
          ? response.data
          : response;

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
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        await deleteInvoice(id);
        setInvoices(invoices.filter((inv) => inv._id !== id));
      } catch (err) {
        alert(err.message || "Failed to delete invoice.");
      }
    }
  };

  const filteredInvoices = invoices
    .filter((inv) => {
      const query = searchQuery.trim().toLowerCase();

      if (!query) return true;

      const c = inv.customer || {};
      const rooms = Array.isArray(inv.rooms) ? inv.rooms : [];

      const values = {
        name: c.customerName,
        phone: c.phoneNumber,
        email: c.email,
        room: rooms.map((room) => room.roomNumber).filter(Boolean).join(" "),
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

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return (Number(a.invoiceYear || 0) - Number(b.invoiceYear || 0)) ||
          (Number(a.invoiceSequence || 0) - Number(b.invoiceSequence || 0));
      case "customerAsc":
        return String(a.customer?.customerName || "").localeCompare(String(b.customer?.customerName || ""));
      case "customerDesc":
        return String(b.customer?.customerName || "").localeCompare(String(a.customer?.customerName || ""));
      case "totalHigh":
        return Number(b.financials?.grandTotal || 0) - Number(a.financials?.grandTotal || 0);
      case "totalLow":
        return Number(a.financials?.grandTotal || 0) - Number(b.financials?.grandTotal || 0);
      case "newest":
      default:
        return (Number(b.invoiceYear || 0) - Number(a.invoiceYear || 0)) ||
          (Number(b.invoiceSequence || 0) - Number(a.invoiceSequence || 0)) ||
          String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    }
  });

  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentInvoices = sortedInvoices.slice(startIndex, startIndex + itemsPerPage);

  // ============================================================
  // FORMAT HELPERS (same behavior as InvoiceTemplate.jsx)
  // ============================================================

  const formatDate = (value) => formatHumanDate(value);
  const formatTime = (value) => formatHumanTime(value);

  const handleDownloadPDF = async (invoice) => {
    setPdfInvoice(invoice);
    setTimeout(async () => {
      const input = receiptRef.current;
      if (!input) return;
      try {
        const canvas = await html2canvas(input, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/png");
        const pdfWidth = 80;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [pdfWidth, pdfHeight] });
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Invoice_${invoice.invoiceNo}.pdf`);
      } catch (err) {
        console.error("PDF generation failed", err);
      } finally {
        setPdfInvoice(null);
      }
    }, 150);
  };

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


const [downloadingId, setDownloadingId] = useState(null);

const handleDownloadClick = async (inv) => {
  try {
    setDownloadingId(inv._id);
    await handleDownloadPDF(inv); // Your existing PDF generation function
  } finally {
    setDownloadingId(null); // Reset state when done
  }
};


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-white">
        <div className="flex items-center gap-2 text-sm font-medium text-black">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
          Loading invoices...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center bg-white min-h-[60vh] flex items-center justify-center">
        <span className="text-red-700 font-semibold text-sm sm:text-base">Error: {error}</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl w-full mx-auto bg-white min-h-screen font-['Inter'] space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 sm:gap-4">
        <h1 className=" font-bold text-2xl tracking-tight text-black ">
          Hotel Invoice Management
        </h1>
        <button
          onClick={handleDownloadExcel}
          className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white px-4 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition shadow-sm w-full md:w-auto"
        >
          Export Excel / CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-300 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div>
          <label className="block text-[11px] sm:text-xs font-bold text-black uppercase mb-1.5">
            Search Field
          </label>
          <select
            value={searchField}
            onChange={(e) => { setSearchField(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white cursor-pointer"
          >
            <option value="all">All Fields</option>
            <option value="name">Customer Name</option>
            <option value="phone">Phone Number</option>
            <option value="email">Email</option>
            <option value="room">Room Number</option>
            <option value="invoice">Invoice Number</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] sm:text-xs font-bold text-black uppercase mb-1.5">
            Search
          </label>
          <input
            type="text"
            placeholder="Name, phone, email, room, invoice..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[11px] sm:text-xs font-bold text-black uppercase mb-1.5">
            Sort Invoices
          </label>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white cursor-pointer"
          >
            <option value="newest">Newest Invoice</option>
            <option value="oldest">Oldest Invoice</option>
            <option value="customerAsc">Customer A → Z</option>
            <option value="customerDesc">Customer Z → A</option>
            <option value="totalHigh">Grand Total High → Low</option>
            <option value="totalLow">Grand Total Low → High</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] sm:text-xs font-bold text-black uppercase mb-1.5">
            Filter by Date
          </label>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              setFilterMonth("");
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white cursor-pointer"
          />

          {(filterDate || filterMonth) && (
            <button
              type="button"
              onClick={() => {
                setFilterDate("");
                setFilterMonth("");
                setCurrentPage(1);
              }}
              className="mt-2 text-[11px] sm:text-xs text-red-600 hover:text-red-700 font-bold"
            >
              Clear Date / Month Filter
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-gray-100 text-black text-[10px] sm:text-[11px] uppercase font-bold border-b border-gray-300">
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
            <tbody className="divide-y divide-gray-200 text-xs sm:text-sm text-black">
              {currentInvoices.length > 0 ? (
                currentInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-gray-50 transition">
                    <td className="p-3 sm:p-4 font-bold text-indigo-700 whitespace-nowrap">
                      {inv.invoiceNo}
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">{formatDate(inv.invoiceDate || inv.createdAt)}</td>
                    <td className="p-3 sm:p-4 font-medium whitespace-nowrap">
                      {inv.customer?.customerName}
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">{inv.customer?.phoneNumber}</td>
                    <td className="p-3 sm:p-4">
                      {Array.isArray(inv.rooms) && inv.rooms.length > 0 ? (
                        <div className="space-y-1">
                          {inv.rooms.map((room, index) => (
                            <div key={room._id || index} className="whitespace-nowrap">
                              <span className="font-semibold">Room {room.roomNumber || "-"}</span>
                              <span className="text-gray-600"> ({room.roomType || "-"})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      {(() => {
                        const extraStay = computeExtraStayDetails(inv.staySummary, inv.extraCharges);
                        if (!extraStay.hasExtraStay) {
                          return <span className="text-gray-400 text-xs">-</span>;
                        }
                        return (
                          <div className="flex flex-col text-xs leading-tight">
                            {extraStay.extraFullDays > 0 && (
                              <span className="font-bold text-amber-700">
                                {extraStay.extraFullDays} {extraStay.extraFullDays === 1 ? "day" : "days"} extra
                              </span>
                            )}
                            {(extraStay.extraHours > 0 || extraStay.extraMinutes > 0) && (
                              <span className="font-semibold text-teal-700">
                                {extraStay.extraHours}h {extraStay.extraMinutes}m extra
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-3 sm:p-4 font-bold whitespace-nowrap">
                      ₹{inv.financials?.grandTotal?.toLocaleString()}
                    </td>
                    <td className="p-3 sm:p-4">
                      <span className="px-2.5 py-1 text-[11px] sm:text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold whitespace-nowrap">
                        {inv.paymentInfo?.paymentStatus || "PAID"}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() => setActiveInvoice(inv)}
                          className="bg-blue-600 text-white px-2.5 sm:px-3 py-1.5 sm:py-1 rounded text-[11px] sm:text-xs font-semibold hover:bg-blue-700 transition"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDownloadClick(inv)}
                          disabled={downloadingId === (inv._id || inv.id)}
                          className="bg-indigo-600 text-white px-2.5 sm:px-3 py-1.5 sm:py-1 rounded text-[11px] sm:text-xs font-semibold hover:bg-indigo-700 active:scale-95 transition-all duration-150 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          {downloadingId === (inv._id || inv.id) ? (
    <>
      {/* Loading Spinner */}
      <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Downloading...</span>
    </>
  ) : (
    "PDF"
  )}
</button>
                        <button
                          onClick={() => handleDelete(inv._id)}
                          className="bg-red-600 text-white px-2.5 sm:px-3 py-1.5 sm:py-1 rounded text-[11px] sm:text-xs font-semibold hover:bg-red-700 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-black font-medium">
                    No matching invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 bg-white gap-3">
          <span className="text-xs sm:text-sm text-black font-medium text-center sm:text-left">
            Showing {filteredInvoices.length > 0 ? startIndex + 1 : 0} to{" "}
            {Math.min(startIndex + itemsPerPage, filteredInvoices.length)} of {sortedInvoices.length} invoices
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm font-semibold text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-xs sm:text-sm font-bold text-black whitespace-nowrap">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm font-semibold text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

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