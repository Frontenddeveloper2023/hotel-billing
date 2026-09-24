import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Building2,
  Phone,
  Mail,
  Percent,
  Clock,
  Save,
  Image,
} from "lucide-react";

import Spinner from "../../components/Spinner";
import { useToast } from "../../Context/ToastContext";
import { useAuth } from "../../Context/AuthContext";

import {
  getSettings,
  updateSettings,
} from "../../service/settingsService";

import {
  getBranchById,
  updateBranch,
} from "../../service/branchApi";

export default function Settings() {
  const toast = useToast();
  const { userData } = useAuth();

  // ============================================================
  // SUB-BRANCH CHECK
  // ============================================================

  const isSubBranchOwner =
    userData?.role === "hotelOwner" &&
    !!userData?.branchId;

  const API_BASE_URL =
    import.meta.env.VITE_BACKEND_URL ||
    "http://localhost:5000";

  // ============================================================
  // LOGO URL
  // ============================================================

  const getLogoUrl = (logoPath) => {
    if (!logoPath) return "";

    if (
      logoPath.startsWith("blob:") ||
      logoPath.startsWith("http://") ||
      logoPath.startsWith("https://")
    ) {
      return logoPath;
    }

    const cleanBase =
      API_BASE_URL.replace(/\/+$/, "");

    const cleanPath =
      logoPath.replace(/^\/+/, "");

    return `${cleanBase}/${cleanPath}`;
  };

  // ============================================================
  // FORM STATE
  // ============================================================

  const [formData, setFormData] = useState({
    companyName: "",
    phone: "",
    email: "",
    gstNumber: "",
    logo: "",
    logoFile: null,
    removeLogo: false,
    address: "",
    enableGst: false,
    gstPercentage: "",
    before12PmRateType: "percentage",
    before12PmValue: "",
    after12PmRateType: "full",
    after12PmValue: "",
  });

  // ============================================================
  // STATES
  // ============================================================

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ============================================================
  // LOAD SETTINGS
  // ============================================================

  useEffect(() => {
    if (!userData) return;

    fetchSettingsData();
  }, [userData]);

  // ============================================================
  // FETCH SETTINGS
  // ============================================================

  const fetchSettingsData = async () => {
    try {
      setIsLoading(true);

      console.info(
        "[Settings UI] Loading hotel settings..."
      );

      // ========================================================
      // GET NORMAL SETTINGS
      // ========================================================

      const settingsRes = await getSettings();

      let item = settingsRes?.success
        ? settingsRes.data || {}
        : {};

      // ========================================================
      // SUB-BRANCH PROFILE DATA
      // ========================================================

      if (
        isSubBranchOwner &&
        userData?.branchId
      ) {
        const branchRes =
          await getBranchById(
            userData.branchId
          );

        if (
          branchRes?.success &&
          branchRes?.data
        ) {
          const branch =
            branchRes.data;

          // Branch details override
          // main hotel profile details
          item = {
            ...item,

            companyName:
              branch.branchName ||
              item.companyName ||
              "",

            phone:
              branch.phone ||
              item.phone ||
              "",

            email:
              branch.email ||
              item.emailAddress ||
              item.email ||
              "",

            address: [
              branch.address?.street,
              branch.address?.city,
              branch.address?.state,
              branch.address?.country,
              branch.address?.pincode,
            ]
              .filter(Boolean)
              .join(", "),
          };
        }
      }

      // ========================================================
      // SET FORM
      // ========================================================

      if (
        settingsRes?.success &&
        item
      ) {
        // ------------------------------------------------------
        // LOGO
        // ------------------------------------------------------

        const rawLogo =
          item.companyLogo ||
          item.logo ||
          item.logoUrl ||
          "";

        // ------------------------------------------------------
        // PHONE NUMBERS
        // ------------------------------------------------------

        let formattedPhone = "";

        if (
          Array.isArray(
            item.phoneNumbers
          )
        ) {
          formattedPhone =
            item.phoneNumbers.join(", ");
        } else if (
          Array.isArray(
            item.phoneNumber
          )
        ) {
          formattedPhone =
            item.phoneNumber.join(", ");
        } else {
          formattedPhone =
            item.phone ||
            item.phoneNumber ||
            "";
        }

        // ------------------------------------------------------
        // SET FORM
        // ------------------------------------------------------

        setFormData({
          companyName:
            item.companyName || "",

          phone:
            formattedPhone,

          email:
            item.emailAddress ||
            item.email ||
            "",

          gstNumber:
            item.gstNumber || "",

          logo:
            getLogoUrl(rawLogo),

          logoFile: null,

          removeLogo: false,

          address:
            item.address ||
            item.hotelAddress ||
            "",

          enableGst:
            item.gstCalculationEnabled ??
            item.enableGst ??
            false,

          gstPercentage:
            item.gstPercentage !==
              undefined &&
            item.gstPercentage !==
              null
              ? String(
                  item.gstPercentage
                )
              : item.gstRate !==
                    undefined &&
                item.gstRate !==
                    null
              ? String(
                  item.gstRate
                )
              : "",

          before12PmRateType:
            item.beforeCheckoutPolicyType ||
            item.before12PmRateType ||
            "percentage",

          before12PmValue:
            item.beforeCheckoutValue !==
              undefined &&
            item.beforeCheckoutValue !==
              null
              ? String(
                  item.beforeCheckoutValue
                )
              : item.before12PmValue !==
                    undefined
              ? String(
                  item.before12PmValue
                )
              : "",

          after12PmRateType:
            item.afterCheckoutPolicyType ||
            item.after12PmRateType ||
            "full",

          after12PmValue:
            item.afterCheckoutValue !==
              undefined &&
            item.afterCheckoutValue !==
              null
              ? String(
                  item.afterCheckoutValue
                )
              : item.after12PmValue !==
                    undefined
              ? String(
                  item.after12PmValue
                )
              : "",
        });

        setErrors({});

        console.info(
          "[Settings UI] Hotel settings loaded successfully."
        );
      } else {
        toast.error(
          settingsRes?.message ||
            "Unable to load hotel settings."
        );
      }
    } catch (error) {
      console.error(
        "[Settings UI] Failed to load settings:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load hotel settings. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // INPUT CHANGE
  // ============================================================

  const handleInputChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    const val =
      type === "checkbox"
        ? checked
        : value;

    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // ============================================================
  // LOGO UPLOAD
  // ============================================================

  const handleLogoUpload = (e) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toast.error(
        "Logo file size must be less than 1MB."
      );

      e.target.value = "";
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Only JPG, JPEG, and PNG formats are supported."
      );

      e.target.value = "";
      return;
    }

    const previewUrl =
      URL.createObjectURL(file);

    setFormData((prev) => {
      if (
        prev.logo &&
        prev.logo.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          prev.logo
        );
      }

      return {
        ...prev,
        logoFile: file,
        logo: previewUrl,
        removeLogo: false,
      };
    });

    toast.info(
      "New logo selected. Click Save Settings to upload it."
    );
  };

  // ============================================================
  // FORM VALIDATION
  // ============================================================

  const validateForm = () => {
    const formErrors = {};

    // COMPANY NAME
    if (
      !String(
        formData.companyName || ""
      ).trim()
    ) {
      formErrors.companyName =
        "Company name is required.";
    }

    // GST NUMBER
    if (
      !String(
        formData.gstNumber || ""
      ).trim()
    ) {
      formErrors.gstNumber =
        "GST number is required.";
    }

    // GST PERCENTAGE
    if (formData.enableGst) {
      const gstValue = String(
        formData.gstPercentage || ""
      ).trim();

      if (!gstValue) {
        formErrors.gstPercentage =
          "GST percentage is required.";
      } else {
        const gstNumber =
          Number(gstValue);

        if (
          Number.isNaN(gstNumber) ||
          gstNumber < 0
        ) {
          formErrors.gstPercentage =
            "Enter a valid GST percentage.";
        }
      }
    }

    // PHONE
    if (
      !String(
        formData.phone || ""
      ).trim()
    ) {
      formErrors.phone =
        "Phone number is required.";
    } else {
      const phoneNumbers =
        String(formData.phone)
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);

      if (
        phoneNumbers.length === 0
      ) {
        formErrors.phone =
          "At least one phone number is required.";
      } else if (
        phoneNumbers.some(
          (p) =>
            !/^[+0-9\s()-]+$/.test(
              p
            )
        )
      ) {
        formErrors.phone =
          "Enter a valid phone number.";
      }
    }

    // EMAIL
    const email =
      String(
        formData.email || ""
      ).trim();

    if (!email) {
      formErrors.email =
        "Email address is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      formErrors.email =
        "Enter a valid email address.";
    }

    // ADDRESS
    if (
      !String(
        formData.address || ""
      ).trim()
    ) {
      formErrors.address =
        "Address is required.";
    }

    // BEFORE CHECKOUT
    if (
      formData.before12PmValue !==
        "" &&
      formData.before12PmValue !==
        null &&
      formData.before12PmValue !==
        undefined
    ) {
      const value =
        Number(
          formData.before12PmValue
        );

      if (
        Number.isNaN(value) ||
        value < 0
      ) {
        formErrors.before12PmValue =
          "Enter a valid before-checkout value.";
      }
    }

    // AFTER CHECKOUT
    if (
      formData.after12PmRateType !==
        "full" &&
      formData.after12PmValue !==
        "" &&
      formData.after12PmValue !==
        null &&
      formData.after12PmValue !==
        undefined
    ) {
      const value =
        Number(
          formData.after12PmValue
        );

      if (
        Number.isNaN(value) ||
        value < 0
      ) {
        formErrors.after12PmValue =
          "Enter a valid after-checkout value.";
      }
    }

    setErrors(formErrors);

    return (
      Object.keys(formErrors)
        .length === 0
    );
  };

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(
        "Please fix the errors in the form before saving."
      );
      return;
    }

    setIsSaving(true);

    try {
      // ========================================================
      // SUB-BRANCH PROFILE UPDATE
      // ========================================================

      if (
        isSubBranchOwner &&
        userData?.branchId
      ) {
        const branchRes =
          await updateBranch(
            userData.branchId,
            {
              branchName:
                formData.companyName.trim(),

              phone:
                formData.phone.trim(),

              address: {
                street:
                  formData.address.trim(),
              },
            }
          );

        if (!branchRes?.success) {
          throw new Error(
            branchRes?.message ||
              "Unable to update branch details."
          );
        }
      }

      // ========================================================
      // SETTINGS FORM DATA
      // ========================================================

      const data =
        new FormData();

      data.append(
        "companyName",
        String(
          formData.companyName
        ).trim()
      );

      data.append(
        "phone",
        String(
          formData.phone
        ).trim()
      );

      // IMPORTANT:
      // Sub-branch email must never be changed
      // through Settings API.
      if (!isSubBranchOwner) {
        data.append(
          "email",
          String(
            formData.email
          ).trim()
        );
      }

      data.append(
        "gstNumber",
        String(
          formData.gstNumber
        ).trim()
      );

      data.append(
        "address",
        String(
          formData.address
        ).trim()
      );

      data.append(
        "enableGst",
        String(
          Boolean(
            formData.enableGst
          )
        )
      );

      data.append(
        "gstPercentage",
        formData.enableGst
          ? String(
              formData.gstPercentage ||
                ""
            )
          : "0"
      );

      data.append(
        "before12PmRateType",
        formData.before12PmRateType
      );

      data.append(
        "before12PmValue",
        String(
          formData.before12PmValue ||
            ""
        )
      );

      data.append(
        "after12PmRateType",
        formData.after12PmRateType
      );

      data.append(
        "after12PmValue",
        String(
          formData.after12PmValue ||
            ""
        )
      );

      data.append(
        "removeLogo",
        String(
          Boolean(
            formData.removeLogo
          )
        )
      );

      // ========================================================
      // LOGO
      // ========================================================

      if (formData.logoFile) {
        data.append(
          "companyLogo",
          formData.logoFile
        );
      }

      // ========================================================
      // UPDATE SETTINGS
      // ========================================================

      const res =
        await updateSettings(data);

      if (!res?.success) {
        throw new Error(
          res?.message ||
            "Failed to update settings."
        );
      }

      toast.success(
        "Settings updated successfully."
      );

      // ========================================================
      // REFRESH LOCAL DATA
      // ========================================================

      await fetchSettingsData();
    } catch (error) {
      console.error(
        "[Settings UI] Error updating settings:",
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong while saving settings. Please try again.";

      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // REMOVE LOGO
  // ============================================================

  const handleRemoveLogo = () => {
    setFormData((prev) => {
      if (
        prev.logo &&
        prev.logo.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          prev.logo
        );
      }

      return {
        ...prev,
        logo: "",
        logoFile: null,
        removeLogo: true,
      };
    });

    toast.info(
      "Logo removed. Click Save Settings to confirm."
    );
  };

  // ============================================================
  // CLEANUP BLOB URL
  // ============================================================

  useEffect(() => {
    return () => {
      if (
        formData.logo &&
        formData.logo.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          formData.logo
        );
      }
    };
  }, [formData.logo]);

  // ============================================================
  // LOADING
  // ============================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      <Helmet>
        <title>
          Settings — SS Residency Hotel Management
        </title>

        <meta
          name="description"
          content="Manage hotel configuration settings at SS Residency."
        />
      </Helmet>

      <main className="max-w-6xl space-y-6">
        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-black">
              System Settings
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage your hotel profile,
              tax configurations, and
              checkout rules.
            </p>
          </div>
        </div>

        {/* FORM */}

        <form
          onSubmit={handleFormSubmit}
          noValidate
          className="space-y-6"
        >
          {/* COMPANY & TAX PROFILE */}

          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>

              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Company & Tax Profile
                </h2>

                <p className="text-[11px] sm:text-xs text-slate-500">
                  Primary business details
                  displayed on invoices and
                  receipts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">

              {/* COMPANY NAME */}

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] sm:text-xs font-bold text-black uppercase tracking-wider">
                  Company Name{" "}
                  <span className="text-red-500 ml-1">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  name="companyName"
                  disabled={isSaving}
                  value={
                    formData.companyName
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="e.g. SS Residency"
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
                    errors.companyName
                      ? "border-red-500 bg-red-50/20 focus:ring-2 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 bg-slate-50/40"
                  }`}
                />

                {errors.companyName && (
                  <span className="text-xs text-red-500 font-medium">
                    {errors.companyName}
                  </span>
                )}
              </div>

              {/* GST NUMBER */}

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] sm:text-xs font-bold text-black uppercase tracking-wider">
                  GST Number{" "}
                  <span className="text-red-500 ml-1">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  name="gstNumber"
                  disabled={isSaving}
                  value={
                    formData.gstNumber
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="e.g. 29GGGGG1314R9Z6"
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border outline-none transition-all uppercase ${
                    errors.gstNumber
                      ? "border-red-500 bg-red-50/20 focus:ring-2 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 bg-slate-50/40"
                  }`}
                />

                {errors.gstNumber && (
                  <span className="text-xs text-red-500 font-medium">
                    {errors.gstNumber}
                  </span>
                )}
              </div>

              {/* PHONE */}

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] sm:text-xs font-bold text-black uppercase tracking-wider">
                  Phone Number(s){" "}
                  <span className="text-red-500 ml-1">
                    *
                  </span>
                </label>

                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <input
                    type="tel"
                    name="phone"
                    disabled={isSaving}
                    value={
                      formData.phone
                    }
                    onChange={
                      handleInputChange
                    }
                    placeholder="+91 9876543210"
                    className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
                      errors.phone
                        ? "border-red-500 bg-red-50/20 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-200 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 bg-slate-50/40"
                    }`}
                  />
                </div>

                <span className="text-[10px] text-slate-400">
                  For multiple numbers,
                  separate them with commas.
                </span>

                {errors.phone && (
                  <span className="text-xs text-red-500 font-medium">
                    {errors.phone}
                  </span>
                )}
              </div>

              {/* EMAIL */}

              {/* EMAIL */}

<div className="flex flex-col gap-1.5">
  <label className="text-[11px] sm:text-xs font-bold text-black uppercase tracking-wider">
    Email Address{" "}
    <span className="text-red-500 ml-1">*</span>
  </label>

  <div className="relative">
    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

    <input
      type="email"
      name="email"
      value={formData.email}
      onChange={handleInputChange}
      disabled={
        isSaving || isSubBranchOwner
      }
      readOnly={isSubBranchOwner}
      placeholder="contact@example.com"
      className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
        errors.email
          ? "border-red-500 bg-red-50/20"
          : "border-slate-200 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 bg-slate-50/40"
      } ${
        isSubBranchOwner
          ? "bg-slate-100 cursor-not-allowed"
          : ""
      }`}
    />
  </div>

  {isSubBranchOwner && (
    <span className="text-[10px] text-slate-400">
      Branch email cannot be changed.
    </span>
  )}

  {errors.email && (
    <span className="text-xs text-red-500 font-medium">
      {errors.email}
    </span>
  )}
