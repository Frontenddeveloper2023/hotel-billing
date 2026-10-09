import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Building2, Search, RefreshCw, CheckCircle2, XCircle, Clock3, MapPin, Mail, Phone, Eye, X,
  AlertCircle, Users, CalendarDays, CreditCard, ShieldCheck, Ban, FileCheck2,
  ChevronLeft, ChevronRight, Activity, ArrowRight,
} from "lucide-react";

import { getAllHotels } from "../../service/hotelApi";
import { getAllRegistrations, approveRegistration, rejectRegistration } from "../../service/hotelRegistrationApi";
import { useToast } from "../../Context/ToastContext";


import {
  sendAdminEmail,
  getEmailHistory,
} from "../../service/emailApi";


/* =========================================================
   HELPERS
========================================================= */

const getArrayFromResponse = (response, type) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (type === "hotels") return response?.data?.hotels || response?.hotels || [];
  if (type === "registrations") return response?.data?.registrations || response?.registrations || [];
  return [];
};

const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount || 0));

const formatStatus = (status) => {
  if (!status) return "Unknown";
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatPaymentStatus = (status) => {
  const labels = {
    paid: "Paid", partially_paid: "Partially Paid", pending: "Payment Pending",
    payment_pending: "Payment Pending", payment_failed: "Payment Failed",
    payment_reversed: "Payment Reversed", reversed: "Payment Reversed",
    failed: "Payment Failed", unpaid: "Payment Pending",
  };
  return labels[status] || formatStatus(status);
};

const formatApplicationStatus = (status) => {
  const labels = { pending: "Pending Review", approved: "Approved", rejected: "Rejected" };
  return labels[status] || "Unknown";
};

const getStatusClass = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "active": case "approved": case "paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pending": case "trial": case "expiring_soon": case "partially_paid":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "rejected": case "expired": case "cancelled": case "payment_failed":
    case "failed": case "payment_reversed": case "reversed":
      return "bg-red-50 text-red-700 border-red-200";
    case "suspended":
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

const rejectionReasons = [
  { value: "", label: "Select a reason..." },
  { value: "payment_reversed", label: "Payment reversed" },
  { value: "payment_pending", label: "Payment pending" },
  { value: "duplicate_registration", label: "Duplicate hotel registration" },
  { value: "other", label: "Other reason" },
];

/* =========================================================
   SHARED UI
========================================================= */

const styles = `
@keyframes sh-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes sh-fade{from{opacity:0}to{opacity:1}}
@keyframes sh-pop{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:none}}
@keyframes sh-row{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
.sh-in{opacity:0;animation:sh-up .5s cubic-bezier(.2,.7,.2,1) forwards}
.sh-row{opacity:0;animation:sh-row .4s ease-out forwards}
.sh-fade{animation:sh-fade .2s ease-out}
.sh-pop{animation:sh-pop .28s cubic-bezier(.2,.8,.2,1)}
.sh-scroll{scrollbar-width:thin;scrollbar-color:#9db8e6 transparent;scroll-behavior:smooth}
.sh-scroll::-webkit-scrollbar{height:7px}
.sh-scroll::-webkit-scrollbar-thumb{background:#9db8e6;border-radius:9px}
@media (prefers-reduced-motion:reduce){.sh-in,.sh-row{animation:none;opacity:1}.sh-pop,.sh-fade{animation:none}.sh-scroll{scroll-behavior:auto}}
`;

const delay = (i, step = 60) => ({ animationDelay: `${Math.min(i, 12) * step}ms` });
const card = "rounded-3xl bg-white shadow-[0_18px_45px_rgba(6,20,52,0.28)]";
const inputCls = "w-full border border-[#dbe6f5] rounded-xl text-sm outline-none bg-[#f6f9fe] focus:bg-white focus:ring-2 focus:ring-[#3b82f0]/25 focus:border-[#3b82f0] transition";
const btnGhost = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#dbe6f5] bg-white text-[#0e2a4a] hover:bg-[#eaf3ff] hover:border-[#a8cbff] text-xs font-semibold transition active:scale-95";
const btnGreen = "bg-emerald-600 hover:bg-emerald-700 text-white";
const btnRed = "bg-red-600 hover:bg-red-700 text-white";

const Badge = memo(({ status, label, children }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap ${getStatusClass(status)}`}>
    {children}
    {label}
  </span>
));

const StatusIcon = ({ status }) =>
  status === "approved" || status === "active" ? <CheckCircle2 size={12} />
  : status === "rejected" ? <XCircle size={12} />
  : status === "pending" ? <Clock3 size={12} /> : null;

const Avatar = ({ name }) => (
  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-md shadow-blue-500/25">
    {(name || "H").trim().charAt(0).toUpperCase()}
  </div>
);

const Th = ({ children, right }) => (
  <th className={`px-3 py-1 text-[11px] font-bold text-[#5b7089] uppercase tracking-[0.1em] whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
    {children}
  </th>
);

const Info = ({ label, icon: Icon, children, mono }) => (
  <div className="p-4 bg-[#f4f8fd] rounded-2xl">
    <div className="flex items-center gap-2">
      {Icon && <Icon size={15} className="text-[#6b7f99]" />}
      <p className="text-xs text-[#6b7f99]">{label}</p>
    </div>
    <p className={`mt-1 font-semibold text-[#0e2a4a] break-all ${mono ? "text-xs" : "text-sm"}`}>{children}</p>
  </div>
);

const Skeleton = () => (
  <div className="p-5 space-y-3">
    {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />)}
  </div>
);

const Empty = ({ icon: Icon, title, text }) => (
  <div className="p-12 text-center">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-[#eaf3ff] text-[#2568e0] flex items-center justify-center"><Icon size={26} /></div>
    <h3 className="mt-3 font-bold text-[#0e2a4a]">{title}</h3>
    <p className="text-sm text-[#6b7f99] mt-1">{text}</p>
  </div>
);

/* Horizontally scrollable table with click-and-drag (grab-to-scroll) */
const TableScroller = ({ minWidth, children }) => {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ left: true, right: false });
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollStartLeft = useRef(0);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({
      left: el.scrollLeft <= 6,
      right: el.scrollLeft + el.clientWidth >= el.scrollWidth - 6,
    });
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update, children]);

  const handleMouseDown = (e) => {
    // Only drag on primary left click and not on interactive buttons/links/inputs
    if (e.button !== 0) return;
    if (e.target.closest("button, a, input, select, textarea")) return;
    isDragging.current = true;
    startX.current = e.pageX - ref.current.offsetLeft;
    scrollStartLeft.current = ref.current.scrollLeft;
    setIsGrabbing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    ref.current.scrollLeft = scrollStartLeft.current - walk;
    update();
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
    setIsGrabbing(false);
  };

  const scrollBy = (dir) => {
    ref.current?.scrollBy({ left: dir * 350, behavior: "smooth" });
  };

  return (
    <div className="relative select-none">
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-[#f4f8fd] border-b border-[#e7eff8]">
       
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Scroll table left"
            onClick={() => scrollBy(-1)}
            disabled={edge.left}
            className="h-8 w-8 rounded-xl bg-white border border-[#dbe6f5] text-[#2568e0] flex items-center justify-center hover:bg-[#2568e0] hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-[#2568e0] disabled:cursor-not-allowed transition shadow-sm"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Scroll table right"
            onClick={() => scrollBy(1)}
            disabled={edge.right}
            className="h-8 w-8 rounded-xl bg-white border border-[#dbe6f5] text-[#2568e0] flex items-center justify-center hover:bg-[#2568e0] hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-[#2568e0] disabled:cursor-not-allowed transition shadow-sm"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={ref}
        onScroll={update}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={`sh-scroll overflow-x-auto ${isGrabbing ? "cursor-grabbing select-none" : "cursor-grab"}`}
      >
        <table className="w-full" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

const SaaSAdminHotels = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const registrationIdFromUrl = searchParams.get("registrationId");

  const [hotels, setHotels] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(tabFromUrl === "hotels" ? "hotels" : "applications");

  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab === "hotels" || currentTab === "applications") setActiveTab(currentTab);
  }, [searchParams]);

  const [search, setSearch] = useState("");
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionDetails, setRejectionDetails] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();
  const [successMessage, setSuccessMessage] = useState("");


  const [showEmailModal, setShowEmailModal] = useState(false);
