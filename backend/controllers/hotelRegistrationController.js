import mongoose from "mongoose";

import SaasHotelRegistration from "../models/saasHotelRegistration.js";
import Hotels from "../models/hotels.js";
import BranchHotels from "../models/branchHotels.js";
import Plans from "../models/plans.js";
import Subscription from "../models/subscription.js";
import SaasNotification from "../models/saasNotification.js";
import User from "../models/users.js";
import FreeTrialSettings from "../models/freeTrialSettings.js";
import FreeTrialUsage from "../models/freeTrialUsage.js";
import {
  sendAdminFreeTrialNotificationEmail,
  sendHotelBlockedEmail,
} from "../util/email.js";

import { log } from "../util/logger.js";


// ============================================================
// CREATE HOTEL REGISTRATION
// ============================================================
// Public / New Hotel Owner
// POST /hotel-registrations
// ============================================================

export const createRegistration = async (req, res) => {
  try {
    const {
      hotelName,
      ownerName,
      email,
      phone,
      address,
      gstNumber,
      taxEnabled,
      planId,
      billingCycle,
      paymentStatus,
      paymentTransactionId,
    } = req.body;


    // ========================================================
    // STEP 1: BASIC HOTEL VALIDATION
    // ========================================================

    if (!hotelName || !hotelName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Hotel name is required.",
      });
    }

    if (hotelName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Hotel name must contain at least 2 characters.",
      });
    }


    // ========================================================
    // STEP 2: OWNER VALIDATION
    // ========================================================

    if (!ownerName || !ownerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Owner name is required.",
      });
    }

    if (ownerName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Owner name must contain at least 2 characters.",
      });
    }


    // ========================================================
    // STEP 3: EMAIL VALIDATION
    // ========================================================

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }


    // ========================================================
    // STEP 4: PHONE VALIDATION
    // ========================================================

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    const normalizedPhone = phone.trim();

    if (!/^[0-9]{10}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must contain exactly 10 digits.",
      });
    }


    // ========================================================
    // STEP 5: PLAN VALIDATION
    // ========================================================

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Please select a subscription plan.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({
        success: false,
        message: "The selected plan ID is invalid.",
      });
    }

    const plan = await Plans.findById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "The selected subscription plan was not found.",
      });
    }

    if (!plan.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "The selected subscription plan is currently unavailable. Please choose another plan.",
      });
    }


    // ========================================================
    // STEP 6: BILLING CYCLE VALIDATION
    // ========================================================

    const allowedBillingCycles = [
      "monthly",
      "quarterly",
      "halfYearly",
      "yearly",
      "custom",
    ];

    if (!billingCycle) {
      return res.status(400).json({
        success: false,
        message: "Please select a billing cycle.",
      });
    }

    if (!allowedBillingCycles.includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid billing cycle. Please select monthly, quarterly, half-yearly, yearly, or custom.",
      });
    }


    // ========================================================
    // STEP 7: CUSTOM BILLING VALIDATION
    // ========================================================
    // Your current HotelRegistration model does not contain
    // customDurationDays.
    //
    // Therefore, custom billing cannot be calculated here yet.
    // ========================================================

    if (billingCycle === "custom") {
      return res.status(400).json({
        success: false,
        message:
          "Custom billing duration is not available during registration yet. Please select monthly, quarterly, half-yearly, or yearly.",
      });
    }


    // ========================================================
    // STEP 8: CHECK EXISTING HOTEL REGISTRATION
    // ========================================================

    const existingRegistration =
      await SaasHotelRegistration.findOne({
        email: normalizedEmail,
        status: {
          $in: ["pending", "approved"],
        },
      });

    if (existingRegistration) {
      if (existingRegistration.status === "pending") {
        return res.status(409).json({
          success: false,
          message:
            "A hotel registration with this email is already under review.",
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "A hotel account already exists with this email address.",
      });
    }


    // ========================================================
    // STEP 9: CHECK EXISTING HOTEL
    // ========================================================

    const existingHotel = await Hotels.findOne({
      email: normalizedEmail,
    });

    if (existingHotel) {
      return res.status(409).json({
        success: false,
        message:
          "A hotel account already exists with this email address.",
      });
    }


    // ========================================================
    // STEP 10: PAYMENT STATUS
    // ========================================================

    const finalPaymentStatus = paymentStatus || "pending";

    const allowedPaymentStatuses = [
      "pending",
      "paid",
      "failed",
      "partially_paid",
    ];

    if (!allowedPaymentStatuses.includes(finalPaymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status.",
      });
    }


    // ========================================================
    // STEP 11: CREATE REGISTRATION
    // ========================================================

    const registration =
      await SaasHotelRegistration.create({
        hotelName: hotelName.trim(),

        ownerName: ownerName.trim(),

        email: normalizedEmail,

        phone: normalizedPhone,

        address: {
          street: address?.street?.trim() || "",
          city: address?.city?.trim() || "",
          state: address?.state?.trim() || "",
          country: address?.country?.trim() || "",
          pincode: address?.pincode?.trim() || "",
        },

        gstNumber: gstNumber?.trim() || "",

        taxEnabled:
          typeof taxEnabled === "boolean"
            ? taxEnabled
            : false,

        planId: plan._id,

        billingCycle,

        status: "pending",

        paymentStatus: finalPaymentStatus,

        paymentTransactionId:
          paymentTransactionId?.trim() || "",
      });


    // ========================================================
    // SUCCESS LOG
    // ========================================================

    log.info(
      `New hotel registration created successfully. Registration ID: ${registration._id}, Hotel: ${registration.hotelName}, Email: ${registration.email}`
    );


    return res.status(201).json({
      success: true,
      message:
        "Hotel registration submitted successfully. Your application is now under review.",
      data: registration,
    });


  } catch (error) {

    log.error(
      `Failed to create hotel registration: ${error.message}`
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A registration with the provided information already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to submit hotel registration at the moment. Please try again later.",
    });
  }
};



