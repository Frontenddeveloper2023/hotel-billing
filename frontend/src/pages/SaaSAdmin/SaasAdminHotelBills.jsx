import React, { memo, useCallback, useEffect, useMemo, useState } from "react";

import {
  Building2,
  Search,
  RefreshCw,
  X,
  TrendingUp,
  Receipt,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock3,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Mail,
  Phone,
  Layers,
  Calendar,
  BarChart3,
  ShieldCheck,
  AlertCircle,
  Users,
  Eye,
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

  return isNaN(dt)
    ? "N/A"
    : dt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const fmtNum = (n) =>
  new Intl.NumberFormat("en-IN").format(Number(n || 0));

const statusColor = (s) => {
  const k = String(s || "").toLowerCase();

  if (["active", "approved"].includes(k))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";

  if (["pending", "trial"].includes(k))
    return "bg-amber-50 text-amber-700 border-amber-200";

  if (["expired", "cancelled", "rejected"].includes(k))
    return "bg-red-50 text-red-700 border-red-200";

  if (k === "suspended")
    return "bg-orange-50 text-orange-700 border-orange-200";

  return "bg-slate-50 text-slate-500 border-slate-200";
};

const StatusIcon = ({ s }) => {
  const k = String(s || "").toLowerCase();

  if (k === "active")
    return <CheckCircle2 size={11} />;

  if (["expired", "cancelled"].includes(k))
    return <XCircle size={11} />;

  return <Clock3 size={11} />;
};

const pickArr = (r, key) => {
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.data)) return r.data;
  if (Array.isArray(r?.data?.[key])) return r.data[key];
  if (Array.isArray(r?.[key])) return r[key];

  return [];
};

// Extract the grand total from an invoice
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
  <span
    className={`
      inline-flex
      max-w-full
      shrink-0
      items-center
      gap-1
      rounded-full
      border
      px-2
      py-0.5
      text-[10px]
      font-semibold
      whitespace-nowrap
      sm:px-2.5
      sm:text-[11px]
      ${statusColor(status)}
    `}
  >
    <StatusIcon s={status} />

    <span className="truncate">
      {String(status || "Unknown")
        .replace(/\_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  </span>
));

const Avatar = ({ name }) => (
  <div
    className="
      flex
      h-9
      w-9
      shrink-0
      items-center
      justify-center
      rounded-xl
      bg-gradient-to-br
      from-[#5b9bf5]
      to-[#2568e0]
      text-xs
      font-bold
      text-white
      shadow
      shadow-blue-400/30
      sm:h-10
      sm:w-10
      sm:text-sm
    "
  >
    {(name || "H").trim().charAt(0).toUpperCase()}
  </div>
);

const Skeleton = () => (
  <div className="w-full min-w-0 space-y-3 p-3 sm:p-5">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="
          h-14
          w-full
          rounded-2xl
          bg-slate-100
          animate-pulse
          sm:h-16
        "
      />
    ))}
  </div>
);

