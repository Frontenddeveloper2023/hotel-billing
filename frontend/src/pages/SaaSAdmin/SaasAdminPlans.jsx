import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Edit3,
  Trash2,
  X,
  Check,
  AlertCircle,
  Clock3,
  Building2,
  Users,
  Utensils,
  BedDouble,
  CalendarDays,
  IndianRupee,
  Settings2,
} from "lucide-react";

import {
  createPlan,
  getAllPlans,
  updatePlan,
  deletePlan,
} from "../../service/planApi";


// ======================================================
// DEFAULT FORM
// ======================================================

const initialForm = {
  planName: "",
  description: "",

  pricing: {
    monthly: "",
    quarterly: "",
    halfYearly: "",
    yearly: "",
  },

  trialDays: 0,
  setupFee: 0,

  limits: {
    rooms: 0,
    branches: 0,
    receptionists: 0,
  },

  features: {
    foodService: false,
    roomService: false,
  },

  validityDays: 30,
  autoRenewalAllowed: true,
  isActive: true,
};

// Always hand out a fresh, deep copy so nothing ever shares
// references with the frozen `initialForm` object above.
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
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.plans)) {
    return response.data.plans;
  }

  if (Array.isArray(response?.plans)) {
    return response.plans;
  }

  return [];
};


const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};


const numberValue = (value) => {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};


// ======================================================
// INPUT FIELD
// ======================================================
// IMPORTANT: this must live OUTSIDE the main component.
// Defining it inside SaaSAdminPlans meant a brand-new
// component type was created on every render, so React
// unmounted/remounted the <input> on every keystroke and
// the field lost focus after a single character. Declaring
// it at module scope fixes that.