// ============================================================
// GET ALL HOTEL REGISTRATIONS
// ============================================================
// SaaS Admin
// GET /hotel-registrations/list-registrations
// ============================================================

export const getAllRegistrations = async (req, res) => {
  try {

    const registrations =
      await SaasHotelRegistration.find()
        .populate(
          "planId",
          "planName pricing limits features validityDays"
        )
        .populate(
          "hotelId",
          "hotelName ownerName email phone status"
        )
        .populate(
          "subscriptionId",
          "billingCycle startDate endDate status paymentStatus finalAmount"
        )
        .populate(
          "approvedBy",
          "name email role"
        )
        .sort({
          createdAt: -1,
        });


    log.info(
      `Hotel registrations retrieved successfully. Total registrations: ${registrations.length}`
    );


    return res.status(200).json({
      success: true,
      message:
        "Hotel registrations retrieved successfully.",
      count: registrations.length,
      data: registrations,
    });


  } catch (error) {

    log.error(
      `Failed to retrieve hotel registrations: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve hotel registrations at the moment. Please try again later.",
    });
  }
};



// ============================================================
// GET HOTEL REGISTRATION BY ID
// ============================================================
// SaaS Admin
// GET /hotel-registrations/:id
// ============================================================

export const getRegistrationById = async (req, res) => {
  try {

    const { id } = req.params;


    // ========================================================
    // STEP 1: VALIDATE ID
    // ========================================================

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Hotel registration ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "The provided hotel registration ID is invalid.",
      });
    }


    // ========================================================
    // STEP 2: FIND REGISTRATION
    // ========================================================

    const registration =
      await SaasHotelRegistration.findById(id)
        .populate(
          "planId",
          "planName description pricing limits features validityDays"
        )
        .populate(
          "hotelId",
          "hotelName ownerName email phone address gstNumber status"
        )
        .populate(
          "subscriptionId",
          "billingCycle startDate endDate status paymentStatus amount discount tax finalAmount"
        )
        .populate(
          "approvedBy",
          "name email role"
        );


    if (!registration) {
      return res.status(404).json({
        success: false,
        message:
          "Hotel registration was not found.",
      });
    }


    log.info(
      `Hotel registration retrieved successfully. Registration ID: ${id}`
    );


    return res.status(200).json({
      success: true,
      message:
        "Hotel registration retrieved successfully.",
      data: registration,
    });


  } catch (error) {

    log.error(
      `Failed to retrieve hotel registration: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve the hotel registration at the moment. Please try again later.",
    });
  }
};



// ============================================================
// APPROVE HOTEL REGISTRATION
// ============================================================
// SaaS Admin
// PUT /hotel-registrations/approve/:id
// ============================================================