const InfoRow = ({ icon: Icon, label, value }) => (
  <div
    className="
      flex
      min-w-0
      items-start
      gap-2.5
      rounded-2xl
      bg-[#f4f8fd]
      p-3
      sm:gap-3
      sm:p-4
    "
  >
    {Icon && (
      <Icon
        size={15}
        className="mt-0.5 shrink-0 text-[#6b7f99]"
      />
    )}

    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium text-[#6b7f99] sm:text-xs">
        {label}
      </p>

      <p
        className="
          mt-0.5
          break-words
          text-xs
          font-semibold
          leading-5
          text-[#0e2a4a]
          sm:text-sm
        "
      >
        {value || "N/A"}
      </p>
    </div>
  </div>
);

/* =========================================================
   HOTEL DETAIL MODAL
========================================================= */

const HotelModal = memo(
  ({ hotel, subscription, branches, invoices, onClose }) => {
    if (!hotel) return null;

    const hotelBranches = branches.filter(
      (b) =>
        b.hotelId === hotel._id ||
        b.hotelId?._id === hotel._id ||
        b.parentHotelId === hotel._id
    );

    const hotelInvoices = invoices.filter(
      (inv) =>
        inv.hotelId === hotel._id ||
        inv.hotelId?._id === hotel._id
    );

    const totalRevenue = hotelInvoices.reduce(
      (s, inv) => s + getInvAmount(inv),
      0
    );

    const paidRevenue = hotelInvoices
      .filter((inv) =>
        ["paid", "completed", "PAID"].includes(
          String(getInvStatus(inv)).toLowerCase()
        )
      )
      .reduce((s, inv) => s + getInvAmount(inv), 0);

    const plan = subscription?.planId || subscription?.plan || {};

    const planName =
      plan?.planName ||
      plan?.name ||
      subscription?.planName ||
      subscription?.planId?.planName ||
      "N/A";

    const subStatus = subscription?.status || "unknown";

    const purchasedAt =
      subscription?.createdAt ||
      subscription?.purchasedAt ||
      subscription?.startDate;

    const validUntil =
      subscription?.endDate ||
      subscription?.validUntil ||
      subscription?.expiresAt;

    const billingCycle = subscription?.billingCycle || "—";

    return (
      <div
        className="
          fixed
          inset-0
          z-50
          flex
          items-center
          justify-center
          overflow-y-auto
          p-2
          sm:p-4
        "
        style={{
          background: "rgba(10,25,55,0.6)",
          backdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      >
        <div
          className="
            relative
            flex
            max-h-[96vh]
            w-full
            max-w-2xl
            flex-col
            overflow-hidden
            rounded-2xl
            bg-white
            shadow-[0_32px_80px_rgba(6,20,52,0.30)]
            sm:max-h-[92vh]
            sm:rounded-[28px]
          "
          style={{
            animation:
              "bhpop .28s cubic-bezier(.2,.8,.2,1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            @keyframes bhpop {
              from {
                opacity: 0;
                transform: translateY(20px) scale(.96);
              }
              to {
                opacity: 1;
                transform: none;
              }
            }
          `}</style>

          {/* Header */}
          <div
            className="
              flex
              min-w-0
              shrink-0
              items-center
              gap-2.5
              border-b
              border-slate-100
              bg-gradient-to-r
              from-[#f8fbff]
              to-white
              px-3
              py-3.5
              sm:gap-4
              sm:px-6
              sm:py-5
            "
          >
            <Avatar name={hotel.hotelName || hotel.name} />

            <div className="min-w-0 flex-1">
              <h2
                className="
                  truncate
                  text-base
                  font-extrabold
                  leading-tight
                  text-[#0e2a4a]
                  sm:text-lg
                "
              >
                {hotel.hotelName || hotel.name || "Hotel"}
              </h2>

              <p
                className="
                  mt-0.5
                  truncate
                  text-xs
                  text-[#6b7f99]
                  sm:text-sm
                "
              >
                {hotel.email || "—"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                text-slate-400
                transition
                hover:bg-slate-100
                hover:text-slate-600
                sm:h-10
                sm:w-10
              "
            >
              <X size={19} />
            </button>
          </div>

          {/* Scrollable body */}
          <div
            className="
              min-h-0
              flex-1
              space-y-5
              overflow-y-auto
              p-3
              sm:space-y-6
              sm:p-6
            "
            style={{ scrollbarWidth: "thin" }}
          >
            {/* Revenue Stats */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                className="
                  rounded-2xl
                  bg-gradient-to-br
                  from-blue-500
                  to-blue-700
                  p-4
                  text-white
                  shadow
                  shadow-blue-400/25
                  sm:p-5
                "
              >
                <p className="mb-1 text-[11px] font-semibold opacity-80 sm:text-xs">
                  Total Bills
                </p>

                <p className="text-2xl font-extrabold sm:text-3xl">
                  {fmtNum(hotelInvoices.length)}
                </p>

                <p className="mt-0.5 text-[10px] opacity-70 sm:text-[11px]">
                  Invoices generated
                </p>
              </div>

              <div
                className="
                  rounded-2xl
                  bg-gradient-to-br
                  from-emerald-500
                  to-emerald-700
                  p-4
                  text-white
                  shadow
                  shadow-emerald-400/25
                  sm:p-5
                "
              >
                <p className="mb-1 text-[11px] font-semibold opacity-80 sm:text-xs">
                  Total Revenue
                </p>

                <p className="break-words text-base font-extrabold leading-tight sm:text-lg">
                  {fmt(totalRevenue)}
                </p>

                <p className="mt-0.5 text-[10px] opacity-70 sm:text-[11px]">
                  All invoices
                </p>
              </div>
            </div>

            {/* Current Plan */}
            <div className="min-w-0">
              <h3
                className="
                  mb-3
                  flex
                  min-w-0
                  items-center
                  gap-2
                  text-xs
                  font-bold
                  text-[#0e2a4a]
                  sm:text-sm
                "
              >
                <CreditCard
                  size={15}
                  className="shrink-0 text-[#2568e0]"
                />

                <span>Current Subscription Plan</span>
              </h3>

              <div
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-[#dbe6f5]
                  bg-[#f8fbff]
                "
              >
                {/* Plan name + status row */}
                <div
                  className="
                    flex
                    min-w-0
                    flex-col
                    items-start
                    gap-2
                    border-b
                    border-[#dbe6f5]
                    p-3
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                    sm:gap-4
                    sm:p-4
                  "
                >
                  <p className="min-w-0 break-words text-sm font-extrabold text-[#0e2a4a] sm:text-base">
                    {planName}
                  </p>

                  <Badge status={subStatus} />
                </div>

                {/* Dates grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-[#dbe6f5]">
                  <div className="border-b border-[#dbe6f5] p-3 sm:border-b-0 sm:p-4">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#6b7f99] sm:text-[11px]">
                      Purchased Date
                    </p>

                    <p className="text-xs font-bold text-[#0e2a4a] sm:text-sm">
                      {fmtDate(purchasedAt)}
                    </p>
                  </div>

                  <div className="p-3 sm:p-4">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#6b7f99] sm:text-[11px]">
                      End Date
                    </p>

                    <p className="text-xs font-bold text-[#0e2a4a] sm:text-sm">
                      {fmtDate(validUntil)}
                    </p>
                  </div>
                </div>

                {billingCycle && billingCycle !== "—" && (
                  <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#6b7f99] sm:text-[11px]">
                      Billing Cycle
                    </p>

                    <p className="text-xs font-semibold capitalize text-[#0e2a4a] sm:text-sm">
                      {billingCycle}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Hotel Info */}
            <div className="min-w-0">
              <h3
                className="
                  mb-3
                  flex
                  items-center
                  gap-2
                  text-xs
                  font-bold
                  text-[#0e2a4a]
                  sm:text-sm
                "
              >
                <Building2
                  size={15}
                  className="shrink-0 text-[#2568e0]"
                />

                <span>Hotel Details</span>
              </h3>

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoRow
                  icon={Users}
                  label="Owner"
                  value={hotel.ownerName || hotel.owner}
                />

                <InfoRow
                  icon={Mail}
                  label="Email"
                  value={hotel.email}
                />

                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={hotel.phone}
                />

                <InfoRow
                  icon={MapPin}
                  label="Location"
                  value={[
                    hotel.address?.city,
                    hotel.address?.state,
                    hotel.address?.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />

                <InfoRow
                  icon={Calendar}
                  label="Registered On"
                  value={fmtDate(hotel.createdAt)}
                />

                <InfoRow
                  icon={ShieldCheck}
                  label="Status"
                  value={hotel.status || "active"}
                />
              </div>
            </div>

            {/* Sub-branches */}
            <div className="min-w-0">
              <h3
                className="
                  mb-3
                  flex
                  items-center
                  gap-2
                  text-xs
                  font-bold
                  text-[#0e2a4a]
                  sm:text-sm
                "
              >
                <Layers
                  size={15}
                  className="shrink-0 text-[#2568e0]"
                />

                <span>Branches</span>

                <span
                  className="
                    ml-auto
                    shrink-0
                    rounded-full
                    bg-[#2568e0]
                    px-2.5
                    py-0.5
                    text-[10px]
                    font-semibold
                    text-white
                    sm:text-[11px]
                  "
                >
                  {hotelBranches.length}
                </span>
              </h3>

              {hotelBranches.length === 0 ? (
                <p
                  className="
                    rounded-2xl
                    bg-[#f4f8fd]
                    p-3
                    text-center
                    text-xs
                    text-[#6b7f99]
                    sm:p-4
                    sm:text-sm
                  "
                >
                  No sub-branches registered.
                </p>
              ) : (
                <div
                  className="
                    max-h-44
                    space-y-2
                    overflow-y-auto
                    pr-1
                  "
                  style={{ scrollbarWidth: "thin" }}
                >
                  {hotelBranches.map((b, i) => (
                    <div
                      key={b._id || i}
                      className="
                        flex
                        min-w-0
                        items-center
                        gap-2.5
                        rounded-xl
                        border
                        border-[#dbe6f5]
                        bg-[#f4f8fd]
                        p-2.5
                        sm:gap-3
                        sm:p-3
                      "
                    >
                      <div
                        className="
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-lg
                          bg-gradient-to-br
                          from-[#5b9bf5]
                          to-[#2568e0]
                          text-xs
                          font-bold
                          text-white
                        "
                      >
                        {(b.branchName || b.name || "B")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[#0e2a4a] sm:text-sm">
                          {b.branchName || b.name}
                        </p>
                      </div>

                      <Badge status={b.status || "active"} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Bills */}
            {hotelInvoices.length > 0 && (
              <div className="min-w-0">
                <h3
                  className="
                    mb-3
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-bold
                    text-[#0e2a4a]
                    sm:text-sm
                  "
                >
                  <Receipt
                    size={15}
                    className="shrink-0 text-[#2568e0]"
                  />

                  <span>Recent Bills</span>

                  <span
                    className="
                      ml-auto
                      shrink-0
                      rounded-full
                      bg-[#2568e0]
                      px-2.5
                      py-0.5
                      text-[10px]
                      font-semibold
                      text-white
                      sm:text-[11px]
                    "
                  >
                    {hotelInvoices.length}
                  </span>
                </h3>

                <div
                  className="
                    max-h-52
                    space-y-2
                    overflow-y-auto
                    pr-1
                  "
                  style={{ scrollbarWidth: "thin" }}
                >
                  {hotelInvoices.slice(0, 20).map((inv, i) => (
                    <div
                      key={inv._id || i}
                      className="
                        flex
                        min-w-0
                        items-center
                        gap-2.5
                        rounded-xl
                        border
                        border-[#dbe6f5]
                        bg-[#f4f8fd]
                        p-2.5
                        sm:gap-3
                        sm:p-3
                      "
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[#0e2a4a]">
                          {getInvNo(inv, i)}
                        </p>

                        <p className="mt-0.5 truncate text-[10px] text-[#6b7f99] sm:text-[11px]">
                          {fmtDate(
                            inv.createdAt ||
                              inv.invoiceDate ||
                              inv.date
                          )}
                        </p>
                      </div>

                      <p className="shrink-0 text-xs font-bold text-[#0e2a4a] sm:text-sm">
                        {fmt(getInvAmount(inv))}
                      </p>

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
  }
);

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

      setHotels(
        hR.status === "fulfilled"
          ? pickArr(hR.value, "hotels")
          : []
      );

      setSubscriptions(
        sR.status === "fulfilled"
          ? pickArr(sR.value, "subscriptions")
          : []
      );

      setBranches(
        bR.status === "fulfilled"
          ? pickArr(bR.value, "branches")
          : []
      );

      setInvoices(
        iR.status === "fulfilled"
          ? pickArr(iR.value, "invoices")
          : []
      );
    } catch (e) {
      setError(e?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const enriched = useMemo(
    () =>
      hotels.map((h) => {
        const sub = subscriptions.find(
          (s) =>
            s.hotelId === h._id ||
            s.hotelId?._id === h._id
        );

        const hBranches = branches.filter(
          (b) =>
            b.hotelId === h._id ||
            b.hotelId?._id === h._id ||
            b.parentHotelId === h._id
        );

        const hInvoices = invoices.filter((inv) => {
          const invHotelId = String(
            inv.hotelId?._id ||
              inv.hotelId ||
              ""
          );

          return invHotelId === String(h._id);
        });

        const revenue = hInvoices.reduce(
          (s, inv) => s + getInvAmount(inv),
          0
        );

        const planName =
          sub?.planId?.planName ||
          sub?.planId?.name ||
          sub?.plan?.planName ||
          sub?.plan?.name ||
          sub?.planName ||
          "N/A";

        const subStatus = sub?.status || "unknown";

        return {
          ...h,
          sub,
          hBranches,
          hInvoices,
          revenue,
          billsCount: hInvoices.length,
          planName,
          subStatus,
        };
      }),
    [hotels, subscriptions, branches, invoices]
  );

  const planOptions = useMemo(() => {
    const s = new Set(enriched.map((h) => h.planName));

    return Array.from(s).filter(
      (p) => p && p !== "N/A"
    );
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return enriched.filter((h) => {
      const nm = (
        h.hotelName ||
        h.name ||
        ""
      ).toLowerCase();

      const em = (h.email || "").toLowerCase();

      const ow = (
        h.ownerName ||
        ""
      ).toLowerCase();

      const ci = (
        h.address?.city ||
        ""
      ).toLowerCase();

      if (
        q &&
        ![nm, em, ow, ci].some((f) =>
          f.includes(q)
        )
      )
        return false;

      if (
        filterStatus !== "all" &&
        h.subStatus !== filterStatus
      )
        return false;

      if (
        filterPlan !== "all" &&
        h.planName !== filterPlan
      )
        return false;

      return true;
    });
  }, [
    enriched,
    search,
    filterStatus,
    filterPlan,
  ]);

  const totalRevenue = useMemo(
    () =>
      filtered.reduce(
        (s, h) => s + h.revenue,
        0
      ),
    [filtered]
  );

  const totalBills = useMemo(
    () =>
      filtered.reduce(
        (s, h) => s + h.billsCount,
        0
      ),
    [filtered]
  );

  const activeCount = useMemo(
    () =>
      filtered.filter(
        (h) => h.subStatus === "active"
      ).length,
    [filtered]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE)
  );

  const safePage = Math.min(
    page,
    totalPages
  );

  const paginated = filtered.slice(
    (safePage - 1) * PAGE,
    safePage * PAGE
  );

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterPlan]);

  const modalSub = selectedHotel
    ? subscriptions.find(
        (s) =>
          s.hotelId === selectedHotel._id ||
          s.hotelId?._id === selectedHotel._id
      )
    : null;

  return (
    <div
      className="
        w-full
        min-w-0
        space-y-4
        overflow-x-hidden
        sm:space-y-5
        lg:space-y-6
      "
    >
      <style>{`
        @keyframes bh-up {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }

        .bh-in {
          opacity: 0;
          animation: bh-up .45s cubic-bezier(.2,.7,.2,1) forwards;
        }

        .bh-row {
          opacity: 0;
          animation: bh-up .35s ease-out forwards;
        }
      `}</style>

      {/* HEADER */}
      <header
        className="
          bh-in
          flex
          min-w-0
          flex-col
          items-start
          gap-3
          sm:flex-row
          sm:items-center
        "
        style={{ animationDelay: "0ms" }}
      >
        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-gradient-to-br
            from-[#5b9bf5]
            to-[#2568e0]
            text-white
            shadow
            shadow-blue-400/30
            sm:h-11
            sm:w-11
          "
        >
          <BarChart3 size={20} />
        </div>

        <div className="min-w-0">
          <h1
            className="
              break-words
              text-lg
              font-extrabold
              leading-tight
              text-white
              sm:text-xl
            "
          >
            Hotel Bills &amp; Revenue
          </h1>

          <p
            className="
              mt-0.5
              break-words
              text-[11px]
              leading-4
              text-blue-200/70
              sm:text-xs
            "
          >
            All registered hotels · billing summary · plan status
          </p>
        </div>
      </header>

      {/* ERROR */}
      {error && (
        <div
          className="
            flex
            min-w-0
            items-start
            gap-2.5
            rounded-2xl
            border
            border-red-200
            bg-red-50
            p-3
            text-xs
            text-red-700
            bh-in
            sm:items-center
            sm:gap-3
            sm:p-4
            sm:text-sm
          "
        >
          <AlertCircle
            size={17}
            className="mt-0.5 shrink-0 sm:mt-0"
          />

          <span className="min-w-0 flex-1 break-words">
            {error}
          </span>

          <button
            type="button"
            onClick={fetchAll}
            className="
              shrink-0
              text-[11px]
              font-bold
              underline
              sm:text-xs
            "
          >
            Retry
          </button>
        </div>
      )}

      {/* STATS */}
      {!loading && (
        <div
          className="
            grid
            grid-cols-1
            gap-3
            bh-in
            sm:grid-cols-2
            sm:gap-4
            lg:grid-cols-4
          "
          style={{ animationDelay: "40ms" }}
        >
          {[
            {
              icon: Building2,
              label: "Total Hotels",
              value: fmtNum(filtered.length),
              bg: "bg-blue-50 text-blue-600 border-blue-100",
            },
            {
              icon: Receipt,
              label: "Total Bills",
              value: fmtNum(totalBills),
              bg: "bg-violet-50 text-violet-600 border-violet-100",
            },
            {
              icon: TrendingUp,
              label: "Total Revenue",
              value: fmt(totalRevenue),
              bg: "bg-amber-50 text-amber-600 border-amber-100",
            },
          ].map(
            ({
              icon: Icon,
              label,
              value,
              bg,
            }) => (
              <div
                key={label}
                className="
                  flex
                  min-w-0
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-[#dbe6f5]
                  bg-white
                  p-4
                  shadow-sm
                  sm:gap-4
                  sm:p-5
                "
              >
                <div
                  className={`
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    sm:h-11
                    sm:w-11
                    ${bg}
                  `}
                >
                  <Icon size={21} />
                </div>

                <div className="min-w-0">
                  <p
                    className="
                      truncate
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-[#6b7f99]
                      sm:text-xs
                    "
                  >
                    {label}
                  </p>

                  <p
                    className="
                      mt-0.5
                      break-words
                      text-lg
                      font-extrabold
                      leading-tight
                      text-[#0e2a4a]
                      sm:text-xl
                    "
                  >
                    {value}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* FILTER BAR */}
      <div
        className="
          bh-in
          flex
          min-w-0
          flex-col
          gap-3
          sm:flex-row
        "
        style={{ animationDelay: "80ms" }}
      >
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="
              pointer-events-none
              absolute
              left-3.5
              top-1/2
              -translate-y-1/2
              text-[#8fa4be]
            "
          />

          <input
            id="hotel-bills-search"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search hotel, email, owner, city…"
            className="
              h-11
              w-full
              rounded-xl
              border
              border-[#dbe6f5]
              bg-white
              pl-9
              pr-4
              text-xs
              text-[#0e2a4a]
              outline-none
              placeholder:text-[#8fa4be]
              focus:border-[#3b82f0]
              focus:ring-2
              focus:ring-[#3b82f0]/25
              transition
              shadow-sm
              sm:text-sm
            "
          />
        </div>

        <select
          id="hotel-bills-status"
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value)
          }
          className="
            h-11
            w-full
            min-w-0
            rounded-xl
            border
            border-[#dbe6f5]
            bg-white
            px-3
            text-xs
            text-[#0e2a4a]
            outline-none
            focus:border-[#3b82f0]
            focus:ring-2
            focus:ring-[#3b82f0]/25
            transition
            shadow-sm
            sm:w-auto
            sm:min-w-[150px]
            sm:px-4
            sm:text-sm
          "
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
            onChange={(e) =>
              setFilterPlan(e.target.value)
            }
            className="
              h-11
              w-full
              min-w-0
              rounded-xl
              border
              border-[#dbe6f5]
              bg-white
              px-3
              text-xs
              text-[#0e2a4a]
              outline-none
              focus:border-[#3b82f0]
              focus:ring-2
              focus:ring-[#3b82f0]/25
              transition
              shadow-sm
              sm:w-auto
              sm:min-w-[150px]
              sm:px-4
              sm:text-sm
            "
          >
            <option value="all">All Plans</option>

            {planOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* TABLE */}
      <div
        className="
          bh-in
          w-full
          min-w-0
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-[0_18px_45px_rgba(6,20,52,0.18)]
          sm:rounded-3xl
        "
        style={{ animationDelay: "120ms" }}
      >
        {loading ? (
          <Skeleton />
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center sm:py-16">
            <div
              className="
                mx-auto
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-[#eaf3ff]
                text-[#2568e0]
                sm:h-14
                sm:w-14
              "
            >
              <Building2 size={25} />
            </div>

            <h3 className="mt-3 text-sm font-bold text-[#0e2a4a] sm:text-base">
              No Hotels Found
            </h3>

            <p className="mx-auto mt-1 max-w-md px-2 text-xs leading-5 text-[#6b7f99] sm:text-sm">
              Adjust your filters or wait for hotels to register.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden w-full overflow-x-auto md:block">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-[#f8fbff]">
                    {[
                      "Hotel",
                      "Owner",
                      "Plan",
                      "Sub Status",
                      "Bills",
                      "Revenue",
                      "Branches",
                      "Registered",
                      "",
                    ].map((h, i) => (
                      <th
                        key={i}
                        className={`
                          whitespace-nowrap
                          px-4
                          py-3
                          text-[11px]
                          font-bold
                          uppercase
                          tracking-[0.09em]
                          text-[#5b7089]
                          ${
                            i >= 4 && i <= 7
                              ? "text-right"
                              : "text-left"
                          }
                        `}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {paginated.map((h, i) => (
                    <tr
                      key={h._id || i}
                      className="
                        bh-row
                        cursor-pointer
                        transition-colors
                        hover:bg-[#f4f9ff]
                        group
                      "
                      style={{
                        animationDelay: `${i * 35}ms`,
                      }}
                      onClick={() =>
                        setSelectedHotel(h)
                      }
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            name={
                              h.hotelName || h.name
                            }
                          />

                          <div className="min-w-0">
                            <p className="max-w-[150px] truncate text-sm font-bold text-[#0e2a4a]">
                              {h.hotelName ||
                                h.name ||
                                "—"}
                            </p>

                            <p className="max-w-[150px] truncate text-[11px] text-[#6b7f99]">
                              {h.email || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-sm font-medium text-[#0e2a4a]">
                        {h.ownerName || "—"}
                      </td>

                      <td className="px-4 py-3.5 text-sm font-semibold text-[#0e2a4a]">
                        {h.planName}
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge status={h.subStatus} />
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-bold text-[#0e2a4a]">
                          {fmtNum(h.billsCount)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-bold text-emerald-700">
                          {fmt(h.revenue)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-semibold text-[#0e2a4a]">
                          {fmtNum(
                            h.hBranches?.length || 0
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right text-xs text-[#6b7f99]">
                        {fmtDate(h.createdAt)}
                      </td>

                      <td className="px-4 py-3.5">
                        <button
                          id={`view-hotel-bill-${h._id || i}`}
                          type="button"
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-xl
                            border
                            border-[#dbe6f5]
                            bg-white
                            px-3
                            py-1.5
                            text-xs
                            font-semibold
                            text-[#0e2a4a]
                            opacity-0
                            transition
                            group-hover:opacity-100
                            hover:border-[#a8cbff]
                            hover:bg-[#eaf3ff]
                          "
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHotel(h);
                          }}
                        >
                          <Eye size={13} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {paginated.map((h, i) => (
                <div
                  key={h._id || i}
                  className="
                    bh-row
                    min-w-0
                    cursor-pointer
                    p-3
                    transition
                    hover:bg-[#f4f9ff]
                    sm:p-4
                  "
                  style={{
                    animationDelay: `${i * 35}ms`,
                  }}
                  onClick={() =>
                    setSelectedHotel(h)
                  }
                >
                  <div
                    className="
                      mb-3
                      flex
                      min-w-0
                      items-start
                      gap-2.5
                      sm:gap-3
                    "
                  >
                    <Avatar
                      name={
                        h.hotelName || h.name
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#0e2a4a]">
                        {h.hotelName || h.name}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-[#6b7f99] sm:text-xs">
                        {h.email}
                      </p>
                    </div>

                    <Badge status={h.subStatus} />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="min-w-0 rounded-xl bg-[#f4f8fd] p-2 text-center">
                      <p className="text-[10px] font-medium text-[#6b7f99]">
                        Bills
                      </p>

                      <p className="text-sm font-extrabold text-[#0e2a4a]">
                        {fmtNum(h.billsCount)}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-xl bg-[#f4f8fd] p-2 text-center">
                      <p className="text-[10px] font-medium text-[#6b7f99]">
                        Revenue
                      </p>

                      <p className="truncate text-xs font-extrabold text-emerald-700">
                        {fmt(h.revenue)}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-xl bg-[#f4f8fd] p-2 text-center">
                      <p className="text-[10px] font-medium text-[#6b7f99]">
                        Branches
                      </p>

                      <p className="text-sm font-extrabold text-[#0e2a4a]">
                        {h.hBranches?.length || 0}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 truncate text-xs text-[#6b7f99]">
                    Plan:{" "}
                    <span className="font-semibold text-[#0e2a4a]">
                      {h.planName}
                    </span>
                  </p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                className="
                  flex
                  min-w-0
                  flex-col
                  gap-3
                  border-t
                  border-slate-100
                  bg-[#f8fbff]
                  px-3
                  py-3
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                  sm:px-5
                  sm:py-4
                "
              >
                <p className="text-center text-[11px] font-medium text-[#6b7f99] sm:text-left sm:text-xs">
                  Showing{" "}
                  {((safePage - 1) * PAGE) + 1}–
                  {Math.min(
                    safePage * PAGE,
                    filtered.length
                  )}{" "}
                  of {filtered.length}
                </p>

                <div
                  className="
                    flex
                    items-center
                    justify-center
                    gap-1.5
                    sm:gap-2
                  "
                >
                  <button
                    id="hotel-bills-prev"
                    type="button"
                    onClick={() =>
                      setPage((p) =>
                        Math.max(1, p - 1)
                      )
                    }
                    disabled={safePage === 1}
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-[#dbe6f5]
                      bg-white
                      text-[#0e2a4a]
                      transition
                      hover:bg-[#eaf3ff]
                      disabled:opacity-40
                      sm:h-9
                      sm:w-9
                    "
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from(
                      {
                        length: Math.min(
                          5,
                          totalPages
                        ),
                      },
                      (_, k) => {
                        const start = Math.max(
                          1,
                          Math.min(
                            safePage - 2,
                            totalPages - 4
                          )
                        );

                        return start + k;
                      }
                    ).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`
                          flex
                          h-8
                          w-8
                          items-center
                          justify-center
                          rounded-xl
                          text-xs
                          font-bold
                          transition
                          sm:h-9
                          sm:w-9
                          ${
                            p === safePage
                              ? "bg-[#2568e0] text-white shadow shadow-blue-400/25"
                              : "border border-[#dbe6f5] bg-white text-[#0e2a4a] hover:bg-[#eaf3ff]"
                          }
                        `}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    id="hotel-bills-next"
                    type="button"
                    onClick={() =>
                      setPage((p) =>
                        Math.min(
                          totalPages,
                          p + 1
                        )
                      )
                    }
                    disabled={
                      safePage === totalPages
                    }
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-[#dbe6f5]
                      bg-white
                      text-[#0e2a4a]
                      transition
                      hover:bg-[#eaf3ff]
                      disabled:opacity-40
                      sm:h-9
                      sm:w-9
                    "
                  >
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
          onClose={() =>
            setSelectedHotel(null)
          }
        />
      )}
    </div>
  );
}