import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Package, Plus, Search, RefreshCw, Pencil, Trash2, X, Check, AlertCircle, Clock3,
  Building2, Users, Utensils, BedDouble, CalendarDays, IndianRupee, Settings2,
  Crown, Gem, Rocket, Sparkles, Wallet, Gauge, Zap,
} from "lucide-react";

import { createPlan, getAllPlans, updatePlan, deletePlan } from "../../service/planApi";

// ======================================================
// DEFAULT FORM
// ======================================================

const initialForm = {
  planName: "",
  description: "",
  pricing: { monthly: "", quarterly: "", halfYearly: "", yearly: "" },
  limits: { rooms: 0, branches: 0, receptionists: 0 },
  features: { foodService: false, roomService: false },
  validityDays: 30,
  autoRenewalAllowed: true,
  isActive: true,
};

// Always hand out a fresh, deep copy so nothing shares references with initialForm.
const getFreshForm = () => ({
  ...initialForm,
  pricing: { ...initialForm.pricing },
  limits: { ...initialForm.limits },
  features: { ...initialForm.features },
});

// ======================================================
// HELPERS
// ======================================================

const getPlansFromResponse = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.plans)) return response.data.plans;
  if (Array.isArray(response?.plans)) return response.plans;
  return [];
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount || 0));

const numberValue = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

// ======================================================
// STYLE + SHARED UI
// ======================================================

const styles = `
@keyframes sp-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes sp-fade{from{opacity:0}to{opacity:1}}
@keyframes sp-pop{from{opacity:0;transform:translateY(22px) scale(.96)}to{opacity:1;transform:none}}
@keyframes sp-shine{from{transform:translateX(-120%)}to{transform:translateX(220%)}}
@keyframes sp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.sp-in{opacity:0;animation:sp-up .55s cubic-bezier(.2,.7,.2,1) forwards}
.sp-fade{animation:sp-fade .2s ease-out}
.sp-pop{animation:sp-pop .3s cubic-bezier(.2,.8,.2,1)}
.sp-float{animation:sp-float 3.5s ease-in-out infinite}
.sp-card:hover .sp-shine{animation:sp-shine .9s ease-out}
.sp-scroll{scrollbar-width:thin;scrollbar-color:#9db8e6 transparent}
@media (prefers-reduced-motion:reduce){.sp-in{animation:none;opacity:1}.sp-fade,.sp-pop,.sp-float,.sp-card:hover .sp-shine{animation:none}}
`;

const delay = (i) => ({ animationDelay: `${Math.min(i, 10) * 70}ms` });
const card = "rounded-3xl bg-white shadow-[0_18px_45px_rgba(6,20,52,0.28)]";
const fieldCls = "w-full px-3.5 py-2.5 rounded-xl border bg-[#f6f9fe] text-sm text-[#0e2a4a] outline-none transition placeholder:text-[#9aabc0]";
const okBorder = "border-[#dbe6f5] focus:bg-white focus:border-[#3b82f0] focus:ring-2 focus:ring-[#3b82f0]/20";
const btnBlue = "bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] hover:brightness-110 text-white shadow-md shadow-blue-500/25";

const tiers = [
  { grad: "from-[#5b9bf5] to-[#2568e0]", Icon: Rocket },
  { grad: "from-[#3b82f0] to-[#1d4fc4]", Icon: Crown },
  { grad: "from-[#4aa3ff] to-[#1f6fd8]", Icon: Gem },
  { grad: "from-[#6aa8f7] to-[#2f5fd0]", Icon: Sparkles },
];

