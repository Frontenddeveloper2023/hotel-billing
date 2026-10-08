import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CreditCard,
  Search,
  RefreshCcw,
  RefreshCw,
  Eye,
  X,
  Mail,
  AlertCircle,
  CheckCircle2,
  Clock3,
  XCircle,
  Building2,
  Package,
  CalendarClock,
  IndianRupee,
  Receipt,
  Ban,
  Wallet,
  Activity,
  BarChart3,
  Hourglass,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Gauge,
  Zap,
  Utensils,
  BedDouble,
  Users,
  Layers,
} from "lucide-react";

import { getAllSubscriptions, getSubscriptionById, cancelSubscription } from "../../service/subscriptionApi";

import {
  sendAdminEmail,
  getEmailHistory,
} from "../../service/emailApi";


// ======================================================
// HELPERS (unchanged behaviour)
// ======================================================

const getSubscriptionsFromResponse = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.subscriptions)) return response.data.subscriptions;
  if (Array.isArray(response?.subscriptions)) return response.subscriptions;
  return [];
};

const getSubscriptionFromResponse = (response) => {
  if (response?.data?.subscription) return response.data.subscription;
  if (response?.subscription) return response.subscription;
  if (response?.data?._id) return response.data;
  if (response?._id) return response;
  return null;
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount || 0));

const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatStatus = (status) => {
  if (!status) return "Unknown";
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const getStatusClass = (status) => {
  switch (status) {
    case "active": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "trial": return "bg-blue-50 text-blue-700 border-blue-200";
    case "expiring_soon": return "bg-amber-50 text-amber-700 border-amber-200";
    case "grace_period": case "suspended": return "bg-orange-50 text-orange-700 border-orange-200";
    case "expired": case "cancelled": case "payment_failed": return "bg-red-50 text-red-700 border-red-200";
    default: return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

const getPaymentStatusClass = (status) => {
  switch (status) {
    case "paid": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "partially_paid": return "bg-amber-50 text-amber-700 border-amber-200";
    case "failed": return "bg-red-50 text-red-700 border-red-200";
    case "refunded": return "bg-violet-50 text-violet-700 border-violet-200";
    default: return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

const timeAgo = (date) => {
  const t = new Date(date).getTime();
  if (!date || Number.isNaN(t)) return "";
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  const steps = [[31536000, "y"], [2592000, "mo"], [86400, "d"], [3600, "h"], [60, "m"]];
  for (const [sec, l] of steps) if (s >= sec) return `${Math.floor(s / sec)}${l} ago`;
  return "Just now";
};

const canCancel = (s) => s === "active" || s === "trial" || s === "expiring_soon" || s === "grace_period";

const statusMeta = {
  active: { label: "Active", bar: "from-emerald-400 to-emerald-600", Icon: CheckCircle2, chip: "bg-emerald-50 text-emerald-600" },
  expiring_soon: { label: "Expiring Soon", bar: "from-amber-300 to-amber-500", Icon: Hourglass, chip: "bg-amber-50 text-amber-600" },
  grace_period: { label: "Grace Period", bar: "from-orange-300 to-orange-500", Icon: Hourglass, chip: "bg-orange-50 text-orange-600" },
  expired: { label: "Expired", bar: "from-red-400 to-red-600", Icon: XCircle, chip: "bg-red-50 text-red-600" },
  suspended: { label: "Suspended", bar: "from-orange-400 to-red-500", Icon: Ban, chip: "bg-orange-50 text-orange-600" },
  cancelled: { label: "Cancelled", bar: "from-slate-400 to-slate-600", Icon: Ban, chip: "bg-slate-100 text-slate-600" },
  payment_failed: { label: "Payment Failed", bar: "from-rose-400 to-rose-600", Icon: AlertCircle, chip: "bg-rose-50 text-rose-600" },
};

// ======================================================
// SHARED UI
// ======================================================

const styles = `
@keyframes ss-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes ss-fade{from{opacity:0}to{opacity:1}}
@keyframes ss-pop{from{opacity:0;transform:translateY(22px) scale(.96)}to{opacity:1;transform:none}}
@keyframes ss-row{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
@keyframes ss-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes ss-live{0%{box-shadow:0 0 0 0 rgba(52,211,153,.6)}100%{box-shadow:0 0 0 8px rgba(52,211,153,0)}}
.ss-in{opacity:0;animation:ss-up .55s cubic-bezier(.2,.7,.2,1) forwards}
.ss-row{opacity:0;animation:ss-row .4s ease-out forwards}
.ss-fade{animation:ss-fade .2s ease-out}
.ss-pop{animation:ss-pop .3s cubic-bezier(.2,.8,.2,1)}
.ss-bar{transform-origin:left;animation:ss-grow .9s .25s cubic-bezier(.2,.7,.2,1) both}
.ss-live{animation:ss-live 1.6s infinite}
.ss-scroll{scrollbar-width:thin;scrollbar-color:#9db8e6 transparent}
.ss-scroll::-webkit-scrollbar{height:8px;width:6px}
.ss-scroll::-webkit-scrollbar-thumb{background:#9db8e6;border-radius:9px}
.ss-drag{cursor:grab}.ss-drag.ss-grabbing{cursor:grabbing;user-select:none}
@media (prefers-reduced-motion:reduce){.ss-in,.ss-row,.ss-bar,.ss-live{animation:none;opacity:1}.ss-fade,.ss-pop{animation:none}}
`;

const delay = (i, step = 70) => ({ animationDelay: `${Math.min(i, 12) * step}ms` });
const card = "rounded-3xl bg-white shadow-[0_18px_45px_rgba(6,20,52,0.28)]";
const eyebrow = "text-[10px] sm:text-[11px] uppercase tracking-[0.14em] font-bold text-[#6b7f99]";
const inputCls = "w-full px-3.5 py-2.5 border border-[#dbe6f5] rounded-xl text-sm text-[#0e2a4a] bg-[#f6f9fe] outline-none focus:bg-white focus:border-[#3b82f0] focus:ring-2 focus:ring-[#3b82f0]/20 transition";

const StatCard = memo(({ title, value, icon: Icon, wrapperClass, loading, index }) => (
  <div style={delay(index)} className={`ss-in ${card} p-4 sm:p-5 hover:-translate-y-1 transition-transform duration-300`}>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className={eyebrow}>{title}</p>
        {loading ? (
          <div className="mt-2 h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0e2a4a] truncate">{value}</p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${wrapperClass}`}><Icon size={22} /></div>
    </div>
  </div>
));

const Badge = memo(({ cls, children }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap ${cls}`}>{children}</span>
));

const Th = ({ children, right }) => (
  <th className={`px-5 py-3.5 text-[11px] font-bold text-[#5b7089] uppercase tracking-[0.1em] whitespace-nowrap ${right ? "text-right" : "text-left"}`}>{children}</th>
);

const Box = ({ icon: Icon, title, children }) => (
  <div className="border border-[#e2ebf7] rounded-2xl p-4">
    <div className="flex items-center gap-2.5 mb-4">
      {Icon && <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] text-white flex items-center justify-center"><Icon size={16} /></div>}
      <h3 className="text-sm font-bold text-[#0e2a4a]">{title}</h3>
    </div>
    {children}
  </div>
);

const Field = ({ label, children, mono }) => (
  <div>
    <p className="text-xs text-[#6b7f99]">{label}</p>
    <p className={`mt-1 font-semibold text-[#0e2a4a] break-all ${mono ? "text-xs" : "text-sm"}`}>{children}</p>
  </div>
);

/* Table you can drag (mouse), swipe (touch) or move with arrows */
const DragTable = ({ minWidth, children }) => {
  const ref = useRef(null);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const [grabbing, setGrabbing] = useState(false);
  const [edge, setEdge] = useState({ left: true, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ left: el.scrollLeft <= 4, right: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update, children]);

  const onDown = (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { down: true, x: e.clientX, left: ref.current.scrollLeft, moved: false };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d.down) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) {
      d.moved = true;
      setGrabbing(true);
    }
    if (d.moved) ref.current.scrollLeft = d.left - dx;
  };
  const onUp = () => {
    drag.current.down = false;
    setGrabbing(false);
  };
  // stop a drag from triggering a button click
  const onClickCapture = (e) => {
    if (drag.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      drag.current.moved = false;
    }
  };

  const nudge = (dir) => ref.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  const hidden = edge.left && edge.right;

  return (
    <div>
      {!hidden && (
        <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-[#f4f8fd] border-b border-[#e7eff8]">
          <div className="flex gap-2">
            {[[-1, ChevronLeft, edge.left, "Scroll left"], [1, ChevronRight, edge.right, "Scroll right"]].map(([d, I, off, label]) => (
              <button key={d} type="button" aria-label={label} onClick={() => nudge(d)} disabled={off}
                className="h-8 w-8 rounded-full bg-white border border-[#dbe6f5] text-[#2568e0] flex items-center justify-center hover:bg-[#2568e0] hover:text-white disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-[#2568e0] disabled:cursor-not-allowed transition shadow-sm">
                <I size={16} />
              </button>
            ))}
          </div>
        </div>
      )}
      <div
        ref={ref}
        onScroll={update}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onClickCapture={onClickCapture}
        className={`ss-scroll ss-drag overflow-x-auto ${grabbing ? "ss-grabbing" : ""}`}
        style={{ scrollBehavior: grabbing ? "auto" : "smooth" }}
      >
        <table className="w-full" style={{ minWidth }}>{children}</table>
      </div>
    </div>
  );
};

// ======================================================
// MAIN COMPONENT
// ======================================================

const SaaSAdminSubscriptions = () => {
  const [searchParams] = useSearchParams();
  const registrationIdFromUrl = searchParams.get("registrationId");

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  // FETCH
  const fetchSubscriptions = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await getAllSubscriptions();
      setSubscriptions(getSubscriptionsFromResponse(response));
    } catch (err) {
      console.error("Get subscriptions error:", err);
      setError(err?.message || err?.data?.message || "Unable to load subscriptions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  useEffect(() => {
    if (subscriptions.length > 0 && registrationIdFromUrl && !showDetailsModal) {
      const match = subscriptions.find(s => 
        s.registrationId === registrationIdFromUrl || 
        s.hotelId?._id === registrationIdFromUrl || 
        s.hotelId?.registrationId === registrationIdFromUrl ||
        s._id === registrationIdFromUrl
      );
      if (match) {
        handleView(match);
      }
    }
  }, [subscriptions, registrationIdFromUrl]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // COUNTS
  const activeCount = subscriptions.filter((i) => i.status === "active").length;
  const expiredCount = subscriptions.filter((i) => i.status === "expired").length;

  // REVENUE
  const collectedRevenue = useMemo(
    () =>
      subscriptions.reduce((total, s) => {
        if (s.paymentStatus === "paid" || s.paymentStatus === "partially_paid") {
          return total + Number(s.finalAmount ?? s.amount ?? 0);
        }
        return total;
      }, 0),
    [subscriptions]
  );

  // CHART + ACTIVITY (derived, display only)
  const statusBars = useMemo(() => {
    const counts = {};
    subscriptions.forEach((s) => { if (s.status) counts[s.status] = (counts[s.status] || 0) + 1; });
    const rows = Object.keys(statusMeta).map((k) => ({ key: k, count: counts[k] || 0 })).filter((r) => r.count > 0);
    const max = Math.max(...rows.map((r) => r.count), 1);
    return rows.map((r) => ({ ...r, pct: (r.count / max) * 100 }));
  }, [subscriptions]);

  const recentActivity = useMemo(
    () =>
      [...subscriptions]
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
        .slice(0, 6),
    [subscriptions]
  );

  // FILTER
  const filteredSubscriptions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return subscriptions.filter((subscription) => {
      const hotelName = subscription.hotelId?.hotelName || "";
      const planName = subscription.planId?.planName || "";
      const subscriptionId = subscription._id || "";

      const matchesSearch =
        !query ||
        hotelName.toLowerCase().includes(query) ||
        planName.toLowerCase().includes(query) ||
        subscriptionId.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || subscription.status === statusFilter;
      const matchesBilling = billingFilter === "all" || subscription.billingCycle === billingFilter;

      return matchesSearch && matchesStatus && matchesBilling;
    });
  }, [subscriptions, search, statusFilter, billingFilter]);

  // VIEW DETAILS
  const handleView = async (subscription) => {
    try {
      setActionLoading(true);
      setError("");

      const response = await getSubscriptionById(subscription._id);
      const details = getSubscriptionFromResponse(response);

      setSelectedSubscription(details || subscription);
      setShowDetailsModal(true);
    } catch (err) {
      console.error("Get subscription details error:", err);
      // Fallback to row data
      setSelectedSubscription(subscription);
      setShowDetailsModal(true);
    } finally {
      setActionLoading(false);
    }
  };

  const closeDetails = () => {
    if (actionLoading) return;
    setShowDetailsModal(false);
    setSelectedSubscription(null);
    setError("");
  };

  const openEmailModal = (subscription) => {
    const email =
      subscription?.hotelId?.email ||
      subscription?.hotelEmail ||
      subscription?.email ||
      "";

    const name =
      subscription?.hotelId?.ownerName ||
      subscription?.ownerName ||
      subscription?.hotelId?.hotelName ||
      "Hotel Owner";

    if (!email) {
      setError("This hotel does not have an email address.");
      return;
    }

    setEmailForm({
      recipientEmail: email,
      recipientName: name,
      subject: "",
      message: "",
    });

    setError("");
    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    if (!selectedSubscription) return;

    if (!emailForm.recipientEmail.trim()) {
      setError("Recipient email is required.");
      return;
    }

    if (!emailForm.subject.trim()) {
      setError("Email subject is required.");
      return;
    }

    if (!emailForm.message.trim()) {
      setError("Email message is required.");
      return;
    }

    try {
      setEmailLoading(true);
      setError("");

      const hotelId =
        selectedSubscription.hotelId?._id ||
        selectedSubscription.hotelId;

      if (!hotelId) {
        throw new Error("Hotel ID is missing.");
      }

      const response = await sendAdminEmail({
        hotelId,

        subHotelId: null,

        recipientEmail:
          emailForm.recipientEmail.trim(),

        recipientName:
          emailForm.recipientName.trim(),

        subject:
          emailForm.subject.trim(),

        message:
          emailForm.message.trim(),

        registrationId: null,

        subscriptionId:
          selectedSubscription._id || null,
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

      setSuccessMessage("Email sent successfully.");
    } catch (err) {
      console.error("Send subscription email error:", err);

      setError(
        err?.message ||
        err?.data?.message ||
        "Unable to send email."
      );
    } finally {
      setEmailLoading(false);
    }
  };

  const handleViewEmailHistory = async () => {
    if (!selectedSubscription) return;

    try {
      setEmailHistoryLoading(true);
      setError("");

      const hotelId =
        selectedSubscription.hotelId?._id ||
        selectedSubscription.hotelId;

      if (!hotelId) {
        throw new Error("Hotel ID is missing.");
      }

      const response = await getEmailHistory({
        hotelId,
        subHotelId: null,
      });

      if (!response?.success) {
        throw new Error(
          response?.message ||
          "Unable to load email history."
        );
      }

      setEmailHistory(response.data || []);
      setShowEmailHistoryModal(true);
    } catch (err) {
      console.error(
        "Subscription email history error:",
        err
      );

      setError(
        err?.message ||
        "Unable to load email history."
      );
    } finally {
      setEmailHistoryLoading(false);
    }
  };

  // CANCEL
  const handleCancel = async (subscription) => {
    const hotelName = subscription.hotelId?.hotelName || "this hotel";

    const reason = window.prompt(
      `Are you sure you want to cancel the subscription for "${hotelName}"?\n\nEnter reason for cancellation (this will be emailed directly to the hotel):`,
      "Subscription cancelled by system administrator."
    );

    if (reason === null) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccessMessage("");

      await cancelSubscription(subscription._id, reason || "Subscription cancelled by system administrator.");

      setSuccessMessage(`Subscription for ${hotelName} has been cancelled and notification email sent.`);
      setShowDetailsModal(false);
      setSelectedSubscription(null);

      await fetchSubscriptions(true);
    } catch (err) {
      console.error("Cancel subscription error:", err);
      setError(err?.message || err?.data?.message || "Unable to cancel the subscription.");
    } finally {
      setActionLoading(false);
    }
  };

  const sel = selectedSubscription;

  // RENDER
  return (
    <div className="min-h-full font-['Inter']">
      <style>{styles}</style>
      <div className="max-w-[1500px] mx-auto">

        {/* HEADER */}
        <div className="ss-in flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
          <div>

            <h1 className="mt-2 text-[18px] sm:text-[24px] lg:text-[28px] leading-tight font-extrabold tracking-[-0.035em] text-white">Subscriptions</h1>
          </div>


        </div>

        {/* SUCCESS */}
        {successMessage && (
          <div className="ss-pop mb-5 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 flex items-start gap-3">
            <CheckCircle2 size={19} className="text-emerald-600 shrink-0" />
            <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="ss-pop mb-5 p-4 rounded-2xl border border-red-200 bg-red-50 flex items-start gap-3">
            <AlertCircle size={19} className="text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Something went wrong</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* STATS */}
<div className="mb-5 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
  <StatCard
    index={1}
    title="Total"
    value={subscriptions.length}
    icon={Layers}
    wrapperClass="bg-[#EAF3FF] text-[#2568e0]"
    loading={loading}
  />

  <StatCard
    index={2}
    title="Active"
    value={activeCount}
    icon={CheckCircle2}
    wrapperClass="bg-[#E1FAF0] text-[#087A58]"
    loading={loading}
  />

  <StatCard
    index={3}
    title="Expired"
    value={expiredCount}
    icon={XCircle}
    wrapperClass="bg-red-50 text-red-600"
    loading={loading}
  />

  <StatCard
    index={4}
    title="Collected"
    value={formatCurrency(collectedRevenue)}
    icon={Wallet}
    wrapperClass="bg-violet-50 text-violet-600"
    loading={loading}
  />
</div>
        {/* BAR CHART + RECENT ACTIVITY */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5 mb-5">
          <section style={delay(6)} className={`ss-in lg:col-span-3 ${card} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={eyebrow}>Overview</p>
                <h2 className="mt-1 text-lg sm:text-xl font-bold text-[#0e2a4a]">Subscriptions by Status</h2>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#eaf3ff] text-[#2568e0] flex items-center justify-center"><BarChart3 size={19} /></div>
            </div>

            <div className="mt-5 space-y-3.5">
              {loading ? (
                [1, 2, 3, 4].map((i) => <div key={i} className="h-9 rounded-xl bg-slate-100 animate-pulse" />)
              ) : statusBars.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#6b7f99]">No subscription data yet.</p>
              ) : (
                statusBars.map(({ key, count, pct }) => {
                  const m = statusMeta[key];
                  return (
                    <button key={key} type="button" onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
                      className={`w-full cursor-pointer text-left group rounded-xl p-1.5 -m-1.5 transition-colors ${statusFilter === key ? "bg-[#eaf3ff]" : "hover:bg-[#f4f8fd]"}`}>
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#3d5473]">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center ${m.chip}`}><m.Icon size={13} /></span>
                          {m.label}
                        </span>
                        <span className="text-xs font-bold text-[#0e2a4a]">{count}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-[#e8f0fb] overflow-hidden">
                        <div className={`ss-bar h-full rounded-full bg-gradient-to-r ${m.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            {statusBars.length > 0 && <p className="mt-4 text-[11px] text-[#8fa2ba]">Tip: click a bar to filter the table by that status.</p>}
          </section>

          <section style={delay(7)} className={`ss-in lg:col-span-2 ${card} p-5 sm:p-6 flex flex-col`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="mt-1 text-lg sm:text-xl font-bold text-[#0e2a4a]">Recent Activity</h2>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#eaf3ff] text-[#2568e0] flex items-center justify-center"><Activity size={19} /></div>
            </div>

            <div className="mt-4 flex-1 max-h-[340px] overflow-y-auto ss-scroll pr-1">
              {loading ? (
                [1, 2, 3, 4].map((i) => <div key={i} className="h-14 mb-2 rounded-xl bg-slate-100 animate-pulse" />)
              ) : recentActivity.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#6b7f99]">No recent activity.</p>
              ) : (
                <ol className="relative border-l-2 border-[#e2ebf7] ml-3 space-y-4">
                  {recentActivity.map((s, i) => {
                    const m = statusMeta[s.status] || { Icon: CreditCard, chip: "bg-slate-100 text-slate-600" };
                    return (
                      <li 
                        key={s._id} 
                        style={delay(i, 60)} 
                        onClick={() => handleView(s)}
                        className="ss-row pl-6 relative cursor-pointer group mb-4"
                      >
                        <span className={`absolute -left-[15px] top-1 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center z-10 ${m.chip}`}><m.Icon size={13} /></span>
                        <div className="flex items-start justify-between gap-2 p-2.5 -mt-1.5 -ml-2 rounded-xl group-hover:bg-[#F8FAFD] transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0e2a4a] truncate">{s.hotelId?.hotelName || "Hotel"}</p>
                            <p className="text-[11px] text-[#6b7f99] truncate">{s.planId?.planName || "Plan"} · {formatStatus(s.status)}</p>
                          </div>
                          <span className="text-[10px] text-[#8fa2ba] whitespace-nowrap pt-0.5">{timeAgo(s.updatedAt || s.createdAt)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>
        </div>

        {/* FILTERS */}
        <div style={delay(8)} className={`ss-in ${card} p-3 sm:p-4 mb-5`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7d90a8]" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search hotel, plan or ID..." className={`${inputCls} pl-10`} />
            </div>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
              <option value="payment_failed">Payment Failed</option>
            </select>

            <select value={billingFilter} onChange={(e) => setBillingFilter(e.target.value)} className={inputCls}>
              <option value="all">All Billing Cycles</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="halfYearly">Half Yearly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div style={delay(9)} className={`ss-in ${card} overflow-hidden mb-4`}>
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="p-14 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#eaf3ff] text-[#2568e0] flex items-center justify-center"><CreditCard size={28} /></div>
              <h3 className="mt-4 font-bold text-[#0e2a4a]">No subscriptions found</h3>
              <p className="mt-1 text-sm text-[#6b7f99]">
                {search || statusFilter !== "all" || billingFilter !== "all"
                  ? "Try changing your search or filters."
                  : "No subscriptions have been created yet."}
              </p>
            </div>
          ) : (
            <DragTable minWidth={250}>
              
              <thead>
                <tr className="bg-[#f4f8fd] border-b border-[#e2ebf7]">
                  <Th>Hotel</Th><Th>Billing</Th><Th>Payment</Th><Th>Status</Th><Th right>Action</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef3fa]">
                {filteredSubscriptions.map((subscription, i) => {
                  const hotelName = subscription.hotelId?.hotelName || "Hotel";
                  const planName = subscription.planId?.planName || "Plan";

                  return (
                    <tr
                      key={subscription._id}
                      style={delay(i, 35)}
                      onClick={() => handleView(subscription)}
                      className="ss-row hover:bg-[#f4f9ff] transition-colors cursor-pointer"
                    >                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0e2a4a]">{hotelName}</p>
                            <p className="text-[11px] text-[#8fa2ba] mt-1">{subscription._id}</p>
                          </div>
                        </div>
                      </td>



                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-[#3d5473]">{formatStatus(subscription.billingCycle)}</p>
                        <p className="text-xs text-[#8fa2ba] mt-1 whitespace-nowrap">
                          {formatDate(subscription.startDate)} → {formatDate(subscription.endDate)}
                        </p>
                      </td>

                    

                      <td className="px-5 py-4"><Badge cls={getPaymentStatusClass(subscription.paymentStatus)}>{formatStatus(subscription.paymentStatus)}</Badge></td>
                      <td className="px-5 py-4"><Badge cls={getStatusClass(subscription.status)}>{formatStatus(subscription.status)}</Badge></td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">

                          {canCancel(subscription.status) && (
                            <button type="button" onClick={(e) => {
  e.stopPropagation();
  handleCancel(subscription);
}} disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white text-xs font-semibold disabled:opacity-50 transition-colors">
                              <Ban size={14} /> Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DragTable>
          )}
        </div>
      </div>

      {/* DETAILS MODAL */}
      {showDetailsModal && sel && (
        <div className="ss-fade fixed inset-0 z-50 bg-[#0b1d3d]/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={closeDetails}>
          <div className="ss-pop bg-white w-full max-w-2xl max-h-[94vh] overflow-y-auto ss-scroll rounded-t-3xl sm:rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>

            <div className="sticky top-0 z-10 bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] text-white px-5 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><Receipt size={20} /></div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold">Subscription Details</h2>
                  <p className="text-xs text-blue-100 mt-0.5">Complete subscription information.</p>
                </div>
              </div>
              <button type="button" onClick={closeDetails} disabled={actionLoading} aria-label="Close"
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center disabled:opacity-50 shrink-0 transition">
                <X size={19} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-[#eaf3ff] rounded-2xl">
                  <div className="flex items-center gap-2"><Building2 size={18} className="text-[#2568e0]" /><p className="text-xs text-[#2568e0] font-semibold">Hotel</p></div>
                  <p className="mt-2 text-base font-bold text-[#0e2a4a]">{sel.hotelId?.hotelName || "Hotel"}</p>
                  <p className="text-[11px] text-[#6b7f99] mt-1 break-all">{sel.hotelId?._id || sel.hotelId || "N/A"}</p>
                </div>
                <div className="p-4 bg-violet-50 rounded-2xl">
                  <div className="flex items-center gap-2"><Package size={18} className="text-violet-600" /><p className="text-xs text-violet-600 font-semibold">Plan</p></div>
                  <p className="mt-2 text-base font-bold text-[#0e2a4a]">{sel.planId?.planName || "Plan"}</p>
                  <p className="text-[11px] text-[#6b7f99] mt-1 break-all">{sel.planId?._id || sel.planId || "N/A"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge cls={getStatusClass(sel.status)}>{formatStatus(sel.status)}</Badge>
                <Badge cls={getPaymentStatusClass(sel.paymentStatus)}>Payment: {formatStatus(sel.paymentStatus)}</Badge>
                {sel.autoRenewal && <Badge cls="border-blue-200 bg-blue-50 text-blue-700">Auto Renewal</Badge>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <button
                  type="button"
                  onClick={() => openEmailModal(sel)}
                  disabled={emailLoading}
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

                  {emailHistoryLoading
                    ? "Loading..."
                    : "View Sent Email History"}
                </button>

              </div>

              <Box icon={CalendarClock} title="Billing Period">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Billing Cycle">{formatStatus(sel.billingCycle)}</Field>
                  <Field label="Start Date">{formatDate(sel.startDate)}</Field>
                  <Field label="End Date">{formatDate(sel.endDate)}</Field>
                </div>
              </Box>

              <Box icon={IndianRupee} title="Billing Summary">
                <div className="space-y-3">
                  <div className="flex justify-between gap-4"><span className="text-sm text-[#6b7f99]">Amount</span><span className="text-sm font-semibold text-[#0e2a4a]">{formatCurrency(sel.amount)}</span></div>

                  <div className="pt-3 border-t border-[#e7eff8] flex justify-between gap-4">
                    <span className="font-bold text-[#0e2a4a]">Final Amount</span>
                    <span className="text-lg font-extrabold text-[#2568e0]">{formatCurrency(sel.finalAmount)}</span>
                  </div>
                </div>
              </Box>

              <Box icon={Gauge} title="Subscription Limits">
                <div className="grid grid-cols-3 gap-3">
                  {[[BedDouble, sel.limits?.rooms, "Rooms"], [Building2, sel.limits?.branches, "Branches"], [Users, sel.limits?.receptionists, "Receptionists"]].map(([I, v, l]) => (
                    <div key={l} className="p-3 bg-[#f4f8fd] rounded-xl text-center">
                      <I size={16} className="mx-auto text-[#2568e0]" />
                      <p className="text-lg font-extrabold text-[#0e2a4a] mt-1">{v ?? 0}</p>
                      <p className="text-[11px] text-[#6b7f99]">{l}</p>
                    </div>
                  ))}
                </div>
              </Box>

              <Box icon={Zap} title="Enabled Features">
                <div className="flex flex-wrap gap-2">
                  {sel.features?.foodService && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-semibold"><Utensils size={13} /> Food Service</span>
                  )}
                  {sel.features?.roomService && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#eaf3ff] text-[#2568e0] text-xs font-semibold"><BedDouble size={13} /> Room Service</span>
                  )}
                  {!sel.features?.foodService && !sel.features?.roomService && (
                    <span className="text-xs text-[#9aabc0]">No additional features</span>
                  )}
                </div>
              </Box>

              <Box icon={Wallet} title="Payment Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Payment Status">{formatStatus(sel.paymentStatus)}</Field>
                  <Field label="Transaction ID" mono>{sel.paymentTransactionId || "Not available"}</Field>
                </div>
              </Box>

              <div className="text-xs text-[#8fa2ba]">
                Created: {formatDateTime(sel.createdAt)} {" • "} Updated: {formatDateTime(sel.updatedAt)}
              </div>

              {canCancel(sel.status) && (
                <button type="button" onClick={() => handleCancel(sel)} disabled={actionLoading}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2 transition">
                  {actionLoading ? (<><RefreshCw size={16} className="animate-spin" /> Processing...</>) : (<><Ban size={16} /> Cancel Subscription</>)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}



      {/* EMAIL COMPOSER MODAL */}
      {showEmailModal && (
        <div
          className="ss-fade fixed inset-0 z-[70] bg-[#0b1d3d]/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => {
            if (!emailLoading) {
              setShowEmailModal(false);
              setError("");
            }
          }}
        >
          <div
            className="ss-pop bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
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
                    Send a message to this hotel.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!emailLoading) {
                    setShowEmailModal(false);
                    setError("");
                  }
                }}
                disabled={emailLoading}
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
              >
                <X size={19} />
              </button>
            </div>

            {/* BODY */}
            <div className="p-5 sm:p-6 space-y-5">

              {/* RECIPIENT */}
              <div className="p-4 rounded-2xl bg-[#f4f8fd] border border-[#e2ebf7]">
                <p className="text-xs text-[#6b7f99]">
                  Sending to
                </p>

                <p className="text-sm font-bold text-[#0e2a4a] mt-1">
                  {emailForm.recipientName || "Hotel Owner"}
                </p>

                <p className="text-xs text-[#60758D] mt-0.5">
                  {emailForm.recipientEmail}
                </p>
              </div>

              {/* NAME */}
              <div>
                <label className={eyebrow}>
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
                  className={`${inputCls} mt-2`}
                />
              </div>

              {/* EMAIL */}
              <div>
                <label className={eyebrow}>
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
                  className={`${inputCls} mt-2`}
                />
              </div>

              {/* SUBJECT */}
              <div>
                <label className={eyebrow}>
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
                  className={`${inputCls} mt-2`}
                />
              </div>

              {/* MESSAGE */}
              <div>
                <label className={eyebrow}>
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
                  className={`${inputCls} mt-2 resize-none`}
                />

                <div className="flex justify-end mt-1">
                  <span className="text-[11px] text-[#8fa2ba]">
                    {emailForm.message.length}/10000
                  </span>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2">
                  <AlertCircle
                    size={17}
                    className="text-red-600 shrink-0"
                  />

                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              )}

              {/* BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-3">

                <button
                  type="button"
                  onClick={() => {
                    setShowEmailModal(false);
                    setError("");
                  }}
                  disabled={emailLoading}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
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
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2568e0] hover:bg-[#1d5bc4] text-white text-sm font-semibold disabled:opacity-50"
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

      {/* EMAIL HISTORY MODAL */}
      {showEmailHistoryModal && (
        <div
          className="ss-fade fixed inset-0 z-[75] bg-[#0b1d3d]/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowEmailHistoryModal(false)}
        >
          <div
            className="ss-pop bg-white w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}
            <div className="bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] text-white px-5 sm:px-6 py-4 flex items-center justify-between">

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Mail size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    Sent Email History
                  </h2>

                  <p className="text-xs text-blue-100 mt-0.5">
                    Previous emails sent to this hotel.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowEmailHistoryModal(false)
                }
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
              >
                <X size={19} />
              </button>

            </div>

            {/* HISTORY */}
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

                        <div>
                          <p className="text-sm font-bold text-[#0e2a4a]">
                            {email.subject}
                          </p>

                          <p className="text-xs text-[#6b7f99] mt-1">
                            To: {email.recipientEmail}
                          </p>

                          {email.sentBy && (
                            <p className="text-xs text-[#8fa2ba] mt-1">
                              Sent by:{" "}
                              {email.sentBy.name ||
                                email.sentBy.email ||
                                "Admin"}
                            </p>
                          )}
                        </div>

                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
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

                      <p className="mt-3 text-[11px] text-[#8fa2ba]">
                        {email.sentAt
                          ? new Date(
                              email.sentAt
                            ).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Date unavailable"}
                      </p>

                    </div>
                  ))}

                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};


   

export default SaaSAdminSubscriptions;