export const approveRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    // ========================================================
    // STEP 1: VALIDATE REGISTRATION ID
    // ========================================================

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Hotel registration ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "The provided hotel registration ID is invalid.",
      });
    }

    // ========================================================
    // STEP 2: FIND REGISTRATION
    // ========================================================

    const registration = await SaasHotelRegistration.findById(id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Hotel registration was not found.",
      });
    }

    // ========================================================
    // STEP 3: NORMALIZE OWNER EMAIL
    // ========================================================

    const ownerEmail = registration.email
      ?.trim()
      .toLowerCase();

    if (!ownerEmail) {
      return res.status(400).json({
        success: false,
        message:
          "The hotel registration does not contain a valid owner email address.",
      });
    }

    // ========================================================
    // STEP 4: ALREADY APPROVED
    // ========================================================
    //
    // This is important for your CURRENT hotel.
    //
    // Your hotel is already approved, but the hotelOwner user
    // was not created earlier.
    //
    // Instead of returning "already approved", we check whether
    // the owner user exists. If missing, we create it.
    // ========================================================

    if (registration.status === "approved") {
      // ------------------------------------------------------
      // Check hotel
      // ------------------------------------------------------

      let hotel = null;

      if (registration.hotelId) {
        hotel = await Hotels.findById(registration.hotelId);
      }

      if (!hotel) {
        hotel = await Hotels.findOne({
          email: ownerEmail,
        });
      }

      if (!hotel) {
        return res.status(404).json({
          success: false,
          message:
            "This registration is marked as approved, but the related hotel account was not found.",
        });
      }

      // ------------------------------------------------------
      // Find main branch
      // ------------------------------------------------------

      let branch = await BranchHotels.findOne({
        hotelId: hotel._id,
        branchCode: "MAIN",
      });

      // If MAIN branch does not exist, create it
      if (!branch) {
        branch = await BranchHotels.create({
          hotelId: hotel._id,

          branchName:
            `${registration.hotelName} Main Branch`,

          branchCode: "MAIN",

          phone: registration.phone || "",

          email: ownerEmail,

          address: registration.address || {
            street: "",
            city: "",
            state: "",
            country: "",
            pincode: "",
          },

          status: "active",
          isMainBranch: true,
        });
      }

      // ------------------------------------------------------
      // Check owner user
      // ------------------------------------------------------

      let ownerUser = await User.findOne({
        email: ownerEmail,
      });

      // ------------------------------------------------------
      // Existing user belongs to another hotel
      // ------------------------------------------------------

      if (
        ownerUser &&
        ownerUser.hotelId &&
        ownerUser.hotelId.toString() !== hotel._id.toString()
      ) {
        return res.status(409).json({
          success: false,
          message:
            "A user with this email already belongs to another hotel.",
        });
      }

      // ------------------------------------------------------
      // Create missing owner user
      // ------------------------------------------------------

      if (!ownerUser) {
        ownerUser = await User.create({
          name: registration.ownerName?.trim() || hotel.ownerName,

          email: ownerEmail,

          role: "hotelOwner",

          hotelId: hotel._id,

          branchId: branch._id,

          status: "active",

          permission: {
            dashboard: true,
            roomsBooking: true,
            foodManagement: true,
            serviceManagement: true,
            reports: true,
            customer: true,
            invoice: true,
            settings: true,
            users: true,
          },
        });

        log.info(
          `Missing hotel owner user created successfully. User ID: ${ownerUser._id}, Hotel ID: ${hotel._id}, Branch ID: ${branch._id}`
        );
      } else {
        // ----------------------------------------------------
        // Existing owner user
        // Make sure tenant information is correct
        // ----------------------------------------------------

        let changed = false;

        if (
          !ownerUser.hotelId ||
          ownerUser.hotelId.toString() !== hotel._id.toString()
        ) {
          ownerUser.hotelId = hotel._id;
          changed = true;
        }

        if (
          !ownerUser.branchId ||
          ownerUser.branchId.toString() !== branch._id.toString()
        ) {
          ownerUser.branchId = branch._id;
          changed = true;
        }

        if (ownerUser.role !== "hotelOwner") {
          ownerUser.role = "hotelOwner";
          changed = true;
        }

        if (ownerUser.status !== "active") {
          ownerUser.status = "active";
          changed = true;
        }

        if (changed) {
          await ownerUser.save();

          log.info(
            `Existing hotel owner user updated successfully. User ID: ${ownerUser._id}, Hotel ID: ${hotel._id}, Branch ID: ${branch._id}`
          );
        }
      }

      // ------------------------------------------------------
      // Make sure registration has correct IDs
      // ------------------------------------------------------

      registration.hotelId = hotel._id;
      registration.status = "approved";

      await registration.save();

      return res.status(200).json({
        success: true,

        message:
          "Hotel is already approved. The hotel owner account has been verified successfully.",

        data: {
          registrationId: registration._id,

          hotelId: hotel._id,

          branchId: branch._id,

          ownerUserId: ownerUser._id,

          ownerEmail: ownerUser.email,

          role: ownerUser.role,

          status: registration.status,
        },
      });
    }

    // ========================================================
    // STEP 5: CHECK REJECTED STATUS
    // ========================================================

    if (registration.status === "rejected") {
      return res.status(400).json({
        success: false,
        message:
          "This hotel registration has already been rejected. A rejected application cannot be approved.",
      });
    }

    // ========================================================
    // STEP 6: CHECK PAYMENT
    // ========================================================

    if (registration.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message:
          "This registration cannot be approved because the payment has not been verified as paid.",
      });
    }

    // ========================================================
    // STEP 7: GET PLAN
    // ========================================================

    const plan = await Plans.findById(
      registration.planId
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message:
          "The plan selected by this hotel could not be found.",
      });
    }

    if (!plan.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "The selected plan is no longer active. Please assign an active plan before approving this registration.",
      });
    }

    // ========================================================
    // STEP 8: CHECK EXISTING HOTEL
    // ========================================================

    const existingHotel = await Hotels.findOne({
      email: ownerEmail,
    });

    if (existingHotel) {
      return res.status(409).json({
        success: false,
        message:
          "A hotel account already exists with this email address. This registration cannot be approved.",
      });
    }

    // ========================================================
    // STEP 9: CHECK EXISTING USER
    // ========================================================
    //
    // Do this BEFORE creating Hotel / Subscription / Branch.
    // This prevents partial data if email already exists.
    // ========================================================

    const existingUser = await User.findOne({
      email: ownerEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "A user account with this hotel owner email already exists. This email cannot be used for another hotel owner account.",
      });
    }

    // ========================================================
    // STEP 10: CREATE HOTEL
    // ========================================================

    const cleanHotelCode = registration.hotelName
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 6)
      .toUpperCase() || "HTL";

    const hotel = await Hotels.create({
      hotelName: registration.hotelName,

      hotelCode: cleanHotelCode,

      ownerName: registration.ownerName,

      email: ownerEmail,

      phone: registration.phone,

      address: registration.address,

      gstNumber: registration.gstNumber,

      taxEnabled: registration.taxEnabled,

      status: "active",
    });

    // ========================================================
    // STEP 11: CALCULATE SUBSCRIPTION DATES
    // ========================================================

    const startDate = new Date();

    const endDate = new Date(startDate);

    endDate.setDate(
      endDate.getDate() +
        Number(plan.validityDays || 30)
    );

    // ========================================================
    // STEP 12: GET PLAN PRICE
    // ========================================================

    let amount = 0;

    switch (registration.billingCycle) {
      case "monthly":
        amount = Number(
          plan.pricing?.monthly || 0
        );
        break;

      case "quarterly":
        amount = Number(
          plan.pricing?.quarterly || 0
        );
        break;

      case "halfYearly":
        amount = Number(
          plan.pricing?.halfYearly || 0
        );
        break;

      case "yearly":
        amount = Number(
          plan.pricing?.yearly || 0
        );
        break;

      default:
        amount = 0;
    }

    // ========================================================
    // STEP 13: CREATE SUBSCRIPTION
    // ========================================================

    const subscription =
      await Subscription.create({
        hotelId: hotel._id,

        planId: plan._id,

        billingCycle:
          registration.billingCycle,

        startDate,

        endDate,

        status: "active",

        paymentStatus: "paid",

        autoRenewal:
          plan.autoRenewalAllowed,

        trialStatus: "not_started",

        limits: {
          rooms: Number(
            plan.limits?.rooms || 0
          ),

          branches: Number(
            plan.limits?.branches || 0
          ),

          receptionists: Number(
            plan.limits?.receptionists || 0
          ),
        },

        features: {
          foodService:
            plan.features?.foodService === true,

          roomService:
            plan.features?.roomService === true,
        },

        amount,

        discount: 0,

        tax: 0,

        finalAmount: amount,

        paymentTransactionId:
          registration.paymentTransactionId ||
          "",
      });

    // ========================================================
    // STEP 14: CREATE MAIN BRANCH
    // ========================================================

    const branch = await BranchHotels.create({
      hotelId: hotel._id,

      branchName:
        `${registration.hotelName} Main Branch`,

      branchCode: "MAIN",

      phone: registration.phone || "",

      email: ownerEmail,

      address: registration.address || {
        street: "",
        city: "",
        state: "",
        country: "",
        pincode: "",
      },

      status: "active",
      isMainBranch: true,
    });

    // ========================================================
    // STEP 15: CREATE HOTEL OWNER USER
    // ========================================================

    const ownerUser = await User.create({
      name:
        registration.ownerName?.trim() ||
        hotel.ownerName,

      email: ownerEmail,

      role: "hotelOwner",

      // IMPORTANT:
      // These IDs come from backend-created
      // Hotel and Branch.
      hotelId: hotel._id,

      branchId: branch._id,

      status: "active",

      permission: {
        dashboard: true,

        roomsBooking: true,

        foodManagement: true,

        serviceManagement: true,

        reports: true,

        customer: true,

        invoice: true,

        settings: true,

        users: true,
      },
    });

    // ========================================================
    // STEP 16: UPDATE REGISTRATION
    // ========================================================

    registration.status = "approved";

    registration.hotelId = hotel._id;

    registration.subscriptionId =
      subscription._id;

    registration.approvedBy =
      req.user?._id || null;

    registration.approvedAt = new Date();

    registration.rejectionReason = "";
    registration.rejectionDetails = "";

    await registration.save();

    // ========================================================
    // STEP 17: SUCCESS LOG
    // ========================================================

    log.info(
      `Hotel registration approved successfully. ` +
        `Registration ID: ${registration._id}, ` +
        `Hotel ID: ${hotel._id}, ` +
        `Subscription ID: ${subscription._id}, ` +
        `Branch ID: ${branch._id}, ` +
        `Owner User ID: ${ownerUser._id}`
    );

    // ========================================================
    // STEP 18: SUCCESS RESPONSE
    // ========================================================

    return res.status(200).json({
      success: true,

      message:
        "Hotel registration approved successfully. Hotel account, subscription, main branch, and hotel owner account have been created.",

      data: {
        registrationId:
          registration._id,

        hotelId: hotel._id,

        subscriptionId:
          subscription._id,

        branchId: branch._id,

        ownerUserId:
          ownerUser._id,

        ownerEmail:
          ownerUser.email,

        ownerRole:
          ownerUser.role,

        status:
          registration.status,

        paymentStatus:
          registration.paymentStatus,

        paymentTransactionId:
          registration.paymentTransactionId,

        approvedBy:
          registration.approvedBy,

        approvedAt:
          registration.approvedAt,
      },
    });
  } catch (error) {
    // ========================================================
    // ERROR LOG
    // ========================================================

    console.error(
      "APPROVE REGISTRATION ERROR:",
      error
    );

    log.error(
      `Failed to approve hotel registration: ${error.message}`
    );

    // ========================================================
    // DUPLICATE KEY
    // ========================================================

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This hotel could not be approved because some of its information already exists in the system.",
      });
    }

    // ========================================================
    // GENERAL ERROR
    // ========================================================

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Unable to approve this hotel registration at the moment. Please try again.",
    });
  }
};