// Must live OUTSIDE the main component (otherwise inputs remount on every keystroke and lose focus).
const InputField = ({ label, name, value, onChange, type = "text", placeholder, error, min }) => (
  <div>
    <label className="block text-[13px] font-semibold text-[#3d5473] mb-1.5">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      className={`${fieldCls} ${error ? "border-red-300 bg-white focus:ring-2 focus:ring-red-200" : okBorder}`}
    />
    {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
  </div>
);

const Toggle = ({ name, checked, onChange, title, desc, icon: Icon, tone = "blue" }) => {
  const tones = { blue: "text-[#2568e0] bg-[#eaf3ff]", orange: "text-orange-600 bg-orange-50", green: "text-emerald-600 bg-emerald-50" };
  return (
    <label className={`flex items-center gap-3 p-3.5 rounded-2xl border select-none cursor-pointer transition-all ${checked ? "border-[#3b82f0] bg-[#f2f8ff] shadow-sm" : "border-[#dbe6f5] hover:bg-[#f6f9fe]"}`}>
      {Icon && <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}><Icon size={19} /></div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0e2a4a]">{title}</p>
        <p className="text-xs text-[#6b7f99] mt-0.5">{desc}</p>
      </div>
      <input type="checkbox" name={name} checked={checked} onChange={onChange} className="peer sr-only cursor-pointer" />
      <span className="relative w-11 h-6 rounded-full bg-slate-300 peer-checked:bg-[#2568e0] transition-colors shrink-0 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-300" />
    </label>
  );
};

const Section = ({ icon: Icon, title, children }) => (
  <section className="rounded-2xl border border-[#e7eff8] p-4 sm:p-5">
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] text-white flex items-center justify-center"><Icon size={16} /></div>
      <h3 className="text-sm font-bold text-[#0e2a4a]">{title}</h3>
    </div>
    {children}
  </section>
);

