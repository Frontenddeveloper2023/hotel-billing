import React, { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  GitBranch,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
  Sparkles,
  ArrowUpRight,
  Crown,
  X,
  Loader2,
  RefreshCw,
  Building,
} from "lucide-react";

import { useToast } from "../../Context/ToastContext";
import { useAuth } from "../../Context/AuthContext";
import {
  getAllBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchUsage,
} from "../../service/branchApi";

export default function BranchManagement() {
  const { showToast } = useToast();
  const { userData } = useAuth();
  const navigate = useNavigate();

  // ============================================================
  // STATES
  // ============================================================
  const [branches, setBranches] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);

  // Form State
  const initialForm = {
    branchName: "",
    branchCode: "",
    phone: "",
    email: "",
    status: "active",
    street: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
  };

  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ============================================================
  // LOAD DATA
  // ============================================================
  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [branchesRes, usageRes] = await Promise.all([
        getAllBranches(),
        getBranchUsage(),
      ]);

      if (branchesRes?.success) {
        setBranches(branchesRes.data || []);
      }

      if (usageRes?.success) {
        setUsage(usageRes.data);
      }
    } catch (err) {
      console.error("[BranchManagement] Error loading data:", err);
      showToast(
        err?.message || "Failed to load branches or plan quota details.",
        "error"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ============================================================
  // FORM VALIDATION
  // ============================================================
  const validateForm = (isEdit = false) => {
    const errors = {};

    if (!formData.branchName.trim()) {
      errors.branchName = "Branch name is required";
    } else if (formData.branchName.trim().length < 2) {
      errors.branchName = "Branch name must contain at least 2 characters";
    }

    if (formData.branchCode.trim()) {
      const codeUpper = formData.branchCode.trim().toUpperCase();
      if (!isEdit && codeUpper === "MAIN") {
        errors.branchCode = "Code 'MAIN' is reserved for the primary branch";
      }
    }

    if (formData.phone.trim()) {
      if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
        errors.phone = "Phone number must be exactly 10 digits";
      }
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = "Please enter a valid email address";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================
  // OPEN ADD MODAL
  // ============================================================
  const handleOpenAddModal = () => {
    if (usage && !usage.canCreate) {
      showToast(
        `Branch limit reached (${usage.limit} max). Please upgrade your subscription plan.`,
        "warning"
      );
      return;
    }
    setFormData(initialForm);
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // ============================================================
  // OPEN EDIT MODAL
  // ============================================================
  const handleOpenEditModal = (branch) => {
    setSelectedBranch(branch);
    setFormData({
      branchName: branch.branchName || "",
      branchCode: branch.branchCode || "",
      phone: branch.phone || "",
      email: branch.email || "",
      status: branch.status || "active",
      street: branch.address?.street || "",
      city: branch.address?.city || "",
      state: branch.address?.state || "",
      country: branch.address?.country || "India",
      pincode: branch.address?.pincode || "",
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // ============================================================
  // OPEN DELETE MODAL
  // ============================================================
  const handleOpenDeleteModal = (branch) => {
    if (branch.isMainBranch || branch.branchCode === "MAIN") {
      showToast("Primary Main Branch cannot be deleted.", "warning");
      return;
    }
    setSelectedBranch(branch);
    setIsDeleteModalOpen(true);
  };

  // ============================================================
  // SUBMIT ADD BRANCH
  // ============================================================
 const handleCreateBranch = async (e) => {
  e.preventDefault();

  if (!validateForm(false)) return;

  try {
    setSubmitting(true);

    const payload = {
      branchName: formData.branchName.trim(),
      branchCode: formData.branchCode.trim().toUpperCase(),
      phone: formData.phone.trim(),
      email: formData.email.trim().toLowerCase(),
      status: formData.status,
      address: {
        street: formData.street.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
        pincode: formData.pincode.trim(),
      },
    };

    const res = await createBranch(payload);

    if (!res?.success) {
      throw new Error(
        res?.message || "Failed to create branch."
      );
    }

    // Get the newly created branch from backend
    const newBranch = res?.data;

    if (!newBranch?._id) {
      throw new Error(
        "Branch created, but server did not return branch data."
      );
    }

    // ==========================================
    // IMMEDIATELY UPDATE BRANCH LIST
    // ==========================================
    setBranches((prev) => {
      const alreadyExists = prev.some(
        (branch) => branch._id === newBranch._id
      );

      if (alreadyExists) {
        return prev;
      }

      return [...prev, newBranch];
    });

    // ==========================================
    // IMMEDIATELY UPDATE USAGE
    // ==========================================
    setUsage((prev) => {
      if (!prev) return prev;

      const currentUsed = Number(prev.used || 0);
      const currentRemaining = Number(prev.remaining || 0);

      const newUsed = currentUsed + 1;
      const newRemaining = Math.max(
        0,
        currentRemaining - 1
      );

      return {
        ...prev,
        used: newUsed,
        remaining: newRemaining,
        canCreate: newRemaining > 0,
      };
    });

    // ==========================================
    // CLOSE MODAL IMMEDIATELY
    // ==========================================
    setIsAddModalOpen(false);

    // Reset form
    setFormData(initialForm);
    setFormErrors({});

    // Success toast
    showToast(
      "Sub-branch created successfully!",
      "success"
    );
  } catch (err) {
    console.error(
      "[BranchManagement] Create error:",
      err
    );

    showToast(
      err?.message ||
        "Failed to create branch.",
      "error"
    );
  } finally {
    setSubmitting(false);
  }
};

  // ============================================================
  // SUBMIT UPDATE BRANCH
  // ============================================================
  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    if (!selectedBranch) return;
    if (!validateForm(true)) return;

    try {
      setSubmitting(true);

      const payload = {
        branchName: formData.branchName.trim(),
        branchCode: formData.branchCode.trim().toUpperCase(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        status: formData.status,
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          country: formData.country.trim(),
          pincode: formData.pincode.trim(),
        },
      };

      const res = await updateBranch(selectedBranch._id, payload);

      if (res?.success) {
  const updatedBranch = res.data;

  // Immediately update branch in UI
  if (updatedBranch?._id) {
    setBranches((prev) =>
      prev.map((branch) =>
        branch._id === updatedBranch._id
          ? updatedBranch
          : branch
      )
    );
  }

  // Close edit modal immediately
  setIsEditModalOpen(false);

  // Clear selected branch
  setSelectedBranch(null);

  // Clear form
  setFormData(initialForm);
  setFormErrors({});

  // Success toast
  showToast(
    "Branch updated successfully!",
    "success"
  );
}


    } catch (err) {
      console.error("[BranchManagement] Update error:", err);
      showToast(err?.message || "Failed to update branch.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // SUBMIT DELETE BRANCH
  // ============================================================
 const handleDeleteBranch = async () => {
  if (!selectedBranch?._id) return;

  try {
    setSubmitting(true);

    const res = await deleteBranch(selectedBranch._id);

    if (!res?.success) {
      throw new Error(
        res?.message || "Failed to delete branch."
      );
    }

    // Remove branch immediately from UI
    setBranches((prev) =>
      prev.filter(
        (branch) => branch._id !== selectedBranch._id
      )
    );

    // Update quota immediately
    setUsage((prev) => {
      if (!prev) return prev;

      const newUsed = Math.max(0, Number(prev.used || 0) - 1);
      const newRemaining = Number(prev.remaining || 0) + 1;

      return {
        ...prev,
        used: newUsed,
        remaining: newRemaining,
        canCreate: true,
      };
    });

    // Close delete modal
    setIsDeleteModalOpen(false);
    setSelectedBranch(null);

    showToast(
      "Branch deleted successfully!",
      "success"
    );
  } catch (err) {
    console.error(
      "[BranchManagement] Delete error:",
      err
    );

    showToast(
      err?.message || "Failed to delete branch.",
      "error"
    );
  } finally {
    setSubmitting(false);
  }
};

  // ============================================================
  // FILTERED BRANCHES
  // ============================================================
  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      // Search
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        branch.branchName?.toLowerCase().includes(q) ||
        branch.branchCode?.toLowerCase().includes(q) ||
        branch.phone?.toLowerCase().includes(q) ||
        branch.address?.city?.toLowerCase().includes(q);

      // Status
      const matchStatus =
        statusFilter === "all" || branch.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [branches, searchTerm, statusFilter]);

  // Usage stats
  const usedCount = usage?.used ?? branches.length;
  const limitCount = usage?.limit ?? 1;
  const remainingCount = usage?.remaining ?? Math.max(0, limitCount - usedCount);
  const isLimitReached = !usage?.canCreate && usage !== null;
  const progressPercent = Math.min(
    100,
    Math.round((usedCount / (limitCount || 1)) * 100)
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6">
      <Helmet>
        <title>Branch Management | Hotel SaaS</title>
      </Helmet>

      {/* ============================================================
          TOP HEADER
      ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Branch Management
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Create and oversee your sub-branches according to your plan quota.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-600" : ""}`}
            />
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            disabled={isLimitReached}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${
              isLimitReached
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-md"
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Sub-Branch
          </button>
        </div>
      </div>

      {/* ============================================================
          SUBSCRIPTION LIMIT & USAGE CARD
      ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress & Quota Details */}
        <div className="lg:col-span-2 bg-gradient-to-br from-white to-indigo-50/30 border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-lg bg-indigo-100 text-indigo-700">
                  {usage?.planName || "Active Plan"}
                </span>
                <span className="text-xs text-slate-500">Subscription Quota</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-slate-900">
                  {usedCount}
                </span>
                <span className="text-slate-400 text-sm font-medium">
                  {" "}/ {limitCount} Branches
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/60 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progressPercent >= 100
                      ? "bg-rose-500"
                      : progressPercent >= 75
                      ? "bg-amber-500"
                      : "bg-indigo-600"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                <span>{progressPercent}% allocated</span>
                <span>
                  {remainingCount > 0
                    ? `${remainingCount} slot${remainingCount === 1 ? "" : "s"} available`
                    : "No quota remaining"}
                </span>
              </div>
            </div>
          </div>

          {/* Upgrade Banner if reached */}
          {isLimitReached ? (
            <div className="mt-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-800">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <p className="text-xs md:text-sm font-medium">
                  Branch limit reached! Upgrade your subscription plan to create additional branches.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/saas-user/choose-plan")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap shadow-sm"
              >
                Upgrade Plan <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>
                You can create <strong>{remainingCount}</strong> more sub-branch
                {remainingCount === 1 ? "" : "es"} on your current plan.
              </span>
            </div>
          )}
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Branches
            </span>
            <div className="mt-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {branches.length}
              </span>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {branches.filter((b) => b.status === "active").length} Active
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Remaining Quota
            </span>
            <div className="mt-2">
              <span
                className={`text-3xl font-extrabold ${
                  remainingCount === 0 ? "text-rose-600" : "text-indigo-600"
                }`}
              >
                {remainingCount}
              </span>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Available slots
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          SEARCH & FILTER TOOLBAR
      ============================================================ */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by branch name, code, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {["all", "active", "inactive"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                statusFilter === status
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================
          BRANCHES LISTING / GRID
      ============================================================ */}
      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500 mt-3">
            Loading your branches and quota...
          </p>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
            <Building className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mt-4">
            No Branches Found
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            {searchTerm
              ? "No branches match your search criteria. Try modifying your filter."
              : "You haven't created any sub-branches yet."}
          </p>
          {!isLimitReached && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Sub-Branch
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((branch) => {
            const isMain = branch.isMainBranch || branch.branchCode === "MAIN";

            return (
              <div
                key={branch._id}
                className={`relative bg-white rounded-2xl border transition-all duration-200 hover:shadow-md p-6 flex flex-col justify-between ${
                  isMain
                    ? "border-indigo-300 ring-1 ring-indigo-500/10 shadow-sm"
                    : "border-slate-200/80"
                }`}
              >
                {/* Main Branch Banner */}
                {isMain && (
                  <div className="absolute -top-3 left-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-full text-xs font-semibold shadow-sm">
                      <Crown className="w-3.5 h-3.5 text-amber-300" />
                      Primary Main Branch
                    </span>
                  </div>
                )}

                {/* Card Top */}
                <div className={isMain ? "pt-2" : ""}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {branch.branchName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-xs font-semibold rounded">
                          {branch.branchCode || "N/A"}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            branch.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              branch.status === "active"
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {branch.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-5 space-y-2.5 text-sm text-slate-600 border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">
                        {branch.phone || "No phone provided"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">
                        {branch.email || "No email provided"}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-500 line-clamp-2">
                        {[
                          branch.address?.street,
                          branch.address?.city,
                          branch.address?.state,
                          branch.address?.pincode,
                        ]
                          .filter(Boolean)
                          .join(", ") || "No address provided"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Created {new Date(branch.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(branch)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit Branch"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {!isMain && (
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(branch)}
                        className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Sub-Branch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          MODAL: ADD SUB-BRANCH
      ============================================================ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Add New Sub-Branch
                  </h2>
                  <p className="text-xs text-slate-500">
                    Consumes 1 of your {remainingCount} remaining branch slots.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateBranch} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Branch Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Seaside Resort Branch"
                    value={formData.branchName}
                    onChange={(e) =>
                      setFormData({ ...formData, branchName: e.target.value })
                    }
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      formErrors.branchName
                        ? "border-rose-400 focus:ring-rose-500/20"
                        : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                    }`}
                  />
                  {formErrors.branchName && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      {formErrors.branchName}
                    </p>
                  )}
                </div>

                {/* Branch Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Branch Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BEACH01"
                    value={formData.branchCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        branchCode: e.target.value.toUpperCase(),
                      })
                    }
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 font-mono border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      formErrors.branchCode
                        ? "border-rose-400 focus:ring-rose-500/20"
                        : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                    }`}
                  />
                  {formErrors.branchCode && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      {formErrors.branchCode}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone (10 Digits)
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      formErrors.phone
                        ? "border-rose-400 focus:ring-rose-500/20"
                        : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Branch Email
                  </label>
                  <input
                    type="email"
                    placeholder="branch@hotel.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      formErrors.email
                        ? "border-rose-400 focus:ring-rose-500/20"
                        : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                    }`}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      {formErrors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Address Header */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Address Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Street address"
                      value={formData.street}
                      onChange={(e) =>
                        setFormData({ ...formData, street: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="State"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={formData.pincode}
                      onChange={(e) =>
                        setFormData({ ...formData, pincode: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Country"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: EDIT BRANCH
      ============================================================ */}
      {isEditModalOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Edit Branch Details
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedBranch.branchName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateBranch} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Branch Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.branchName}
                    onChange={(e) =>
                      setFormData({ ...formData, branchName: e.target.value })
                    }
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      formErrors.branchName
                        ? "border-rose-400 focus:ring-rose-500/20"
                        : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                    }`}
                  />
                  {formErrors.branchName && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      {formErrors.branchName}
                    </p>
                  )}
                </div>

                {/* Branch Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Branch Code
                  </label>
                  <input
                    type="text"
                    disabled={selectedBranch.isMainBranch || selectedBranch.branchCode === "MAIN"}
                    value={formData.branchCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        branchCode: e.target.value.toUpperCase(),
                      })
                    }
                    className={`w-full px-3.5 py-2.5 text-sm font-mono border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      selectedBranch.isMainBranch || selectedBranch.branchCode === "MAIN"
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                        : "bg-slate-50 border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                    }`}
                  />
                  {(selectedBranch.isMainBranch || selectedBranch.branchCode === "MAIN") && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Main branch code cannot be modified.
                    </p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone (10 Digits)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                  {formErrors.phone && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Branch Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                  {formErrors.email && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      {formErrors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Address Header */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Address Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Street address"
                      value={formData.street}
                      onChange={(e) =>
                        setFormData({ ...formData, street: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="State"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={formData.pincode}
                      onChange={(e) =>
                        setFormData({ ...formData, pincode: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Country"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: DELETE BRANCH CONFIRMATION
      ============================================================ */}
      {isDeleteModalOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              Delete Sub-Branch
            </h3>

            <p className="text-sm text-slate-600 mt-2">
              Are you sure you want to delete{" "}
              <strong>"{selectedBranch.branchName}"</strong>? This action cannot
              be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteBranch}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all disabled:opacity-60"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete Branch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
