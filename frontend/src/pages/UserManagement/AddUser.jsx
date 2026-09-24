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
};


/* =========================================================
   FEATURE ICONS
========================================================= */

const featureInfo = {
    foodManagement: {
        icon: Utensils,
    },

    serviceManagement: {
        icon: BedDouble,
    },
};


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
    /* =======================================================
       PLAN NAME
    ======================================================= */

    const planName =
        plan?.planName ||
        subscription?.planId?.planName ||
        "Current Plan";


    /* =======================================================
       RECEPTIONIST LIMIT
       
       IMPORTANT:
       Subscription is runtime source of truth.
       Plan is fallback only.
    ======================================================= */

    const receptionistLimit = Number(
        subscription?.limits?.receptionists ??
            plan?.limits?.receptionists ??
            0
    );


    /* =======================================================
       SUBSCRIPTION FEATURES
    ======================================================= */

    const foodService =
        subscription?.features?.foodService ??
        plan?.features?.foodService ??
        false;

    const roomService =
        subscription?.features?.roomService ??
        plan?.features?.roomService ??
        false;


    /* =======================================================
       SUBSCRIPTION STATUS
    ======================================================= */

    const subscriptionActive =
        [
            "trial",
            "active",
            "expiring_soon",
        ].includes(subscription?.status) &&
        (
            !subscription?.endDate ||
            new Date(subscription.endDate) >
                new Date()
        );


    /* =======================================================
       RECEPTIONIST LIMIT
    ======================================================= */

    const receptionistLimitReached =
        receptionistLimit > 0 &&
        receptionistCount >= receptionistLimit;


    /* =======================================================
       EDITING EXISTING RECEPTIONIST
       
       Existing receptionist can still be edited even
       when the receptionist limit is currently reached.
    ======================================================= */

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
        String(userToEdit?.role || "").toLowerCase() === "hotelowner"
            ? "Hotel Owner"
            : "Administrator";

    const canSubmitForm =
        subscriptionActive || editingPrivilegedUser;


    /* =======================================================
       CAN CREATE RECEPTIONIST
    ======================================================= */

    const canCreateReceptionist =
        !receptionistLimitReached;


    /* =======================================================
       LOCK FORM
       
       When creating a new receptionist and the limit is
       reached, do not allow entering any details.
    ======================================================= */

    const detailsLocked =
        !userToEdit &&
        !canCreateReceptionist;


    /* =======================================================
       PERMISSION AVAILABILITY
       
       Food and Service depend on subscription features.
    ======================================================= */

    const isPermissionAvailable = (key) => {
        if (key === "foodManagement") {
            return foodService;
        }

        if (key === "serviceManagement") {
            return roomService;
        }

        return true;
    };


    /* =======================================================
       HANDLE SUBMIT
       
       This component is receptionist-only.
       
       We do not expose any role selector.
    ======================================================= */

    const handleSubmit = (event) => {
        event.preventDefault();

        /*
         * If this is a new receptionist and the limit
         * has been reached, do not submit.
         *
         * Backend also enforces the limit.
         */

        if (
            !userToEdit &&
            receptionistLimitReached
        ) {
            return;
        }

        /*
         * Existing receptionist editing is allowed.
         */

        onSubmit(event);
    };


    /* =======================================================
       RENDER
    ======================================================= */

    return (
        <div className="w-full bg-white font-['Inter']">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-white">

                <div className="flex items-center gap-3">

                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-indigo-600" />
                    </div>

                    <div>

                        <h2 className="text-base sm:text-lg font-bold text-gray-900">
                            {userToEdit
                                ? editingPrivilegedUser
                                    ? "Edit Administrator"
                                    : "Edit Receptionist"
                                : "Add Receptionist"}
                        </h2>

                        <p className="text-[10px] text-gray-400">
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
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                >
                    <X className="w-5 h-5" />
                </button>

            </div>


            {/* =================================================
                PLAN SUMMARY
            ================================================= */}

            <div className="px-4 sm:px-6 pt-4">

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">

                        {/* Plan icon */}

                        <div className="w-9 h-9 rounded-lg bg-white border border-indigo-100 flex items-center justify-center shrink-0">
                            <Crown className="w-4 h-4 text-indigo-600" />
                        </div>


                        {/* Plan details */}

                        <div className="flex-1 min-w-0">

                            <div className="flex items-center gap-2 flex-wrap">

                                <p className="text-xs font-bold text-indigo-900 capitalize">
                                    {planName}
                                </p>


                                {subscriptionActive && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                                        Active
                                    </span>
                                )}

                            </div>


                            <p className="text-[10px] text-indigo-700 mt-0.5">
                                {isSelfEdit
                                    ? "You can update only your own basic profile details."
                                    : editingPrivilegedUser
                                        ? `${privilegedRoleName} has full access to all modules.`
                                        : "Receptionist access is controlled by your current subscription."}
                            </p>

                        </div>


                        {/* Receptionist usage */}

                        {receptionistLimit > 0 && (
                            <div className="text-left sm:text-right">

                                <p className="text-[9px] uppercase tracking-wide font-bold text-indigo-400">
                                    Receptionists
                                </p>


                                <p
                                    className={`text-xs font-bold ${
                                        receptionistLimitReached
                                            ? "text-amber-700"
                                            : "text-indigo-900"
                                    }`}
                                >
                                    {receptionistCount}/
                                    {receptionistLimit}
                                </p>

                            </div>
                        )}

                    </div>

                </div>

            </div>


            {/* =================================================
                RECEPTIONIST LIMIT WARNING
            ================================================= */}

            {!userToEdit &&
                receptionistLimitReached && (
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


                                    <p className="text-[10px] text-amber-800 mt-1 leading-relaxed">

                                        Your{" "}

                                        <strong className="capitalize">
                                            {planName}
                                        </strong>{" "}

                                        plan allows up to{" "}

                                        <strong>
                                            {receptionistLimit}
                                        </strong>{" "}

                                        receptionist account
                                        {receptionistLimit !== 1
                                            ? "s"
                                            : ""}{" "}

                                        and all available
                                        receptionist seats
                                        are currently in use.

                                    </p>


                                    <p className="text-[10px] text-amber-700 mt-1.5 leading-relaxed">

                                        To add another
                                        receptionist, please
                                        upgrade your subscription
                                        or increase the
                                        receptionist limit.

                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>
                )}


            {/* =================================================
                SUBSCRIPTION UNAVAILABLE
            ================================================= */}

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


                            <p className="text-[10px] text-red-700 mt-1 leading-relaxed">
                                Your subscription is not
                                currently active. A valid
                                subscription is required to
                                manage receptionist accounts.
                            </p>

                        </div>

                    </div>

                </div>
            )}


            {/* =================================================
                GENERAL FORM ERROR
            ================================================= */}

            {errors?.form && (
                <div className="mx-4 sm:mx-6 mt-4 flex items-start gap-2.5 px-3.5 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">

                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />

                    <span>
                        {errors.form}
                    </span>

                </div>
            )}


            {/* =================================================
                FORM
            ================================================= */}

            <div className="p-4 sm:p-6">

                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="space-y-6"
                >

                    {/* =================================================
                        BASIC DETAILS
                    ================================================= */}

                    <section>

                        <div className="flex items-center gap-2 mb-3">

                            <Users className="w-4 h-4 text-gray-400" />

                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                Basic Details
                            </h3>

                        </div>


                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                            {/* ROLE - fixed for receptionist accounts */}

                            {!editingPrivilegedUser && (
                                <div className="md:col-span-2">

                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Role
                                </label>


                                <div
                                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                                        receptionistLimitReached &&
                                        !editingReceptionist
                                            ? "border-amber-200 bg-amber-50"
                                            : "border-gray-200 bg-gray-50"
                                    }`}
                                >

                                    <div className="flex items-center justify-between">

                                        <div className="flex items-center gap-2">

                                            <Users
                                                className={`w-4 h-4 ${
                                                    receptionistLimitReached &&
                                                    !editingReceptionist
                                                        ? "text-amber-600"
                                                        : "text-indigo-500"
                                                }`}
                                            />

                                            <span
                                                className={`font-semibold ${
                                                    receptionistLimitReached &&
                                                    !editingReceptionist
                                                        ? "text-amber-800"
                                                        : "text-gray-800"
                                                }`}
                                            >
                                                Receptionist
                                            </span>

                                        </div>


                                        {receptionistLimitReached &&
                                            !editingReceptionist && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700">

                                                    <Lock className="w-3 h-3" />

                                                    Limit Reached

                                                </span>
                                            )}

                                    </div>

                                </div>


                                {receptionistLimitReached &&
                                    !editingReceptionist && (
                                        <p className="flex items-start gap-1.5 mt-1.5 text-[10px] text-amber-700 font-semibold">

                                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />

                                            <span>
                                                New receptionist
                                                accounts cannot be
                                                created because your
                                                current plan has
                                                reached its limit of{" "}
                                                <strong>
                                                    {
                                                        receptionistLimit
                                                    }
                                                </strong>
                                                .
                                            </span>

                                        </p>
                                    )}

                            </div>
                            )}



                            {/* =================================================
                                DETAILS LOCKED MESSAGE
                            ================================================= */}

                            {detailsLocked && (
                                <div className="md:col-span-2">

                                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                                        <div className="flex items-start gap-3">

                                            <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">

                                                <Lock className="w-4 h-4 text-gray-400" />

                                            </div>


                                            <div>

                                                <p className="text-xs font-bold text-gray-700">
                                                    Upgrade your Plan to Add More Receptionist
                                                </p>


                                                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                                                    All receptionist
                                                    seats included in
                                                    your current plan
                                                    are already in use.
                                                    Please upgrade your
                                                    subscription to add
                                                    another receptionist.
                                                </p>

                                            </div>

                                        </div>

                                    </div>

                                </div>
                            )}


                            {/* =================================================
                                NAME
                            ================================================= */}

                            {!detailsLocked && (
                                <div className="md:col-span-2">

                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">

                                        Full Name

                                        <span className="text-red-500 ml-1">
                                            *
                                        </span>

                                    </label>


                                    <div className="relative">

                                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />


                                        <input
                                            type="text"
                                            name="name"
                                            value={
                                                formData?.name || ""
                                            }
                                            disabled={isSaving}
                                            onChange={
                                                onInputChange
                                            }
                                            onBlur={
                                                onInputBlur
                                            }
                                            placeholder="Enter full name"
                                            autoComplete="name"
                                            className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none ${
                                                errors?.name
                                                    ? "border-red-400 bg-red-50"
                                                    : "border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                            }`}
                                        />

                                    </div>


                                    {errors?.name && (
                                        <p className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-red-600">

                                            <AlertCircle className="w-3 h-3" />

                                            {errors.name}

                                        </p>
                                    )}

                                </div>
                            )}


                            {/* =================================================
                                EMAIL
                            ================================================= */}

                            {!detailsLocked && (
                                <div className="md:col-span-2">

                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">

                                        Email Address

                                        <span className="text-red-500 ml-1">
                                            *
                                        </span>

                                    </label>


                                    <div className="relative">

                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />


                                        <input
                                            type="email"
                                            name="email"
                                            value={
                                                formData?.email || ""
                                            }
                                            disabled={isSaving}
                                            onChange={
                                                onInputChange
                                            }
                                            onBlur={
                                                onInputBlur
                                            }
                                            placeholder="name@example.com"
                                            autoComplete="email"
                                            className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none ${
                                                errors?.email
                                                    ? "border-red-400 bg-red-50"
                                                    : "border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                            }`}
                                        />

                                    </div>


                                    {errors?.email && (
                                        <p className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-red-600">

                                            <AlertCircle className="w-3 h-3" />

                                            {errors.email}

                                        </p>
                                    )}

                                </div>
                            )}


                            {/* =================================================
                                STATUS
                            ================================================= */}

                            {!detailsLocked && !editingPrivilegedUser && !isSelfEdit && (
                                <div>

                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Status
                                    </label>


                                    <select
                                        name="status"
                                        value={
                                            formData?.status ||
                                            "active"
                                        }
                                        disabled={isSaving}
                                        onChange={
                                            onInputChange
                                        }
                                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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


                    {/* =================================================
                        PERMISSIONS
                    ================================================= */}

                    {!detailsLocked && !editingPrivilegedUser && !isSelfEdit && (
                        <section className="border-t border-gray-100 pt-5">

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-3">

                                <div>

                                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                        Permissions
                                    </h3>

                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        Choose which modules this
                                        receptionist can access.
                                    </p>

                                </div>


                                <span className="text-[9px] text-gray-400">
                                    Subscription controlled
                                </span>

                            </div>


                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

                                {Object.entries(
                                    formData?.permission || {}
                                ).map(
                                    ([key, value]) => {

                                        const available =
                                            isPermissionAvailable(
                                                key
                                            );


                                        const locked =
                                            !available;


                                        const Icon =
                                            featureInfo[key]
                                                ?.icon ||
                                            Shield;


                                        return (
                                            <button
                                                type="button"
                                                key={key}
                                                disabled={
                                                    isSaving ||
                                                    locked
                                                }
                                                onClick={() =>
                                                    onPermissionChange(
                                                        key
                                                    )
                                                }
                                                className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                                    locked
                                                        ? "bg-gray-50 border-gray-200 cursor-not-allowed opacity-70"
                                                        : value
                                                        ? "bg-indigo-50 border-indigo-300"
                                                        : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                                                }`}
                                            >

                                                {/* Permission icon */}

                                                <div
                                                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                        locked
                                                            ? "bg-gray-100 text-gray-400"
                                                            : value
                                                            ? "bg-indigo-600 text-white"
                                                            : "bg-gray-100 text-gray-500"
                                                    }`}
                                                >

                                                    {locked ? (
                                                        <Lock className="w-4 h-4" />
                                                    ) : (
                                                        <Icon className="w-4 h-4" />
                                                    )}

                                                </div>


                                                {/* Permission details */}

                                                <div className="flex-1 min-w-0">

                                                    <p
                                                        className={`text-xs font-bold ${
                                                            locked
                                                                ? "text-gray-500"
                                                                : "text-gray-800"
                                                        }`}
                                                    >
                                                        {
                                                            permissionLabels[
                                                                key
                                                            ] ||
                                                            key
                                                        }
                                                    </p>


                                                    <p className="text-[9px] text-gray-400 mt-0.5">

                                                        {locked
                                                            ? "Not included in current plan"
                                                            : value
                                                            ? "Access enabled"
                                                            : "Access disabled"}

                                                    </p>

                                                </div>


                                                {/* Checkbox */}

                                                <div
                                                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                                        locked
                                                            ? "bg-gray-100 border-gray-200"
                                                            : value
                                                            ? "bg-indigo-600 border-indigo-600 text-white"
                                                            : "bg-white border-gray-300"
                                                    }`}
                                                >

                                                    {locked ? (
                                                        <Lock className="w-3 h-3 text-gray-400" />
                                                    ) : (
                                                        value && (
                                                            <Check className="w-3 h-3 stroke-[3]" />
                                                        )
                                                    )}

                                                </div>

                                            </button>
                                        );
                                    }
                                )}

                            </div>


                            {/* =================================================
                                FEATURE INFORMATION
                            ================================================= */}

                            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">

                                <div className="flex items-start gap-2">

                                    <Lock className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />

                                    <p className="text-[10px] text-gray-500 leading-relaxed">

                                        Food Management and
                                        Service Management are
                                        available only when they
                                        are included in the hotel's
                                        current subscription.
                                        Subscription restrictions
                                        are also enforced by the
                                        backend.

                                    </p>

                                </div>

                            </div>

                        </section>
                    )}


                    {/* =================================================
                        ACTIONS
                    ================================================= */}

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-gray-100">

                        {/* Cancel */}

                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={onCancel}
                            className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl disabled:opacity-50"
                        >
                            Cancel
                        </button>


                        {/* Submit */}

                        <button
                            type="submit"
                            disabled={
                                isSaving ||
                                !canSubmitForm ||
                                detailsLocked
                            }
                            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
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