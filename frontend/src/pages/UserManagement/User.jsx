import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
    useDeferredValue,
    memo,
} from "react";

import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../Context/AuthContext";

import {
    Search,
    Filter,
    Trash2,
    Edit2,
    Loader2,
    Users,
    ShieldCheck,
    Crown,
    CalendarDays,
    AlertTriangle,
    RefreshCw,
    CheckCircle2,
    Lock,
    Sparkles,
} from "lucide-react";

import { useToast } from "../../Context/ToastContext";

import AddUser from "./AddUser";

import {
    deleteUser,
    listUsers as getAllUsers,
    updateUser,
    createUser,
} from "../../service/userAccessService";

import { getMySubscription } from "../../service/subscriptionApi.js";

import { getPlanById } from "../../service/planApi.js";

/* =========================================================
   DEFAULT PERMISSIONS
========================================================= */

const initialPermissionsState = {
    dashboard: false,
    roomsBooking: false,
    foodManagement: false,
    serviceManagement: false,
    reports: false,
    customer: false,
    invoice: false,
    settings: false,
    users: false,
    upgradePlan: false,
};

/* =========================================================
   INITIAL FORM
========================================================= */

const initialFormState = {
    name: "",
    role: "receptionist",
    email: "",
    status: "active",
    permission: {
        ...initialPermissionsState,
    },
};

/* =========================================================
   HELPERS
========================================================= */

const getId = (item) => item?.id || item?._id;

const isPrivilegedUser = (user) => {
    const role = String(user?.role || "").toLowerCase();
    return role === "admin" || role === "hotelowner";
};

const getDaysRemaining = (endDate) => {
    if (!endDate) return null;

    const end = new Date(endDate);
    const now = new Date();

    if (Number.isNaN(end.getTime())) {
        return null;
    }

    return Math.max(
        0,
        Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
};

const formatDate = (date) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "—";
    }

    return parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

/* =========================================================
   TAILWIND-ONLY MOTION HELPERS
   (no CSS file, no <style>: state flips a transition)
========================================================= */

// flips to `true` one paint after mount so CSS transitions can run
function useEntered() {
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        let r2;
        const r1 = requestAnimationFrame(() => {
            r2 = requestAnimationFrame(() => setEntered(true));
        });
        return () => {
            cancelAnimationFrame(r1);
            cancelAnimationFrame(r2);
        };
    }, []);

    return entered;
}

function Reveal({ delay = 0, as: Tag = "div", className = "", children, ...rest }) {
    const entered = useEntered();

    return (
        <Tag
            {...rest}
            style={{ transitionDelay: entered ? `${delay}ms` : "0ms" }}
            className={`transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            } ${className}`}
        >
            {children}
        </Tag>
    );
}

function UsageBar({ value, full }) {
    const entered = useEntered();

    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#dbe6f8]">
            <div
                style={{ width: entered ? `${value}%` : "0%" }}
                className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${
                    full
                        ? "bg-gradient-to-r from-amber-400 to-amber-600"
                        : "bg-gradient-to-r from-blue-500 to-sky-400"
                }`}
            />
        </div>
    );
}

function ModalShell({ onBackdrop, children }) {
    const entered = useEntered();

    return (
        <div
            onClick={onBackdrop}
            className={`fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-[#0a1a3f]/60 backdrop-blur-sm p-0 sm:p-4 transition-opacity duration-300 motion-reduce:transition-none ${
                entered ? "opacity-100" : "opacity-0"
            }`}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-2xl max-h-[94vh] sm:max-h-[92vh] overflow-y-auto overscroll-contain bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                    entered
                        ? "opacity-100 translate-y-0 sm:scale-100"
                        : "opacity-0 translate-y-8 sm:translate-y-2 sm:scale-95"
                }`}
            >
                {children}
            </div>
        </div>
    );
}

/* =========================================================
   LIST LAYOUT
   Cards on mobile, aligned grid columns from md up.
========================================================= */

const GRID_OWNER =
    "md:grid-cols-[2.5rem_minmax(0,1.5fr)_7rem_minmax(0,2fr)_9.5rem_5.5rem]";
const GRID_STAFF =
    "md:grid-cols-[2.5rem_minmax(0,1.5fr)_7rem_minmax(0,2fr)_5.5rem]";

const headCell =
    "text-xs font-semibold text-slate-500";

/* =========================================================
   USER ROW (memoized: only re-renders when its own data changes)
========================================================= */

