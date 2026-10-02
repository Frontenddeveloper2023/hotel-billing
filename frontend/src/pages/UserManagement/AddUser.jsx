import React from "react";

import {
    Save,
    X,
    Shield,
    Mail,
    User as UserIcon,
    Check,
    AlertCircle,
    Lock,
    Crown,
    Users,
    Utensils,
    BedDouble,
} from "lucide-react";

/* =========================================================
   SPINNER
========================================================= */

const Spinner = () => (
    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
);

/* =========================================================
   PERMISSION LABELS
========================================================= */

const permissionLabels = {
    dashboard: "Dashboard",
    roomsBooking: "Rooms Booking",
    foodManagement: "Food Management",
    serviceManagement: "Service Management",
    reports: "Reports",
    customer: "Customer",
    invoice: "Invoice Management",
    settings: "Settings",
    users: "Users",
    upgradePlan: "Upgrade Plan",
};

/* =========================================================
   FEATURE ICONS
========================================================= */



const featureInfo = {
    foodManagement: { icon: Utensils },
    serviceManagement: { icon: BedDouble },
};

/* =========================================================
   SHARED STYLES (Tailwind only)
========================================================= */

const labelCls =
    "block text-xs font-semibold text-slate-700 mb-1.5";

const inputCls = (hasError) =>
    `w-full pl-9 pr-4 py-2.5 text-sm text-[#0a1a3f] rounded-xl border outline-none transition-all duration-200 placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed ${
        hasError
            ? "border-red-400 bg-red-50/60 focus:ring-2 focus:ring-red-100"
            : "border-[#dbe6f8] bg-[#eff6ff]/40 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    }`;

const FieldError = ({ message }) =>
    message ? (
        <p className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-red-600">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {message}
        </p>
    ) : null;

/* =========================================================
   COMPONENT
========================================================= */