export const getRegistrationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Registration ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration ID.",
      });
    }

    const registration = await SaasHotelRegistration.findById(id)
      .populate(
        "planId",
        "planName description pricing trialDays setupFee limits features validityDays"
      )
      .populate(
        "hotelId",
        "hotelName ownerName email phone address gstNumber taxEnabled status"
      )
      .populate(
        "subscriptionId",
        "planId billingCycle startDate endDate status paymentStatus amount discount tax finalAmount autoRenewal"
      )
      .lean();

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Registration status retrieved successfully.",
      data: registration,
    });
  } catch (error) {
    log.error(
      `Failed to retrieve registration status: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load application status right now. Please try again later.",
    });
  }
};


// ============================================================
// REJECT HOTEL REGISTRATION
// ============================================================
// SaaS Admin
// PUT /hotel-registrations/reject/:id
// ============================================================

export const rejectRegistration = async (req, res) => {
  try {

    const { id } = req.params;

    const {
      rejectionReason,
      rejectionDetails,
    } = req.body;


    // ========================================================
    // STEP 1: VALIDATE ID
    // ========================================================

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Hotel registration ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "The provided hotel registration ID is invalid.",
      });
    }


    // ========================================================
    // STEP 2: VALIDATE REASON & DETAILS
    // ========================================================

    const reason = typeof rejectionReason === "string" ? rejectionReason.trim() : "";
    const details = typeof rejectionDetails === "string" ? rejectionDetails.trim() : "";

    if (!reason && !details) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a rejection reason or provide additional details.",
      });
    }


    // ========================================================
    // STEP 3: FIND REGISTRATION
    // ========================================================

    const registration =
      await SaasHotelRegistration.findById(id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message:
          "Hotel registration was not found.",
      });
    }


    // ========================================================
    // STEP 4: CHECK STATUS
    // ========================================================

    if (registration.status === "approved") {
      return res.status(400).json({
        success: false,
        message:
          "This hotel registration has already been approved and cannot be rejected.",
      });
    }

    if (registration.status === "rejected") {
      return res.status(400).json({
        success: false,
        message:
          "This hotel registration has already been rejected.",
      });
    }


    // ========================================================
    // STEP 5: UPDATE STATUS
    // ========================================================

    registration.status = "rejected";
    registration.rejectionReason = reason;
    registration.rejectionDetails = details;

    await registration.save();

    // If an approved hotel exists, block the hotel and deactivate users
    if (registration.hotelId) {
      const hotel = await Hotels.findById(registration.hotelId);
      if (hotel) {
        hotel.status = "blocked";
        hotel.blockReason = `${reason}${details ? ` - ${details}` : ""}`;
        await hotel.save();

        await User.updateMany(
          { hotelId: hotel._id },
          { $set: { status: "inactive" } }
        );

        if (registration.subscriptionId) {
          await Subscription.findByIdAndUpdate(registration.subscriptionId, {
            status: "cancelled",
            cancellationReason: `Cancelled by platform admin: ${reason}`,
          });
        }
      }
    }

    // Send professional email to hotel owner (NO REFUND)
    const ownerEmail = registration.email;
    if (ownerEmail) {
      await sendHotelBlockedEmail({
        to: ownerEmail,
        hotelName: registration.hotelName,
        ownerName: registration.ownerName,
        reason,
        details,
      });
    }

    // ========================================================
    // SUCCESS LOG
    // ========================================================

    log.info(
      `Hotel registration rejected/blocked successfully. Registration ID: ${id}, Reason: ${registration.rejectionReason}, Details: ${registration.rejectionDetails}`
    );


    return res.status(200).json({
      success: true,
      message:
        "Hotel registration has been rejected successfully.",
      data: {
        registrationId:
          registration._id,

        status: registration.status,

        rejectionReason:
          registration.rejectionReason,

        rejectionDetails:
          registration.rejectionDetails,
      },
    });


  } catch (error) {

    log.error(
      `Failed to reject hotel registration: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reject the hotel registration at the moment. Please try again later.",
    });
  }
};




