import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
} from "react";

import { Helmet } from "react-helmet-async";

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
} from "lucide-react";

import AddUser from "./AddUser";

import {
    deleteUser,
    listUsers as getAllUsers,
    updateUser,
    createUser,
} from "../../service/userAccessService";

import {
    getMySubscription,
} from "../../service/subscriptionApi.js";

import {
    getPlanById,
} from "../../service/planApi.js";

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

const getId = (item) =>
    item?.id || item?._id;

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
        Math.ceil(
            (end.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24)
        )
    );
};

const formatDate = (date) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "—";
    }

    return parsed.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }
    );
};

/* =========================================================
   COMPONENT
========================================================= */

export default function User() {
    /* =======================================================
       CURRENT LOGGED-IN USER / ACCESS CONTROL
    ======================================================= */

    const { userData } = useAuth();

    const currentUserId =
        userData?.id ||
        userData?._id;

    const currentUserRole =
        String(userData?.role || "").toLowerCase();

    const isHotelOwner =
        currentUserRole === "hotelowner";

    const isReceptionist =
        currentUserRole === "receptionist";

    const isOwnUser = (user) => {
        if (!user || !currentUserId) {
            return false;
        }

        return String(getId(user)) === String(currentUserId);
    };

    const canEditUser = (user) => {
        if (!user) {
            return false;
        }

        const targetRole =
            String(user?.role || "").toLowerCase();

        // Hotel Owner can edit receptionist accounts only.
        if (isHotelOwner) {
            return targetRole === "receptionist";
        }

        // Receptionist can edit only their own receptionist account.
        if (isReceptionist) {
            return (
                targetRole === "receptionist" &&
                isOwnUser(user)
            );
        }

        return false;
    };

    const canDeleteUsers = isHotelOwner;
    const canChangeUserStatus = isHotelOwner;

    /* =======================================================
       USERS
    ======================================================= */

    const [users, setUsers] = useState([]);

    const [isLoading, setIsLoading] =
        useState(true);

    const [listError, setListError] =
        useState("");

    /* =======================================================
       SUBSCRIPTION
    ======================================================= */

    const [
        subscription,
        setSubscription,
    ] = useState(null);

    const [
        plan,
        setPlan,
    ] = useState(null);

    const [
        subscriptionLoading,
        setSubscriptionLoading,
    ] = useState(true);

    const [
        subscriptionError,
        setSubscriptionError,
    ] = useState("");

    /* =======================================================
       FILTER / FORM
    ======================================================= */

    const [
        roleFilter,
        setRoleFilter,
    ] = useState("All");

    const [
        selectedIds,
        setSelectedIds,
    ] = useState([]);

    const [
        isSaving,
        setIsSaving,
    ] = useState(false);

    const [
        isFormModalOpen,
        setIsFormModalOpen,
    ] = useState(false);

    const [
        togglingId,
        setTogglingId,
    ] = useState(null);

    const [
        deletingId,
        setDeletingId,
    ] = useState(null);

    const [
        editingUser,
        setEditingUser,
    ] = useState(null);

    const [
        searchUser,
        setSearchUser,
    ] = useState("");

    const [
        errors,
        setErrors,
    ] = useState({});

    const [
        touched,
        setTouched,
    ] = useState({});

    const [
        formData,
        setFormData,
    ] = useState(
        initialFormState
    );

    /* =======================================================
       FETCH USERS
    ======================================================= */

    const fetchUsers = useCallback(
        async () => {
            try {
                setIsLoading(true);
                setListError("");

                const response =
                    await getAllUsers();

                const usersArray =
                    response?.data
                        ?.users ||
                    response?.users ||
                    [];

                setUsers(
                    Array.isArray(
                        usersArray
                    )
                        ? usersArray
                        : []
                );

                return Array.isArray(
                    usersArray
                )
                    ? usersArray
                    : [];
            } catch (error) {
                console.error(
                    "Failed to fetch users:",
                    error
                );

                setUsers([]);

                setListError(
                    error?.response
                        ?.data?.message ||
                        error?.message ||
                        "Failed to load users. Please refresh the page."
                );

                return [];
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    /* =======================================================
       FETCH SUBSCRIPTION + PLAN
    ======================================================= */

    const fetchSubscription =
        useCallback(
            async (usersArray) => {
                try {
                    setSubscriptionLoading(
                        true
                    );

                    setSubscriptionError(
                        ""
                    );

                    /*
                     * Backend already tenant-scopes
                     * users by authenticated hotel.
                     *
                     * We only use the returned hotelId
                     * to request subscription data.
                     */

                    const firstUser =
                        usersArray?.find(
                            (user) =>
                                user?.hotelId
                        );

                    const hotelId =
                        firstUser?.hotelId
                            ? typeof firstUser.hotelId ===
                              "object"
                                ? firstUser
                                      .hotelId
                                      ?._id
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

                    /*
                     * GET CURRENT HOTEL SUBSCRIPTION
                     */

                    const subscriptionResponse =
                        await getMySubscription(
                            hotelId
                        );

                    const subscriptionData =
                        subscriptionResponse?.data
                            ?.subscription ||
                        subscriptionResponse?.subscription ||
                        subscriptionResponse?.data ||
                        null;

                    if (
                        !subscriptionData
                    ) {
                        setSubscription(
                            null
                        );
                        setPlan(null);

                        setSubscriptionError(
                            "No active subscription was found for this hotel."
                        );

                        return;
                    }

                    setSubscription(
                        subscriptionData
                    );

                    /*
                     * GET PLAN
                     *
                     * Subscription stores planId.
                     * Plan API gives the complete plan
                     * information.
                     */

                    const planId =
                        subscriptionData
                            ?.planId?._id ||
                        subscriptionData
                            ?.planId;

                    if (planId) {
                        try {
                            const planResponse =
                                await getPlanById(
                                    planId
                                );

                            const planData =
                                planResponse
                                    ?.data
                                    ?.plan ||
                                planResponse?.plan ||
                                planResponse?.data ||
                                null;

                            setPlan(
                                planData
                            );
                        } catch (
                            planError
                        ) {
                            console.error(
                                "Failed to fetch plan:",
                                planError
                            );

                            /*
                             * Don't break the page.
                             *
                             * Subscription contains
                             * the runtime limits/features.
                             */
                            setPlan(null);
                        }
                    }
                } catch (error) {
                    console.error(
                        "Failed to fetch subscription:",
                        error
                    );

                    setSubscription(
                        null
                    );
                    setPlan(null);

                    setSubscriptionError(
                        error?.response
                            ?.data?.message ||
                            error?.message ||
                            "Unable to load subscription details."
                    );
                } finally {
                    setSubscriptionLoading(
                        false
                    );
                }
            },
            []
        );

    /* =======================================================
       INITIAL LOAD
    ======================================================= */

    useEffect(() => {
        const loadPage =
            async () => {
                const usersArray =
                    await fetchUsers();

                await fetchSubscription(
                    usersArray
                );
            };

        loadPage();
    }, [
        fetchUsers,
        fetchSubscription,
    ]);

    /* =======================================================
       SUBSCRIPTION VALUES
    ======================================================= */

    /*
     * IMPORTANT:
     *
     * Subscription is the runtime source of truth.
     *
     * Plan is used for plan name / reference.
     */

    const limits = useMemo(
        () => ({
            rooms:
                Number(
                    subscription
                        ?.limits
                        ?.rooms ??
                        plan?.limits
                            ?.rooms ??
                        0
                ),

            branches:
                Number(
                    subscription
                        ?.limits
                        ?.branches ??
                        plan?.limits
                            ?.branches ??
                        0
                ),

            receptionists:
                Number(
                    subscription
                        ?.limits
                        ?.receptionists ??
                        plan?.limits
                            ?.receptionists ??
                        0
                ),
        }),
        [
            subscription,
            plan,
        ]
    );

    const features = useMemo(
        () => ({
            foodService:
                subscription
                    ?.features
                    ?.foodService ??
                plan?.features
                    ?.foodService ??
                false,

            roomService:
                subscription
                    ?.features
                    ?.roomService ??
                plan?.features
                    ?.roomService ??
                false,
        }),
        [
            subscription,
            plan,
        ]
    );

    const planName =
        plan?.planName ||
        subscription
            ?.planId
            ?.planName ||
        "No Plan";

    const subscriptionStatus =
        subscription?.status ||
        "inactive";

    const subscriptionActive =
        [
            "trial",
            "active",
            "expiring_soon",
        ].includes(
            subscriptionStatus
        ) &&
        (!subscription?.endDate ||
            new Date(
                subscription.endDate
            ) > new Date());

    /* =======================================================
       RECEPTIONIST USAGE
    ======================================================= */

    const receptionistCount =
        useMemo(() => {
            return users.filter(
                (user) =>
                    String(
                        user?.role
                    ).toLowerCase() ===
                    "receptionist"
            ).length;
        }, [users]);

    const receptionistLimit =
        limits.receptionists;

    const receptionistLimitReached =
        receptionistLimit > 0 &&
        receptionistCount >=
            receptionistLimit;

    const receptionistRemaining =
        receptionistLimit > 0
            ? Math.max(
                  0,
                  receptionistLimit -
                      receptionistCount
              )
            : null;

    /* =======================================================
       EXPIRY
    ======================================================= */

    const daysRemaining =
        getDaysRemaining(
            subscription?.endDate
        );

    /* =======================================================
       VALIDATION
    ======================================================= */

    const validateField = (
        name,
        value
    ) => {
        switch (name) {
            case "name":
                if (
                    !value ||
                    !value.trim()
                ) {
                    return "Please enter the user's full name.";
                }

                if (
                    value.trim()
                        .length < 2
                ) {
                    return "Name must be at least 2 characters.";
                }

                if (
                    !/^[A-Za-z\s]+$/.test(
                        value.trim()
                    )
                ) {
                    return "Name can only contain letters and spaces.";
                }

                return "";

            case "email":
                if (
                    !value ||
                    !value.trim()
                ) {
                    return "Please enter an email address.";
                }

                if (
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                        value.trim()
                    )
                ) {
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
            name === "name"
                ? value.replace(/[^A-Za-z\s]/g, "")
                : value;

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

    const handleInputBlur = (
        e
    ) => {
        const {
            name,
            value,
        } = e.target;

        setTouched(
            (prev) => ({
                ...prev,
                [name]: true,
            })
        );

        setErrors(
            (prev) => ({
                ...prev,
                [name]:
                    validateField(
                        name,
                        value
                    ),
            })
        );
    };

    /* =======================================================
       PERMISSION
    ======================================================= */

    const handlePermissionChange =
        (permissionKey) => {
            if (
                permissionKey ===
                    "foodManagement" &&
                !features.foodService
            ) {
                setErrors(
                    (prev) => ({
                        ...prev,
                        form: "Food Management is not included in your current subscription plan.",
                    })
                );

                return;
            }

            if (
                permissionKey ===
                    "serviceManagement" &&
                !features.roomService
            ) {
                setErrors(
                    (prev) => ({
                        ...prev,
                        form: "Service Management is not included in your current subscription plan.",
                    })
                );

                return;
            }

            setErrors(
                (prev) => ({
                    ...prev,
                    form: "",
                })
            );

            setFormData(
                (prev) => ({
                    ...prev,
                    permission: {
                        ...prev.permission,
                        [permissionKey]:
                            !prev
                                .permission[
                                permissionKey
                            ],
                    },
                })
            );
        };

    /* =======================================================
       RESET
    ======================================================= */

    const resetFormAndModal =
        () => {
            setErrors({});
            setTouched({});
            setEditingUser(
                null
            );

            setFormData({
                ...initialFormState,
                permission: {
                    ...initialPermissionsState,
                },
            });

            setIsFormModalOpen(
                false
            );
        };

    /* =======================================================
       ADD MODAL
    ======================================================= */

    const openAddModal = () => {
        // Only Hotel Owner can create receptionist accounts.
        if (!isHotelOwner) {
            return;
        }

        if (
            !subscriptionActive
        ) {
            setListError(
                "Your subscription is not active. Please renew your plan before adding users."
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

        setIsFormModalOpen(
            true
        );
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
            formErrors.form = "Only Hotel Owner can create receptionist accounts.";
        }

        // Receptionist can edit only their own account.
        if (editingUser && !canEditUser(editingUser)) {
            formErrors.form = "You can only edit your own receptionist account.";
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
                const userId =
                    editingUser?.id ||
                    editingUser?._id;

                if (!userId) {
                    throw new Error("User ID is missing");
                }

                if (!canEditUser(editingUser)) {
                    throw new Error(
                        "You are not allowed to edit this user."
                    );
                }

                // Receptionist editing themselves can update only
                // their own basic profile details.
                if (isReceptionist) {
                    await updateUser(userId, {
                        name: formData.name.trim(),
                        email: formData.email.trim().toLowerCase(),
                    });
                } else if (isHotelOwner) {
                    // Hotel Owner can manage receptionist details,
                    // status and permissions.
                    await updateUser(userId, {
                        ...formData,
                        role: "receptionist",
                    });
                }
            } else {
                if (!isHotelOwner) {
                    throw new Error(
                        "Only Hotel Owner can create receptionist accounts."
                    );
                }

                await createUser({
                    ...formData,
                    role: "receptionist",
                });
            }

            const latestUsers = await fetchUsers();
            await fetchSubscription(latestUsers);
            resetFormAndModal();
        } catch (error) {
            console.error("Failed to save user:", error);

            setErrors({
                form:
                    error?.response?.data?.message ||
                    error?.message ||
                    "Failed to save user. Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    /* =======================================================
       EDIT
    ======================================================= */

    const handleEditClick = (user) => {
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
                foodManagement:
                    features.foodService
                        ? currentPerms.foodManagement ?? false
                        : false,
                serviceManagement:
                    features.roomService
                        ? currentPerms.serviceManagement ?? false
                        : false,
                reports: currentPerms.reports ?? false,
                customer: currentPerms.customer ?? false,
                invoice: currentPerms.invoice ?? false,
                settings: currentPerms.settings ?? false,
                users: currentPerms.users ?? false,
            },
        });

        setErrors({});
        setTouched({});
        setIsFormModalOpen(true);
    };

    /* =======================================================
       FILTER
    ======================================================= */

    const filteredUsers =
        useMemo(() => {
            const search =
                searchUser
                    .trim()
                    .toLowerCase();

            return users.filter(
                (user) => {
                    const matchesSearch =
                        (
                            user?.name ||
                            ""
                        )
                            .toLowerCase()
                            .includes(
                                search
                            ) ||
                        (
                            user?.email ||
                            ""
                        )
                            .toLowerCase()
                            .includes(
                                search
                            );

                    const matchesRole =
                        roleFilter ===
                            "All" ||
                        user?.role ===
                            roleFilter;

                    return (
                        matchesSearch &&
                        matchesRole
                    );
                }
            );
        }, [
            users,
            searchUser,
            roleFilter,
        ]);

    /* =======================================================
       SELECTION
    ======================================================= */

    const toggleSelect = (
        id
    ) => {
        if (!isHotelOwner) {
            return;
        }

        const user =
            users.find(
                (u) =>
                    getId(u) === id
            );

        if (
            isPrivilegedUser(user)
        ) {
            return;
        }

        setSelectedIds(
            (prev) =>
                prev.includes(id)
                    ? prev.filter(
                          (
                              sid
                          ) =>
                              sid !==
                              id
                      )
                    : [
                          ...prev,
                          id,
                      ]
        );
    };

    const toggleSelectAll =
        () => {
            if (!isHotelOwner) {
                return;
            }

            const ids =
                filteredUsers
                    .filter(
                        (u) =>
                            String(
                                u.role
                            ).toLowerCase() !==
                            "admin"
                    )
                    .map(
                        getId
                    );

            if (
                ids.length === 0
            ) {
                return;
            }

            const allSelected =
                ids.every(
                    (id) =>
                        selectedIds.includes(
                            id
                        )
                );

            setSelectedIds(
                (prev) =>
                    allSelected
                        ? prev.filter(
                              (
                                  id
                              ) =>
                                  !ids.includes(
                                      id
                                  )
                          )
                        : [
                              ...new Set(
                                  [
                                      ...prev,
                                      ...ids,
                                  ]
                              ),
                          ]
            );
        };

    /* =======================================================
       STATUS
    ======================================================= */

    const handleToggleStatus =
        async (user) => {
            if (!canChangeUserStatus || !isHotelOwner) {
                return;
            }

            const userId =
                getId(user);

            if (!userId) {
                return;
            }

            if (
                String(
                    user?.role
                ).toLowerCase() ===
                "admin"
            ) {
                return;
            }

            const oldStatus =
                String(
                    user?.status ||
                        "active"
                ).toLowerCase();

            const newStatus =
                oldStatus ===
                "active"
                    ? "inactive"
                    : "active";

            setTogglingId(
                userId
            );

            setUsers(
                (prev) =>
                    prev.map(
                        (item) =>
                            String(
                                getId(
                                    item
                                )
                            ) ===
                            String(
                                userId
                            )
                                ? {
                                      ...item,
                                      status: newStatus,
                                  }
                                : item
                    )
            );

            try {
                await updateUser(
                    userId,
                    {
                        status:
                            newStatus,
                    }
                );
            } catch (error) {
                setUsers(
                    (prev) =>
                        prev.map(
                            (
                                item
                            ) =>
                                String(
                                    getId(
                                        item
                                    )
                                ) ===
                                String(
                                    userId
                                )
                                    ? {
                                          ...item,
                                          status: oldStatus,
                                      }
                                    : item
                        )
                );

                setListError(
                    error?.response
                        ?.data
                        ?.message ||
                        "Unable to update user status."
                );
            } finally {
                setTogglingId(
                    null
                );
            }
        };

    /* =======================================================
       DELETE
    ======================================================= */

    const handleDeleteUser =
        async (id) => {
            if (!canDeleteUsers || !isHotelOwner) {
                return;
            }

            if (!id) {
                return;
            }

            if (
                !window.confirm(
                    "Are you sure you want to delete this user?"
                )
            ) {
                return;
            }

            try {
                setDeletingId(
                    id
                );

                await deleteUser(
                    id
                );

                const latestUsers =
                    await fetchUsers();

                setSelectedIds(
                    (prev) =>
                        prev.filter(
                            (
                                sid
                            ) =>
                                sid !==
                                id
                        )
                );

                await fetchSubscription(
                    latestUsers
                );
            } catch (error) {
                window.alert(
                    error?.response
                        ?.data
                        ?.message ||
                        "Failed to delete user. Please try again."
                );
            } finally {
                setDeletingId(
                    null
                );
            }
        };

    /* =======================================================
       DELETE SELECTED
    ======================================================= */

    const handleDeleteSelected =
        async () => {
            if (!canDeleteUsers || !isHotelOwner) {
                return;
            }

            if (
                selectedIds.length ===
                0
            ) {
                return;
            }

            const confirmed =
                window.confirm(
                    `Are you sure you want to delete ${selectedIds.length} selected user${
                        selectedIds.length >
                        1
                            ? "s"
                            : ""
                    }?`
                );

            if (!confirmed) {
                return;
            }

            try {
                await Promise.all(
                    selectedIds.map(
                        (id) =>
                            deleteUser(
                                id
                            )
                    )
                );

                const latestUsers =
                    await fetchUsers();

                setSelectedIds(
                    []
                );

                await fetchSubscription(
                    latestUsers
                );
            } catch (error) {
                window.alert(
                    error?.response
                        ?.data
                        ?.message ||
                        "Some users could not be deleted."
                );

                await fetchUsers();
            }
        };

    const allVisibleSelected =
        isHotelOwner &&
        filteredUsers.filter(
            (u) =>
                !isPrivilegedUser(u)
        ).length > 0 &&
        filteredUsers
            .filter(
                (u) =>
                    !isPrivilegedUser(u)
            )
            .every((u) =>
                selectedIds.includes(
                    getId(u)
                )
            );

    /* =======================================================
       RENDER
    ======================================================= */

    return (
        <>
            <Helmet>
                <title>
                    Users Management —
                    Hotel Management
                </title>

                <meta
                    name="description"
                    content="Manage staff accounts, roles, permissions and subscription-based access."
                />
            </Helmet>

            <main className="w-full max-w-7xl mx-auto space-y-5 sm:space-y-6 font-['Inter']">
                {/* =================================================
                    HEADER
                ================================================= */}

                <section>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-indigo-600" />
                        </div>

                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                                Users Management
                            </h1>

                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                Manage receptionist accounts. Admin and hotel owner accounts have full access.
                            </p>
                        </div>
                    </div>
                </section>

                {/* =================================================
                    SUBSCRIPTION CARD
                ================================================= */}

                <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5">
                        {subscriptionLoading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />

                                Loading
                                subscription...
                            </div>
                        ) : subscription ? (
                            <>
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                                    {/* PLAN */}

                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                            <Crown className="w-5 h-5 text-indigo-600" />
                                        </div>

                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                                Current
                                                Plan
                                            </p>

                                            <div className="flex items-center gap-2 mt-0.5">
                                                <h2 className="text-base font-bold text-gray-900 capitalize">
                                                    {
                                                        planName
                                                    }
                                                </h2>

                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold capitalize">
                                                    <CheckCircle2 className="w-3 h-3" />

                                                    {
                                                        subscriptionStatus
                                                    }
                                                </span>
                                            </div>

                                            {subscription?.endDate && (
                                                <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5">
                                                    <CalendarDays className="w-3.5 h-3.5" />

                                                    Valid
                                                    until{" "}
                                                    <strong className="text-gray-700">
                                                        {formatDate(
                                                            subscription.endDate
                                                        )}
                                                    </strong>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* LIMITS */}

                                    <div className="grid grid-cols-3 gap-2.5 w-full lg:w-auto">
                                        {/* RECEPTIONISTS */}

                                        <div className="min-w-[110px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                                            <p className="text-[9px] uppercase tracking-wide font-bold text-gray-400">
                                                Receptionists
                                            </p>

                                            <p className="text-sm font-bold text-gray-900 mt-1">
                                                {
                                                    receptionistCount
                                                }

                                                <span className="text-gray-400 font-medium">
                                                    {" "}
                                                    /{" "}
                                                    {limits.receptionists ||
                                                        "∞"}
                                                </span>
                                            </p>
                                        </div>

                                        {/* BRANCHES */}

                                        <div className="min-w-[110px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                                            <p className="text-[9px] uppercase tracking-wide font-bold text-gray-400">
                                                Branches
                                            </p>

                                            <p className="text-sm font-bold text-gray-900 mt-1">
                                                {limits.branches ||
                                                    "∞"}
                                            </p>
                                        </div>

                                        {/* ROOMS */}

                                        <div className="min-w-[110px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                                            <p className="text-[9px] uppercase tracking-wide font-bold text-gray-400">
                                                Rooms
                                            </p>

                                            <p className="text-sm font-bold text-gray-900 mt-1">
                                                {limits.rooms ||
                                                    "∞"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* FEATURE STATUS */}

                                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                                    <span
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                            features.foodService
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-gray-50 text-gray-400 border-gray-200"
                                        }`}
                                    >
                                        Food Service{" "}
                                        {features.foodService
                                            ? "Included"
                                            : "Not Included"}
                                    </span>

                                    <span
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                            features.roomService
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-gray-50 text-gray-400 border-gray-200"
                                        }`}
                                    >
                                        Room Service{" "}
                                        {features.roomService
                                            ? "Included"
                                            : "Not Included"}
                                    </span>
                                </div>

                                {/* EXPIRY */}

                                {daysRemaining !==
                                    null &&
                                    daysRemaining <=
                                        7 &&
                                    daysRemaining >
                                        0 && (
                                        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />

                                            <div>
                                                <p className="text-xs font-bold text-amber-800">
                                                    Subscription
                                                    expires
                                                    soon
                                                </p>

                                                <p className="text-[11px] text-amber-700 mt-0.5">
                                                    Your
                                                    subscription
                                                    expires
                                                    in{" "}
                                                    <strong>
                                                        {
                                                            daysRemaining
                                                        }{" "}
                                                        day
                                                        {daysRemaining !==
                                                        1
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
                                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />

                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        Subscription
                                        unavailable
                                    </p>

                                    <p className="text-xs text-gray-500 mt-1">
                                        {subscriptionError ||
                                            "No subscription information is available."}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* =================================================
                    TOOLBAR
                ================================================= */}

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-gray-200 pb-4">
                    <div className="flex flex-col sm:flex-row gap-2.5 flex-1">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                            <input
                                type="text"
                                placeholder="Search by name or email"
                                value={
                                    searchUser
                                }
                                onChange={(
                                    e
                                ) =>
                                    setSearchUser(
                                        e.target
                                            .value
                                    )
                                }
                                className="w-full sm:w-80 pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                            />
                        </div>

                        {isHotelOwner && selectedIds.length >
                            0 && (
                            <button
                                type="button"
                                onClick={
                                    handleDeleteSelected
                                }
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl"
                            >
                                <Trash2 className="w-4 h-4" />

                                Delete Selected (
                                {
                                    selectedIds.length
                                }
                                )
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

                            <select
                                value={
                                    roleFilter
                                }
                                onChange={(
                                    e
                                ) =>
                                    setRoleFilter(
                                        e.target
                                            .value
                                    )
                                }
                                className="w-full sm:w-40 pl-9 pr-8 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl cursor-pointer text-gray-800 focus:border-indigo-500 outline-none font-medium"
                            >
                                <option value="All">
                                    All Roles
                                </option>

                                <option value="receptionist">Receptionist</option>
                                <option value="hotelOwner">Admin</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={async () => {
                                const latestUsers =
                                    await fetchUsers();

                                await fetchSubscription(
                                    latestUsers
                                );
                            }}
                            disabled={
                                isLoading ||
                                subscriptionLoading
                            }
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl disabled:opacity-50"
                        >
                            <RefreshCw
                                className={`w-4 h-4 ${
                                    isLoading ||
                                    subscriptionLoading
                                        ? "animate-spin"
                                        : ""
                                }`}
                            />

                            Refresh
                        </button>

                        {isHotelOwner && (
                            <button
                                type="button"
                                onClick={
                                    openAddModal
                                }
                                disabled={
                                    !subscriptionActive
                                }
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                                <Users className="w-4 h-4" />

                                Add Receptionist
                            </button>
                        )}
                    </div>
                </div>

                {/* =================================================
                    RECEPTIONIST LIMIT
                ================================================= */}

                {subscription &&
                    limits.receptionists >
                        0 && (
                        <div
                            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 ${
                                receptionistLimitReached
                                    ? "bg-amber-50 border-amber-200"
                                    : "bg-indigo-50 border-indigo-100"
                            }`}
                        >
                            <ShieldCheck
                                className={`w-4 h-4 ${
                                    receptionistLimitReached
                                        ? "text-amber-600"
                                        : "text-indigo-600"
                                }`}
                            />

                            <p
                                className={`text-xs font-semibold ${
                                    receptionistLimitReached
                                        ? "text-amber-800"
                                        : "text-indigo-800"
                                }`}
                            >
                                {receptionistLimitReached
                                    ? `Receptionist limit reached (${receptionistCount}/${limits.receptionists}).`
                                    : `${receptionistRemaining} receptionist${
                                          receptionistRemaining !==
                                          1
                                              ? "s"
                                              : ""
                                      } remaining on your ${planName} plan.`}
                            </p>
                        </div>
                    )}

                {/* =================================================
                    ERROR
                ================================================= */}

                {listError && (
                    <div className="flex items-start gap-2.5 px-4 py-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />

                        {listError}
                    </div>
                )}

                {/* =================================================
                    TABLE
                ================================================= */}

                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="pl-5 pr-2 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={
                                                allVisibleSelected
                                            }
                                            disabled={!isHotelOwner}
                                            onChange={
                                                toggleSelectAll
                                            }
                                            className="w-4 h-4 accent-indigo-600"
                                        />
                                    </th>

                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>

                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>

                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                        Permissions
                                    </th>

                                    {isHotelOwner && (
    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
        Status
    </th>
)}

                                    <th className="px-5 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr>
                                        <td
                                            colSpan="6"
                                            className="px-6 py-16 text-center"
                                        >
                                            <div className="flex justify-center items-center gap-2 text-gray-500">
                                                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />

                                                Loading
                                                users...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length >
                                  0 ? (
                                    filteredUsers.map(
                                        (
                                            user
                                        ) => {
                                            const userId =
                                                getId(
                                                    user
                                                );

                                            const isAdmin = String(user.role || "").toLowerCase() === "admin";

                                            const isPrivileged = isPrivilegedUser(user);

                                            const isActive =
                                                String(
                                                    user.status ||
                                                        "active"
                                                ).toLowerCase() ===
                                                "active";

                                            const isToggling =
                                                String(
                                                    togglingId
                                                ) ===
                                                String(
                                                    userId
                                                );

                                            const isDeleting =
                                                String(
                                                    deletingId
                                                ) ===
                                                String(
                                                    userId
                                                );

                                            return (
                                                <tr
                                                    key={
                                                        userId
                                                    }
                                                    className="hover:bg-gray-50 transition-colors"
                                                >
                                                    <td className="pl-5 pr-2 py-4">
                                                        <input
                                                            type="checkbox"
                                                            disabled={
                                                                !isHotelOwner ||
                                                                isPrivileged
                                                            }
                                                            checked={selectedIds.includes(
                                                                userId
                                                            )}
                                                            onChange={() =>
                                                                toggleSelect(
                                                                    userId
                                                                )
                                                            }
                                                            className="w-4 h-4 accent-indigo-600 disabled:opacity-40"
                                                        />
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                                                <span className="text-sm font-bold text-indigo-600">
                                                                    {(
                                                                        user.name ||
                                                                        "U"
                                                                    )
                                                                        .charAt(
                                                                            0
                                                                        )
                                                                        .toUpperCase()}
                                                                </span>
                                                            </div>

                                                            <div>
                                                                <p className="font-bold text-gray-900 text-sm">
                                                                    {
                                                                        user.name
                                                                    }
                                                                </p>

                                                                <p className="text-[11px] text-gray-500">
                                                                    {
                                                                        user.email
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <span
                                                            className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold capitalize border ${
                                                                isAdmin
                                                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                                    : "bg-gray-50 text-gray-700 border-gray-200"
                                                            }`}
                                                        >
                                                            {
                                                                user.role
                                                            }
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        {isPrivileged ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-bold">
                                                                <ShieldCheck className="w-3 h-3" />
                                                                Full Access
                                                            </span>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-1 max-w-sm">
                                                                {Object.entries(user.permission || {}).map(([key, value]) => {
                                                                    if (!value) return null;
                                                                    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
                                                                    return (
                                                                        <span key={key} className="px-2 py-1 text-[9px] bg-gray-100 text-gray-700 rounded-md border border-gray-200 font-semibold">
                                                                            {label}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </td>

                                                 {isHotelOwner && (
    <td className="px-4 py-4">
        <div className="flex items-center gap-2">
            <button
                type="button"
                disabled={
                    isPrivileged ||
                    isToggling
                }
                onClick={() =>
                    handleToggleStatus(user)
                }
                className={`relative w-10 h-5.5 rounded-full ${
                    isActive
                        ? "bg-emerald-500"
                        : "bg-gray-300"
                } ${
                    isPrivileged ||
                    isToggling
                        ? "opacity-50"
                        : "cursor-pointer"
                }`}
            >
                <span
                    className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                        isActive
                            ? "left-5"
                            : "left-0.5"
                    }`}
                />
            </button>

            <span
                className={`text-[10px] font-bold ${
                    isActive
                        ? "text-emerald-700"
                        : "text-red-600"
                }`}
            >
                {isActive
                    ? "Active"
                    : "Inactive"}
            </span>
        </div>
    </td>
)}

                                                    <td className="px-5 py-3">
                                                        <div className="flex justify-end gap-2">
                                                            {canEditUser(user) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleEditClick(
                                                                            user
                                                                        )
                                                                    }
                                                                    className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg"
                                                                    title={
                                                                        isReceptionist
                                                                            ? "Edit your profile"
                                                                            : "Edit receptionist"
                                                                    }
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            {isHotelOwner && !isPrivileged && (
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        isDeleting
                                                                    }
                                                                    onClick={() =>
                                                                        handleDeleteUser(
                                                                            userId
                                                                        )
                                                                    }
                                                                    className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white rounded-lg disabled:opacity-30"
                                                                    title="Delete receptionist"
                                                                >
                                                                    {isDeleting ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        <Trash2 className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )
                                ) : (
                                    <tr>
                                        <td
                                            colSpan="6"
                                            className="px-6 py-16 text-center text-sm text-gray-400"
                                        >
                                            No users
                                            found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* =================================================
                    ADD / EDIT MODAL
                ================================================= */}

                {isFormModalOpen && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
                        onClick={() => {
                            if (
                                !isSaving
                            ) {
                                resetFormAndModal();
                            }
                        }}
                    >
                        <div
                            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
                            onClick={(e) =>
                                e.stopPropagation()
                            }
                        >
                            <AddUser
                                formData={
                                    formData
                                }
                                errors={
                                    errors
                                }
                                isSaving={
                                    isSaving
                                }
                                userToEdit={
                                    editingUser
                                }
                                isSelfEdit={
                                    Boolean(
                                        editingUser &&
                                        isReceptionist &&
                                        isOwnUser(editingUser)
                                    )
                                }
                                subscription={
                                    subscription
                                }
                                plan={
                                    plan
                                }
                                receptionistCount={
                                    receptionistCount
                                }
                                onSubmit={
                                    handleFormSubmit
                                }
                                onInputChange={
                                    handleInputChange
                                }
                                onInputBlur={
                                    handleInputBlur
                                }
                                onPermissionChange={
                                    handlePermissionChange
                                }
                                onCancel={
                                    resetFormAndModal
                                }
                            />
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}