const [showEmailHistoryModal, setShowEmailHistoryModal] = useState(false);

const [emailLoading, setEmailLoading] = useState(false);
const [emailHistoryLoading, setEmailHistoryLoading] = useState(false);

const [emailHistory, setEmailHistory] = useState([]);

const [emailForm, setEmailForm] = useState({
  recipientEmail: "",
  recipientName: "",
  subject: "",
  message: "",
});


  /* FETCH DATA */
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const results = await Promise.allSettled([getAllHotels(), getAllRegistrations()]);
      const hotelsResult = results[0];
      const registrationsResult = results[1];

      const hotels = hotelsResult.status === "fulfilled" ? getArrayFromResponse(hotelsResult.value, "hotels") : [];
      const registrations = registrationsResult.status === "fulfilled" ? getArrayFromResponse(registrationsResult.value, "registrations") : [];

      const failed = [];
      if (hotelsResult.status === "rejected") failed.push("Hotels");
      if (registrationsResult.status === "rejected") failed.push("Applications");

      if (failed.length > 0) {
        setError(`${failed.join(" and ")} data could not be loaded. Please check your permissions and backend APIs.`);
      }

      setHotels(hotels);
      setRegistrations(registrations);
    } catch (err) {
      console.error("SaaS Admin Hotels error:", err);
      setError(err?.message || "Unable to load hotel data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  /* COUNTS */
  const pendingCount = registrations.filter((i) => i.status === "pending").length;
  const rejectedCount = registrations.filter((i) => i.status === "rejected").length;
  const activeHotelCount = hotels.filter((h) => h.status === "active").length;

  const totalOverview = activeHotelCount + pendingCount + rejectedCount;
  const overviewDenom = totalOverview > 0 ? totalOverview : 1;
  const activePercent = totalOverview > 0 ? Math.round((activeHotelCount / overviewDenom) * 100) : 0;
  const pendingPercent = totalOverview > 0 ? Math.round((pendingCount / overviewDenom) * 100) : 0;
  const rejectedPercent = totalOverview > 0 ? Math.round((rejectedCount / overviewDenom) * 100) : 0;

  const donutGradient = totalOverview === 0
    ? "#E2E8F0 0% 100%"
    : `conic-gradient(#10B981 0% ${activePercent}%, #F59E0B ${activePercent}% ${activePercent + pendingPercent}%, #EF4444 ${activePercent + pendingPercent}% 100%)`;

  /* RECENT ACTIVITIES (Last 5 events) */
  const recentActivities = useMemo(() => {
    const list = registrations.map((r) => ({
      _id: r._id,
      hotelName: r.hotelName || "Unnamed Hotel",
      ownerName: r.ownerName,
      status: r.status,
      actionText:
        r.status === "approved"
          ? "Approved by Admin"
          : r.status === "rejected"
          ? "Rejected"
          : "Pending Approval",
      date: r.updatedAt || r.createdAt,
      raw: r,
    }));

    return list
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5);
  }, [registrations]);

  /* FILTERS */
  const matches = (item, query) =>
    item.hotelName?.toLowerCase().includes(query) ||
    item.ownerName?.toLowerCase().includes(query) ||
    item.email?.toLowerCase().includes(query) ||
    item.phone?.toLowerCase().includes(query) ||
    item.status?.toLowerCase().includes(query);

  const filteredRegistrations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return registrations;
    return registrations.filter((item) => matches(item, query));
  }, [registrations, search]);

  const filteredHotels = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return hotels;
    return hotels.filter((hotel) => matches(hotel, query));
  }, [hotels, search]);

  /* VIEW */
  const handleViewRegistration = (registration) => {
    setSelectedRegistration(registration);
    setSelectedHotel(null);
    setShowDetailsModal(true);
    
  };

  const handleViewHotel = (hotel) => {
    setSelectedHotel(hotel);
    setSelectedRegistration(null);
    setShowDetailsModal(true);
    
  };

  const openedRegistrationId = useRef(null);

  useEffect(() => {
    if (registrationIdFromUrl && openedRegistrationId.current !== registrationIdFromUrl) {
      if (registrations.length > 0) {
        const regMatch = registrations.find(r => r._id === registrationIdFromUrl);
        if (regMatch) {
          openedRegistrationId.current = registrationIdFromUrl;
          handleViewRegistration(regMatch);
          return;
        }
      }
      if (hotels.length > 0) {
        const hotelMatch = hotels.find(h => h.registrationId === registrationIdFromUrl || h._id === registrationIdFromUrl);
        if (hotelMatch) {
          openedRegistrationId.current = registrationIdFromUrl;
          handleViewHotel(hotelMatch);
        }
      }
    } else if (!registrationIdFromUrl) {
      openedRegistrationId.current = null;
    }
  }, [hotels, registrations, registrationIdFromUrl]);

  /* APPROVE */
  const handleApprove = async (registration) => {
    if (!registration?._id) {
      toast.error("Application ID is missing.");
      return;
    }

    toast.confirm(
      `Are you sure you want to approve "${registration.hotelName}"?`,
      async () => {
        try {
          setActionLoading(true);
          setSuccessMessage("");

          const response = await approveRegistration(registration._id);
          if (!response?.success) {
            throw new Error(response?.message || "Application approval failed.");
          }

          setRegistrations((prev) =>
            prev.map((item) =>
              String(item._id) === String(registration._id)
                ? { ...item, status: "approved", paymentStatus: "paid" }
                : item
            )
          );

          // Refresh data in background to get new active hotel
          fetchData(true);

          setSuccessMessage(`${registration.hotelName} has been approved successfully.`);
          setShowDetailsModal(false);
          setSelectedRegistration(null);
        } catch (err) {
          console.error("Approve application error:", err);
          toast.error(err?.message || err?.data?.message || "Unable to approve this application.");
        } finally {
          setActionLoading(false);
        }
      },
      {
        title: "Approve Hotel Application",
        confirmText: "Approve",
        cancelText: "Cancel",
        variant: "success",
      }
    );
  };

  /* REJECT */
  const handleOpenReject = (registration) => {
    setSelectedRegistration(registration);
    setRejectionReason("");
    setRejectionDetails("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    const reason = rejectionReason.trim();
    const details = rejectionDetails.trim();

    if (!reason && !details) {
      toast.error("Please select a rejection reason or provide additional details.");
      return;
    }

    if (details.length > 0 && details.length < 5) {
      toast.error("Please provide at least 5 characters for additional details.");
      return;
    }

    if (!selectedRegistration?._id) {
      toast.error("Application information is missing.");
      return;
    }

    try {
      setActionLoading(true);
      setSuccessMessage("");

      await rejectRegistration(selectedRegistration._id, reason, details);

      setRegistrations((prev) =>
        prev.map((item) =>
          String(item._id) === String(selectedRegistration._id)
            ? { ...item, status: "rejected", rejectionReason: reason, rejectionDetails: details }
            : item
        )
      );

      setSuccessMessage(`${selectedRegistration.hotelName} has been rejected.`);
      setShowRejectModal(false);
      setShowDetailsModal(false);
      setSelectedRegistration(null);
      setRejectionReason("");
      setRejectionDetails("");
    } catch (err) {
      console.error("Reject application error:", err);
      toast.error(err?.message || err?.data?.message || "Unable to reject this application.");
    } finally {
      setActionLoading(false);
    }
  };

  const getAddress = (address) => {
    if (!address) return "Address not provided";
    return [address.street, address.city, address.state, address.country, address.pincode].filter(Boolean).join(", ");
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedRegistration(null);
    setSelectedHotel(null);
    

    if (registrationIdFromUrl) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("registrationId");
      setSearchParams(newParams);
    }
  };


  const openEmailModal = (user) => {
  if (!user?.email) {
    toast.error("This user does not have an email address.");
    return;
  }

  setEmailForm({
    recipientEmail: user.email || "",
    recipientName:
      user.ownerName ||
      user.hotelName ||
      "Hotel Owner",
    subject: "",
    message: "",
  });

  setShowEmailModal(true);
  
};