const InputField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  min,
}) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        className={`w-full px-3 py-2.5 rounded-lg border bg-[#faf9ff] text-sm outline-none transition ${
          error
            ? "border-red-300 bg-white focus:ring-2 focus:ring-red-200"
            : "border-[#e5e2f2] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        }`}
      />

      {error && (
        <p className="text-xs text-red-600 mt-1.5">{error}</p>
      )}
    </div>
  );
};


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


  // ====================================================
  // FETCH PLANS
  // ====================================================

  const fetchPlans = useCallback(async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await getAllPlans();

      const planList = getPlansFromResponse(response);

      setPlans(planList);
    } catch (err) {
      console.error("Get plans error:", err);

      setError(
        err?.message || err?.data?.message || "Unable to load plans."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);


  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);


  // ====================================================
  // SUCCESS MESSAGE
  // ====================================================

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [successMessage]);


  // ====================================================
  // FILTER
  // ====================================================

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return plans;
    }

    return plans.filter((plan) => {
      return (
        plan.planName?.toLowerCase().includes(query) ||
        plan.description?.toLowerCase().includes(query)
      );
    });
  }, [plans, search]);


  // ====================================================
  // STATS (memoized so they don't recompute every render)
  // ====================================================

  const activePlans = useMemo(
    () => plans.filter((plan) => plan.isActive).length,
    [plans]
  );

  const inactivePlans = useMemo(
    () => plans.filter((plan) => !plan.isActive).length,
    [plans]
  );


  // ====================================================
  // OPEN CREATE MODAL
  // ====================================================

  const handleCreate = () => {
    setEditingPlan(null);
    setForm(getFreshForm());
    setFormErrors({});
    setError("");
    setShowModal(true);
  };


  // ====================================================
  // OPEN EDIT MODAL
  // ====================================================

  const handleEdit = (plan) => {
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

      trialDays: plan.trialDays ?? 0,
      setupFee: plan.setupFee ?? 0,

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
  };


  // ====================================================
  // CLOSE MODAL
  // ====================================================

  const handleCloseModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingPlan(null);
    setForm(getFreshForm());
    setFormErrors({});
  };


  // ====================================================
  // FORM CHANGE
  // ====================================================

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setFormErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };


  const handlePricingChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      pricing: {
        ...previous.pricing,
        [name]: value,
      },
    }));

    // Clear the aggregate pricing error as soon as the user
    // starts fixing any pricing field.
    setFormErrors((previous) => ({
      ...previous,
      pricing: "",
    }));
  };


  const handleLimitChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      limits: {
        ...previous.limits,
        [name]: value,
      },
    }));

    setFormErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };


  const handleFeatureChange = (e) => {
    const { name, checked } = e.target;

    setForm((previous) => ({
      ...previous,
      features: {
        ...previous.features,
        [name]: checked,
      },
    }));
  };


  // ====================================================
  // VALIDATION
  // ====================================================

  const validateForm = () => {
    const errors = {};

    if (!form.planName.trim()) {
      errors.planName = "Plan name is required.";
    } else if (form.planName.trim().length < 2) {
      errors.planName = "Plan name must contain at least 2 characters.";
    }

    const monthly = numberValue(form.pricing.monthly);
    const quarterly = numberValue(form.pricing.quarterly);
    const halfYearly = numberValue(form.pricing.halfYearly);
    const yearly = numberValue(form.pricing.yearly);

    if (monthly === 0 && quarterly === 0 && halfYearly === 0 && yearly === 0) {
      errors.pricing = "Please enter at least one pricing amount.";
    }

    if (numberValue(form.trialDays) < 0) {
      errors.trialDays = "Trial days cannot be negative.";
    }

    if (numberValue(form.setupFee) < 0) {
      errors.setupFee = "Setup fee cannot be negative.";
    }

    if (numberValue(form.limits.rooms) < 0) {
      errors.rooms = "Room limit cannot be negative.";
    }

    if (numberValue(form.limits.branches) < 0) {
      errors.branches = "Branch limit cannot be negative.";
    }

    if (numberValue(form.limits.receptionists) < 0) {
      errors.receptionists = "Receptionist limit cannot be negative.";
    }

    if (numberValue(form.validityDays) < 1) {
      errors.validityDays = "Validity must be at least 1 day.";
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };


  // ====================================================
  // SAVE PLAN
  // ====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const planData = {
        planName: form.planName.trim(),
        description: form.description.trim(),

        pricing: {
          monthly: numberValue(form.pricing.monthly),
          quarterly: numberValue(form.pricing.quarterly),
          halfYearly: numberValue(form.pricing.halfYearly),
          yearly: numberValue(form.pricing.yearly),
        },

        trialDays: numberValue(form.trialDays),
        setupFee: numberValue(form.setupFee),

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

      if (editingPlan?._id) {
        await updatePlan(editingPlan._id, planData);
        setSuccessMessage(`${planData.planName} has been updated successfully.`);
      } else {
        await createPlan(planData);
        setSuccessMessage(`${planData.planName} has been created successfully.`);
      }

      setShowModal(false);
      setEditingPlan(null);
      setForm(getFreshForm());
      setFormErrors({});

      await fetchPlans(true);
    } catch (err) {
      console.error("Save plan error:", err);

      setError(
        err?.message || err?.data?.message || "Unable to save the plan."
      );
    } finally {
      setSaving(false);
    }
  };


  // ====================================================
  // DELETE PLAN
  // ====================================================

  const handleDelete = async (plan) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${plan.planName}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(plan._id);
      setError("");
      setSuccessMessage("");

      await deletePlan(plan._id);

      setSuccessMessage(`${plan.planName} has been deleted successfully.`);

      await fetchPlans(true);
    } catch (err) {
      console.error("Delete plan error:", err);

      setError(
        err?.message || err?.data?.message || "Unable to delete the plan."
      );
    } finally {
      setDeletingId(null);
    }
  };


  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="min-h-full bg-[#f8f7ff]">
      <div className="max-w-[1440px] mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Package size={24} className="text-[#4338e8]" />
              <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[#111827]">
                SaaS Plans
              </h1>
            </div>
            <p className="text-sm text-[#667085] mt-1">
              Create and manage subscription plans for hotels.
            </p>
          </div>

          <div className="flex gap-3">
           
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4338e8] hover:bg-[#3730c9] text-white text-sm font-semibold transition"
            >
              <Plus size={17} />
              Add Plan
            </button>
          </div>
        </div>

        {/* SUCCESS */}
        {successMessage && (
          <div className="mb-5 p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start gap-3">
            <Check size={19} className="text-emerald-600 shrink-0" />
            <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-5 p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3">
            <AlertCircle size={19} className="text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Something went wrong</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-[#ebe8f5] rounded-2xl p-5 shadow-[0_2px_10px_rgba(31,27,75,0.04)]">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-[#667085]">Total Plans</p>
                <p className="text-2xl font-bold text-[#172033] mt-2">
                  {loading ? "—" : plans.length}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-[#4338e8] flex items-center justify-center">
                <Package size={21} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#ebe8f5] rounded-2xl p-5 shadow-[0_2px_10px_rgba(31,27,75,0.04)]">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-[#667085]">Active Plans</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">
                  {loading ? "—" : activePlans}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Check size={21} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#ebe8f5] rounded-2xl p-5 shadow-[0_2px_10px_rgba(31,27,75,0.04)]">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-[#667085]">Inactive Plans</p>
                <p className="text-2xl font-bold text-slate-600 mt-2">
                  {loading ? "—" : inactivePlans}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#f0f1f7] text-slate-600 flex items-center justify-center">
                <Settings2 size={21} />
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <div className="bg-white border border-[#ebe8f5] rounded-2xl shadow-[0_2px_10px_rgba(31,27,75,0.03)] mb-6 p-3 sm:p-4">
          <div className="relative max-w-md">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2b3]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plans..."
              className="w-full pl-10 pr-4 py-2.5 border border-[#e5e2f2] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#4338e8]/15 focus:border-[#4338e8]"
            />
          </div>
        </div>

        {/* PLANS */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-[430px] bg-white border border-[#e5e2f2] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="bg-white border border-[#e5e2f2] rounded-2xl p-14 text-center">
            <Package size={42} className="mx-auto text-slate-300" />
            <h3 className="mt-4 font-semibold text-slate-800">No plans found</h3>
            <p className="mt-1 text-sm text-[#667085]">
              {search ? "Try a different search term." : "Create your first SaaS subscription plan."}
            </p>
            {!search && (
              <button
                type="button"
                onClick={handleCreate}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-[#4338e8] text-white rounded-xl text-sm font-semibold"
              >
                <Plus size={16} />
                Add Plan
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredPlans.map((plan) => (
              <div
                key={plan._id}
                className="bg-white border border-[#e5e2f2] rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-[#f0eef7]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 text-[#4338e8] flex items-center justify-center shrink-0">
                        <Package size={21} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-bold text-[#172033] truncate">{plan.planName}</h2>
                        <p className="text-xs text-[#667085] mt-1 line-clamp-2">
                          {plan.description || "No description"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
                        plan.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-[#f0f1f7] text-slate-600 border-[#e5e2f2]"
                      }`}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Pricing */}
                <div className="p-5">
                  <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-[0.06em] mb-3">Pricing</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#f6f5fc] rounded-xl p-3">
                      <p className="text-[11px] text-[#667085]">Monthly</p>
                      <p className="mt-1 font-bold text-[#172033]">{formatCurrency(plan.pricing?.monthly)}</p>
                    </div>
                    <div className="bg-[#f6f5fc] rounded-xl p-3">
                      <p className="text-[11px] text-[#667085]">Quarterly</p>
                      <p className="mt-1 font-bold text-[#172033]">{formatCurrency(plan.pricing?.quarterly)}</p>
                    </div>
                    <div className="bg-[#f6f5fc] rounded-xl p-3">
                      <p className="text-[11px] text-[#667085]">Half Yearly</p>
                      <p className="mt-1 font-bold text-[#172033]">{formatCurrency(plan.pricing?.halfYearly)}</p>
                    </div>
                    <div className="bg-[#f6f5fc] rounded-xl p-3">
                      <p className="text-[11px] text-[#667085]">Yearly</p>
                      <p className="mt-1 font-bold text-[#172033]">{formatCurrency(plan.pricing?.yearly)}</p>
                    </div>
                  </div>
                </div>

                {/* Limits */}
                <div className="px-5 pb-5">
                  <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-[0.06em] mb-3">Limits</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-3 bg-slate-50 rounded-xl">
                      <BedDouble size={17} className="mx-auto text-[#4338e8]" />
                      <p className="text-lg font-bold text-[#172033] mt-1">{plan.limits?.rooms ?? 0}</p>
                      <p className="text-[10px] text-[#667085]">Rooms</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-xl">
                      <Building2 size={17} className="mx-auto text-[#4338e8]" />
                      <p className="text-lg font-bold text-[#172033] mt-1">{plan.limits?.branches ?? 0}</p>
                      <p className="text-[10px] text-[#667085]">Branches</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-xl">
                      <Users size={17} className="mx-auto text-[#4338e8]" />
                      <p className="text-lg font-bold text-[#172033] mt-1">{plan.limits?.receptionists ?? 0}</p>
                      <p className="text-[10px] text-[#667085]">Receptionists</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="px-5 pb-5">
                  <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-[0.06em] mb-3">Features</p>
                  <div className="flex flex-wrap gap-2">
                    {plan.features?.foodService && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#fff7ed] text-orange-700 text-xs font-semibold">
                        <Utensils size={13} />
                        Food Service
                      </span>
                    )}
                    {plan.features?.roomService && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#eef0ff] text-[#4338e8] text-xs font-semibold">
                        <BedDouble size={13} />
                        Room Service
                      </span>
                    )}
                    {!plan.features?.foodService && !plan.features?.roomService && (
                      <span className="text-xs text-[#98a2b3]">No additional features</span>
                    )}
                  </div>
                </div>

                {/* Other Details */}
                <div className="px-5 pb-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Clock3 size={15} className="text-[#98a2b3]" />
                      <div>
                        <p className="text-[10px] text-[#98a2b3]">Trial</p>
                        <p className="text-xs font-semibold text-slate-700">{plan.trialDays ?? 0} days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays size={15} className="text-[#98a2b3]" />
                      <div>
                        <p className="text-[10px] text-[#98a2b3]">Validity</p>
                        <p className="text-xs font-semibold text-slate-700">{plan.validityDays ?? 30} days</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-[#f0eef7] p-4 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(plan)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#eef0ff] hover:bg-[#e5e7ff] text-[#312e81] text-sm font-semibold transition"
                  >
                    <Edit3 size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(plan)}
                    disabled={deletingId === plan._id}
                    className="sm:px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold disabled:opacity-50 transition"
                  >
                    {deletingId === plan._id ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#17133a]/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#e5e2f2] shadow-[0_24px_70px_rgba(31,27,75,0.20)]">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-[#ebe8f5] px-5 sm:px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#172033]">
                  {editingPlan ? "Edit Plan" : "Create New Plan"}
                </h2>
                <p className="text-xs text-[#667085] mt-1">
                  Configure pricing, limits and features.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                disabled={saving}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-[#667085] disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-5" noValidate>
              {Object.values(formErrors).some(Boolean) && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-900">
                      Please correct the highlighted errors below
                    </h4>
                    <p className="text-xs text-red-700 mt-0.5">
                      Some required fields are missing or contain invalid values.
                    </p>
                  </div>
                </div>
              )}

              {/* BASIC DETAILS */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Package size={18} className="text-[#4338e8]" />
                  <h3 className="text-sm font-semibold text-[#172033]">Basic Details</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Plan Name *"
                    name="planName"
                    value={form.planName}
                    onChange={handleChange}
                    placeholder="e.g. Premium"
                    error={formErrors.planName}
                  />

                  <InputField
                    label="Validity Days *"
                    name="validityDays"
                    value={form.validityDays}
                    onChange={handleChange}
                    type="number"
                    min="1"
                    placeholder="30"
                    error={formErrors.validityDays}
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Describe what this plan offers..."
                    className="w-full px-3 py-2.5 border border-[#e5e2f2] rounded-xl text-sm outline-none resize-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-100"
                  />
                </div>
              </section>

              {/* PRICING */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-semibold text-[#172033]">Pricing</h3>
                </div>

                {formErrors.pricing && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle size={15} />
                    {formErrors.pricing}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Monthly *"
                    name="monthly"
                    value={form.pricing.monthly}
                    onChange={handlePricingChange}
                    type="number"
                    min="0"
                    placeholder="999"
                    error={formErrors.pricing}
                  />

                  <InputField
                    label="Quarterly"
                    name="quarterly"
                    value={form.pricing.quarterly}
                    onChange={handlePricingChange}
                    type="number"
                    min="0"
                    placeholder="2499"
                  />

                  <InputField
                    label="Half Yearly"
                    name="halfYearly"
                    value={form.pricing.halfYearly}
                    onChange={handlePricingChange}
                    type="number"
                    min="0"
                    placeholder="4499"
                  />

                  <InputField
                    label="Yearly"
                    name="yearly"
                    value={form.pricing.yearly}
                    onChange={handlePricingChange}
                    type="number"
                    min="0"
                    placeholder="7999"
                  />
                </div>

                <div className="mt-4">
                  <InputField
                    label="Setup Fee"
                    name="setupFee"
                    value={form.setupFee}
                    onChange={handleChange}
                    type="number"
                    min="0"
                    placeholder="0"
                    error={formErrors.setupFee}
                  />
                </div>
              </section>

              {/* LIMITS */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Settings2 size={18} className="text-[#4338e8]" />
                  <h3 className="text-sm font-semibold text-[#172033]">Limits</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <InputField
                    label="Rooms *"
                    name="rooms"
                    value={form.limits.rooms}
                    onChange={handleLimitChange}
                    type="number"
                    min="0"
                    placeholder="25"
                    error={formErrors.rooms}
                  />

                  <InputField
                    label="Branches *"
                    name="branches"
                    value={form.limits.branches}
                    onChange={handleLimitChange}
                    type="number"
                    min="0"
                    placeholder="2"
                    error={formErrors.branches}
                  />

                  <InputField
                    label="Receptionists *"
                    name="receptionists"
                    value={form.limits.receptionists}
                    onChange={handleLimitChange}
                    type="number"
                    min="0"
                    placeholder="3"
                    error={formErrors.receptionists}
                  />
                </div>
              </section>

              {/* FEATURES */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Check size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-semibold text-[#172033]">Features</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      form.features.foodService
                        ? "border-orange-300 bg-orange-50"
                        : "border-[#e5e2f2] hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="foodService"
                      checked={form.features.foodService}
                      onChange={handleFeatureChange}
                      className="w-4 h-4 accent-orange-600 rounded"
                    />
                    <Utensils size={19} className="text-orange-600" />
                    <div>
                      <p className="text-sm font-semibold text-[#172033]">Food Service</p>
                      <p className="text-xs text-[#667085] mt-0.5">Enable food management</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      form.features.roomService
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-[#e5e2f2] hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="roomService"
                      checked={form.features.roomService}
                      onChange={handleFeatureChange}
                      className="w-4 h-4 accent-indigo-600 rounded"
                    />
                    <BedDouble size={19} className="text-[#4338e8]" />
                    <div>
                      <p className="text-sm font-semibold text-[#172033]">Room Service</p>
                      <p className="text-xs text-[#667085] mt-0.5">Enable room service management</p>
                    </div>
                  </label>
                </div>
              </section>

              {/* TRIAL + SETTINGS */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays size={18} className="text-[#4338e8]" />
                  <h3 className="text-sm font-semibold text-[#172033]">Plan Settings</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Trial Days"
                    name="trialDays"
                    value={form.trialDays}
                    onChange={handleChange}
                    type="number"
                    min="0"
                    placeholder="0"
                    error={formErrors.trialDays}
                  />

                  <label className="flex items-center gap-3 p-3 border border-[#e5e2f2] rounded-xl cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="checkbox"
                      name="autoRenewalAllowed"
                      checked={form.autoRenewalAllowed}
                      onChange={handleChange}
                      className="w-4 h-4 accent-slate-900 rounded"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#172033]">Allow Auto Renewal</p>
                      <p className="text-xs text-[#667085] mt-0.5">Customers can enable automatic renewal.</p>
                    </div>
                  </label>
                </div>

                <label className="mt-4 flex items-center gap-3 p-3 border border-[#e5e2f2] rounded-xl cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleChange}
                    className="w-4 h-4 accent-slate-900 rounded"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#172033]">Plan Active</p>
                    <p className="text-xs text-[#667085] mt-0.5">
                      Active plans are available to new hotel owners.
                    </p>
                  </div>
                </label>
              </section>

              {/* FORM ACTIONS */}
              <div className="sticky bottom-0 bg-white border-t border-[#ebe8f5] pt-3 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold disabled:opacity-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-[#4338e8] hover:bg-[#3730c9] text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2 transition"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {editingPlan ? "Update Plan" : "Create Plan"}
                    </>
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