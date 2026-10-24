import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
  Mail,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  User,
  KeyRound,
  Eye,
  Info,
} from "lucide-react";
import { useAuth } from "../../Context/AuthContext";
import { useToast } from "../../Context/ToastContext";
import StaylioLoader from "../../Components/StaylioLoader";
import {
  getAdminUsers,
  createSubAdmin,
  updateSubAdmin,
  toggleBlockSubAdmin,
  deleteSubAdmin,
  updateAdminProfile,
} from "../../service/saasAdminSettingsApi";

export default function SaaSAdminSettings() {
  const { adminUser, fetchAdminUser } = useAuth();
  const toast = useToast();

  const isMainAdmin = adminUser?.role === "admin";

  // Data state
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Profile Form state (for Main Admin)
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});

  // Sub-admin Form Modal state (Create & Edit)
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", status: "active" });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Action busy states for toggle block
  const [actionBusyId, setActionBusyId] = useState(null);

  // Sync profile fields from logged-in adminUser
  useEffect(() => {
    if (adminUser) {
      setProfileName(adminUser.name || "");
      setProfileEmail(adminUser.email || "");
    }
  }, [adminUser]);

  // Load admins list
  const loadUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await getAdminUsers();
      if (res?.success && Array.isArray(res.data)) {
        setUsersList(res.data);
      }
    } catch (err) {
      console.error("Failed to load admin users:", err);
      toast.error(err?.message || "Failed to load admin accounts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Email validator
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // -------------------------------------------------------------
  // PROFILE UPDATE (MAIN ADMIN ONLY) - INSTANT LOCAL UPDATE
  // -------------------------------------------------------------
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!isMainAdmin) {
      toast.error("Sub-admins are not permitted to edit profile details.");
      return;
    }

    const errors = {};
    if (!profileEmail.trim()) {
      errors.email = "Email is required.";
    } else if (!validateEmail(profileEmail.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (!profileName.trim()) {
      errors.name = "Name is required.";
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }
    setProfileErrors({});
    setProfileSaving(true);

    try {
      const res = await updateAdminProfile({
        name: profileName.trim(),
        email: profileEmail.trim(),
      });

      if (res?.success) {
        toast.success(res.message || "Profile updated successfully!");
        
        // INSTANT STATE UPDATE in users table
        setUsersList((prev) =>
          prev.map((u) =>
            u._id === adminUser?._id
              ? { ...u, name: profileName.trim(), email: profileEmail.trim().toLowerCase() }
              : u
          )
        );

        // Refresh AuthContext session silently
        if (fetchAdminUser) {
          fetchAdminUser();
        }
      }
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error(err?.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  // -------------------------------------------------------------
  // OPEN CREATE MODAL
  // -------------------------------------------------------------
  const openCreateModal = () => {
    if (!isMainAdmin) {
      toast.error("Only the main admin can create sub-admins.");
      return;
    }
    setSelectedUser(null);
    setFormData({ name: "", email: "", status: "active" });
    setFormErrors({});
    setModalMode("create");
  };

  // -------------------------------------------------------------
  // OPEN EDIT MODAL
  // -------------------------------------------------------------
  const openEditModal = (user) => {
    if (!isMainAdmin) {
      toast.error("Only the main admin can edit sub-admins.");
      return;
    }
    if (user.role !== "sub_admin") {
      toast.error("Only sub-admins can be edited here.");
      return;
    }
    setSelectedUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      status: user.status || "active",
    });
    setFormErrors({});
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
    setFormData({ name: "", email: "", status: "active" });
    setFormErrors({});
  };

  // -------------------------------------------------------------
  // SUBMIT CREATE / EDIT FORM - INSTANT LOCAL UPDATE
  // -------------------------------------------------------------
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!isMainAdmin) {
      toast.error("Sub-admins are not permitted to perform this action.");
      return;
    }

    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Name is required.";
    }
    if (!formData.email.trim()) {
      errors.email = "Email is required.";
    } else if (!validateEmail(formData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSubmitting(true);

    try {
      if (modalMode === "create") {
        const res = await createSubAdmin({
          name: formData.name.trim(),
          email: formData.email.trim(),
        });

        if (res?.success) {
          toast.success(res.message || "Sub-admin created successfully!");
          // INSTANT STATE UPDATE (Prepend new sub-admin to list without reload)
          if (res.data) {
            setUsersList((prev) => [res.data, ...prev]);
          } else {
            loadUsers();
          }
          closeModal();
        }
      } else if (modalMode === "edit" && selectedUser) {
        const res = await updateSubAdmin(selectedUser._id, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          status: formData.status,
        });

        if (res?.success) {
          toast.success(res.message || "Sub-admin updated successfully!");
          // INSTANT STATE UPDATE (Update item in-place without reload)
          setUsersList((prev) =>
            prev.map((u) =>
              u._id === selectedUser._id
                ? {
                    ...u,
                    name: formData.name.trim(),
                    email: formData.email.trim().toLowerCase(),
                    status: formData.status,
                  }
                : u
            )
          );
          closeModal();
        }
      }
    } catch (err) {
      console.error("Modal submit error:", err);
      toast.error(err?.message || "Failed to process request.");
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // TOGGLE BLOCK / UNBLOCK - INSTANT LOCAL UPDATE
  // -------------------------------------------------------------
  const handleToggleBlock = async (user) => {
    if (!isMainAdmin) {
      toast.error("Sub-admins cannot block or unblock accounts.");
      return;
    }
    if (user.role !== "sub_admin") {
      toast.error("Main admin cannot be blocked.");
      return;
    }

    const newStatus = user.status === "active" ? "inactive" : "active";
    const actionLabel = newStatus === "active" ? "unblocked" : "blocked";

    setActionBusyId(user._id);
    try {
      const res = await toggleBlockSubAdmin(user._id, newStatus);
      if (res?.success) {
        toast.success(res.message || `Sub-admin has been ${actionLabel}.`);
        // INSTANT STATE UPDATE without page refresh
        setUsersList((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, status: newStatus } : u))
        );
      }
    } catch (err) {
      console.error("Toggle block error:", err);
      toast.error(err?.message || `Failed to ${actionLabel} sub-admin.`);
    } finally {
      setActionBusyId(null);
    }
  };

  // -------------------------------------------------------------
  // DELETE SUB-ADMIN - INSTANT LOCAL UPDATE
  // -------------------------------------------------------------
  const openDeleteModal = (user) => {
    if (!isMainAdmin) {
      toast.error("Sub-admins cannot delete accounts.");
      return;
    }
    if (user.role !== "sub_admin") {
      toast.error("Main admin cannot be deleted.");
      return;
    }
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete || !isMainAdmin) return;

    setDeleting(true);
    try {
      const res = await deleteSubAdmin(userToDelete._id);
      if (res?.success) {
        toast.success(res.message || "Sub-admin deleted successfully!");
        // INSTANT STATE UPDATE (Remove from list immediately)
        setUsersList((prev) => prev.filter((u) => u._id !== userToDelete._id));
        setDeleteModalOpen(false);
        setUserToDelete(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err?.message || "Failed to delete sub-admin.");
    } finally {
      setDeleting(false);
    }
  };

  // Filtered list
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query);

      const matchRole =
        filterRole === "all" || u.role === filterRole;

      const matchStatus =
        filterStatus === "all" || u.status === filterStatus;

      return matchQuery && matchRole && matchStatus;
    });
  }, [usersList, searchQuery, filterRole, filterStatus]);

  // Counts
  const counts = useMemo(() => {
    const mainAdminCount = usersList.filter((u) => u.role === "admin").length;
    const subAdminCount = usersList.filter((u) => u.role === "sub_admin").length;
    const activeCount = usersList.filter((u) => u.status === "active").length;
    const inactiveCount = usersList.filter((u) => u.status === "inactive").length;
    return { mainAdminCount, subAdminCount, activeCount, inactiveCount };
  }, [usersList]);

  return (
    <div className=" max-w-7xl space-y-5 animate-fadeIn">
      {/* ---------------------------------------------------------
          HEADER
      ---------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 ">
        <div>
          <div className="flex items-center gap-3">
            
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                SaaS Admin Settings
              </h1>
             
            </div>
          </div>
        </div>

       
      </div>

      {/* ---------------------------------------------------------
          ROLE NOTICE BANNER
      ---------------------------------------------------------- */}
      {!isMainAdmin && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold">Sub-Admin Access (Read-Only Settings): </span>
            You are logged in as a Sub-Admin. You can view all admin accounts, but you cannot create, edit, delete, or block any account, nor can you modify profile credentials.
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          METRIC STATS CARDS
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Accounts
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {usersList.length}
          </div>
          <p className="text-xs text-gray-500 mt-1">Platform management users</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Main Admins
            </span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {counts.mainAdminCount}
          </div>
          <p className="text-xs text-gray-500 mt-1">Full control permissions</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Sub-Admins
            </span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Shield className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {counts.subAdminCount}
          </div>
          <p className="text-xs text-gray-500 mt-1">Portal view permissions</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Active / Blocked
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            <span className="text-emerald-600">{counts.activeCount}</span>
            <span className="text-gray-300 mx-1.5">/</span>
            <span className="text-red-500">{counts.inactiveCount}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {counts.inactiveCount > 0 ? `${counts.inactiveCount} accounts blocked` : "All accounts active"}
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------
          SECTION 1: ADMIN PROFILE SETTINGS
      ---------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-gray-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Admin Profile Information
            </h2>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              isMainAdmin
                ? "bg-indigo-100 text-indigo-700"
                : "bg-purple-100 text-purple-700"
            }`}
          >
            {isMainAdmin ? "Main Admin (Full Privileges)" : "Sub-Admin (Read Only)"}
          </span>
        </div>

        <form onSubmit={handleProfileSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => {
                    setProfileName(e.target.value);
                    if (profileErrors.name) setProfileErrors((p) => ({ ...p, name: null }));
                  }}
                  disabled={!isMainAdmin || profileSaving}
                  placeholder="Admin name"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm transition-colors ${
                    profileErrors.name
                      ? "border-red-400 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  } ${!isMainAdmin ? "bg-gray-100 cursor-not-allowed text-gray-500" : "bg-white"}`}
                />
              </div>
              {profileErrors.name && (
                <p className="mt-1 text-xs text-red-600">{profileErrors.name}</p>
              )}
            </div>

            {/* Email Field */}
           <div>
  <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-1.5">
    Admin Email Address
    {isMainAdmin && (
      <span className="text-xs text-blue-600 font-normal ml-1">
        (Editable by Main Admin)
      </span>
    )}
  </label>
  
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
      <Mail className="w-4 h-4" />
    </div>

    <input
      id="admin-email"
      type="email"
      value={profileEmail}
      onChange={(e) => {
        const val = e.target.value;
        setProfileEmail(val);

        // Pro validation check on change
        const trimmed = val.trim();
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

        let error = null;
        if (!trimmed) {
          error = "Email address is required.";
        } else if (!emailRegex.test(trimmed)) {
          error = "Please enter a valid email address format.";
        }

        setProfileErrors((p) => ({ ...p, email: error }));
      }}
      disabled={!isMainAdmin || profileSaving}
      placeholder="admin@example.com"
      className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm transition-colors outline-none ${
        profileErrors.email
          ? "border-red-400 bg-red-50/10 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-red-900"
          : "border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      } ${!isMainAdmin ? "bg-gray-100 cursor-not-allowed text-gray-500" : "bg-white"}`}
    />
  </div>

  {profileErrors.email && (
    <p className="mt-1 text-xs text-red-600 font-medium">{profileErrors.email}</p>
  )}

  {!isMainAdmin && (
    <p className="mt-1.5 text-xs text-gray-400">
      Sub-admins cannot edit their own email or profile details.
    </p>
  )}
</div>
          </div>

          {isMainAdmin && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={profileSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
              >
                {profileSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save Profile Changes
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* ---------------------------------------------------------
          SECTION 2: SUB-ADMINS & ADMIN MANAGEMENT TABLE
      ---------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Administrator Accounts
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Main admin can create, edit, block, and delete sub-admin accounts with instant UI update
              </p>
            </div>

            {isMainAdmin && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                New Sub-Admin
              </button>
            )}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="staylio-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-black hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="admin">Main Admin</option>
                <option value="sub_admin">Sub-Admin</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Blocked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <StaylioLoader
            message="Loading Administrator Accounts"
            subtitle="Fetching sub-admin credentials and permission matrices..."
            fullPage={false}
          />
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-700">No accounts found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery
                ? "Try adjusting your search criteria"
                : "No administrator accounts registered yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5">User Details</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => {
                  const isUserMainAdmin = user.role === "admin";
                  const isCurrentLoggedIn = user._id === adminUser?._id;
                  const isBusy = actionBusyId === user._id;

                  return (
                    <tr
                      key={user._id}
                      className="hover:bg-gray-50/70 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                              isUserMainAdmin
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {user.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                {user.name}
                              </span>
                              {isCurrentLoggedIn && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        {isUserMainAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Main Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            <Shield className="w-3.5 h-3.5" />
                            Sub-Admin
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {user.status === "active" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                            <Lock className="w-3 h-3" />
                            Blocked
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {isMainAdmin && !isUserMainAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(user)}
                              disabled={isBusy}
                              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Sub-Admin"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Block / Unblock Toggle */}
                            <button
                              onClick={() => handleToggleBlock(user)}
                              disabled={isBusy}
                              className={`p-1.5 rounded-lg transition-colors ${
                                user.status === "active"
                                  ? "text-gray-600 hover:text-amber-600 hover:bg-amber-50"
                                  : "text-amber-600 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={user.status === "active" ? "Block Sub-Admin" : "Unblock Sub-Admin"}
                            >
                              {isBusy ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : user.status === "active" ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <Unlock className="w-4 h-4" />
                              )}
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => openDeleteModal(user)}
                              disabled={isBusy}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Sub-Admin"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            {isUserMainAdmin ? "Super Account" : "Read-only"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------
          MODAL: CREATE / EDIT SUB-ADMIN
      ---------------------------------------------------------- */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  {modalMode === "create" ? (
                    <UserPlus className="w-5 h-5" />
                  ) : (
                    <Edit2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {modalMode === "create" ? "Add New Sub-Admin" : "Edit Sub-Admin"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {modalMode === "create"
                      ? "Create an assistant admin with portal access"
                      : "Modify sub-admin details"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                disabled={submitting}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    if (formErrors.name) setFormErrors((p) => ({ ...p, name: null }));
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm ${
                    formErrors.name
                      ? "border-red-400 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="subadmin@company.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, email: e.target.value }));
                    if (formErrors.email) setFormErrors((p) => ({ ...p, email: null }));
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm ${
                    formErrors.email
                      ? "border-red-400 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {formErrors.email && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>
                )}
                <p className="text-[11px] text-gray-500 mt-1">
                  Sub-admin logs in via Email OTP through the admin login page.
                </p>
              </div>

              {/* Status (Only when editing) */}
              {modalMode === "edit" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Account Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, status: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:ring-blue-500"
                  >
                    <option value="active">Active (Permitted to Login)</option>
                    <option value="inactive">Blocked (Login Denied)</option>
                  </select>
                </div>
              )}

              {/* Permissions Preview Info */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Sub-Admin Access Scope:
                </div>
                <p className="text-[11px] text-blue-700">
                  Sub-admins can view Hotels, Bills, Plans, Subscriptions, and Notifications. They cannot create other sub-admins, delete accounts, block users, or edit credentials.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : modalMode === "create" ? (
                    "Create Sub-Admin"
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          MODAL: DELETE CONFIRMATION
      ---------------------------------------------------------- */}
      {deleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-gray-900">
                Delete Sub-Admin?
              </h3>
              <p className="text-xs text-gray-500">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-800">
                  {userToDelete.name}
                </span>{" "}
                ({userToDelete.email})? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