// ============================================================
// DUMMY PAYMENT SUCCESS
// ============================================================

export const confirmDummyPayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration ID.",
      });
    }

    const registration = await SaasHotelRegistration.findById(id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Hotel registration not found.",
      });
    }

    // Prevent duplicate payment
    if (registration.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment has already been completed for this application.",
      });
    }

    // Generate demo transaction ID
    const transactionId = `DEMO-${Date.now()}-${Math.floor(
      10000 + Math.random() * 90000
    )}`;

    // Update payment
    registration.paymentStatus = "paid";
    registration.paymentTransactionId = transactionId;

    await registration.save();

    // ==========================================
    // CREATE ADMIN NOTIFICATION
    // ==========================================

   await SaasNotification.create({
  type: "registration_submitted",

  title: "New Hotel Registration",

  message: `${registration.ownerName} registered ${registration.hotelName}. The subscription payment has been completed and the hotel registration is waiting for admin approval.`,

  registrationId: registration._id,

  hotelId: null,

  isRead: false,

  metadata: {
    hotelName: registration.hotelName,
    ownerName: registration.ownerName,
    email: registration.email,
    phone: registration.phone,

    action: "new_hotel_registration",

    planId: registration.planId,
    billingCycle: registration.billingCycle,

    paymentStatus: registration.paymentStatus,
    paymentTransactionId: transactionId,

    registeredAt: registration.createdAt || new Date(),
  },
});

    log(
      "info",
      `Dummy payment completed for registration ${registration._id}. Transaction: ${transactionId}`
    );

    return res.status(200).json({
      success: true,
      message: "Dummy payment completed successfully.",
      data: {
        registrationId: registration._id,
        paymentStatus: registration.paymentStatus,
        paymentTransactionId: transactionId,
      },
    });
  } catch (error) {
    log(
      "error",
      `Dummy payment error: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message: "Unable to complete payment.",
    });
  }
};

// ============================================================
// REGISTER FREE TRIAL
// ============================================================
// Public / New Hotel Owner Free Trial Activation
// POST /hotel-registrations/free-trial
// Instant access without admin approval!
// Checks both email & phone number to strictly enforce 1 trial per user.
// ============================================================
export const registerFreeTrial = async (req, res) => {
  try {
    const {
      hotelName,
      ownerName,
      email,
      phone,
      address,
      gstNumber,
      taxEnabled,
      planId,
    } = req.body;

    // 1. Hotel validation
    if (!hotelName || !hotelName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Hotel name is required.",
      });
    }

    if (hotelName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Hotel name must contain at least 2 characters.",
      });
    }

    // 2. Owner validation
    if (!ownerName || !ownerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Owner name is required.",
      });
    }

    if (ownerName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Owner name must contain at least 2 characters.",
      });
    }

    // 3. Email validation
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // 4. Phone validation
    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    const normalizedPhone = phone.trim().replace(/\D/g, "");
    if (normalizedPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Phone number must contain exactly 10 digits.",
      });
    }

    // 5. Check Free Trial Configuration
    let trialConfig = await FreeTrialSettings.findOne();
    if (!trialConfig) {
      trialConfig = await FreeTrialSettings.create({
        isEnabled: true,
        trialDays: 14,
      });
    }

    if (!trialConfig.isEnabled) {
      return res.status(400).json({
        success: false,
        message: "Free trial is currently disabled. Please select a subscription plan to continue.",
      });
    }

    const trialDays = Number(trialConfig.trialDays || 14);

    // 6. STRICT 1-TRIAL LIMIT CHECK: Verify BOTH email and phone number
    const emailTrialUsed = await FreeTrialUsage.findOne({ email: normalizedEmail });
    if (emailTrialUsed) {
      return res.status(400).json({
        success: false,
        message: "This email address has already used a free trial. Each user is eligible for only one free trial. Please select an active plan to continue.",
      });
    }

    const phoneTrialUsed = await FreeTrialUsage.findOne({ phone: normalizedPhone });
    if (phoneTrialUsed) {
      return res.status(400).json({
        success: false,
        message: "This phone number has already been used for a free trial. Each user is eligible for only one free trial. Please select an active plan to continue.",
      });
    }

    // 7. Check if hotel or user account already exists with this email or phone
    const existingHotelWithEmail = await Hotels.findOne({ email: normalizedEmail });
    if (existingHotelWithEmail) {
      return res.status(409).json({
        success: false,
        message: "A hotel account already exists with this email address. Please login instead.",
      });
    }

    const existingHotelWithPhone = await Hotels.findOne({ phone: normalizedPhone });
    if (existingHotelWithPhone) {
      return res.status(409).json({
        success: false,
        message: "A hotel account already exists with this phone number. Please login or contact support.",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user account with this email address already exists. Please login instead.",
      });
    }

    // 8. Find an active plan reference for planId
    let plan = null;
    if (planId && mongoose.Types.ObjectId.isValid(planId)) {
      plan = await Plans.findById(planId);
    }
    if (!plan) {
      plan = await Plans.findOne({ isActive: true });
    }
    if (!plan) {
      plan = await Plans.findOne();
    }

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: "No subscription plan is currently set up in the system.",
      });
    }

    // 9. Calculate trial validity dates
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + trialDays * 24 * 60 * 60 * 1000);

    // 10. Generate Hotel Code
    const cleanHotelCode = hotelName.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase() || "HTL";

    // 11. Create Hotel (Instantly active!)
    const hotel = await Hotels.create({
      hotelName: hotelName.trim(),
      hotelCode: cleanHotelCode,
      ownerName: ownerName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      address: {
        street: address?.street?.trim() || "",
        city: address?.city?.trim() || "",
        state: address?.state?.trim() || "",
        country: address?.country?.trim() || "",
        pincode: address?.pincode?.trim() || "",
      },
      gstNumber: gstNumber?.trim() || "",
      taxEnabled: typeof taxEnabled === "boolean" ? taxEnabled : false,
      status: "active",
    });

    // 12. Create Subscription (Full access to all features during trial!)
    const transactionId = `TRIAL-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const subscription = await Subscription.create({
      hotelId: hotel._id,
      planId: plan._id,
      billingCycle: "trial",
      startDate,
      endDate,
      status: "trial",
      paymentStatus: "paid",
      autoRenewal: false,
      trialStatus: "active",
      limits: {
        rooms: plan.limits?.rooms || 50,
        branches: plan.limits?.branches || 5,
        receptionists: plan.limits?.receptionists || 10,
      },
      features: {
        foodService: true,
        roomService: true,
      },
      amount: 0,
      discount: 0,
      tax: 0,
      finalAmount: 0,
      paymentTransactionId: transactionId,
    });

    // 13. Create Main Branch
    const branch = await BranchHotels.create({
      hotelId: hotel._id,
      branchName: `${hotel.hotelName} Main Branch`,
      branchCode: "MAIN",
      phone: hotel.phone,
      email: normalizedEmail,
      address: hotel.address,
      status: "active",
      isMainBranch: true,
    });

    // 14. Create Hotel Owner User Account
    const ownerUser = await User.create({
      name: ownerName.trim(),
      email: normalizedEmail,
      role: "hotelOwner",
      hotelId: hotel._id,
      branchId: branch._id,
      status: "active",
      permission: {
        dashboard: true,
        roomsBooking: true,
        foodManagement: true,
        serviceManagement: true,
        reports: true,
        customer: true,
        invoice: true,
        settings: true,
        users: true,
      },
    });

    // 15. Create SaasHotelRegistration record (Approved instantly!)
    const registration = await SaasHotelRegistration.create({
      hotelName: hotel.hotelName,
      ownerName: hotel.ownerName,
      email: normalizedEmail,
      phone: normalizedPhone,
      address: hotel.address,
      gstNumber: hotel.gstNumber,
      taxEnabled: hotel.taxEnabled,
      planId: plan._id,
      billingCycle: "trial",
      status: "approved",
      paymentStatus: "paid",
      paymentTransactionId: transactionId,
      hotelId: hotel._id,
      subscriptionId: subscription._id,
      approvedAt: new Date(),
    });

    // 16. Record Free Trial Usage to permanently lock this email & phone
    await FreeTrialUsage.create({
      email: normalizedEmail,
      phone: normalizedPhone,
      hotelId: hotel._id,
      subscriptionId: subscription._id,
      startedAt: startDate,
      expiresAt: endDate,
    });

    // 17. Notify SaaS Admin (In-App Notification)
    try {
      await SaasNotification.create({
        type: "free_trial_activated",
        title: "New Free Trial Hotel Registered",
        message: `${hotel.hotelName} registered and activated a ${trialDays}-day Free Trial. Access is granted instantly.`,
        hotelId: hotel._id,
        registrationId: registration._id,
        isRead: false,
        metadata: {
          hotelName: hotel.hotelName,
          ownerName: hotel.ownerName,
          email: hotel.email,
          phone: hotel.phone,
          trialDays,
          startDate,
          endDate,
        },
      });
    } catch (notifErr) {
      log.error(`[registerFreeTrial] In-app notification error: ${notifErr.message}`);
    }

    // 18. Send Notification Email to Main Admin
    try {
      await sendAdminFreeTrialNotificationEmail({
        hotel,
        trialDays,
        startDate,
        endDate,
      });
    } catch (emailErr) {
      log.error(`[registerFreeTrial] Admin email error: ${emailErr.message}`);
    }

    log.info(
      `[registerFreeTrial] Free trial activated successfully for ${hotel.hotelName} (${normalizedEmail}, ${normalizedPhone}). Valid from ${startDate.toISOString()} to ${endDate.toISOString()}.`
    );

    return res.status(201).json({
      success: true,
      message: "Your free trial plan was enabled successfully!",
      data: {
        hotelId: hotel._id,
        registrationId: registration._id,
        hotelName: hotel.hotelName,
        ownerEmail: normalizedEmail,
        trialDays,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    log.error(`[registerFreeTrial] Error: ${error.message}`);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A hotel registration or trial with the provided email or phone already exists.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Unable to start free trial at the moment. Please try again later.",
      error: error.message,
    });
  }
};