const handleSendEmail = async () => {
  if (!selectedRegistration && !selectedHotel) return;

  const selectedUser =
    selectedRegistration || selectedHotel;

  if (!emailForm.recipientEmail.trim()) {
    toast.error("Recipient email is required.");
    return;
  }

  if (!emailForm.subject.trim()) {
    toast.error("Email subject is required.");
    return;
  }

  if (!emailForm.message.trim()) {
    toast.error("Email message is required.");
    return;
  }

  try {
    setEmailLoading(true);
    

    const response = await sendAdminEmail({
      hotelId:
        selectedUser.hotelId?._id ||
        selectedUser.hotelId ||
        selectedUser._id,

      subHotelId:
        selectedUser.subHotelId?._id ||
        selectedUser.subHotelId ||
        null,

      recipientEmail:
        emailForm.recipientEmail.trim(),

      recipientName:
        emailForm.recipientName.trim(),

      subject:
        emailForm.subject.trim(),

      message:
        emailForm.message.trim(),

      registrationId:
        selectedRegistration?._id || null,

      subscriptionId: null,
    });

    if (!response?.success) {
      throw new Error(
        response?.message ||
          "Failed to send email."
      );
    }

    setShowEmailModal(false);

    setEmailForm({
      recipientEmail: "",
      recipientName: "",
      subject: "",
      message: "",
    });

    setSuccessMessage(
      "Email sent successfully."
    );
  } catch (error) {
    console.error(
      "Send admin email error:",
      error
    );

    toast.error(
      error?.message ||
        "Unable to send email."
    );
  } finally {
    setEmailLoading(false);
  }
};