export default function AddUser({
    formData,
    errors,
    isSaving,
    userToEdit,
    isSelfEdit = false,
    subscription,
    plan,
    receptionistCount = 0,
    onSubmit,
    onInputChange,
    onInputBlur,
    onPermissionChange,
    onCancel,
}) {
    /* PLAN NAME */

    const planName =
        plan?.planName ||
        subscription?.planId?.planName ||
        "Current Plan";

    /* RECEPTIONIST LIMIT
       Subscription is runtime source of truth. Plan is fallback only. */

    const receptionistLimit = Number(
        subscription?.limits?.receptionists ??
            plan?.limits?.receptionists ??
            0
    );

    /* SUBSCRIPTION FEATURES */

    const foodService =
        subscription?.features?.foodService ??
        plan?.features?.foodService ??
        false;

    const roomService =
        subscription?.features?.roomService ??
        plan?.features?.roomService ??
        false;

    /* SUBSCRIPTION STATUS */

    const subscriptionActive =
        ["trial", "active", "expiring_soon"].includes(
            subscription?.status
        ) &&
        (!subscription?.endDate ||
            new Date(subscription.endDate) > new Date());

    /* RECEPTIONIST LIMIT */

    const receptionistLimitReached =
        receptionistLimit > 0 &&
        receptionistCount >= receptionistLimit;

    /* EDITING EXISTING RECEPTIONIST
       Existing receptionist can still be edited even when the
       receptionist limit is currently reached. */

    const editingReceptionist =
        Boolean(userToEdit) &&
        String(userToEdit?.role || "").toLowerCase() ===
            "receptionist";

    const editingPrivilegedUser =
        Boolean(userToEdit) &&
        ["admin", "hotelowner"].includes(
            String(userToEdit?.role || "").toLowerCase()
        );

    const privilegedRoleName =
        String(userToEdit?.role || "").toLowerCase() ===
        "hotelowner"
            ? "Hotel Owner"
            : "Administrator";

    const canSubmitForm =
        subscriptionActive || editingPrivilegedUser;

    /* CAN CREATE RECEPTIONIST */

    const canCreateReceptionist = !receptionistLimitReached;

    /* LOCK FORM
       New receptionist + limit reached = no details allowed. */

    const detailsLocked = !userToEdit && !canCreateReceptionist;

    /* PERMISSION AVAILABILITY
       Food and Service depend on subscription features. */

    const isPermissionAvailable = (key) => {
        if (key === "foodManagement") return foodService;
        if (key === "serviceManagement") return roomService;
        return true;
    };

    /* HANDLE SUBMIT
       Receptionist-only component; no role selector. */

    const handleSubmit = (event) => {
        event.preventDefault();

        // Backend also enforces the limit.
        if (!userToEdit && receptionistLimitReached) {
            return;
        }

        onSubmit(event);
    };

    const limitBlocked =
        receptionistLimitReached && !editingReceptionist;

    /* =======================================================
       RENDER
    ======================================================= */

    return (
        <div className="w-full bg-white font-['Inter']">
            {/* HEADER */}

            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-[#dbe6f8] bg-white/95 backdrop-blur">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-[#12306b] text-white shadow-md shadow-blue-600/25 flex items-center justify-center">
                        <Shield className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-bold text-[#0a1a3f] truncate">
                            {userToEdit
                                ? editingPrivilegedUser
                                    ? "Edit Administrator"
                                    : "Edit Receptionist"
                                : "Add Receptionist"}
                        </h2>

                        <p className="text-[11px] text-slate-400">
                            {isSelfEdit
                                ? "Update your own name and email."
                                : editingPrivilegedUser
                                  ? `Update ${privilegedRoleName.toLowerCase()} name and email.`
                                  : "Manage receptionist access and permissions."}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    disabled={isSaving}
                    onClick={onCancel}
                    aria-label="Close"
                    className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:bg-[#eff6ff] hover:text-blue-700 active:scale-95 transition-all duration-200 disabled:opacity-50"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* PLAN SUMMARY */}

            <div className="px-4 sm:px-6 pt-4">
                <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-[#eff6ff] to-white p-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-blue-100 flex items-center justify-center shrink-0 shadow-sm">
                            <Crown className="w-4 h-4 text-blue-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-bold text-[#0a1a3f] capitalize">
                                    {planName}
                                </p>

                                {subscriptionActive && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                        Active
                                    </span>
                                )}
                            </div>

                            <p className="text-[11px] text-slate-500 mt-0.5">
                                {isSelfEdit
                                    ? "You can update only your own basic profile details."
                                    : editingPrivilegedUser
                                      ? `${privilegedRoleName} has full access to all modules.`
                                      : "Receptionist access is controlled by your current subscription."}
                            </p>
                        </div>

                        {receptionistLimit > 0 && (
                            <div className="text-left sm:text-right">
                                <p className="text-[10px] font-semibold text-slate-400">
                                    Receptionists
                                </p>

                                <p
                                    className={`text-sm font-bold ${
                                        receptionistLimitReached
                                            ? "text-amber-700"
                                            : "text-[#0a1a3f]"
                                    }`}
                                >
                                    {receptionistCount}/{receptionistLimit}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RECEPTIONIST LIMIT WARNING */}

            {!userToEdit && receptionistLimitReached && (
                <div className="mx-4 sm:mx-6 mt-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                <Lock className="w-4 h-4 text-amber-600" />
                            </div>

                            <div className="flex-1">
                                <p className="text-xs font-bold text-amber-900">
                                    Receptionist limit reached
                                </p>

                                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                                    Your{" "}
                                    <strong className="capitalize">
                                        {planName}
                                    </strong>{" "}
                                    plan allows up to{" "}
                                    <strong>{receptionistLimit}</strong>{" "}
                                    receptionist account
                                    {receptionistLimit !== 1 ? "s" : ""} and
                                    all available receptionist seats are
                                    currently in use.
                                </p>

                                <p className="text-[11px] text-amber-700 mt-1.5 leading-relaxed">
                                    To add another receptionist, please
                                    upgrade your subscription or increase
                                    the receptionist limit.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SUBSCRIPTION UNAVAILABLE */}

            {!subscriptionActive && !editingPrivilegedUser && (
                <div className="mx-4 sm:mx-6 mt-4">
                    <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-red-200 bg-red-50">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                        </div>

                        <div>
                            <p className="text-xs font-bold text-red-900">
                                Subscription unavailable
                            </p>

                            <p className="text-[11px] text-red-700 mt-1 leading-relaxed">
                                Your subscription is not currently active. A
                                valid subscription is required to manage
                                receptionist accounts.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* GENERAL FORM ERROR */}

            {errors?.form && (
                <div
                    role="alert"
                    className="mx-4 sm:mx-6 mt-4 flex items-start gap-2.5 px-3.5 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium"
                >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{errors.form}</span>
                </div>
            )}

            {/* FORM */}

            <div className="p-4 sm:p-6">
                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="space-y-6"
                >
                    {/* BASIC DETAILS */}

                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-blue-500" />

                            <h3 className="text-sm font-bold text-[#0a1a3f]">
                                Basic details
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* ROLE - fixed for receptionist accounts */}

                            {!editingPrivilegedUser && (
                                <div className="md:col-span-2">
                                    <label className={labelCls}>Role</label>

                                    <div
                                        className={`w-full px-3.5 py-2.5 text-sm rounded-xl border transition-colors duration-300 ${
                                            limitBlocked
                                                ? "border-amber-200 bg-amber-50"
                                                : "border-[#dbe6f8] bg-[#eff6ff]/60"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Users
                                                    className={`w-4 h-4 ${
                                                        limitBlocked
                                                            ? "text-amber-600"
                                                            : "text-blue-500"
                                                    }`}
                                                />

                                                <span
                                                    className={`font-semibold ${
                                                        limitBlocked
                                                            ? "text-amber-800"
                                                            : "text-[#0a1a3f]"
                                                    }`}
                                                >
                                                    Receptionist
                                                </span>
                                            </div>

                                            {limitBlocked && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                                                    <Lock className="w-3 h-3" />
                                                    Limit reached
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {limitBlocked && (
                                        <p className="flex items-start gap-1.5 mt-1.5 text-[11px] text-amber-700 font-semibold">
                                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />

                                            <span>
                                                New receptionist accounts
                                                cannot be created because
                                                your current plan has reached
                                                its limit of{" "}
                                                <strong>
                                                    {receptionistLimit}
                                                </strong>
                                                .
                                            </span>
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* DETAILS LOCKED MESSAGE */}

                            {detailsLocked && (
                                <div className="md:col-span-2">
                                    <div className="rounded-xl border border-[#dbe6f8] bg-[#eff6ff]/60 p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-white border border-[#dbe6f8] flex items-center justify-center shrink-0">
                                                <Lock className="w-4 h-4 text-slate-400" />
                                            </div>

                                            <div>
                                                <p className="text-xs font-bold text-slate-700">
                                                    Upgrade your Plan to Add
                                                    More Receptionist
                                                </p>

                                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                                    All receptionist seats
                                                    included in your current
                                                    plan are already in use.
                                                    Please upgrade your
                                                    subscription to add
                                                    another receptionist.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* NAME */}

                            {!detailsLocked && (
                                <div className="md:col-span-2">
                                    <label className={labelCls}>
                                        Full Name
                                        <span className="text-red-500 ml-1">
                                            *
                                        </span>
                                    </label>

                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />

                                        <input
                                            type="text"
                                            name="name"
                                            value={formData?.name || ""}
                                            disabled={isSaving}
                                            onChange={onInputChange}
                                            onBlur={onInputBlur}
                                            placeholder="Enter full name"
                                            autoComplete="name"
                                            className={inputCls(errors?.name)}
                                        />
                                    </div>

                                    <FieldError message={errors?.name} />
                                </div>
                            )}

                            {/* EMAIL */}

                            {!detailsLocked && (
                                <div className="md:col-span-2">
                                    <label className={labelCls}>
                                        Email Address
                                        <span className="text-red-500 ml-1">
                                            *
                                        </span>
                                    </label>

                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />

                                        <input
                                            type="email"
                                            name="email"
                                            value={formData?.email || ""}
                                            disabled={isSaving}
                                            onChange={onInputChange}
                                            onBlur={onInputBlur}
                                            placeholder="name@example.com"
                                            autoComplete="email"
                                            className={inputCls(errors?.email)}
                                        />
                                    </div>

                                    <FieldError message={errors?.email} />
                                </div>
                            )}

                            {/* STATUS */}

                            {!detailsLocked &&
                                !editingPrivilegedUser &&
                                !isSelfEdit && (
                                    <div>
                                        <label className={labelCls}>
                                            Status
                                        </label>

                                        <select
                                            name="status"
                                            value={
                                                formData?.status || "active"
                                            }
                                            disabled={isSaving}
                                            onChange={onInputChange}
                                            className="w-full px-3.5 py-2.5 text-sm text-[#0a1a3f] rounded-xl border border-[#dbe6f8] bg-white outline-none cursor-pointer transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        >
                                            <option value="active">
                                                Active
                                            </option>

                                            <option value="inactive">
                                                Inactive
                                            </option>
                                        </select>
                                    </div>
                                )}
                        </div>
                    </section>

                    {/* PERMISSIONS */}

                    {!detailsLocked &&
                        !editingPrivilegedUser &&
                        !isSelfEdit && (
                            <section className="border-t border-[#dbe6f8] pt-5">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-[#0a1a3f]">
                                            Permissions
                                        </h3>

                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            Choose which modules this
                                            receptionist can access.
                                        </p>
                                    </div>

                                    <span className="text-[10px] text-slate-400">
                                        Subscription controlled
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {Object.entries(
                                        formData?.permission || {}
                                    ).map(([key, value]) => {
                                        const available =
                                            isPermissionAvailable(key);

                                        const locked = !available;

                                        const Icon =
                                            featureInfo[key]?.icon || Shield;

                                        return (
                                            <button
                                                type="button"
                                                key={key}
                                                disabled={isSaving || locked}
                                                aria-pressed={Boolean(value)}
                                                onClick={() =>
                                                    onPermissionChange(key)
                                                }
                                                className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 motion-reduce:transition-none ${
                                                    locked
                                                        ? "bg-slate-50 border-slate-200 cursor-not-allowed opacity-70"
                                                        : value
                                                          ? "bg-[#eff6ff] border-blue-400 shadow-sm shadow-blue-600/10"
                                                          : "bg-white border-[#dbe6f8] hover:bg-[#eff6ff]/60 hover:border-blue-300 active:scale-[0.98]"
                                                }`}
                                            >
                                                <div
                                                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${
                                                        locked
                                                            ? "bg-slate-100 text-slate-400"
                                                            : value
                                                              ? "bg-gradient-to-br from-blue-500 to-[#12306b] text-white"
                                                              : "bg-[#eff6ff] text-blue-500"
                                                    }`}
                                                >
                                                    {locked ? (
                                                        <Lock className="w-4 h-4" />
                                                    ) : (
                                                        <Icon className="w-4 h-4" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p
                                                        className={`text-xs font-bold ${
                                                            locked
                                                                ? "text-slate-500"
                                                                : "text-[#0a1a3f]"
                                                        }`}
                                                    >
                                                        {permissionLabels[
                                                            key
                                                        ] || key}
                                                    </p>

                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        {locked
                                                            ? "Not included in current plan"
                                                            : value
                                                              ? "Access enabled"
                                                              : "Access disabled"}
                                                    </p>
                                                </div>

                                                <div
                                                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors duration-200 ${
                                                        locked
                                                            ? "bg-slate-100 border-slate-200"
                                                            : value
                                                              ? "bg-blue-600 border-blue-600 text-white"
                                                              : "bg-white border-slate-300"
                                                    }`}
                                                >
                                                    {locked ? (
                                                        <Lock className="w-3 h-3 text-slate-400" />
                                                    ) : (
                                                        <Check
                                                            className={`w-3 h-3 stroke-[3] transition-transform duration-200 ${
                                                                value
                                                                    ? "scale-100"
                                                                    : "scale-0"
                                                            }`}
                                                        />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* FEATURE INFORMATION */}

                                <div className="mt-3 rounded-xl border border-[#dbe6f8] bg-[#eff6ff]/60 px-3 py-2.5">
                                    <div className="flex items-start gap-2">
                                        <Lock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />

                                        <p className="text-[11px] text-slate-500 leading-relaxed">
                                            Food Management and Service
                                            Management are available only
                                            when they are included in the
                                            hotel's current subscription.
                                            Subscription restrictions are
                                            also enforced by the backend.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )}

                    {/* ACTIONS */}

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-[#dbe6f8]">
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={onCancel}
                            className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-[#dbe6f8] hover:bg-[#eff6ff] active:scale-[0.98] rounded-xl transition-all duration-200 disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={
                                isSaving || !canSubmitForm || detailsLocked
                            }
                            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#12306b] to-blue-600 rounded-xl shadow-md shadow-blue-600/25 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 motion-reduce:transform-none disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <Spinner />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-3.5 h-3.5" />

                                    {userToEdit
                                        ? isSelfEdit
                                            ? "Update My Profile"
                                            : editingPrivilegedUser
                                              ? "Update Administrator"
                                              : "Update Receptionist"
                                        : "Create Receptionist"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}