const StatCard = memo(({ title, value, icon: Icon, cls, valueCls, loading, index }) => (
  <div style={delay(index)} className={`sp-in ${card} p-4 sm:p-5 hover:-translate-y-1 transition-transform duration-300`}>
    <div className="flex justify-between items-center gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b7f99]">{title}</p>
        <p className={`text-3xl font-extrabold tracking-tight mt-2 ${valueCls}`}>{loading ? "—" : value}</p>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cls}`}><Icon size={22} /></div>
    </div>
  </div>
));

const PlanCard = memo(({ plan, index, onEdit, onDelete, deleting }) => {
  const { grad, Icon } = tiers[index % tiers.length];
  return (
    <div style={delay(index + 4)} className={`sp-in sp-card ${card} overflow-hidden flex flex-col hover:-translate-y-1.5 hover:shadow-[0_26px_60px_rgba(6,20,52,0.4)] transition-all duration-300`}>
      {/* Banner */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${grad} p-5 text-white`}>
        <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/10 blur-xl" />
        <div className="sp-shine absolute inset-y-0 w-1/3 -skew-x-12 bg-white/15 -translate-x-[120%]" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="sp-float w-12 h-12 rounded-2xl bg-white/20 border border-white/25 backdrop-blur flex items-center justify-center shrink-0"><Icon size={22} /></div>
            <div className="min-w-0">
              <h2 className="font-bold text-lg truncate">{plan.planName}</h2>
              <p className="text-xs text-blue-100 mt-0.5 line-clamp-2">{plan.description || "No description"}</p>
            </div>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${plan.isActive ? "bg-emerald-400/25 border-emerald-200/40 text-emerald-50" : "bg-white/15 border-white/25 text-blue-100"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${plan.isActive ? "bg-emerald-300" : "bg-slate-300"}`} />
            {plan.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="relative mt-4 flex items-end gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight">{formatCurrency(plan.pricing?.monthly)}</span>
          <span className="pb-1 text-xs text-blue-100">/ month</span>
        </div>
      </div>

      {/* Pricing */}
      <div className="p-5 pb-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#6b7f99] uppercase tracking-[0.12em] mb-3"><Wallet size={13} /> Pricing</p>
        <div className="grid grid-cols-2 gap-2.5">
          {[["Monthly", "monthly"], ["Quarterly", "quarterly"], ["Half Yearly", "halfYearly"], ["Yearly", "yearly"]].map(([l, k]) => (
            <div key={k} className="bg-[#f4f8fd] hover:bg-[#eaf3ff] transition-colors rounded-xl p-3">
              <p className="text-[11px] text-[#6b7f99]">{l}</p>
              <p className="mt-1 font-bold text-[#0e2a4a]">{formatCurrency(plan.pricing?.[k])}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Limits */}
      <div className="px-5 pb-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#6b7f99] uppercase tracking-[0.12em] mb-3"><Gauge size={13} /> Limits</p>
        <div className="grid grid-cols-3 gap-2">
          {[[BedDouble, plan.limits?.rooms, "Rooms"], [Building2, plan.limits?.branches, "Branches"], [Users, plan.limits?.receptionists, "Receptionists"]].map(([I, v, l]) => (
            <div key={l} className="text-center p-3 rounded-xl border border-[#e7eff8]">
              <I size={17} className="mx-auto text-[#2568e0]" />
              <p className="text-lg font-extrabold text-[#0e2a4a] mt-1">{v ?? 0}</p>
              <p className="text-[10px] text-[#6b7f99] truncate">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="px-5 pb-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#6b7f99] uppercase tracking-[0.12em] mb-3"><Zap size={13} /> Features</p>
        <div className="flex flex-wrap gap-2">
          {plan.features?.foodService && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-semibold"><Utensils size={13} /> Food Service</span>
          )}
          {plan.features?.roomService && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#eaf3ff] text-[#2568e0] text-xs font-semibold"><BedDouble size={13} /> Room Service</span>
          )}
          {!plan.features?.foodService && !plan.features?.roomService && (
            <span className="text-xs text-[#9aabc0]">No additional features</span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="px-5 pb-5 grid grid-cols-2 gap-3">
        {[[CalendarDays, "Validity", `${plan.validityDays ?? 30} days`]].map(([I, l, v]) => (
          <div key={l} className="flex items-center gap-2.5 rounded-xl bg-[#f4f8fd] px-3 py-2.5">
            <I size={16} className="text-[#2568e0]" />
            <div>
              <p className="text-[10px] text-[#6b7f99]">{l}</p>
              <p className="text-xs font-bold text-[#0e2a4a]">{v}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-auto border-t border-[#e7eff8] p-4 flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(plan)}
          className={`flex-1 cursor-pointer inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition active:scale-95 ${btnBlue}`}
        >
          <Pencil size={15} /> Edit Plan
        </button>
        <button
          type="button"
          aria-label="Delete plan"
          onClick={() => onDelete(plan)}
          disabled={deleting}
          className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white text-sm font-semibold disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center active:scale-95"
          title="Delete plan"
        >
          {deleting ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
        </button>
      </div>
    </div>
  );
});

// ======================================================
// MAIN COMPONENT
// ======================================================

const SaaSAdminPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(getFreshForm());
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // FETCH PLANS
  const fetchPlans = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await getAllPlans();
      setPlans(getPlansFromResponse(response));
    } catch (err) {
      console.error("Get plans error:", err);
      setError(err?.message || err?.data?.message || "Unable to load plans.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // FILTER
  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return plans;
    return plans.filter((plan) => plan.planName?.toLowerCase().includes(query) || plan.description?.toLowerCase().includes(query));
  }, [plans, search]);

  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive).length, [plans]);
  const inactivePlans = useMemo(() => plans.filter((plan) => !plan.isActive).length, [plans]);

  // OPEN CREATE
  const handleCreate = () => {
    setEditingPlan(null);
    setForm(getFreshForm());
    setFormErrors({});
    setError("");
    setShowModal(true);
  };

  // OPEN EDIT
  const handleEdit = useCallback((plan) => {
    setEditingPlan(plan);
    setForm({
      planName: plan.planName || "",
      description: plan.description || "",
      pricing: {
        monthly: plan.pricing?.monthly ?? "",
        quarterly: plan.pricing?.quarterly ?? "",
        halfYearly: plan.pricing?.halfYearly ?? "",
        yearly: plan.pricing?.yearly ?? "",
      },
      limits: {
        rooms: plan.limits?.rooms ?? 0,
        branches: plan.limits?.branches ?? 0,
        receptionists: plan.limits?.receptionists ?? 0,
      },
      features: {
        foodService: plan.features?.foodService ?? false,
        roomService: plan.features?.roomService ?? false,
      },
      validityDays: plan.validityDays ?? 30,
      autoRenewalAllowed: plan.autoRenewalAllowed ?? true,
      isActive: plan.isActive ?? true,
    });
    setFormErrors({});
    setError("");
    setShowModal(true);
  }, []);

  // CLOSE MODAL
  const handleCloseModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingPlan(null);
    setForm(getFreshForm());
    setFormErrors({});
    setError("");
  };

  // FORM CHANGE
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((previous) => ({ ...previous, [name]: type === "checkbox" ? checked : value }));
    setFormErrors((previous) => ({ ...previous, [name]: "" }));
  };

  const handlePricingChange = (e) => {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, pricing: { ...previous.pricing, [name]: value } }));
    setFormErrors((previous) => ({ ...previous, pricing: "" }));
  };

  const handleLimitChange = (e) => {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, limits: { ...previous.limits, [name]: value } }));
    setFormErrors((previous) => ({ ...previous, [name]: "" }));
  };

  const handleFeatureChange = (e) => {
    const { name, checked } = e.target;
    setForm((previous) => ({ ...previous, features: { ...previous.features, [name]: checked } }));
  };

  // VALIDATION
  const validateForm = () => {
    const errors = {};

    if (!form.planName.trim()) errors.planName = "Plan name is required.";
    else if (form.planName.trim().length < 2) errors.planName = "Plan name must contain at least 2 characters.";

    const monthly = numberValue(form.pricing.monthly);
    const quarterly = numberValue(form.pricing.quarterly);
    const halfYearly = numberValue(form.pricing.halfYearly);
    const yearly = numberValue(form.pricing.yearly);

    if (monthly === 0 && quarterly === 0 && halfYearly === 0 && yearly === 0) {
      errors.pricing = "Please enter at least one pricing amount.";
    }
    if (numberValue(form.limits.rooms) < 0) errors.rooms = "Room limit cannot be negative.";
    if (numberValue(form.limits.branches) < 0) errors.branches = "Branch limit cannot be negative.";
    if (numberValue(form.limits.receptionists) < 0) errors.receptionists = "Receptionist limit cannot be negative.";
    if (numberValue(form.validityDays) < 1) errors.validityDays = "Validity must be at least 1 day.";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // SAVE PLAN
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError("");

      const planData = {
        planName: form.planName.trim(),
        description: form.description.trim(),
        pricing: {
          monthly: numberValue(form.pricing.monthly),
          quarterly: numberValue(form.pricing.quarterly),
          halfYearly: numberValue(form.pricing.halfYearly),
          yearly: numberValue(form.pricing.yearly),
        },
        limits: {
          rooms: numberValue(form.limits.rooms),
          branches: numberValue(form.limits.branches),
          receptionists: numberValue(form.limits.receptionists),
        },
        features: {
          foodService: Boolean(form.features.foodService),
          roomService: Boolean(form.features.roomService),
        },
        validityDays: numberValue(form.validityDays),
        autoRenewalAllowed: Boolean(form.autoRenewalAllowed),
        isActive: Boolean(form.isActive),
      };

      if (editingPlan) {
        await updatePlan(editingPlan._id, planData);
        setSuccessMessage(`Plan "${planData.planName}" updated successfully.`);
      } else {
        await createPlan(planData);
        setSuccessMessage(`Plan "${planData.planName}" created successfully.`);
      }

      handleCloseModal();
      await fetchPlans(true);
    } catch (err) {
      console.error("Save plan error:", err);
      setError(err?.message || err?.data?.message || "Unable to save the plan.");
    } finally {
      setSaving(false);
    }
  };

  // DELETE PLAN
  const handleDelete = useCallback(
    async (plan) => {
      if (!plan?._id) return;
      const confirmed = window.confirm(
        `Are you sure you want to delete "${plan.planName || "this plan"}"? This will permanently remove the plan.`
      );
      if (!confirmed) return;

      try {
        setDeletingId(plan._id);
        setError("");
        setSuccessMessage("");

        await deletePlan(plan._id);
        setSuccessMessage(`Plan "${plan.planName || "Plan"}" deleted successfully.`);

        // Optimistically remove from state so the card disappears immediately!
        setPlans((prev) => prev.filter((p) => String(p._id) !== String(plan._id)));

        // Background refetch to ensure database is in sync
        await fetchPlans(true);
      } catch (err) {
        console.error("Delete plan error:", err);
        setError(err?.message || err?.data?.message || "Unable to delete the plan.");
      } finally {
        setDeletingId(null);
      }
    },
    [fetchPlans]
  );

  // RENDER
  return (
    <div className="min-h-full font-['Inter']">
      <style>{styles}</style>
      <div className="max-w-[1440px] mx-auto">

        {/* HEADER */}
        <div className="sp-in flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            
            <h1 className="mt-1.5 text-[18px] sm:text-[24px] lg:text-[28px] leading-tight font-extrabold tracking-[-0.035em] text-white">SaaS Plans</h1>
          </div>

          <div className="flex items-center gap-3">
          

            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex cursor-pointer items-center gap-2 px-5 h-12 rounded-2xl bg-white text-[#1d4fc4] hover:bg-blue-50 hover:-translate-y-0.5 text-sm font-bold shadow-lg shadow-black/20 transition active:scale-95"
            >
              <Plus size={18} /> Add Plan
            </button>
          </div>
        </div>

        {/* SUCCESS */}
        {successMessage && (
          <div className="sp-pop mb-5 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 flex items-start gap-3">
            <Check size={19} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="sp-pop mb-5 p-4 rounded-2xl border border-red-200 bg-red-50 flex items-start gap-3">
            <AlertCircle size={19} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Something went wrong</p>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <StatCard index={1} title="Total Plans" value={plans.length} icon={Package} cls="bg-[#EAF3FF] text-[#2568e0]" valueCls="text-[#0e2a4a]" loading={loading} />
          <StatCard index={2} title="Active Plans" value={activePlans} icon={Check} cls="bg-[#E1FAF0] text-[#087A58]" valueCls="text-[#087A58]" loading={loading} />
          <StatCard index={3} title="Inactive Plans" value={inactivePlans} icon={Settings2} cls="bg-slate-100 text-slate-600" valueCls="text-slate-600" loading={loading} />
        </div>

        {/* SEARCH */}
        <div style={delay(4)} className="sp-in relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-100" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans by name or description..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md text-sm text-white placeholder:text-blue-100/60 outline-none focus:bg-white/15 focus:border-white/40 focus:ring-2 focus:ring-white/20 transition"
          />
        </div>

        {/* PLANS */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3].map((item) => <div key={item} className="h-[520px] bg-white/80 rounded-3xl animate-pulse" />)}
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className={`sp-pop ${card} p-14 text-center`}>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#eaf3ff] text-[#2568e0] flex items-center justify-center"><Package size={30} /></div>
            <h3 className="mt-4 font-bold text-[#0e2a4a]">No plans found</h3>
            <p className="mt-1 text-sm text-[#6b7f99]">{search ? "Try a different search term." : "Create your first SaaS subscription plan."}</p>
            {!search && (
              <button
                type="button"
                onClick={handleCreate}
                className={`mt-5 cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition active:scale-95 ${btnBlue}`}
              >
                <Plus size={16} /> Add Plan
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-4">
            {filteredPlans.map((plan, i) => (
              <PlanCard
                key={plan._id}
                plan={plan}
                index={i}
                onEdit={handleEdit}
                onDelete={handleDelete}
                deleting={String(deletingId) === String(plan._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="sp-fade fixed inset-0 z-50 bg-[#0b1d3d]/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="sp-pop bg-white w-full max-w-3xl max-h-[94vh] overflow-y-auto sp-scroll rounded-t-3xl sm:rounded-3xl shadow-[0_24px_70px_rgba(6,20,52,0.45)]">

            <div className="sticky top-0 z-10 bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] text-white px-5 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><Package size={20} /></div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold">{editingPlan ? "Edit Plan" : "Create New Plan"}</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={saving}
                aria-label="Close"
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center disabled:opacity-50 shrink-0 transition cursor-pointer"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4" noValidate>
              {/* SERVER ERROR INSIDE MODAL */}
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm font-semibold text-red-800">{error}</p>
                </div>
              )}

              {Object.values(formErrors).some(Boolean) && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                  <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-900">Please correct the highlighted errors below</h4>
                    <p className="text-xs text-red-700 mt-0.5">Some required fields are missing or contain invalid values.</p>
                  </div>
                </div>
              )}

              <Section icon={Package} title="Basic Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Plan Name *" name="planName" value={form.planName} onChange={handleChange} placeholder="e.g. Premium" error={formErrors.planName} />
                  <InputField label="Validity Days *" name="validityDays" value={form.validityDays} onChange={handleChange} type="number" min="1" placeholder="30" error={formErrors.validityDays} />
                </div>
                <div className="mt-4">
                  <label className="block text-[13px] font-semibold text-[#3d5473] mb-1.5">Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Describe what this plan offers..."
                    className={`${fieldCls} ${okBorder} resize-none`}
                  />
                </div>
              </Section>

              <Section icon={IndianRupee} title="Pricing">
                {formErrors.pricing && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle size={15} /> {formErrors.pricing}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Monthly *" name="monthly" value={form.pricing.monthly} onChange={handlePricingChange} type="number" min="0" placeholder="999" error={formErrors.pricing} />
                  <InputField label="Quarterly" name="quarterly" value={form.pricing.quarterly} onChange={handlePricingChange} type="number" min="0" placeholder="2499" />
                  <InputField label="Half Yearly" name="halfYearly" value={form.pricing.halfYearly} onChange={handlePricingChange} type="number" min="0" placeholder="4499" />
                  <InputField label="Yearly" name="yearly" value={form.pricing.yearly} onChange={handlePricingChange} type="number" min="0" placeholder="7999" />
                </div>
               
              </Section>

              <Section icon={Gauge} title="Limits">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <InputField label="Rooms *" name="rooms" value={form.limits.rooms} onChange={handleLimitChange} type="number" min="0" placeholder="25" error={formErrors.rooms} />
                  <InputField label="Branches *" name="branches" value={form.limits.branches} onChange={handleLimitChange} type="number" min="0" placeholder="2" error={formErrors.branches} />
                  <InputField label="Receptionists *" name="receptionists" value={form.limits.receptionists} onChange={handleLimitChange} type="number" min="0" placeholder="3" error={formErrors.receptionists} />
                </div>
              </Section>

              <Section icon={Zap} title="Features">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Toggle name="foodService" checked={form.features.foodService} onChange={handleFeatureChange} icon={Utensils} tone="orange" title="Food Service" desc="Enable food management" />
                  <Toggle name="roomService" checked={form.features.roomService} onChange={handleFeatureChange} icon={BedDouble} title="Room Service" desc="Enable room service management" />
                </div>
              </Section>

              <Section icon={CalendarDays} title="Plan Settings">
              
                <div className="mt-4">
                  <Toggle name="isActive" checked={form.isActive} onChange={handleChange} title="Plan Active" desc="Active plans are available to new hotel owners." />
                </div>
              </Section>

              <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-[#e7eff8] -mx-4 sm:-mx-5 px-4 sm:px-5 py-3 flex flex-col-reverse sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold disabled:opacity-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed ${btnBlue}`}
                >
                  {saving ? (
                    <><RefreshCw size={16} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Check size={16} /> {editingPlan ? "Update Plan" : "Create Plan"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSAdminPlans;

