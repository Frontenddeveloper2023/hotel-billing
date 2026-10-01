import mongoose from "mongoose";

import EmailHistory from "../models/EmailHistory.js";
import BranchHotels from "../models/branchHotels.js";

import { sendAdminEmail } from "../util/email.js";
import { log } from "../util/logger.js";


// ==========================================================
// HELPERS
// ==========================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};


const normalizeEmail = (email) => {
  return String(email || "")
    .trim()
    .toLowerCase();
};


const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};


// ==========================================================
// VERIFY HOTEL / SUB-HOTEL OWNERSHIP
// ==========================================================

const verifyTenant = async ({
  hotelId,
  subHotelId,
}) => {

  // --------------------------------------------------------
  // hotelId required
  // --------------------------------------------------------

  if (!hotelId || !isValidObjectId(hotelId)) {
    return {
      valid: false,
      status: 400,
      message: "Valid hotelId is required.",
    };
  }


  // --------------------------------------------------------
  // Main hotel email
  // --------------------------------------------------------

  if (!subHotelId) {
    return {
      valid: true,
      hotelId,
      subHotelId: null,
    };
  }


  // --------------------------------------------------------
  // subHotelId validation
  // --------------------------------------------------------

  if (!isValidObjectId(subHotelId)) {
    return {
      valid: false,
      status: 400,
      message: "Invalid subHotelId.",
    };
  }


  // --------------------------------------------------------
  // IMPORTANT:
  // Verify sub-hotel actually belongs to this hotel
  // --------------------------------------------------------

  const subHotel = await BranchHotels.findOne({
    _id: subHotelId,
    hotelId,
  })
    .select("_id hotelId branchName email status")
    .lean();


  if (!subHotel) {
    return {
      valid: false,
      status: 403,
      message:
        "This sub-hotel does not belong to the selected hotel.",
    };
  }


  return {
    valid: true,
    hotelId,
    subHotelId,
    subHotel,
  };
};


// ==========================================================
// SEND EMAIL
// ==========================================================

export const sendEmailToUser = async (req, res) => {
  try {

    // ======================================================
    // AUTHORIZATION
    // ======================================================

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in.",
      });
    }


    // Only SaaS admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Only administrators can send emails.",
      });
    }


    // ======================================================
    // REQUEST DATA
    // ======================================================

    const {
      hotelId,
      subHotelId,
      recipientEmail,
      recipientName,
      subject,
      message,
      registrationId,
      subscriptionId,
    } = req.body;


    // ======================================================
    // BASIC VALIDATION
    // ======================================================

    if (!hotelId) {
      return res.status(400).json({
        success: false,
        message: "hotelId is required.",
      });
    }


    if (!recipientEmail?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Recipient email is required.",
      });
    }


    if (!subject?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email subject is required.",
      });
    }


    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email message is required.",
      });
    }


    // ======================================================
    // OBJECT ID VALIDATION
    // ======================================================

    if (!isValidObjectId(hotelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotelId.",
      });
    }


    if (
      registrationId &&
      !isValidObjectId(registrationId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid registrationId.",
      });
    }


    if (
      subscriptionId &&
      !isValidObjectId(subscriptionId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscriptionId.",
      });
    }


    // ======================================================
    // EMAIL VALIDATION
    // ======================================================

    const normalizedEmail =
      normalizeEmail(recipientEmail);


    if (!validateEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }


    // ======================================================
    // VERIFY HOTEL / SUB-HOTEL
    // ======================================================

    const tenant = await verifyTenant({
      hotelId,
      subHotelId,
    });


    if (!tenant.valid) {
      return res.status(tenant.status).json({
        success: false,
        message: tenant.message,
      });
    }


    // ======================================================
    // SEND EMAIL
    // ======================================================

    log.info(
      `[EMAIL] Sending admin email | hotel=${hotelId} | subHotel=${subHotelId || "MAIN"} | to=${normalizedEmail}`
    );


    try {

      await sendAdminEmail({
        to: normalizedEmail,
        recipientName:
          recipientName?.trim() || "there",
        subject: subject.trim(),
        message: message.trim(),
      });


      // ====================================================
      // SAVE SUCCESS HISTORY
      // ====================================================

      const history = await EmailHistory.create({
        hotelId,
        subHotelId: subHotelId || null,

        recipientEmail: normalizedEmail,
        recipientName:
          recipientName?.trim() || "",

        registrationId:
          registrationId || null,

        subscriptionId:
          subscriptionId || null,

        subject: subject.trim(),
        message: message.trim(),

        sentBy: req.user._id,

        status: "sent",
        sentAt: new Date(),
      });


      log.info(
        `[EMAIL] Email sent successfully | history=${history._id}`
      );


      return res.status(200).json({
        success: true,
        message: "Email sent successfully.",
        data: history,
      });

    } catch (emailError) {

      // ====================================================
      // SAVE FAILED EMAIL ATTEMPT
      // ====================================================

      await EmailHistory.create({
        hotelId,
        subHotelId: subHotelId || null,

        recipientEmail: normalizedEmail,
        recipientName:
          recipientName?.trim() || "",

        registrationId:
          registrationId || null,

        subscriptionId:
          subscriptionId || null,

        subject: subject.trim(),
        message: message.trim(),

        sentBy: req.user._id,

        status: "failed",
        errorMessage:
          emailError?.message || "Unknown email error",

        sentAt: new Date(),
      });


      log.error(
        `[EMAIL] Sending failed | hotel=${hotelId} | subHotel=${subHotelId || "MAIN"} | to=${normalizedEmail} | error=${emailError.message}`
      );


      return res.status(500).json({
        success: false,
        message:
          "Email could not be sent. Please try again.",
      });
    }

  } catch (error) {

    console.error(
      "[EMAIL CONTROLLER] Send email error:",
      error
    );

    log.error(
      `[EMAIL] Unexpected send error: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message: "Failed to send email.",
    });
  }
};


// ==========================================================
// GET EMAIL HISTORY
// ==========================================================

export const getEmailHistory = async (req, res) => {
  try {

    // ======================================================
    // AUTHORIZATION
    // ======================================================

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in.",
      });
    }


    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Only administrators can view email history.",
      });
    }


    const {
      hotelId,
      subHotelId,
    } = req.query;


    // ======================================================
    // VALIDATE HOTEL
    // ======================================================

    if (!hotelId || !isValidObjectId(hotelId)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid hotelId is required.",
      });
    }


    // ======================================================
    // VERIFY TENANT
    // ======================================================

    const tenant = await verifyTenant({
      hotelId,
      subHotelId,
    });


    if (!tenant.valid) {
      return res.status(tenant.status).json({
        success: false,
        message: tenant.message,
      });
    }


    // ======================================================
    // BUILD FILTER
    // ======================================================

    const filter = {
      hotelId,
      subHotelId:
        subHotelId || null,
    };


    // ======================================================
    // FETCH HISTORY
    // ======================================================

    const history = await EmailHistory.find(filter)
      .populate(
        "sentBy",
        "name email role"
      )
      .sort({
        sentAt: -1,
      })
      .lean();


    log.info(
      `[EMAIL] History fetched | hotel=${hotelId} | subHotel=${subHotelId || "MAIN"} | count=${history.length}`
    );


    return res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });

  } catch (error) {

    console.error(
      "[EMAIL CONTROLLER] History error:",
      error
    );

    log.error(
      `[EMAIL] History fetch failed: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch email history.",
    });
  }
};