</div>

              {/* GST TOGGLE */}

              <div className="flex flex-col gap-3 p-4 bg-slate-50/60 rounded-xl border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-teal-700" />

                    <span className="text-[11px] sm:text-xs font-bold text-black uppercase tracking-wider">
                      GST Tax Calculation
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="enableGst"
                      checked={
                        formData.enableGst
                      }
                      onChange={
                        handleInputChange
                      }
                      disabled={isSaving}
                      className="sr-only peer"
                    />

                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-700"></div>
                  </label>
                </div>

                {formData.enableGst && (
                  <div className="flex flex-col gap-1 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        name="gstPercentage"
                        min="0"
                        step="0.01"
                        disabled={isSaving}
                        value={
                          formData.gstPercentage
                        }
                        onChange={
                          handleInputChange
                        }
                        placeholder="e.g. 12"
                        className={`w-24 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border bg-white focus:outline-none ${
                          errors.gstPercentage
                            ? "border-red-500"
                            : "border-slate-200 focus:border-teal-600"
                        }`}
                      />

                      <span className="text-[11px] sm:text-xs font-medium text-black">
                        % GST Rate applied
                        automatically on
                        invoices
                      </span>
                    </div>

                    {errors.gstPercentage && (
                      <span className="text-xs text-red-500 font-medium">
                        {
                          errors.gstPercentage
                        }
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ADDRESS */}

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] sm:text-xs font-bold text-black uppercase tracking-wider">
                  Hotel Address{" "}
                  <span className="text-red-500 ml-1">
                    *
                  </span>
                </label>

                <textarea
                  name="address"
                  rows="3"
                  disabled={isSaving}
                  value={
                    formData.address
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="Enter complete physical address..."
                  className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border outline-none resize-none transition-all ${
                    errors.address
                      ? "border-red-500 bg-red-50/20 focus:ring-2 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 bg-slate-50/40"
                  }`}
                />

                {errors.address && (
                  <span className="text-xs text-red-500 font-medium">
                    {errors.address}
                  </span>
                )}
              </div>

              {/* LOGO */}

              <div className="flex flex-col gap-2 col-span-1 md:col-span-2">
                <div className="flex flex-col">
                  <label className="text-[11px] sm:text-xs font-bold text-black uppercase tracking-wider">
                    Company Logo
                  </label>

                  <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                    Supported formats:
                    <strong className="text-slate-700">
                      JPG, JPEG, PNG
                    </strong>{" "}
                    | Max file size:
                    <strong className="text-slate-700">
                      1MB
                    </strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative">
                    <input
                      type="file"
                      id="logo-upload"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      disabled={isSaving}
                      onChange={
                        handleLogoUpload
                      }
                      className="hidden"
                    />

                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-dashed border-slate-300 hover:border-teal-600 cursor-pointer text-slate-600 hover:text-teal-700 bg-slate-50/50 hover:bg-teal-50/20 transition-all"
                    >
                      <Image className="w-4 h-4" />
                      Upload New Logo
                    </label>
                  </div>

                  {formData.logo ? (
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                        <img
                          src={
                            formData.logo
                          }
                          alt="Company logo preview"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={
                          handleRemoveLogo
                        }
                        className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">
                      No logo uploaded yet
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CHECKOUT RULES */}

          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-slate-100 text-slate-800 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>

              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Extra Time & Checkout Rules
                </h2>

                <p className="text-[11px] sm:text-xs text-slate-500">
                  Configure automated
                  penalty or extra fee
                  calculations for late
                  departures.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">

              {/* BEFORE 12 PM */}

              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Before 12 PM Checkout
                    Policy
                  </h3>

                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Fee configuration for
                    early or mid-day
                    departures.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <select
                    name="before12PmRateType"
                    value={
                      formData.before12PmRateType
                    }
                    onChange={
                      handleInputChange
                    }
                    disabled={isSaving}
                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none"
                  >
                    <option value="percentage">
                      % of Room Rate
                    </option>

                    <option value="flat">
                      Flat Amount (₹)
                    </option>
                  </select>

                  <input
                    type="number"
                    name="before12PmValue"
                    min="0"
                    step="0.01"
                    value={
                      formData.before12PmValue
                    }
                    onChange={
                      handleInputChange
                    }
                    disabled={isSaving}
                    placeholder="Enter value"
                    className={`w-24 sm:w-28 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl border bg-white focus:outline-none ${
                      errors.before12PmValue
                        ? "border-red-500"
                        : "border-slate-200 focus:border-teal-600"
                    }`}
                  />

                  <span className="text-xs font-bold text-slate-600">
                    {formData.before12PmRateType ===
                    "percentage"
                      ? "%"
                      : "₹"}
                  </span>
                </div>

                {errors.before12PmValue && (
                  <span className="text-xs text-red-500 font-medium">
                    {
                      errors.before12PmValue
                    }
                  </span>
                )}
              </div>

              {/* AFTER 12 PM */}

              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    After 12 PM Checkout
                    Policy
                  </h3>

                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Fee configuration for
                    extended stays past
                    standard checkout.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <select
                    name="after12PmRateType"
                    value={
                      formData.after12PmRateType
                    }
                    onChange={
                      handleInputChange
                    }
                    disabled={isSaving}
                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none"
                  >
                    <option value="full">
                      Full Day Charge
                    </option>

                    <option value="flat">
                      Flat Amount (₹)
                    </option>
                  </select>

                  {formData.after12PmRateType !==
                    "full" && (
                    <>
                      <input
                        type="number"
                        name="after12PmValue"
                        min="0"
                        step="0.01"
                        value={
                          formData.after12PmValue
                        }
                        onChange={
                          handleInputChange
                        }
                        disabled={isSaving}
                        placeholder="Enter amount"
                        className={`w-24 sm:w-28 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl border bg-white focus:outline-none ${
                          errors.after12PmValue
                            ? "border-red-500"
                            : "border-slate-200 focus:border-teal-600"
                        }`}
                      />

                      <span className="text-xs font-bold text-slate-600">
                        ₹
                      </span>
                    </>
                  )}
                </div>

                {errors.after12PmValue && (
                  <span className="text-xs text-red-500 font-medium">
                    {
                      errors.after12PmValue
                    }
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SAVE */}

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-75 min-w-[120px]"
            >
              {isSaving ? (
                <>
                  <Spinner />
                  <span>
                    Saving...
                  </span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />

                  <span>
                    Save Settings
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}