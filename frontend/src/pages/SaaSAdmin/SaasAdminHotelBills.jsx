import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2, Search, RefreshCw, X, TrendingUp, Receipt,
  CreditCard, CheckCircle2, XCircle, Clock3, ChevronLeft,
  ChevronRight, MapPin, Mail, Phone, Layers, Calendar,
  BarChart3, ShieldCheck, AlertCircle, Users, Eye,
} from "lucide-react";
import { getAllHotels } from "../../service/hotelApi";
import { getAllSubscriptions } from "../../service/subscriptionApi";
import { getAllBranches } from "../../service/branchApi";
import { getAllInvoicesAdmin } from "../../service/invoiceApi";

/* =========================================================
   HELPERS
========================================================= */

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const fmtDate = (d) => {
  if (!d) return "N/A";
  const dt = new Date(d);
  return isNaN(dt) ? "N/A" : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtNum = (n) => new Intl.NumberFormat("en-IN").format(Number(n || 0));

const statusColor = (s) => {
  const k = String(s || "").toLowerCase();
  if (["active", "approved"].includes(k)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["pending", "trial"].includes(k)) return "bg-amber-50 text-amber-700 border-amber-200";
  if (["expired", "cancelled", "rejected"].includes(k)) return "bg-red-50 text-red-700 border-red-200";
  if (k === "suspended") return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
};

const StatusIcon = ({ s }) => {
  const k = String(s || "").toLowerCase();
  if (k === "active") return <CheckCircle2 size={11} />;
  if (["expired", "cancelled"].includes(k)) return <XCircle size={11} />;
  return <Clock3 size={11} />;
};

const pickArr = (r, key) => {
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.data)) return r.data;
  if (Array.isArray(r?.data?.[key])) return r.data[key];
  if (Array.isArray(r?.[key])) return r[key];
  return [];
};

// Extract the grand total from an invoice (supports nested and flat schema)
const getInvAmount = (inv) =>
  Number(
    inv?.financials?.grandTotal ??
    inv?.grandTotal ??
    inv?.totalAmount ??
    inv?.total ??
    0
  );

// Extract payment status from an invoice
const getInvStatus = (inv) =>
  inv?.paymentInfo?.paymentStatus ??
  inv?.paymentStatus ??
  inv?.status ??
  "pending";

// Extract invoice number
const getInvNo = (inv, i) =>
  inv?.invoiceNo ??
  inv?.invoiceNumber ??
  inv?.billNumber ??
  `INV-${String(i + 1).padStart(4, "0")}`;

const PAGE = 10;

/* =========================================================
   MINI UI
========================================================= */