const UserRow = memo(function UserRow({
    user,
    index,
    gridCls,
    isHotelOwner,
    isReceptionist,
    canEdit,
    selected,
    toggling,
    deleting,
    onToggleSelect,
    onToggleStatus,
    onEdit,
    onDelete,
}) {
    const userId = getId(user);
    const isPrivileged = isPrivilegedUser(user);
    const isActive =
        String(user.status || "active").toLowerCase() === "active";

    const permissionChips = isPrivileged
        ? null
        : Object.entries(user.permission || {}).filter(([, v]) => v);

    return (
        <Reveal
            role="row"
            delay={Math.min(index, 10) * 35}
            className={`grid grid-cols-[auto_minmax(0,1fr)] md:grid ${gridCls} items-center gap-x-3 gap-y-3 px-4 sm:px-5 py-4 border-b border-[#dbe6f8] last:border-b-0 transition-colors duration-200 hover:bg-[#eff6ff]/70`}
        >
            {/* SELECT */}
            <div role="cell" className="flex items-center">
                <input
                    type="checkbox"
                    aria-label={`Select ${user.name || "user"}`}
                    disabled={!isHotelOwner || isPrivileged}
                    checked={selected}
                    onChange={() => onToggleSelect(userId)}
                    className="w-4 h-4 accent-blue-600 disabled:opacity-40 cursor-pointer"
                />
            </div>

            {/* USER */}
            <div role="cell" className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-[#12306b] text-white shadow-md shadow-blue-600/20 flex items-center justify-center">
                    <span className="text-sm font-bold">
                        {(user.name || "U").charAt(0).toUpperCase()}
                    </span>
                </div>

                <div className="min-w-0">
                    <p className="font-bold text-[#0a1a3f] text-sm truncate">
                        {user.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                        {user.email}
                    </p>
                </div>
            </div>

            {/* ROLE */}
            <div role="cell" className="col-span-2 md:col-span-1">
                <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold capitalize border ${
                        isPrivileged
                            ? "bg-[#eff6ff] text-blue-700 border-blue-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                >
                    {user.role}
                </span>
            </div>

            {/* PERMISSIONS */}
            <div role="cell" className="col-span-2 md:col-span-1 min-w-0">
                {isPrivileged ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#eff6ff] text-blue-700 border border-blue-200 text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        Full Access
                    </span>
                ) : (
                    <div className="flex flex-wrap gap-1 max-w-md">
                        {permissionChips.map(([key]) => (
                            <span
                                key={key}
                                className="px-2 py-1 text-[10px] bg-slate-50 text-slate-700 rounded-md border border-slate-200 font-semibold"
                            >
                                {key
                                    .replace(/([A-Z])/g, " $1")
                                    .replace(/^./, (str) => str.toUpperCase())}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* STATUS */}
            {isHotelOwner && (
                <div
                    role="cell"
                    className="col-span-2 md:col-span-1 flex items-center gap-2.5"
                >
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        aria-label={`Toggle status for ${user.name || "user"}`}
                        disabled={isPrivileged || toggling}
                        onClick={() => onToggleStatus(user)}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 motion-reduce:transition-none focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 ${
                            isActive ? "bg-emerald-500" : "bg-slate-300"
                        } ${
                            isPrivileged || toggling
                                ? "opacity-50 cursor-not-allowed"
                                : "cursor-pointer"
                        }`}
                    >
                        <span
                            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ease-out motion-reduce:transition-none ${
                                isActive ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>

                    <span
                        className={`text-xs font-bold ${
                            isActive ? "text-emerald-700" : "text-red-600"
                        }`}
                    >
                        {isActive ? "Active" : "Inactive"}
                    </span>
                </div>
            )}

            {/* ACTIONS */}
            <div
                role="cell"
                className="col-span-2 md:col-span-1 flex justify-end gap-2"
            >
                {canEdit && (
                    <button
                        type="button"
                        onClick={() => onEdit(user)}
                        aria-label="Edit user"
                        title={
                            isReceptionist
                                ? "Edit your profile"
                                : "Edit receptionist"
                        }
                        className="w-9 h-9 flex items-center justify-center text-blue-600 bg-[#eff6ff] hover:bg-blue-600 hover:text-white active:scale-95 rounded-lg transition-all duration-200 cursor-pointer"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                )}

                {isHotelOwner && !isPrivileged && (
                    <button
                        type="button"
                        disabled={deleting}
                        onClick={() => onDelete(userId)}
                        aria-label="Delete user"
                        title="Delete receptionist"
                        className="w-9 h-9 flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-600 hover:text-white active:scale-95 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-40"
                    >
                        {deleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>
        </Reveal>
    );
});

/* =========================================================
   COMPONENT
========================================================= */

export default function User() {
    const toast = useToast();
    const navigate = useNavigate();

    /* =======================================================
       CURRENT LOGGED-IN USER / ACCESS CONTROL
    ======================================================= */

    const { hotelUser: userData } = useAuth();

    const currentUserId = userData?.id || userData?._id;

    const currentUserRole = String(userData?.role || "").toLowerCase();

    const isHotelOwner = currentUserRole === "hotelowner";

    const isReceptionist = currentUserRole === "receptionist";

    const isOwnUser = useCallback(
        (user) => {
            if (!user || !currentUserId) {
                return false;
            }

            return String(getId(user)) === String(currentUserId);
        },
        [currentUserId]
    );

    const canEditUser = useCallback(
        (user) => {
            if (!user) {
                return false;
            }

            const targetRole = String(user?.role || "").toLowerCase();

            // Hotel Owner can edit receptionist accounts and their own account.
            if (isHotelOwner) {
                return targetRole === "receptionist" || isOwnUser(user);
            }

            // Receptionist can edit only their own receptionist account.
            if (isReceptionist) {
                return targetRole === "receptionist" && isOwnUser(user);
            }

            return false;
        },
        [isHotelOwner, isReceptionist, isOwnUser]
    );

    const canDeleteUsers = isHotelOwner;
    const canChangeUserStatus = isHotelOwner;

    /* =======================================================
       USERS
    ======================================================= */

    const [users, setUsers] = useState([]);

    const usersRef = useRef(users);
    usersRef.current = users;

    const [isLoading, setIsLoading] = useState(true);

    const [listError, setListError] = useState("");

    /* =======================================================
       SUBSCRIPTION
    ======================================================= */

    const [subscription, setSubscription] = useState(null);

    const [plan, setPlan] = useState(null);

    const [subscriptionLoading, setSubscriptionLoading] = useState(true);

    const [subscriptionError, setSubscriptionError] = useState("");

    /* =======================================================
       FILTER / FORM
    ======================================================= */

    const [roleFilter, setRoleFilter] = useState("All");

    const [selectedIds, setSelectedIds] = useState([]);

    const [isSaving, setIsSaving] = useState(false);

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);

    const [togglingId, setTogglingId] = useState(null);

    const [deletingId, setDeletingId] = useState(null);

    const [editingUser, setEditingUser] = useState(null);

    const [searchUser, setSearchUser] = useState("");

    // keeps typing responsive on long lists
    const deferredSearch = useDeferredValue(searchUser);

    const [errors, setErrors] = useState({});

    const [touched, setTouched] = useState({});

    const [formData, setFormData] = useState(initialFormState);

    /* =======================================================
       FETCH USERS
    ======================================================= */

    const fetchUsers = useCallback(async () => {
        try {
            setIsLoading(true);
            setListError("");

            const response = await getAllUsers();

            const usersArray =
                response?.data?.users || response?.users || [];

            setUsers(Array.isArray(usersArray) ? usersArray : []);

            return Array.isArray(usersArray) ? usersArray : [];
        } catch (error) {
            console.error("Failed to fetch users:", error);

            setUsers([]);

            setListError(
                error?.response?.data?.message ||
                    error?.message ||
                    "Failed to load users. Please refresh the page."
            );

            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    /* =======================================================
       FETCH SUBSCRIPTION + PLAN
    ======================================================= */

    const fetchSubscription = useCallback(async (usersArray) => {
        try {
            setSubscriptionLoading(true);

            setSubscriptionError("");

            /*
             * Backend already tenant-scopes users by authenticated hotel.
             * We only use the returned hotelId to request subscription data.
             */

            const firstUser = usersArray?.find((user) => user?.hotelId);

            const hotelId = firstUser?.hotelId
                ? typeof firstUser.hotelId === "object"
                    ? firstUser.hotelId?._id
                    : firstUser.hotelId
                : null;

            if (!hotelId) {
                setSubscription(null);
                setPlan(null);

                setSubscriptionError(
                    "Unable to identify the hotel subscription."
                );

                return;
            }

            /* GET CURRENT HOTEL SUBSCRIPTION */

            const subscriptionResponse = await getMySubscription(hotelId);

            const subscriptionData =
                subscriptionResponse?.data?.subscription ||
                subscriptionResponse?.subscription ||
                subscriptionResponse?.data ||
                null;

            if (!subscriptionData) {
                setSubscription(null);
                setPlan(null);

                setSubscriptionError(
                    "No active subscription was found for this hotel."
                );

                return;
            }

            setSubscription(subscriptionData);

            /*
             * GET PLAN
             * Subscription stores planId. Plan API gives the complete plan.
             */

            const planId =
                subscriptionData?.planId?._id || subscriptionData?.planId;

            if (planId) {
                try {
                    const planResponse = await getPlanById(planId);

                    const planData =
                        planResponse?.data?.plan ||
                        planResponse?.plan ||
                        planResponse?.data ||
                        null;

                    setPlan(planData);
                } catch (planError) {
                    console.error("Failed to fetch plan:", planError);

                    // Don't break the page. Subscription contains the
                    // runtime limits/features.
                    setPlan(null);
                }
            }
        } catch (error) {
            console.error("Failed to fetch subscription:", error);

            setSubscription(null);
            setPlan(null);

            setSubscriptionError(
                error?.response?.data?.message ||
                    error?.message ||
                    "Unable to load subscription details."
            );
        } finally {
            setSubscriptionLoading(false);
        }
    }, []);

    /* =======================================================
       INITIAL LOAD
    ======================================================= */

    useEffect(() => {
        const loadPage = async () => {
            const usersArray = await fetchUsers();

            await fetchSubscription(usersArray);
        };

        loadPage();

        const handleSubscriptionUpdated = async () => {
            console.log(
                "[UserManagement] Subscription updated event received - reloading staff limits"
            );
            const usersArray = await fetchUsers();
            await fetchSubscription(usersArray);
        };

        window.addEventListener(
            "subscriptionUpdated",
            handleSubscriptionUpdated
        );
        return () => {
            window.removeEventListener(
                "subscriptionUpdated",
                handleSubscriptionUpdated
            );
        };
    }, [fetchUsers, fetchSubscription]);

    /* =======================================================
       SUBSCRIPTION VALUES
       Subscription is the runtime source of truth.
       Plan is used for plan name / reference.
    ======================================================= */

    const limits = useMemo(
        () => ({
            rooms: Number(
                subscription?.limits?.rooms ?? plan?.limits?.rooms ?? 0
            ),

            branches: Number(
                subscription?.limits?.branches ?? plan?.limits?.branches ?? 0
            ),

            receptionists: Number(
                subscription?.limits?.receptionists ??
                    plan?.limits?.receptionists ??
                    0
            ),
        }),
        [subscription, plan]
    );

    const features = useMemo(
        () => ({
            foodService:
                subscription?.features?.foodService ??
                plan?.features?.foodService ??
                false,

            roomService:
                subscription?.features?.roomService ??
                plan?.features?.roomService ??
                false,
        }),
        [subscription, plan]
    );

    const planName =
        plan?.planName || subscription?.planId?.planName || "No Plan";

    const subscriptionStatus = subscription?.status || "inactive";

    const subscriptionActive =
        ["trial", "active", "expiring_soon"].includes(subscriptionStatus) &&
        (!subscription?.endDate || new Date(subscription.endDate) > new Date());

    /* =======================================================
       RECEPTIONIST USAGE
    ======================================================= */

    const receptionistCount = useMemo(() => {
        return users.filter(
            (user) => String(user?.role).toLowerCase() === "receptionist"
        ).length;
    }, [users]);

    const receptionistLimit = limits.receptionists;

    const receptionistLimitReached =
        receptionistLimit > 0 && receptionistCount >= receptionistLimit;

    const receptionistRemaining =
        receptionistLimit > 0
            ? Math.max(0, receptionistLimit - receptionistCount)
            : null;

    /* =======================================================
       EXPIRY
    ======================================================= */

    const daysRemaining = getDaysRemaining(subscription?.endDate);

    /* =======================================================
       VALIDATION
    ======================================================= */

    const validateField = (name, value) => {
        switch (name) {
            case "name":
                if (!value || !value.trim()) {
                    return "Please enter the user's full name.";
                }

                if (value.trim().length < 2) {
                    return "Name must be at least 2 characters.";
                }

                if (!/^[A-Za-z\s]+$/.test(value.trim())) {
                    return "Name can only contain letters and spaces.";
                }

                return "";

            case "email":
                if (!value || !value.trim()) {
                    return "Please enter an email address.";
                }

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
                    return "Enter a valid email, like name@example.com.";
                }

                return "";

            default:
                return "";
        }
    };

    /* =======================================================
       INPUT CHANGE
    ======================================================= */

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        const cleanedValue =
            name === "name" ? value.replace(/[^A-Za-z\s]/g, "") : value;

        setFormData((prev) => ({ ...prev, [name]: cleanedValue }));

        if (touched[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: validateField(name, cleanedValue),
            }));
        }
    };

    /* =======================================================
       BLUR
    ======================================================= */

    const handleInputBlur = (e) => {
        const { name, value } = e.target;

        setTouched((prev) => ({
            ...prev,
            [name]: true,
        }));

        setErrors((prev) => ({
            ...prev,
            [name]: validateField(name, value),
        }));
    };

    /* =======================================================
       PERMISSION
    ======================================================= */

    const handlePermissionChange = (permissionKey) => {
        if (permissionKey === "foodManagement" && !features.foodService) {
            setErrors((prev) => ({
                ...prev,
                form: "Food Management is not included in your current subscription plan.",
            }));

            return;
        }

        if (permissionKey === "serviceManagement" && !features.roomService) {
            setErrors((prev) => ({
                ...prev,
                form: "Service Management is not included in your current subscription plan.",
            }));

            return;
        }

        setErrors((prev) => ({
            ...prev,
            form: "",
        }));

        setFormData((prev) => ({
            ...prev,
            permission: {
                ...prev.permission,
                [permissionKey]: !prev.permission[permissionKey],
            },
        }));
    };

    /* =======================================================
       RESET
    ======================================================= */

    const resetFormAndModal = () => {
        setErrors({});
        setTouched({});
        setEditingUser(null);

        setFormData({
            ...initialFormState,
            permission: {
                ...initialPermissionsState,
            },
        });

        setIsFormModalOpen(false);
    };

    /* =======================================================
       ADD MODAL
    ======================================================= */

    const openAddModal = () => {
        // Only Hotel Owner can create receptionist accounts.
        if (!isHotelOwner) {
            return;
        }

        if (!subscriptionActive) {
            toast.error(
                "Your subscription is not active. Please renew your plan before adding users."
            );
            return;
        }

        if (receptionistLimitReached) {
            toast.warn(
                `Your plan receptionist allocation limit has been reached! Your current ${planName} plan allows a maximum of ${receptionistLimit} receptionist(s) (${receptionistCount}/${receptionistLimit} used). If you want to add more staff, please upgrade your subscription plan.`,
                6500
            );
            return;
        }

        setEditingUser(null);

        setFormData({
            ...initialFormState,
            permission: {
                ...initialPermissionsState,
            },
        });

        setErrors({});
        setTouched({});

        setIsFormModalOpen(true);
    };

    /* =======================================================
       FORM VALIDATION
    ======================================================= */

    const validateForm = () => {
        const formErrors = {
            name: validateField("name", formData.name),
            email: validateField("email", formData.email),
        };

        // Only Hotel Owner can create a new receptionist.
        if (!editingUser && !isHotelOwner) {
            formErrors.form =
                "Only Hotel Owner can create receptionist accounts.";
        }

        // Receptionist can edit only their own account.
        if (editingUser && !canEditUser(editingUser)) {
            formErrors.form =
                "You can only edit your own receptionist account.";
        }

        if (
            !editingUser &&
            isHotelOwner &&
            receptionistLimit > 0 &&
            receptionistCount >= receptionistLimit
        ) {
            formErrors.form = `Your ${planName} plan allows ${receptionistLimit} receptionist${receptionistLimit === 1 ? "" : "s"}. You already have ${receptionistCount}. Please upgrade your plan to add another receptionist.`;
        }

        Object.keys(formErrors).forEach((key) => {
            if (!formErrors[key]) delete formErrors[key];
        });

        return formErrors;
    };

    /* =======================================================
       SUBMIT
    ======================================================= */

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        setTouched({ name: true, email: true });

        const formErrors = validateForm();

        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            return;
        }

        setIsSaving(true);
        setErrors({});

        try {
            if (editingUser) {
                const userId = editingUser?.id || editingUser?._id;

                if (!userId) {
                    throw new Error("User ID is missing");
                }

                if (!canEditUser(editingUser)) {
                    throw new Error("You are not allowed to edit this user.");
                }

                // Receptionist editing themselves can update only
                // their own basic profile details.
                if (isReceptionist) {
                    await updateUser(userId, {
                        name: formData.name.trim(),
                        email: formData.email.trim().toLowerCase(),
                    });
                } else if (isHotelOwner) {
                    if (isOwnUser(editingUser)) {
                        await updateUser(userId, {
                            name: formData.name.trim(),
                            email: formData.email.trim().toLowerCase(),
                        });
                    } else {
                        // Hotel Owner can manage receptionist details,
                        // status and permissions.
                        await updateUser(userId, {
                            ...formData,
                            role: "receptionist",
                        });
                    }
                }
                toast.success("User profile updated successfully!");
            } else {
                if (!isHotelOwner) {
                    throw new Error(
                        "Only Hotel Owner can create receptionist accounts."
                    );
                }

                if (receptionistLimitReached) {
                    toast.warn(
                        `Staff allocation limit reached! Your current ${planName} plan allows a maximum of ${receptionistLimit} receptionist(s). Please upgrade your subscription plan.`,
                        6500
                    );
                    throw new Error(
                        `Your current plan allows a maximum of ${receptionistLimit} receptionist(s). Please upgrade your plan.`
                    );
                }

                await createUser({
                    ...formData,
                    role: "receptionist",
                });
                toast.success("Receptionist account created successfully!");
            }

            const latestUsers = await fetchUsers();
            await fetchSubscription(latestUsers);
            resetFormAndModal();
        } catch (error) {
            console.error("Failed to save user:", error);

            const errorMsg =
                error?.response?.data?.message ||
                error?.message ||
                "Failed to save user. Please try again.";

            setErrors({
                form: errorMsg,
            });
            toast.error(errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    /* =======================================================
       EDIT
    ======================================================= */

    const handleEditClick = useCallback(
        (user) => {
            // Enforce the same rule at the UI handler level.
            if (!canEditUser(user)) {
                return;
            }

            setEditingUser(user);

            const currentPerms = user?.permission || {};

            setFormData({
                name: user?.name || "",
                email: user?.email || "",
                role: "receptionist",
                status: user?.status || "active",
                permission: {
                    dashboard: currentPerms.dashboard ?? false,
                    roomsBooking: currentPerms.roomsBooking ?? false,
                    foodManagement: features.foodService
                        ? (currentPerms.foodManagement ?? false)
                        : false,
                    serviceManagement: features.roomService
                        ? (currentPerms.serviceManagement ?? false)
                        : false,
                    reports: currentPerms.reports ?? false,
                    customer: currentPerms.customer ?? false,
                    invoice: currentPerms.invoice ?? false,
                    settings: currentPerms.settings ?? false,
                    users: currentPerms.users ?? false,
                    upgradePlan: currentPerms.upgradePlan ?? false,
                },
            });

            setErrors({});
            setTouched({});
            setIsFormModalOpen(true);
        },
        [canEditUser, features]
    );

    /* =======================================================
       FILTER
    ======================================================= */

    const filteredUsers = useMemo(() => {
        const search = deferredSearch.trim().toLowerCase();

        return users.filter((user) => {
            const matchesSearch =
                (user?.name || "").toLowerCase().includes(search) ||
                (user?.email || "").toLowerCase().includes(search);

            const matchesRole = roleFilter === "All" || user?.role === roleFilter;

            return matchesSearch && matchesRole;
        });
    }, [users, deferredSearch, roleFilter]);

    /* =======================================================
       SELECTION
    ======================================================= */

    const toggleSelect = useCallback(
        (id) => {
            if (!isHotelOwner) {
                return;
            }

            const user = usersRef.current.find((u) => getId(u) === id);

            if (isPrivilegedUser(user)) {
                return;
            }

            setSelectedIds((prev) =>
                prev.includes(id)
                    ? prev.filter((sid) => sid !== id)
                    : [...prev, id]
            );
        },
        [isHotelOwner]
    );

    const toggleSelectAll = () => {
        if (!isHotelOwner) {
            return;
        }

        const ids = filteredUsers
            .filter((u) => String(u.role).toLowerCase() !== "admin")
            .map(getId);

        if (ids.length === 0) {
            return;
        }

        const allSelected = ids.every((id) => selectedIds.includes(id));

        setSelectedIds((prev) =>
            allSelected
                ? prev.filter((id) => !ids.includes(id))
                : [...new Set([...prev, ...ids])]
        );
    };

    /* =======================================================
       STATUS
    ======================================================= */

    const handleToggleStatus = useCallback(
        async (user) => {
            if (!canChangeUserStatus || !isHotelOwner) {
                return;
            }

            const userId = getId(user);

            if (!userId) {
                return;
            }

            if (String(user?.role).toLowerCase() === "admin") {
                return;
            }

            const oldStatus = String(user?.status || "active").toLowerCase();

            const newStatus = oldStatus === "active" ? "inactive" : "active";

            setTogglingId(userId);

            setUsers((prev) =>
                prev.map((item) =>
                    String(getId(item)) === String(userId)
                        ? { ...item, status: newStatus }
                        : item
                )
            );

            try {
                await updateUser(userId, {
                    status: newStatus,
                });
            } catch (error) {
                setUsers((prev) =>
                    prev.map((item) =>
                        String(getId(item)) === String(userId)
                            ? { ...item, status: oldStatus }
                            : item
                    )
                );

                setListError(
                    error?.response?.data?.message ||
                        "Unable to update user status."
                );
            } finally {
                setTogglingId(null);
            }
        },
        [canChangeUserStatus, isHotelOwner]
    );

    /* =======================================================
       DELETE
    ======================================================= */

    const handleDeleteUser = useCallback(
        async (id) => {
            if (!canDeleteUsers || !isHotelOwner) {
                return;
            }

            if (!id) {
                return;
            }

            toast.confirm(
                "Are you sure you want to delete this user?",
                async () => {
                    try {
                        setDeletingId(id);
                        await deleteUser(id);
                        const latestUsers = await fetchUsers();
                        setSelectedIds((prev) => prev.filter((sid) => sid !== id));
                        await fetchSubscription(latestUsers);
                        toast.success("User deleted successfully.");
                    } catch (error) {
                        toast.error(
                            error?.response?.data?.message ||
                                "Failed to delete user. Please try again."
                        );
                    } finally {
                        setDeletingId(null);
                    }
                },
                {
                    title: "Delete User",
                    confirmText: "Delete",
                    cancelText: "Cancel",
                }
            );
        },
        [canDeleteUsers, isHotelOwner, fetchUsers, fetchSubscription, toast]
    );

    /* =======================================================
       DELETE SELECTED
    ======================================================= */

    const handleDeleteSelected = async () => {
        if (!canDeleteUsers || !isHotelOwner) {
            return;
        }

        if (selectedIds.length === 0) {
            return;
        }

        toast.confirm(
            `Are you sure you want to delete ${selectedIds.length} selected user${
                selectedIds.length > 1 ? "s" : ""
            }?`,
            async () => {
                try {
                    await Promise.all(selectedIds.map((id) => deleteUser(id)));
                    const latestUsers = await fetchUsers();
                    setSelectedIds([]);
                    await fetchSubscription(latestUsers);
                    toast.success("Selected users deleted successfully.");
                } catch (error) {
                    toast.error(
                        error?.response?.data?.message ||
                            "Some users could not be deleted."
                    );
                    await fetchUsers();
                }
            },
            {
                title: "Delete Users",
                confirmText: "Delete All",
                cancelText: "Cancel",
            }
        );
    };

    const selectableVisible = filteredUsers.filter(
        (u) => !isPrivilegedUser(u)
    );

    const allVisibleSelected =
        isHotelOwner &&
        selectableVisible.length > 0 &&
        selectableVisible.every((u) => selectedIds.includes(getId(u)));

    const gridCls = isHotelOwner ? GRID_OWNER : GRID_STAFF;

    const usagePct =
        receptionistLimit > 0
            ? Math.min(100, (receptionistCount / receptionistLimit) * 100)
            : 0;

    const busy = isLoading || subscriptionLoading;

    /* =======================================================
       RENDER
    ======================================================= */

    return (
        <>
            <Helmet>
                <title>Users Management — Hotel Management</title>

                <meta
                    name="description"
                    content="Manage staff accounts, roles, permissions and subscription-based access."
                />
            </Helmet>

            <main className="w-full max-w-7xl mx-auto space-y-5 sm:space-y-6 pb-8 font-['Inter']">
                {/* =================================================
                    HEADER
                    (white text is for the navy gradient from Layout;
                     on a light Layout use text-[#0a1a3f] / text-slate-500)
                ================================================= */}

                <Reveal>
                  

                    <div className=" flex items-start gap-3">
                      

                        <div className="min-w-0">
<h1 className="text-[12px] sm:text-[20px] lg:text-[25px] leading-tight font-extrabold tracking-[-0.035em] text-white">                                Users Management
                            </h1>

                          
                        </div>
                    </div>
                </Reveal>

                {/* =================================================
                    SUBSCRIPTION CARD
                ================================================= */}

                <Reveal delay={60}>
                    <section className="rounded-2xl border border-[#dbe6f8] bg-white shadow-[0_8px_30px_-16px_rgba(15,42,99,.3)] overflow-hidden">
                        <div className="p-4 sm:p-5">
                            {subscriptionLoading ? (
                                <div className="animate-pulse space-y-4" aria-busy="true">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-[#e8eefb]" />
                                        <div className="space-y-2">
                                            <div className="h-3 w-24 rounded bg-[#e8eefb]" />
                                            <div className="h-4 w-36 rounded bg-[#e8eefb]" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        <div className="h-14 rounded-xl bg-[#e8eefb]" />
                                        <div className="h-14 rounded-xl bg-[#e8eefb]" />
                                        <div className="h-14 rounded-xl bg-[#e8eefb]" />
                                    </div>
                                </div>
                            ) : subscription ? (
                                <>
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                                        {/* PLAN */}

                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-[#12306b] text-white shadow-md shadow-blue-600/25 flex items-center justify-center">
                                                <Crown className="w-5 h-5" />
                                            </div>

                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-400">
                                                    Current plan
                                                </p>

                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <h2 className="text-base font-bold text-[#0a1a3f] capitalize">
                                                        {planName}
                                                    </h2>

                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold capitalize">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        {subscriptionStatus}
                                                    </span>
                                                </div>

                                                {subscription?.endDate && (
                                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                                        <CalendarDays className="w-3.5 h-3.5" />
                                                        Valid until{" "}
                                                        <strong className="text-slate-700">
                                                            {formatDate(
                                                                subscription.endDate
                                                            )}
                                                        </strong>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* LIMITS */}

                                        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full lg:w-auto">
                                            <div className="min-w-0 lg:min-w-[120px] rounded-xl border border-[#dbe6f8] bg-[#eff6ff]/60 px-3 py-2.5">
                                                <p className="text-[11px] font-semibold text-slate-400 truncate">
                                                    Receptionists
                                                </p>

                                                <p className="text-sm font-bold text-[#0a1a3f] mt-1">
                                                    {receptionistCount}
                                                    <span className="text-slate-400 font-medium">
                                                        {" "}
                                                        / {limits.receptionists || "∞"}
                                                    </span>
                                                </p>
                                            </div>

                                            <div className="min-w-0 lg:min-w-[120px] rounded-xl border border-[#dbe6f8] bg-[#eff6ff]/60 px-3 py-2.5">
                                                <p className="text-[11px] font-semibold text-slate-400 truncate">
                                                    Branches
                                                </p>

                                                <p className="text-sm font-bold text-[#0a1a3f] mt-1">
                                                    {limits.branches || "∞"}
                                                </p>
                                            </div>

                                            <div className="min-w-0 lg:min-w-[120px] rounded-xl border border-[#dbe6f8] bg-[#eff6ff]/60 px-3 py-2.5">
                                                <p className="text-[11px] font-semibold text-slate-400 truncate">
                                                    Rooms
                                                </p>

                                                <p className="text-sm font-bold text-[#0a1a3f] mt-1">
                                                    {limits.rooms || "∞"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* FEATURE STATUS */}

                                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#dbe6f8]">
                                        <span
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                                features.foodService
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-slate-50 text-slate-400 border-slate-200"
                                            }`}
                                        >
                                            Food Service{" "}
                                            {features.foodService
                                                ? "Included"
                                                : "Not Included"}
                                        </span>

                                        <span
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                                features.roomService
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-slate-50 text-slate-400 border-slate-200"
                                            }`}
                                        >
                                            Room Service{" "}
                                            {features.roomService
                                                ? "Included"
                                                : "Not Included"}
                                        </span>
                                    </div>

                                    {/* EXPIRY */}

                                    {daysRemaining !== null &&
                                        daysRemaining <= 7 &&
                                        daysRemaining > 0 && (
                                            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                                                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />

                                                <div>
                                                    <p className="text-xs font-bold text-amber-800">
                                                        Subscription expires soon
                                                    </p>

                                                    <p className="text-xs text-amber-700 mt-0.5">
                                                        Your subscription expires
                                                        in{" "}
                                                        <strong>
                                                            {daysRemaining} day
                                                            {daysRemaining !== 1
                                                                ? "s"
                                                                : ""}
                                                        </strong>
                                                        .
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                </>
                            ) : (
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />

                                    <div>
                                        <p className="text-sm font-bold text-[#0a1a3f]">
                                            Subscription unavailable
                                        </p>

                                        <p className="text-xs text-slate-500 mt-1">
                                            {subscriptionError ||
                                                "No subscription information is available."}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </Reveal>

                {/* =================================================
                    TOOLBAR (blue glass on the gradient)
                ================================================= */}

                <Reveal delay={120}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div className="flex flex-col sm:flex-row gap-2.5 flex-1 min-w-0">
                            <div className="relative flex-1 sm:max-w-sm">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 pointer-events-none" />

                                <input
                                    type="text"
                                    placeholder="Search by name or email"
                                    aria-label="Search users"
                                    value={searchUser}
                                    onChange={(e) => setSearchUser(e.target.value)}
                                    className="w-full h-11 pl-10 pr-4 text-sm text-white placeholder:text-white/60 rounded-xl border border-white/25 bg-white/10 backdrop-blur-md shadow-lg shadow-[#0a1a3f]/15 outline-none transition-all duration-300 focus:border-sky-300 focus:bg-white/15 focus:ring-2 focus:ring-sky-300/40"
                                />
                            </div>

                            {isHotelOwner && selectedIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleDeleteSelected}
                                    className="inline-flex h-11 items-center justify-center gap-1.5 px-4 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.97] rounded-xl shadow-lg shadow-red-900/20 transition-all duration-200"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Selected ({selectedIds.length})
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5">
                            <div className="relative">
                                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 pointer-events-none" />

                                <select
                                    value={roleFilter}
                                    aria-label="Filter by role"
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="w-full sm:w-44 h-11 pl-10 pr-8 text-sm font-medium text-white rounded-xl border border-white/25 bg-white/10 backdrop-blur-md cursor-pointer outline-none transition-all duration-300 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/40 [&>option]:text-slate-900"
                                >
                                    <option value="All">All Roles</option>
                                    <option value="receptionist">Receptionist</option>
                                    <option value="hotelOwner">Admin</option>
                                </select>
                            </div>

                          

                            {isHotelOwner && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (receptionistLimitReached) {
                                            toast.warn(
                                                `Staff allocation limit reached! Your current ${planName} plan allows a maximum of ${receptionistLimit} receptionist(s) (${receptionistCount}/${receptionistLimit} used). If you want to add more staff, please upgrade your subscription plan.`,
                                                6500
                                            );
                                            return;
                                        }
                                        openAddModal();
                                    }}
                                    disabled={!subscriptionActive}
                                    className={`inline-flex h-11 items-center justify-center gap-1.5 px-5 text-sm font-bold rounded-xl shadow-lg shadow-[#0a1a3f]/20 transition-all duration-200 motion-reduce:transform-none hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] ${
                                        receptionistLimitReached
                                            ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 cursor-pointer"
                                            : "bg-white text-[#12306b] hover:shadow-xl"
                                    } disabled:bg-white/30 disabled:text-white/60 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none`}
                                    title={
                                        receptionistLimitReached
                                            ? `Plan receptionist limit reached (${receptionistCount}/${receptionistLimit}). Click to learn how to upgrade.`
                                            : "Add new receptionist"
                                    }
                                >
                                    {receptionistLimitReached ? (
                                        <Lock className="w-4 h-4 text-amber-700" />
                                    ) : (
                                        <Users className="w-4 h-4" />
                                    )}
                                    Add Receptionist
                                    {receptionistLimitReached && (
                                        <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-950">
                                            Quota full
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </Reveal>

                {/* =================================================
                    RECEPTIONIST LIMIT
                ================================================= */}

                {subscription && limits.receptionists > 0 && (
                    <Reveal delay={160}>
                        <div
                            className={`rounded-xl border px-3.5 py-3 shadow-sm ${
                                receptionistLimitReached
                                    ? "bg-amber-50 border-amber-200"
                                    : "bg-white border-[#dbe6f8]"
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <ShieldCheck
                                        className={`w-4 h-4 shrink-0 ${
                                            receptionistLimitReached
                                                ? "text-amber-600"
                                                : "text-blue-600"
                                        }`}
                                    />

                                    <p
                                        className={`text-xs font-semibold ${
                                            receptionistLimitReached
                                                ? "text-amber-800"
                                                : "text-[#12306b]"
                                        }`}
                                    >
                                        {receptionistLimitReached
                                            ? `Staff allocation limit reached (${receptionistCount}/${limits.receptionists}). Upgrade your subscription to add more staff.`
                                            : `${receptionistRemaining} receptionist${
                                                  receptionistRemaining !== 1
                                                      ? "s"
                                                      : ""
                                              } remaining on your ${planName} plan.`}
                                    </p>
                                </div>

                                {receptionistLimitReached && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate("/saas-user/choose-plan")
                                        }
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-amber-700 hover:bg-amber-800 active:scale-[0.97] text-white shrink-0 transition-all duration-200 cursor-pointer"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Upgrade Plan
                                    </button>
                                )}
                            </div>

                            <div className="mt-2.5">
                                <UsageBar
                                    value={usagePct}
                                    full={receptionistLimitReached}
                                />
                            </div>
                        </div>
                    </Reveal>
                )}

                {/* =================================================
                    ERROR
                ================================================= */}

                {listError && (
                    <div
                        role="alert"
                        className="flex items-start gap-2.5 px-4 py-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium"
                    >
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        {listError}
                    </div>
                )}

                {/* =================================================
                    USERS LIST
                ================================================= */}

                <Reveal delay={200}>
                    <section className="bg-white rounded-2xl border border-[#dbe6f8] overflow-hidden shadow-[0_8px_30px_-16px_rgba(15,42,99,.3)]">
                        {/* list header */}
                        <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-[#dbe6f8]">
                            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-[#12306b] text-white shadow-md shadow-blue-600/25 flex items-center justify-center">
                                <Users className="w-5 h-5" />
                            </div>

                            <div className="min-w-0">
                                <h2 className="text-sm font-bold text-[#0a1a3f]">
                                    Team members
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {filteredUsers.length}{" "}
                                    {filteredUsers.length === 1 ? "user" : "users"}
                                </p>
                            </div>
                        </div>

                        <div role="table" aria-label="Users">
                            {/* column headings: md and up */}
                            <div
                                role="row"
                                className={`hidden md:grid ${gridCls} items-center gap-x-3 px-4 sm:px-5 py-3 bg-[#eff6ff]/70 border-b border-[#dbe6f8]`}
                            >
                                <div role="columnheader">
                                    <input
                                        type="checkbox"
                                        aria-label="Select all users"
                                        checked={allVisibleSelected}
                                        disabled={!isHotelOwner}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 accent-blue-600 cursor-pointer disabled:opacity-40"
                                    />
                                </div>
                                <div role="columnheader" className={headCell}>User</div>
                                <div role="columnheader" className={headCell}>Role</div>
                                <div role="columnheader" className={headCell}>Permissions</div>
                                {isHotelOwner && (
                                    <div role="columnheader" className={headCell}>Status</div>
                                )}
                                <div role="columnheader" className={`${headCell} text-right`}>
                                    Actions
                                </div>
                            </div>

                            {/* mobile: select all */}
                            {isHotelOwner && filteredUsers.length > 0 && (
                                <label className="md:hidden flex items-center gap-2.5 px-4 py-2.5 bg-[#eff6ff]/70 border-b border-[#dbe6f8] text-xs font-semibold text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 accent-blue-600"
                                    />
                                    Select all
                                </label>
                            )}

                            {isLoading ? (
                                <div aria-busy="true" className="animate-pulse">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-[#dbe6f8] last:border-b-0"
                                        >
                                            <div className="h-4 w-4 rounded bg-[#e8eefb]" />
                                            <div className="h-10 w-10 rounded-xl bg-[#e8eefb]" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 w-1/3 rounded bg-[#e8eefb]" />
                                                <div className="h-2.5 w-1/2 rounded bg-[#e8eefb]" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user, index) => {
                                    const userId = getId(user);

                                    return (
                                        <UserRow
                                            key={userId}
                                            user={user}
                                            index={index}
                                            gridCls={gridCls}
                                            isHotelOwner={isHotelOwner}
                                            isReceptionist={isReceptionist}
                                            canEdit={canEditUser(user)}
                                            selected={selectedIds.includes(userId)}
                                            toggling={
                                                String(togglingId) === String(userId)
                                            }
                                            deleting={
                                                String(deletingId) === String(userId)
                                            }
                                            onToggleSelect={toggleSelect}
                                            onToggleStatus={handleToggleStatus}
                                            onEdit={handleEditClick}
                                            onDelete={handleDeleteUser}
                                        />
                                    );
                                })
                            ) : (
                                <div className="px-6 py-14 text-center">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff6ff]">
                                        <Users className="h-7 w-7 text-blue-400" />
                                    </div>
                                    <p className="mt-4 text-sm font-bold text-[#0a1a3f]">
                                        No users found
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Try another search or role filter.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                </Reveal>

                {/* =================================================
                    ADD / EDIT MODAL
                    (kept outside every animated wrapper on purpose)
                ================================================= */}

                {isFormModalOpen && (
                    <ModalShell
                        onBackdrop={() => {
                            if (!isSaving) {
                                resetFormAndModal();
                            }
                        }}
                    >
                        <AddUser
                            formData={formData}
                            errors={errors}
                            isSaving={isSaving}
                            userToEdit={editingUser}
                            isSelfEdit={Boolean(
                                editingUser &&
                                    isReceptionist &&
                                    isOwnUser(editingUser)
                            )}
                            isHotelOwner={isHotelOwner}
                            subscription={subscription}
                            plan={plan}
                            receptionistCount={receptionistCount}
                            onSubmit={handleFormSubmit}
                            onInputChange={handleInputChange}
                            onInputBlur={handleInputBlur}
                            onPermissionChange={handlePermissionChange}
                            onCancel={resetFormAndModal}
                        />
                    </ModalShell>
                )}
            </main>
        </>
    );
}