const handleViewEmailHistory = async () => {
  const selectedUser =
    selectedRegistration || selectedHotel;

  if (!selectedUser) return;

  try {
    setEmailHistoryLoading(true);
    

    const hotelId =
      selectedUser.hotelId?._id ||
      selectedUser.hotelId ||
      selectedUser._id;

    const subHotelId =
      selectedUser.subHotelId?._id ||
      selectedUser.subHotelId ||
      null;

    const response =
      await getEmailHistory({
        hotelId,
        subHotelId,
      });

    if (!response?.success) {
      throw new Error(
        response?.message ||
          "Unable to load email history."
      );
    }

    setEmailHistory(
      response.data || []
    );

    setShowEmailHistoryModal(true);
  } catch (error) {
    console.error(
      "Email history error:",
      error
    );

    toast.error(
      error?.message ||
        "Unable to load email history."
    );
  } finally {
    setEmailHistoryLoading(false);
  }
};


  

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSearch("");
  };

  const tabs = [
    ["applications", "ALL", `${pendingCount} Pending`],
    ["hotels", "Approved Hotels", activeHotelCount],
  ];

  const addressBlock = (address) => (
    <div className="p-4 border border-[#e2ebf7] rounded-2xl">
      <div className="flex items-center gap-2 mb-2">
        <MapPin size={17} className="text-[#2568e0]" />
        <h3 className="text-sm font-bold text-[#0e2a4a]">Hotel Address</h3>
      </div>
      <p className="text-sm text-[#60758D]">{getAddress(address)}</p>
    </div>
  );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="min-h-full font-['Inter'] text-[#0e2a4a]">
      <style>{styles}</style>
      <div className="max-w-[1500px] mx-auto space-y-5">

        {/* HEADER */}
        <div className="sh-in flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
             
            <h1 className="mt-1.5 text-[18px] sm:text-[24px] lg:text-[28px] leading-tight font-extrabold tracking-[-0.035em] text-white">
              Hotels &amp; Applications
            </h1>
           
          </div>

       
        </div>

        {/* SUCCESS */}
        {successMessage && (
          <div className="sh-pop p-4 rounded-2xl border border-emerald-200 bg-emerald-50 flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Action completed successfully</p>
              <p className="text-sm text-emerald-700 mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="sh-pop p-4 rounded-2xl border border-red-200 bg-red-50 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Unable to load some data</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* =========================================================
            TOP SECTION: 2-COLUMN SPLIT (LIKE REFERENCE UI)
            1. Left: Hotels Status Donut & Breakdown
            2. Right: Recent Activity (Recent 5 activities)
        ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* LEFT: HOTELS STATUS (DONUT CHART) */}
          <section style={delay(1)} className={`sh-in lg:col-span-5 ${card} p-5 sm:p-6 flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-[#edf2f8] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EAF3FF] text-[#2568e0] flex items-center justify-center shrink-0">
                    <Building2 size={17} />
                  </div>
                  <h2 className="text-base font-bold text-[#0e2a4a]">Hotels Update Status</h2>
                </div>
              
              </div>

              {/* Donut Chart */}
              <div className="mt-5 flex flex-col items-center">
                <div
                  className="relative h-[135px] w-[135px] sm:h-[155px] sm:w-[155px] rounded-full transition-all duration-700 shadow-md"
                  style={{ background: donutGradient }}
                >
                  <div className="absolute inset-[13px] rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#0e2a4a] tracking-tight">
                      {loading ? "—" : totalOverview}
                    </span>
                    <span className="text-[11px] font-semibold text-[#667C92] uppercase tracking-wider">Num of Hotels</span>
                  </div>
                </div>

                {/* Legend Row */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-[#0e2a4a]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span>Active ({activeHotelCount} • {activePercent}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span>Pending ({pendingCount} • {pendingPercent}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                    <span>Rejected ({rejectedCount} • {rejectedPercent}%)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-[#F4F8FD] px-3.5 py-2.5 text-xs">
              <span className="font-medium text-[#46516B]">Approved Active Rate</span>
              <span className="font-bold text-[#087A58]">{loading ? "—" : `${activePercent}%`}</span>
            </div>
          </section>

          {/* RIGHT: RECENT ACTIVITY SECTION (LIKE "SERVICES" IN REFERENCE UI) */}
          <section style={delay(2)} className={`sh-in lg:col-span-7 ${card} p-5 sm:p-6 flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-[#edf2f8] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E1FAF0] text-[#087A58] flex items-center justify-center shrink-0">
                    <Activity size={17} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0e2a4a]">Recent Activity</h2>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#2568e0] bg-[#EAF3FF] px-2.5 py-1 rounded-full">
                  Recent 5
                </span>
              </div>

              {/* Activity List / Table */}
              <div className="mt-3 divide-y divide-[#f0f4fa]">
                {loading ? (
                  <Skeleton />
                ) : recentActivities.length === 0 ? (
                  <Empty icon={Clock3} title="No activity recorded" text="Recent hotel applications or status changes will appear here." />
                ) : (
                  recentActivities.map((act) => (
                      <div
                        key={act._id}
                        onClick={() => handleViewRegistration(act.raw)}
                        className="py-2.5 flex items-center justify-between gap-3 hover:bg-[#F8FAFD] rounded-xl px-2 transition-colors cursor-pointer"
                      >
                      <div className="min-w-0 flex items-center gap-3">
                        <Avatar name={act.hotelName} />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-[#0e2a4a] truncate">{act.hotelName}</p>
                          <p className="text-[11px] text-[#60758D] truncate">
                            {act.ownerName ? `Owner: ${act.ownerName}` : "Application record"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getStatusClass(act.status)}`}>
                          {act.actionText}
                        </span>

                        <span className="text-[11px] text-[#7890A8] hidden sm:inline">
                          {formatDate(act.date)}
                        </span>

                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

           
          </section>
        </div>

        {/* =========================================================
            BOTTOM SECTION: FULL-WIDTH TABLE ("NODE DETAILS" IN UI)
            Grab-to-scroll horizontal scroller with tabs and search
        ========================================================= */}
        <section style={delay(3)} className={`sh-in ${card} overflow-hidden`}>

          {/* TABLE HEADER & CONTROLS */}
          <div className="p-4 sm:p-5 border-b border-[#e7eff8]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

              {/* Title & Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#EAF3FF] text-[#2568e0] flex items-center justify-center shrink-0">
                    <FileCheck2 size={17} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0e2a4a]">Hotel Records</h2>
                  </div>
                </div>

                <div className="flex items-center gap-1 p-1 bg-[#eef4fc] rounded-2xl overflow-x-auto sh-scroll w-fit">
                  {tabs.map(([key, label, count]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => switchTab(key)}
                      className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap cursor-pointer ${
                        activeTab === key ? "bg-white text-[#2568e0] shadow-sm" : "text-[#5b7089] hover:text-[#0e2a4a]"
                      }`}
                    >
                      {label}
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === key ? "bg-[#dbeaff] text-[#2568e0]" : "bg-slate-200 text-slate-600"}`}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full lg:w-[320px]">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7d90a8]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={activeTab === "applications" ? "Search hotel, owner, email..." : "Search properties by name, city..."}
                  className={`${inputCls} pl-10 pr-4 py-2 text-xs sm:text-sm`}
                />
              </div>
            </div>
          </div>

          {/* APPLICATIONS QUEUE TABLE */}
          {activeTab === "applications" && (
            loading ? (
              <Skeleton />
            ) : filteredRegistrations.length === 0 ? (
              <Empty icon={FileCheck2} title="No applications found" text={search ? "Try a different search term." : "There are no hotel applications waiting to be reviewed."} />
            ) : (
              <TableScroller minWidth={1150}>
                <thead>
                  <tr className="bg-[#f4f8fd] border-b border-[#e2ebf7]">
                    <Th>Hotel / Property</Th>
                    <Th>Owner &amp; Contact</Th>
                    <Th>Subscription Plan</Th>
                    <Th>Payment Status</Th>
                    <Th>Application Status</Th>
                    <Th right>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef3fa]">
                  {filteredRegistrations.map((registration, i) => (
<tr
  key={registration._id}
  style={delay(i, 30)}
  onClick={() => handleViewRegistration(registration)}
  className="sh-row hover:bg-[#f4f9ff] transition-colors cursor-pointer"
>
  
                       <td className="px-3 py-1">
                        <div className="flex items-center gap-3">
                          <Avatar name={registration.hotelName} />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[#0e2a4a] truncate max-w-[200px]">
                              {registration.hotelName || "Unnamed Hotel"}
                            </p>
                            <p className="text-xs text-[#6b7f99] mt-0.5">Applied {formatDate(registration.createdAt)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-1">
                        <p className="text-sm font-semibold text-[#0e2a4a]">{registration.ownerName || "Owner not provided"}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Mail size={12} className="text-[#8fa2ba]" />
                          <p className="text-xs text-[#6b7f99] truncate max-w-[220px]">{registration.email || "Email not provided"}</p>
                        </div>
                        {registration.phone && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Phone size={12} className="text-[#8fa2ba]" />
                            <p className="text-xs text-[#6b7f99]">{registration.phone}</p>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-1">
                        <p className="text-sm font-semibold text-[#0e2a4a]">{registration.planId?.planName || "Subscription Plan"}</p>
                        <p className="text-xs text-[#6b7f99] mt-0.5">{formatStatus(registration.billingCycle)}</p>
                        {registration.planId?.price && (
                          <p className="text-xs font-semibold text-[#2568e0] mt-0.5">{formatCurrency(registration.planId.price)}</p>
                        )}
                      </td>

                      <td className="px-3 py-1">
                        <Badge status={registration.paymentStatus} label={formatPaymentStatus(registration.paymentStatus)}>
                          {registration.paymentStatus === "paid" && <CheckCircle2 size={12} />}
                        </Badge>
                      </td>

                      <td className="px-3 py-1">
                        <Badge status={registration.status} label={formatApplicationStatus(registration.status)}>
                          <StatusIcon status={registration.status} />
                        </Badge>
                      </td>

                     <td
  className="px-3 py-1"
  onClick={() => handleViewRegistration(registration)}
>
  <div
    className="flex justify-end items-center gap-2"
    onClick={(e) => e.stopPropagation()}
  >
    {registration.status === "pending" && registration.paymentStatus === "paid" && (
      <>
        <button
          type="button"
          onClick={() => handleApprove(registration)}
          disabled={actionLoading}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50 transition active:scale-95 cursor-pointer ${btnGreen}`}
        >
          <CheckCircle2 size={13} />
          {actionLoading ? "..." : "Approve"}
        </button>

        <button
          type="button"
          onClick={() => handleOpenReject(registration)}
          disabled={actionLoading}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50 transition active:scale-95 cursor-pointer ${btnRed}`}
        >
          <Ban size={13} />
          Reject
        </button>
      </>
    )}
  </div>
</td>
                    </tr>
                  ))}
                </tbody>
              </TableScroller>
            )
          )}

          {/* ACTIVE PROPERTIES TABLE */}
          {activeTab === "hotels" && (
            loading ? (
              <Skeleton />
            ) : filteredHotels.length === 0 ? (
              <Empty icon={Building2} title="No properties found" text={search ? "Try a different search term." : "No active hotels are registered yet."} />
            ) : (
              <TableScroller minWidth={1050}>
                <thead>
                  <tr className="bg-[#f4f8fd] border-b border-[#e2ebf7]">
                    <Th>Hotel / Property</Th>
                    <Th>Hotel Owner</Th>
                    <Th>Contact</Th>
                    <Th>Location</Th>
                    <Th>Property Status</Th>
                    <Th right>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef3fa]">
                  {filteredHotels.map((hotel, i) => (
                    <tr 
                      key={hotel._id} 
                      style={delay(i, 30)} 
                      onClick={() => handleViewHotel(hotel)}
                      className="sh-row hover:bg-[#f4f9ff] transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-1">
                        <div className="flex items-center gap-3">
                          <Avatar name={hotel.hotelName} />
                          <div>
                            <p className="font-semibold text-sm text-[#0e2a4a] truncate max-w-[200px]">
                              {hotel.hotelName || "Unnamed Hotel"}
                            </p>
                            <p className="text-xs text-[#6b7f99] mt-0.5">Added {formatDate(hotel.createdAt)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-1">
                        <p className="text-sm font-semibold text-[#0e2a4a]">{hotel.ownerName || "Owner not provided"}</p>
                      </td>

                      <td className="px-3 py-1">
                        <div className="flex items-center gap-1.5">
                          <Mail size={13} className="text-[#8fa2ba]" />
                          <p className="text-xs text-[#46607d] truncate max-w-[200px]">{hotel.email || "Email not provided"}</p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Phone size={13} className="text-[#8fa2ba]" />
                          <p className="text-xs text-[#6b7f99]">{hotel.phone || "Phone not provided"}</p>
                        </div>
                      </td>

                      <td className="px-3 py-1">
                        <div className="flex items-start gap-1.5 text-xs text-[#46607d] max-w-[240px]">
                          <MapPin size={13} className="shrink-0 text-[#8fa2ba] mt-0.5" />
                          <span className="truncate">{getAddress(hotel.address)}</span>
                        </div>
                      </td>

                      <td className="px-3 py-1">
                        <Badge status={hotel.status} label={formatStatus(hotel.status)}>
{hotel.status === "active" && (
  <CheckCircle2 size={12} />
)}                        </Badge>
                      </td>

                  <td
  className="px-3 py-1 text-right"
  onClick={(e) => e.stopPropagation()}
>
  <div className="flex justify-end items-center gap-2">
    {/* Future Cancel button will go here */}
  </div>
</td>


                    </tr>
                  ))}
                </tbody>
              </TableScroller>
            )
          )}
        </section>
      </div>

      {/* =========================================================
          VIEW DETAILS MODAL (RESPONSIVE)
      ========================================================= */}
      {showDetailsModal && (
        <div className="sh-fade fixed inset-0 z-50 bg-[#0b1d3d]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={closeDetailsModal}>
          <div className="sh-pop bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>

            <div className="sticky top-0 z-10 bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] text-white px-5 sm:px-6 py-4 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">{selectedRegistration ? "Hotel Application Details" : "Property Details"}</h2>
                <p className="text-xs text-blue-100 mt-0.5">
                  {selectedRegistration
                    ? "Review the hotel, owner, subscription, payment, and application details."
                    : "Review the property information and account details."}
                </p>
              </div>
              <button type="button" onClick={closeDetailsModal} className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0 transition cursor-pointer">
                <X size={19} />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {selectedRegistration && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3.5">
                    <Avatar name={selectedRegistration.hotelName} />
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-[#0e2a4a]">{selectedRegistration.hotelName || "Unnamed Hotel"}</h3>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        <Badge status={selectedRegistration.status} label={formatApplicationStatus(selectedRegistration.status)}>
                          <StatusIcon status={selectedRegistration.status} />
                        </Badge>
                        <Badge status={selectedRegistration.paymentStatus} label={formatPaymentStatus(selectedRegistration.paymentStatus)}>
                          <CreditCard size={12} />
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Info label="Hotel Owner">{selectedRegistration.ownerName || "Not provided"}</Info>
                    <Info label="Email Address">{selectedRegistration.email || "Not provided"}</Info>
                    <Info label="Phone Number">{selectedRegistration.phone || "Not provided"}</Info>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <button
    type="button"
    onClick={() => openEmailModal(selectedRegistration)}
    disabled={!selectedRegistration.email}
    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#2568e0] hover:bg-[#1d5bc4] text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Mail size={16} />
    Send Email
  </button>

  <button
    type="button"
    onClick={handleViewEmailHistory}
    disabled={emailHistoryLoading}
    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-[#dbe6f5] bg-white hover:bg-[#f4f8fd] text-[#0e2a4a] text-sm font-semibold transition disabled:opacity-50"
  >
    <Mail size={16} />
    {emailHistoryLoading ? "Loading..." : "View Sent Email History"}
  </button>
</div>

                  <div className="p-4 border border-[#e2ebf7] rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-[#eaf3ff] text-[#2568e0] flex items-center justify-center"><CreditCard size={15} /></div>
                      <h3 className="text-sm font-bold text-[#0e2a4a]">Subscription Plan</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        ["Plan", selectedRegistration.planId?.planName || "Not selected"],
                        ["Billing Frequency", formatStatus(selectedRegistration.billingCycle)],
                        ["Payment Status", formatPaymentStatus(selectedRegistration.paymentStatus)],
                      ].map(([l, v]) => (
                        <div key={l}>
                          <p className="text-xs text-[#6b7f99]">{l}</p>
                          <p className="mt-0.5 text-sm font-semibold text-[#0e2a4a]">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {addressBlock(selectedRegistration.address)}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Info label="Application Date" icon={CalendarDays}>{formatDate(selectedRegistration.createdAt)}</Info>
                    <Info label="Application ID" icon={FileCheck2} mono>{selectedRegistration._id}</Info>
                  </div>

                  {(selectedRegistration.rejectionReason || selectedRegistration.rejectionDetails) && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2">
                        <XCircle size={16} className="text-red-600" />
                        <p className="text-xs font-semibold text-red-700">Rejection Information</p>
                      </div>
                      {selectedRegistration.rejectionReason && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-red-400">Reason</p>
                          <p className="mt-0.5 text-sm font-semibold text-red-800">
                            {rejectionReasons.find((r) => r.value === selectedRegistration.rejectionReason)?.label || selectedRegistration.rejectionReason}
                          </p>
                        </div>
                      )}
                      {selectedRegistration.rejectionDetails && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-red-400">Additional Details</p>
                          <p className="mt-0.5 text-xs text-red-700 whitespace-pre-wrap leading-relaxed">
                            {selectedRegistration.rejectionDetails}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  

                  {selectedRegistration.status === "pending" && selectedRegistration.paymentStatus === "paid" && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(selectedRegistration)}
                        disabled={actionLoading}
                        className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition cursor-pointer ${btnGreen}`}
                      >
                        <CheckCircle2 size={16} />
                        {actionLoading ? "Processing..." : "Approve Application"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenReject(selectedRegistration)}
                        disabled={actionLoading}
                        className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition cursor-pointer ${btnRed}`}
                      >
                        <Ban size={16} /> Reject Application
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedHotel && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3.5">
                    <Avatar name={selectedHotel.hotelName} />
                    <div>
                      <h3 className="text-xl font-bold text-[#0e2a4a]">{selectedHotel.hotelName || "Unnamed Hotel"}</h3>
                      <div className="mt-1.5">
                        <Badge status={selectedHotel.status} label={formatStatus(selectedHotel.status)}>
                          {hotel.status === "active" && <CheckCircle2 size={12} />}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Info label="Hotel Owner" icon={Users}>{selectedHotel.ownerName || "Not provided"}</Info>
                    <Info label="Email Address" icon={Mail}>{selectedHotel.email || "Not provided"}</Info>
                    <Info label="Phone Number" icon={Phone}>{selectedHotel.phone || "Not provided"}</Info>
                  </div>


                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <button
    type="button"
    onClick={() => openEmailModal(selectedHotel)}
    disabled={!selectedHotel.email}
    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#2568e0] hover:bg-[#1d5bc4] text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Mail size={16} />
    Send Email
  </button>

  <button
    type="button"
    onClick={handleViewEmailHistory}
    disabled={emailHistoryLoading}
    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-[#dbe6f5] bg-white hover:bg-[#f4f8fd] text-[#0e2a4a] text-sm font-semibold transition disabled:opacity-50"
  >
    <Mail size={16} />
    {emailHistoryLoading ? "Loading..." : "View Sent Email History"}
  </button>
</div>

                  {addressBlock(selectedHotel.address)}

                  <Info label="Property ID" mono>{selectedHotel._id}</Info>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* =========================================================
    SEND EMAIL MODAL
========================================================= */}
{showEmailModal && (
  <div
    className="sh-fade fixed inset-0 z-[70] bg-[#0b1d3d]/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    onClick={() => {
      if (!emailLoading) {
        setShowEmailModal(false);
        
      }
    }}
  >
    <div
      className="sh-pop bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] text-white px-5 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Mail size={20} />
          </div>

          <div>
            <h2 className="text-lg font-bold">
              Send Email
            </h2>

            <p className="text-xs text-blue-100 mt-0.5">
              Send a professional message to this hotel user.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!emailLoading) {
              setShowEmailModal(false);
              
            }
          }}
          disabled={emailLoading}
          className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition disabled:opacity-50"
        >
          <X size={19} />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6 space-y-5">

        {/* Recipient */}
        <div className="p-4 rounded-2xl bg-[#f4f8fd] border border-[#e2ebf7]">
          <div className="flex items-center gap-3">
            <Avatar name={emailForm.recipientName} />

            <div className="min-w-0">
              <p className="text-xs text-[#6b7f99]">
                Sending to
              </p>

              <p className="text-sm font-bold text-[#0e2a4a] truncate">
                {emailForm.recipientName || "Hotel User"}
              </p>

              <p className="text-xs text-[#60758D] truncate">
                {emailForm.recipientEmail}
              </p>
            </div>
          </div>
        </div>

        {/* Recipient Name */}
        <div>
          <label className="block text-xs font-bold text-[#5b7089] uppercase tracking-wide mb-2">
            Recipient Name
          </label>

          <input
            type="text"
            value={emailForm.recipientName}
            onChange={(e) =>
              setEmailForm((prev) => ({
                ...prev,
                recipientName: e.target.value,
              }))
            }
            placeholder="Enter recipient name"
            className={`${inputCls} px-3 py-2.5`}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-[#5b7089] uppercase tracking-wide mb-2">
            Email Address
          </label>

          <input
            type="email"
            value={emailForm.recipientEmail}
            onChange={(e) =>
              setEmailForm((prev) => ({
                ...prev,
                recipientEmail: e.target.value,
              }))
            }
            placeholder="example@gmail.com"
            className={`${inputCls} px-3 py-2.5`}
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-bold text-[#5b7089] uppercase tracking-wide mb-2">
            Subject
          </label>

          <input
            type="text"
            value={emailForm.subject}
            onChange={(e) =>
              setEmailForm((prev) => ({
                ...prev,
                subject: e.target.value,
              }))
            }
            placeholder="Enter email subject"
            maxLength={200}
            className={`${inputCls} px-3 py-2.5`}
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-bold text-[#5b7089] uppercase tracking-wide mb-2">
            Message
          </label>

          <textarea
            value={emailForm.message}
            onChange={(e) =>
              setEmailForm((prev) => ({
                ...prev,
                message: e.target.value,
              }))
            }
            rows={8}
            maxLength={10000}
            placeholder="Write your message..."
            className={`${inputCls} px-3 py-3 resize-none`}
          />

          <div className="mt-1 flex justify-end">
            <span className="text-[11px] text-[#8fa2ba]">
              {emailForm.message.length}/10000
            </span>
          </div>
        </div>

        

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              setShowEmailModal(false);
              
            }}
            disabled={emailLoading}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSendEmail}
            disabled={
              emailLoading ||
              !emailForm.recipientEmail.trim() ||
              !emailForm.subject.trim() ||
              !emailForm.message.trim()
            }
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2568e0] hover:bg-[#1d5bc4] text-white text-sm font-semibold transition disabled:opacity-50"
          >
            <Mail size={16} />

            {emailLoading
              ? "Sending..."
              : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}


{/* =========================================================
    EMAIL HISTORY MODAL
========================================================= */}
{showEmailHistoryModal && (
  <div
    className="sh-fade fixed inset-0 z-[75] bg-[#0b1d3d]/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    onClick={() => setShowEmailHistoryModal(false)}
  >
    <div
      className="sh-pop bg-white w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Mail size={20} />
          </div>

          <div>
            <h2 className="text-lg font-bold">
              Sent Email History
            </h2>

            <p className="text-xs text-blue-100 mt-0.5">
              Previous emails sent to this user.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowEmailHistoryModal(false)}
          className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
        >
          <X size={19} />
        </button>
      </div>

      {/* History */}
      <div className="overflow-y-auto p-5 sm:p-6">
        {emailHistory.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#eaf3ff] text-[#2568e0] flex items-center justify-center">
              <Mail size={25} />
            </div>

            <h3 className="mt-3 text-sm font-bold text-[#0e2a4a]">
              No emails sent yet
            </h3>

            <p className="mt-1 text-xs text-[#6b7f99]">
              Sent emails will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {emailHistory.map((email) => (
              <div
                key={email._id}
                className="p-4 rounded-2xl border border-[#e2ebf7] bg-[#f9fbfe]"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0e2a4a] break-words">
                      {email.subject}
                    </p>

                    <p className="text-xs text-[#6b7f99] mt-1">
                      To: {email.recipientEmail}
                    </p>

                    {email.sentBy && (
                      <p className="text-xs text-[#8fa2ba] mt-0.5">
                        Sent by:{" "}
                        {email.sentBy.name ||
                          email.sentBy.email ||
                          "Admin"}
                      </p>
                    )}
                  </div>

                  <span
                    className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
                      email.status === "sent"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {email.status === "sent"
                      ? "Sent"
                      : "Failed"}
                  </span>
                </div>

                <div className="mt-3 p-3 rounded-xl bg-white border border-[#e8eef6]">
                  <p className="text-sm text-[#46516B] whitespace-pre-wrap break-words">
                    {email.message}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[#8fa2ba]">
                    {email.sentAt
                      ? new Date(email.sentAt).toLocaleString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "Date unavailable"}
                  </span>

                  {email.errorMessage && (
                    <span className="text-[11px] text-red-600">
                      {email.errorMessage}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
)}

      {/* =========================================================
          REJECT MODAL (RESPONSIVE)
      ========================================================= */}
      {showRejectModal && (
        <div className="sh-fade fixed inset-0 z-[60] bg-[#0b1d3d]/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="sh-pop bg-white w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">

            <div className="px-5 py-4 border-b border-[#e7eff8] flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0"><Ban size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold text-[#0e2a4a]">Reject Application</h2>
                  <p className="text-xs text-[#6b7f99] mt-1">Please provide a clear reason for rejecting this hotel application.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowRejectModal(false);  }}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

          <div className="p-5">

  {/* HOTEL APPLICATION */}
  <div className="mb-4 rounded-2xl bg-[#f4f8fd] p-3.5">
    <p className="text-xs text-[#6b7f99]">
      Hotel Application
    </p>

    <p className="mt-0.5 text-sm font-semibold text-[#0e2a4a]">
      {selectedRegistration?.hotelName || "Selected Hotel"}
    </p>

    {selectedRegistration?.ownerName && (
      <p className="mt-0.5 text-xs text-[#6b7f99]">
        Owner: {selectedRegistration.ownerName}
      </p>
    )}
  </div>


  {/* REJECTION REASON */}
  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#5b7089]">
    Reason for Rejection
  </label>

  <select
    value={rejectionReason}
    onChange={(e) => setRejectionReason(e.target.value)}
    className={`${inputCls} cursor-pointer px-3 py-2.5`}
  >
    {rejectionReasons.map((reason) => (
      <option
        key={reason.value}
        value={reason.value}
      >
        {reason.label}
      </option>
    ))}
  </select>


  {/* ADDITIONAL DETAILS */}
  <label className="mt-4 mb-2 block text-xs font-bold uppercase tracking-wide text-[#5b7089]">
    Additional Details
  </label>

  <textarea
    value={rejectionDetails}
    onChange={(e) => setRejectionDetails(e.target.value)}
    rows={3}
    placeholder="Explain why this application cannot be approved..."
    className={`${inputCls} resize-none px-3 py-2.5`}
  />

  <p className="mt-1 text-xs text-[#8fa2ba]">
    {rejectionReason
      ? "Additional context or notes for the applicant (optional)."
      : "Please select a reason or provide at least 5 characters."}
  </p>


  {/* ACTION BUTTONS */}
  <div className="mt-5 flex gap-3">

    {/* CANCEL */}
    <button
      type="button"
      onClick={() => {
        setShowRejectModal(false);
        setRejectionReason("");
        setRejectionDetails("");
      }}
      disabled={actionLoading}
      className="
        flex-1
        cursor-pointer
        rounded-xl
        bg-slate-100
        py-2.5
        text-sm
        font-semibold
        text-slate-700
        transition
        hover:bg-slate-200
        disabled:cursor-not-allowed
        disabled:opacity-50
      "
    >
      Cancel
    </button>


    {/* CONFIRM REJECTION */}
    <button
      type="button"
      onClick={handleReject}
      disabled={
        actionLoading ||
        (!rejectionReason && rejectionDetails.trim().length < 5)
      }
      className={`
        flex-1
        inline-flex
        cursor-pointer
        items-center
        justify-center
        gap-2
        rounded-xl
        py-2.5
        text-sm
        font-semibold
        transition
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${btnRed}
      `}
    >
      <Ban size={15} />

      {actionLoading
        ? "Rejecting..."
        : "Confirm Rejection"}
    </button>

  </div>

</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSAdminHotels;