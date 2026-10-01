import Settings from "../models/settings.js";
import BranchHotels from "../models/branchHotels.js";

import fs from "fs";
import path from "path";
import mongoose from "mongoose";

import { log } from "../util/logger.js";

// ============================================================
// GET TENANT IDS
// ============================================================
// IMPORTANT:
// hotelId and branchId are NEVER taken from frontend.
// They always come from authenticated user.
// ============================================================

const getTenantIds = (
  req,
  res,
  operation = "settings operation"
) => {
  const hotelId = req.user?.hotelId;
  const branchId = req.user?.branchId;

  // ----------------------------------------------------------
  // HOTEL ID
  // ----------------------------------------------------------

  if (!hotelId) {
    log.error(
      `[Settings] ${operation} failed - hotelId missing. userId=${req.user?._id || "unknown"}`
    );

    res.status(403).json({
      success: false,
      message:
        "Your account is not connected to a hotel. Please contact the administrator.",
    });

    return null;
  }

  // ----------------------------------------------------------
  // BRANCH ID
  // ----------------------------------------------------------

  if (!branchId) {
    log.error(
      `[Settings] ${operation} failed - branchId missing. hotelId=${hotelId}, userId=${req.user?._id || "unknown"}`
    );

    res.status(403).json({
      success: false,
      message:
        "Your account is not connected to a branch. Please contact the administrator.",
    });

    return null;
  }

  // ----------------------------------------------------------
  // VALIDATE HOTEL ID
  // ----------------------------------------------------------

  if (
    !mongoose.Types.ObjectId.isValid(
      hotelId
    )
  ) {
    log.error(
      `[Settings] ${operation} failed - invalid hotelId. hotelId=${hotelId}`
    );

    res.status(403).json({
      success: false,
      message:
        "Your hotel information is invalid. Please contact the administrator.",
    });

    return null;
  }

  // ----------------------------------------------------------
  // VALIDATE BRANCH ID
  // ----------------------------------------------------------

  if (
    !mongoose.Types.ObjectId.isValid(
      branchId
    )
  ) {
    log.error(
      `[Settings] ${operation} failed - invalid branchId. branchId=${branchId}, hotelId=${hotelId}`
    );

    res.status(403).json({
      success: false,
      message:
        "Your branch information is invalid. Please contact the administrator.",
    });

    return null;
  }

  return {
    hotelId,
    branchId,
  };
};

// ============================================================
// VERIFY BRANCH BELONGS TO HOTEL
// ============================================================

const verifyBranchBelongsToHotel = async (
  hotelId,
  branchId
) => {
  log.info(
    `[Settings] Verifying branch ownership. hotelId=${hotelId}, branchId=${branchId}`
  );

  const branch =
    await BranchHotels.findOne({
      _id: branchId,
      hotelId,
    }).select(
      "_id branchName status email"
    );

  return branch;
};

// ============================================================
// DELETE OLD LOGO SAFELY
// ============================================================

const deleteLogoFile = (
  logoPath
) => {
  try {
    if (!logoPath) {
      return;
    }

    const fullPath = path.join(
      process.cwd(),
      logoPath
    );

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);

      log.info(
        `[Settings] Old logo deleted. path=${logoPath}`
      );
    } else {
      log.info(
        `[Settings] Old logo file not found. path=${logoPath}`
      );
    }
  } catch (error) {
    log.error(
      `[Settings] Failed to delete old logo. path=${logoPath}, error=${error.message}`
    );

    // Do not fail settings operation only
    // because old logo deletion failed.
  }
};

// ============================================================
// COMMON ERROR HANDLER
// ============================================================

const handleSettingsError = (
  res,
  error,
  operation,
  hotelId = "unknown",
  branchId = "unknown"
) => {
  log.error(
    `[Settings] ${operation} failed. hotelId=${hotelId}, branchId=${branchId}, error=${error?.message || error}`
  );

  // ----------------------------------------------------------
  // VALIDATION ERROR
  // ----------------------------------------------------------

  if (
    error?.name ===
    "ValidationError"
  ) {
    const messages = Object.values(
      error.errors || {}
    )
      .map(
        (item) => item.message
      )
      .filter(Boolean);

    log.error(
      `[Settings] Validation error. hotelId=${hotelId}, branchId=${branchId}, messages=${messages.join(
        " | "
      )}`
    );

    return res.status(400).json({
      success: false,
      message:
        messages.length > 0
          ? messages.join(" ")
          : "Some settings information is invalid. Please check your details.",
    });
  }

  // ----------------------------------------------------------
  // INVALID OBJECT ID
  // ----------------------------------------------------------

  if (
    error?.name === "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "The hotel or branch information is invalid.",
    });
  }

  // ----------------------------------------------------------
  // DUPLICATE KEY
  // ----------------------------------------------------------

  if (error?.code === 11000) {
    log.error(
      `[Settings] Duplicate settings detected. hotelId=${hotelId}, branchId=${branchId}, keyValue=${JSON.stringify(
        error?.keyValue || {}
      )}`
    );

    return res.status(409).json({
      success: false,
      message:
        "Settings already exist for this hotel branch.",
    });
  }

  // ----------------------------------------------------------
  // INTERNAL ERROR
  // ----------------------------------------------------------

  return res.status(500).json({
    success: false,
    message:
      "Something went wrong while processing settings. Please try again later.",
  });
};