const Badge = memo(({ status }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${statusColor(status)}`}>
    <StatusIcon s={status} />
    {String(status || "Unknown").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
  </span>
));

const Avatar = ({ name }) => (
  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] text-white flex items-center justify-center shrink-0 font-bold text-sm shadow shadow-blue-400/30">
    {(name || "H").trim().charAt(0).toUpperCase()}
  </div>
);

const Skeleton = () => (
  <div className="p-5 space-y-3">
    {[1,2,3,4,5].map(i => (
      <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
    ))}
  </div>
);

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 p-4 bg-[#f4f8fd] rounded-2xl">
    {Icon && <Icon size={15} className="text-[#6b7f99] mt-0.5 shrink-0" />}
    <div>
      <p className="text-xs text-[#6b7f99] font-medium">{label}</p>
      <p className="text-sm font-semibold text-[#0e2a4a] mt-0.5 break-all">{value || "N/A"}</p>
    </div>
  </div>
);

/* =========================================================
   HOTEL DETAIL MODAL
========================================================= */

const HotelModal = memo(({ hotel, subscription, branches, invoices, onClose }) => {
  if (!hotel) return null;

  const hotelBranches = branches.filter(b =>
    b.hotelId === hotel._id || b.hotelId?._id === hotel._id || b.parentHotelId === hotel._id
  );

  const hotelInvoices = invoices.filter(inv =>
    inv.hotelId === hotel._id || inv.hotelId?._id === hotel._id
  );

  const totalRevenue = hotelInvoices.reduce((s, inv) =>
    s + getInvAmount(inv), 0);

  const paidRevenue = hotelInvoices
    .filter(inv => ["paid","completed","PAID"].includes(String(getInvStatus(inv)).toLowerCase()))
    .reduce((s, inv) => s + getInvAmount(inv), 0);

  const plan = subscription?.planId || subscription?.plan || {};
  const planName = plan?.planName || plan?.name || subscription?.planName || subscription?.planId?.planName || "N/A";
  const subStatus = subscription?.status || "unknown";
  const purchasedAt = subscription?.createdAt || subscription?.purchasedAt || subscription?.startDate;
  const validUntil = subscription?.endDate || subscription?.validUntil || subscription?.expiresAt;
  const billingCycle = subscription?.billingCycle || "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: "rgba(10,25,55,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-[28px] shadow-[0_32px_80px_rgba(6,20,52,0.30)] overflow-hidden max-h-[92vh] flex flex-col"
        style={{ animation: "bhpop .28s cubic-bezier(.2,.8,.2,1)" }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes bhpop{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:none}}`}</style>

        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-[#f8fbff] to-white shrink-0">
          <Avatar name={hotel.hotelName || hotel.name} />
          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold text-[#0e2a4a] text-lg leading-tight truncate">
              {hotel.hotelName || hotel.name || "Hotel"}
            </h2>
            <p className="text-sm text-[#6b7f99] mt-0.5 truncate">{hotel.email || "—"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6" style={{ scrollbarWidth: "thin" }}>

          {/* Revenue Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow shadow-blue-400/25">
              <p className="text-xs font-semibold opacity-80 mb-1">Total Bills</p>
              <p className="text-3xl font-extrabold">{fmtNum(hotelInvoices.length)}</p>
              <p className="text-[11px] opacity-70 mt-0.5">Invoices generated</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow shadow-emerald-400/25">
              <p className="text-xs font-semibold opacity-80 mb-1">Total Revenue</p>
              <p className="text-base font-extrabold leading-tight">{fmt(totalRevenue)}</p>
              <p className="text-[11px] opacity-70 mt-0.5">All invoices</p>
            </div>
           
          </div>

          {/* Current Plan */}
          <div>
            <h3 className="text-sm font-bold text-[#0e2a4a] mb-3 flex items-center gap-2">
              <CreditCard size={15} className="text-[#2568e0]" /> Current Subscription Plan
            </h3>
            <div className="rounded-2xl border border-[#dbe6f5] bg-[#f8fbff] overflow-hidden">
              {/* Plan name + status row */}
              <div className="flex items-center justify-between gap-4 p-4 border-b border-[#dbe6f5]">
                <p className="text-base font-extrabold text-[#0e2a4a]">{planName}</p>
                <Badge status={subStatus} />
              </div>
              {/* Dates grid */}
              <div className="grid grid-cols-2 divide-x divide-[#dbe6f5]">
                <div className="p-4">
                  <p className="text-[11px] text-[#6b7f99] font-medium uppercase tracking-wide mb-1">Purchased Date</p>
                  <p className="text-sm font-bold text-[#0e2a4a]">{fmtDate(purchasedAt)}</p>
                </div>
                <div className="p-4">
                  <p className="text-[11px] text-[#6b7f99] font-medium uppercase tracking-wide mb-1">End Date</p>
                  <p className="text-sm font-bold text-[#0e2a4a]">{fmtDate(validUntil)}</p>
                </div>
              </div>
              {billingCycle && billingCycle !== "—" && (
                <div className="px-4 pb-4">
                  <p className="text-[11px] text-[#6b7f99] font-medium uppercase tracking-wide mb-1">Billing Cycle</p>
                  <p className="text-sm font-semibold text-[#0e2a4a] capitalize">{billingCycle}</p>
                </div>
              )}
            </div>
          </div>

          {/* Hotel Info */}
          <div>
            <h3 className="text-sm font-bold text-[#0e2a4a] mb-3 flex items-center gap-2">
              <Building2 size={15} className="text-[#2568e0]" /> Hotel Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={Users} label="Owner" value={hotel.ownerName || hotel.owner} />
              <InfoRow icon={Mail} label="Email" value={hotel.email} />
              <InfoRow icon={Phone} label="Phone" value={hotel.phone} />
              <InfoRow icon={MapPin} label="Location" value={[hotel.address?.city, hotel.address?.state, hotel.address?.country].filter(Boolean).join(", ")} />
              <InfoRow icon={Calendar} label="Registered On" value={fmtDate(hotel.createdAt)} />
              <InfoRow icon={ShieldCheck} label="Status" value={hotel.status || "active"} />
            </div>
          </div>

          {/* Sub-branches */}
          <div>
            <h3 className="text-sm font-bold text-[#0e2a4a] mb-3 flex items-center gap-2">
              <Layers size={15} className="text-[#2568e0]" /> Branches
              <span className="ml-auto text-[11px] font-semibold text-white bg-[#2568e0] px-2.5 py-0.5 rounded-full">
                {hotelBranches.length}
              </span>
            </h3>
            {hotelBranches.length === 0 ? (
              <p className="text-sm text-[#6b7f99] bg-[#f4f8fd] p-4 rounded-2xl text-center">No sub-branches registered.</p>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                {hotelBranches.map((b, i) => (
                  <div key={b._id || i} className="flex items-center gap-3 p-3 bg-[#f4f8fd] rounded-xl border border-[#dbe6f5]">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {(b.branchName || b.name || "B").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0e2a4a] truncate">{b.branchName || b.name}</p>
                      {/* <p className="text-xs text-[#6b7f99] truncate">{[b.city, b.state].filter(Boolean).join(", ") || "—"}</p> */}
                    </div>
                    <Badge status={b.status || "active"} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Bills */}
          {hotelInvoices.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[#0e2a4a] mb-3 flex items-center gap-2">
                <Receipt size={15} className="text-[#2568e0]" /> Recent Bills
                <span className="ml-auto text-[11px] font-semibold text-white bg-[#2568e0] px-2.5 py-0.5 rounded-full">
                  {hotelInvoices.length}
                </span>
              </h3>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                {hotelInvoices.slice(0, 20).map((inv, i) => (
                  <div key={inv._id || i} className="flex items-center gap-3 p-3 bg-[#f4f8fd] rounded-xl border border-[#dbe6f5]">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#0e2a4a]">
                        {getInvNo(inv, i)}
                      </p>
                      <p className="text-[11px] text-[#6b7f99] mt-0.5">{fmtDate(inv.createdAt || inv.invoiceDate || inv.date)}</p>
                    </div>
                    <p className="text-sm font-bold text-[#0e2a4a] shrink-0">{fmt(getInvAmount(inv))}</p>
                    <Badge status={getInvStatus(inv)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/* =========================================================
   MAIN PAGE
========================================================= */

export default function SaasAdminHotelBills() {
  const [hotels, setHotels] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedHotel, setSelectedHotel] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [hR, sR, bR, iR] = await Promise.allSettled([
        getAllHotels(),
        getAllSubscriptions(),
        getAllBranches(),
        getAllInvoicesAdmin(),
      ]);
      setHotels(hR.status === "fulfilled" ? pickArr(hR.value, "hotels") : []);
      setSubscriptions(sR.status === "fulfilled" ? pickArr(sR.value, "subscriptions") : []);
      setBranches(bR.status === "fulfilled" ? pickArr(bR.value, "branches") : []);
      setInvoices(iR.status === "fulfilled" ? pickArr(iR.value, "invoices") : []);
    } catch (e) {
      setError(e?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const enriched = useMemo(() =>
    hotels.map(h => {
      const sub = subscriptions.find(s => s.hotelId === h._id || s.hotelId?._id === h._id);
      const hBranches = branches.filter(b => b.hotelId === h._id || b.hotelId?._id === h._id || b.parentHotelId === h._id);
      const hInvoices = invoices.filter(inv => {
        const invHotelId = String(inv.hotelId?._id || inv.hotelId || "");
        return invHotelId === String(h._id);
      });
      const revenue = hInvoices.reduce((s, inv) => s + getInvAmount(inv), 0);
const planName =
    sub?.planId?.planName ||
    sub?.planId?.name ||
    sub?.plan?.planName ||
    sub?.plan?.name ||
    sub?.planName ||
    "N/A";      const subStatus = sub?.status || "unknown";
      return { ...h, sub, hBranches, hInvoices, revenue, billsCount: hInvoices.length, planName, subStatus };
    }), [hotels, subscriptions, branches, invoices]);

  const planOptions = useMemo(() => {
    const s = new Set(enriched.map(h => h.planName));
    return Array.from(s).filter(p => p && p !== "N/A");
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return enriched.filter(h => {
      const nm = (h.hotelName || h.name || "").toLowerCase();
      const em = (h.email || "").toLowerCase();
      const ow = (h.ownerName || "").toLowerCase();
      const ci = (h.address?.city || "").toLowerCase();
      if (q && ![nm, em, ow, ci].some(f => f.includes(q))) return false;
      if (filterStatus !== "all" && h.subStatus !== filterStatus) return false;
      if (filterPlan !== "all" && h.planName !== filterPlan) return false;
      return true;
    });
  }, [enriched, search, filterStatus, filterPlan]);

  const totalRevenue = useMemo(() => filtered.reduce((s, h) => s + h.revenue, 0), [filtered]);
  const totalBills = useMemo(() => filtered.reduce((s, h) => s + h.billsCount, 0), [filtered]);
  const activeCount = useMemo(() => filtered.filter(h => h.subStatus === "active").length, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);

  useEffect(() => { setPage(1); }, [search, filterStatus, filterPlan]);

  const modalSub = selectedHotel
    ? subscriptions.find(s => s.hotelId === selectedHotel._id || s.hotelId?._id === selectedHotel._id)
    : null;

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes bh-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .bh-in{opacity:0;animation:bh-up .45s cubic-bezier(.2,.7,.2,1) forwards}
        .bh-row{opacity:0;animation:bh-up .35s ease-out forwards}
      `}</style>

      {/* HEADER */}
      <header className="bh-in flex items-center gap-3" style={{ animationDelay: "0ms" }}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] text-white flex items-center justify-center shadow shadow-blue-400/30 shrink-0">
          <BarChart3 size={20} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-white leading-tight">Hotel Bills &amp; Revenue</h1>
          <p className="text-xs text-blue-200/70 mt-0.5">All registered hotels · billing summary · plan status</p>
        </div>
      </header>

      {/* ERROR */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm bh-in">
          <AlertCircle size={17} className="shrink-0" />
          {error}
          <button onClick={fetchAll} className="ml-auto text-xs font-bold underline">Retry</button>
        </div>
      )}

      {/* STATS */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bh-in" style={{ animationDelay: "40ms" }}>
          {[
            { icon: Building2, label: "Total Hotels", value: fmtNum(filtered.length), bg: "bg-blue-50 text-blue-600 border-blue-100" },
            { icon: Receipt, label: "Total Bills", value: fmtNum(totalBills), bg: "bg-violet-50 text-violet-600 border-violet-100" },
            { icon: TrendingUp, label: "Total Revenue", value: fmt(totalRevenue), bg: "bg-amber-50 text-amber-600 border-amber-100" },
          ].map(({ icon: Icon, label, value, bg }) => (
            <div key={label} className="p-5 rounded-2xl bg-white border border-[#dbe6f5] flex items-center gap-4 shadow-sm">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-xs text-[#6b7f99] font-semibold uppercase tracking-wide">{label}</p>
                <p className="text-xl font-extrabold text-[#0e2a4a] mt-0.5 leading-tight">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-3 bh-in" style={{ animationDelay: "80ms" }}>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8fa4be] pointer-events-none" />
          <input
            id="hotel-bills-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search hotel, email, owner, city…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#dbe6f5] bg-white text-sm text-[#0e2a4a] placeholder:text-[#8fa4be] outline-none focus:ring-2 focus:ring-[#3b82f0]/25 focus:border-[#3b82f0] transition shadow-sm"
          />
        </div>
        <select
          id="hotel-bills-status"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-[#dbe6f5] bg-white text-sm text-[#0e2a4a] outline-none focus:ring-2 focus:ring-[#3b82f0]/25 focus:border-[#3b82f0] transition shadow-sm"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="expired">Expired</option>
          {/* <option value="cancelled">Cancelled</option> */}
        </select>
        {planOptions.length > 0 && (
          <select
            id="hotel-bills-plan"
            value={filterPlan}
            onChange={e => setFilterPlan(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[#dbe6f5] bg-white text-sm text-[#0e2a4a] outline-none focus:ring-2 focus:ring-[#3b82f0]/25 focus:border-[#3b82f0] transition shadow-sm"
          >
            <option value="all">All Plans</option>
            {planOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
     
      </div>

      {/* TABLE */}
      <div className="rounded-3xl bg-white shadow-[0_18px_45px_rgba(6,20,52,0.18)] overflow-hidden bh-in" style={{ animationDelay: "120ms" }}>
        {loading ? (
          <Skeleton />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#eaf3ff] text-[#2568e0] flex items-center justify-center">
              <Building2 size={26} />
            </div>
            <h3 className="mt-3 font-bold text-[#0e2a4a]">No Hotels Found</h3>
            <p className="text-sm text-[#6b7f99] mt-1">Adjust your filters or wait for hotels to register.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-[#f8fbff]">
                    {["Hotel", "Owner", "Plan", "Sub Status", "Bills", "Revenue", "Branches", "Registered", ""].map((h, i) => (
                      <th key={i} className={`px-4 py-3 text-[11px] font-bold text-[#5b7089] uppercase tracking-[0.09em] whitespace-nowrap ${i >= 4 && i <= 7 ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map((h, i) => (
                    <tr
                      key={h._id || i}
                      className="bh-row hover:bg-[#f4f9ff] transition-colors cursor-pointer group"
                      style={{ animationDelay: `${i * 35}ms` }}
                      onClick={() => setSelectedHotel(h)}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={h.hotelName || h.name} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#0e2a4a] truncate max-w-[150px]">{h.hotelName || h.name || "—"}</p>
                            <p className="text-[11px] text-[#6b7f99] truncate max-w-[150px]">{h.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-[#0e2a4a] font-medium">{h.ownerName || "—"}</td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-[#0e2a4a]">{h.planName}</td>
                      <td className="px-4 py-3.5"><Badge status={h.subStatus} /></td>
                      <td className="px-4 py-3.5 text-right"><span className="text-sm font-bold text-[#0e2a4a]">{fmtNum(h.billsCount)}</span></td>
                      <td className="px-4 py-3.5 text-right"><span className="text-sm font-bold text-emerald-700">{fmt(h.revenue)}</span></td>
                      <td className="px-4 py-3.5 text-right"><span className="text-sm font-semibold text-[#0e2a4a]">{fmtNum(h.hBranches?.length || 0)}</span></td>
                      <td className="px-4 py-3.5 text-right text-xs text-[#6b7f99]">{fmtDate(h.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <button
                          id={`view-hotel-bill-${h._id || i}`}
                          className="opacity-0 group-hover:opacity-100 transition inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#dbe6f5] bg-white hover:bg-[#eaf3ff] hover:border-[#a8cbff] text-xs font-semibold text-[#0e2a4a]"
                          onClick={e => { e.stopPropagation(); setSelectedHotel(h); }}
                        >
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginated.map((h, i) => (
                <div
                  key={h._id || i}
                  className="p-4 hover:bg-[#f4f9ff] transition cursor-pointer bh-row"
                  style={{ animationDelay: `${i * 35}ms` }}
                  onClick={() => setSelectedHotel(h)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={h.hotelName || h.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#0e2a4a] truncate">{h.hotelName || h.name}</p>
                      <p className="text-xs text-[#6b7f99] truncate">{h.email}</p>
                    </div>
                    <Badge status={h.subStatus} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-[#f4f8fd] rounded-xl">
                      <p className="text-[10px] text-[#6b7f99] font-medium">Bills</p>
                      <p className="text-sm font-extrabold text-[#0e2a4a]">{fmtNum(h.billsCount)}</p>
                    </div>
                    <div className="text-center p-2 bg-[#f4f8fd] rounded-xl">
                      <p className="text-[10px] text-[#6b7f99] font-medium">Revenue</p>
                      <p className="text-xs font-extrabold text-emerald-700">{fmt(h.revenue)}</p>
                    </div>
                    <div className="text-center p-2 bg-[#f4f8fd] rounded-xl">
                      <p className="text-[10px] text-[#6b7f99] font-medium">Branches</p>
                      <p className="text-sm font-extrabold text-[#0e2a4a]">{h.hBranches?.length || 0}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#6b7f99] mt-2">Plan: <span className="font-semibold text-[#0e2a4a]">{h.planName}</span></p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-[#f8fbff]">
                <p className="text-xs text-[#6b7f99] font-medium">
                  Showing {((safePage - 1) * PAGE) + 1}–{Math.min(safePage * PAGE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <button id="hotel-bills-prev" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    className="p-2 rounded-xl border border-[#dbe6f5] bg-white hover:bg-[#eaf3ff] text-[#0e2a4a] disabled:opacity-40 transition">
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, k) => {
                    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                    return start + k;
                  }).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition ${p === safePage ? "bg-[#2568e0] text-white shadow shadow-blue-400/25" : "border border-[#dbe6f5] bg-white text-[#0e2a4a] hover:bg-[#eaf3ff]"}`}>
                      {p}
                    </button>
                  ))}
                  <button id="hotel-bills-next" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    className="p-2 rounded-xl border border-[#dbe6f5] bg-white hover:bg-[#eaf3ff] text-[#0e2a4a] disabled:opacity-40 transition">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL */}
      {selectedHotel && (
        <HotelModal
          hotel={selectedHotel}
          subscription={modalSub}
          branches={branches}
          invoices={invoices}
          onClose={() => setSelectedHotel(null)}
        />
      )}
    </div>
  );
}