// ============================================================
// GET SETTINGS
// ============================================================

export const getSettings = async (
  req,
  res
) => {
  let tenant;

  try {
    log.info(
      `[Settings] GET started. userId=${req.user?._id || "unknown"}`
    );

    // --------------------------------------------------------
    // GET HOTEL + BRANCH FROM USER
    // --------------------------------------------------------

    tenant = getTenantIds(
      req,
      res,
      "get settings"
    );

    if (!tenant) {
      return;
    }

    const {
      hotelId,
      branchId,
    } = tenant;

    log.info(
      `[Settings] Tenant resolved. hotelId=${hotelId}, branchId=${branchId}`
    );

    // --------------------------------------------------------
    // VERIFY BRANCH BELONGS TO HOTEL
    // --------------------------------------------------------

    const branch =
      await verifyBranchBelongsToHotel(
        hotelId,
        branchId
      );

    if (!branch) {
      log.error(
        `[Settings] Branch does not belong to hotel. hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(403).json({
        success: false,
        message:
          "The selected branch does not belong to your hotel.",
      });
    }

    if (
      branch.status &&
      branch.status !== "active"
    ) {
      log.error(
        `[Settings] Branch is inactive. hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(403).json({
        success: false,
        message:
          "This branch is currently inactive. Please contact the administrator.",
      });
    }

    // --------------------------------------------------------
    // FIND SETTINGS FOR CURRENT HOTEL + BRANCH
    // --------------------------------------------------------

    log.info(
      `[Settings] Searching settings. hotelId=${hotelId}, branchId=${branchId}`
    );

    let settings = await Settings.findOne({
      hotelId,
      branchId,
    });

    // --------------------------------------------------------
    // CHECK OLD SETTINGS DOCUMENT
    // --------------------------------------------------------
    // Older Settings data may have hotelId but no branchId.
    // Do NOT create duplicate data.
    // Attach the existing document to current branch.
    // --------------------------------------------------------

    if (!settings) {
      log.info(
        `[Settings] No exact settings found. Checking legacy settings. hotelId=${hotelId}, branchId=${branchId}`
      );

      settings = await Settings.findOne({
        hotelId,
        $or: [
          {
            branchId: {
              $exists: false,
            },
          },
          {
            branchId: null,
          },
        ],
      });

      if (settings) {
        log.info(
          `[Settings] Legacy settings found. Migrating existing settings. settingsId=${settings._id}, hotelId=${hotelId}, newBranchId=${branchId}`
        );

        settings.branchId = branchId;

        await settings.save();

        log.info(
          `[Settings] Legacy settings migrated successfully. settingsId=${settings._id}, hotelId=${hotelId}, branchId=${branchId}`
        );
      }
    }

    // --------------------------------------------------------
    // NO SETTINGS
    // --------------------------------------------------------

    if (!settings) {
      log.info(
        `[Settings] No settings configured for branch. hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(200).json({
        success: true,
        data: null,
        message:
          "Settings have not been configured for this branch yet.",
      });
    }

    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    log.info(
      `[Settings] GET successful. settingsId=${settings._id}, hotelId=${hotelId}, branchId=${branchId}`
    );

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return handleSettingsError(
      res,
      error,
      "get settings",
      tenant?.hotelId ||
        req.user?.hotelId ||
        "unknown",
      tenant?.branchId ||
        req.user?.branchId ||
        "unknown"
    );
  }
};
// ============================================================
// UPDATE / CREATE SETTINGS
// ============================================================

export const updateSettings =
  async (req, res) => {
    let tenant;

    try {
      log.info(
        `[Settings] UPDATE started. userId=${req.user?._id || "unknown"}`
      );

      // --------------------------------------------------------
      // GET HOTEL + BRANCH
      // --------------------------------------------------------

      tenant = getTenantIds(
        req,
        res,
        "update settings"
      );

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      log.info(
        `[Settings] Tenant resolved. hotelId=${hotelId}, branchId=${branchId}`
      );

      // --------------------------------------------------------
      // VERIFY BRANCH
      // --------------------------------------------------------

      const branch =
        await verifyBranchBelongsToHotel(
          hotelId,
          branchId
        );

      if (!branch) {
        log.error(
          `[Settings] Update rejected - branch does not belong to hotel. hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(403).json({
          success: false,
          message:
            "The selected branch does not belong to your hotel.",
        });
      }

      if (
        branch.status &&
        branch.status !== "active"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This branch is currently inactive. Settings cannot be updated.",
        });
      }

      // --------------------------------------------------------
      // LOAD EXISTING SETTINGS
      // --------------------------------------------------------

      let settings =
        await Settings.findOne({
          hotelId,
          branchId,
        });

      if (settings) {
        log.info(
          `[Settings] Existing settings found. settingsId=${settings._id}, hotelId=${hotelId}, branchId=${branchId}`
        );
      } else {
        log.info(
          `[Settings] No settings found. New settings will be created. hotelId=${hotelId}, branchId=${branchId}`
        );
      }

      // --------------------------------------------------------
      // GST
      // --------------------------------------------------------

      const isGstEnabled =
        req.body.enableGst ===
          "true" ||
        req.body.enableGst === true;

      let gstRate = 0;

      if (
        isGstEnabled &&
        req.body.gstPercentage !==
          undefined &&
        req.body.gstPercentage !== ""
      ) {
        gstRate = Number(
          req.body.gstPercentage
        );

        if (
          Number.isNaN(gstRate) ||
          gstRate < 0
        ) {
          log.error(
            `[Settings] Invalid GST rate. hotelId=${hotelId}, branchId=${branchId}, value=${req.body.gstPercentage}`
          );

          return res.status(400).json({
            success: false,
            message:
              "GST percentage must be a valid number and cannot be negative.",
          });
        }
      }

      // --------------------------------------------------------
      // BEFORE CHECKOUT VALUE
      // --------------------------------------------------------

      let beforeCheckoutValue =
        0;

      if (
        req.body.before12PmValue !==
          undefined &&
        req.body.before12PmValue !==
          ""
      ) {
        beforeCheckoutValue =
          Number(
            req.body.before12PmValue
          );

        if (
          Number.isNaN(
            beforeCheckoutValue
          ) ||
          beforeCheckoutValue < 0
        ) {
          log.error(
            `[Settings] Invalid before checkout value. hotelId=${hotelId}, branchId=${branchId}, value=${req.body.before12PmValue}`
          );

          return res.status(400).json({
            success: false,
            message:
              "Before checkout value must be a valid number and cannot be negative.",
          });
        }
      }

      // --------------------------------------------------------
      // AFTER CHECKOUT VALUE
      // --------------------------------------------------------

      let afterCheckoutValue =
        0;

      if (
        req.body.after12PmValue !==
          undefined &&
        req.body.after12PmValue !==
          ""
      ) {
        afterCheckoutValue =
          Number(
            req.body.after12PmValue
          );

        if (
          Number.isNaN(
            afterCheckoutValue
          ) ||
          afterCheckoutValue < 0
        ) {
          log.error(
            `[Settings] Invalid after checkout value. hotelId=${hotelId}, branchId=${branchId}, value=${req.body.after12PmValue}`
          );

          return res.status(400).json({
            success: false,
            message:
              "After checkout value must be a valid number and cannot be negative.",
          });
        }
      }

      // --------------------------------------------------------
      // PHONE NUMBERS
      //
      // Frontend sends:
      // "+91 1234567890, +91 9876543210"
      //
      // Database stores:
      // ["+91 1234567890", "+91 9876543210"]
      // --------------------------------------------------------

      const phoneNumbers =
        Array.isArray(
          req.body.phone
        )
          ? req.body.phone
              .map((phone) =>
                String(phone).trim()
              )
              .filter(Boolean)
          : String(
                req.body.phone || ""
            )
              .split(",")
              .map((phone) =>
                phone.trim()
              )
              .filter(Boolean);

      // --------------------------------------------------------
      // UPDATE DATA
      //
      // IMPORTANT:
      // IDs come ONLY from req.user.
      // --------------------------------------------------------

      const updateData = {
        hotelId,
        branchId,

        companyName:
          req.body.companyName,

        gstNumber:
          req.body.gstNumber,

        phoneNumbers,

        email:
  req.user?.branchId
    ? branch.email
    : req.body.email,

        address:
          req.body.address,

        gstCalculationEnabled:
          isGstEnabled,

        gstRate,

        beforeCheckoutPolicyType:
          req.body
            .before12PmRateType ||
          "percentage",

        beforeCheckoutValue,

        afterCheckoutPolicyType:
          req.body
            .after12PmRateType ||
          "full",

        afterCheckoutValue,
      };

      // --------------------------------------------------------
      // REQUIRED FIELD VALIDATION
      // --------------------------------------------------------

      if (
        !String(
          updateData.companyName ||
            ""
        ).trim()
      ) {
        log.error(
          `[Settings] Company name missing. hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(400).json({
          success: false,
          message:
            "Company name is required.",
        });
      }

      if (
        !String(
          updateData.gstNumber ||
            ""
        ).trim()
      ) {
        log.error(
          `[Settings] GST number missing. hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(400).json({
          success: false,
          message:
            "GST number is required.",
        });
      }

      if (
        phoneNumbers.length === 0
      ) {
        log.error(
          `[Settings] Phone number missing. hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(400).json({
          success: false,
          message:
            "At least one phone number is required.",
        });
      }

      if (
        !String(
          updateData.email || ""
        ).trim()
      ) {
        log.error(
          `[Settings] Email missing. hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(400).json({
          success: false,
          message:
            "Email address is required.",
        });
      }

      if (
        !String(
          updateData.address || ""
        ).trim()
      ) {
        log.error(
          `[Settings] Address missing. hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(400).json({
          success: false,
          message:
            "Hotel address is required.",
        });
      }

      // --------------------------------------------------------
      // EMAIL FORMAT
      // --------------------------------------------------------

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(
          String(
            updateData.email
          ).trim()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid email address.",
        });
      }

      // --------------------------------------------------------
      // LOGO UPLOAD
      // --------------------------------------------------------

      if (req.file) {
        const newLogoPath =
          `uploads/settings/${req.file.filename}`;

        log.info(
          `[Settings] New logo uploaded. hotelId=${hotelId}, branchId=${branchId}, newLogo=${newLogoPath}`
        );

        // Delete old logo
        if (
          settings?.companyLogo
        ) {
          deleteLogoFile(
            settings.companyLogo
          );
        }

        updateData.companyLogo =
          newLogoPath;
      }

      // --------------------------------------------------------
      // REMOVE LOGO
      // --------------------------------------------------------

      else if (
        req.body.removeLogo ===
          "true" ||
        req.body.removeLogo === true
      ) {
        log.info(
          `[Settings] Logo removal requested. hotelId=${hotelId}, branchId=${branchId}`
        );

        if (
          settings?.companyLogo
        ) {
          deleteLogoFile(
            settings.companyLogo
          );
        }

        updateData.companyLogo =
          "";
      }

      // --------------------------------------------------------
      // CREATE SETTINGS
      // --------------------------------------------------------

      if (!settings) {
        log.info(
          `[Settings] Creating settings. hotelId=${hotelId}, branchId=${branchId}`
        );

        settings =
          await Settings.create(
            updateData
          );

        log.info(
          `[Settings] Settings created successfully. settingsId=${settings._id}, hotelId=${hotelId}, branchId=${branchId}`
        );
      }

      // --------------------------------------------------------
      // UPDATE SETTINGS
      // --------------------------------------------------------

      else {
        log.info(
          `[Settings] Updating settings. settingsId=${settings._id}, hotelId=${hotelId}, branchId=${branchId}`
        );

        settings =
          await Settings.findOneAndUpdate(
            {
              _id: settings._id,
              hotelId,
              branchId,
            },
            updateData,
            {
              new: true,
              runValidators: true,
            }
          );

        if (!settings) {
          log.error(
            `[Settings] Settings update returned no document. hotelId=${hotelId}, branchId=${branchId}`
          );

          return res.status(404).json({
            success: false,
            message:
              "Settings could not be found for this branch. Please refresh and try again.",
          });
        }

        log.info(
          `[Settings] Settings updated successfully. settingsId=${settings._id}, hotelId=${hotelId}, branchId=${branchId}`
        );
      }

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,
        message:
          "Settings updated successfully.",
        data: settings,
      });
    } catch (error) {
      return handleSettingsError(
        res,
        error,
        "update settings",
        tenant?.hotelId ||
          req.user?.hotelId ||
          "unknown",
        tenant?.branchId ||
          req.user?.branchId ||
          "unknown"
      );
    }
  };