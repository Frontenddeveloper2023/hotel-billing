import Plans from "../models/plans.js";
import FreeTrialSettings from "../models/freeTrialSettings.js";
import BillingCycleSettings from "../models/billingCycleSettings.js";
import { log } from "../util/logger.js";

// ============================================================
// CREATE PLAN
// ============================================================
export const createPlan = async (req, res) => {
  try {
    const {
      planName,
      description,
      pricing,
      actualPricing,
      trialDays,
      setupFee,
      limits,
      features,
      validityDays,
      autoRenewalAllowed,
      isActive,
    } = req.body;

    // --------------------------------------------------------
    // 1. Validate plan name
    // --------------------------------------------------------
    if (!planName || !planName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Plan name is required.",
      });
    }

    if (planName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Plan name must contain at least 2 characters.",
      });
    }

    // --------------------------------------------------------
    // 2. Check duplicate plan name
    // --------------------------------------------------------
    const existingPlan = await Plans.findOne({
      planName: planName.trim(),
    });

    if (existingPlan) {
      return res.status(409).json({
        success: false,
        message:
          "A plan with this name already exists. Please choose a different plan name.",
      });
    }

    // --------------------------------------------------------
    // 3. Validate pricing (Offer Price & Actual Price)
    // --------------------------------------------------------
    const priceFields = [
      "monthly",
      "quarterly",
      "halfYearly",
      "yearly",
    ];

    if (pricing !== undefined) {
      for (const field of priceFields) {
        if (
          pricing[field] !== undefined &&
          (typeof pricing[field] !== "number" ||
            pricing[field] < 0)
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} plan price must be a valid amount greater than or equal to 0.`,
          });
        }
      }
    }

    if (actualPricing !== undefined) {
      for (const field of priceFields) {
        if (
          actualPricing[field] !== undefined &&
          (typeof actualPricing[field] !== "number" ||
            actualPricing[field] < 0)
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} actual price must be a valid amount greater than or equal to 0.`,
          });
        }
      }
    }

    // --------------------------------------------------------
    // 4. Validate trial days
    // --------------------------------------------------------
    if (
      trialDays !== undefined &&
      (!Number.isInteger(trialDays) || trialDays < 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Trial period must be a whole number of days and cannot be negative.",
      });
    }

    // --------------------------------------------------------
    // 5. Validate setup fee
    // --------------------------------------------------------
    if (
      setupFee !== undefined &&
      (typeof setupFee !== "number" || setupFee < 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Setup fee must be a valid amount greater than or equal to 0.",
      });
    }

    // --------------------------------------------------------
    // 6. Validate validity days
    // --------------------------------------------------------
    if (
      validityDays !== undefined &&
      (!Number.isInteger(validityDays) || validityDays < 1)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Plan validity must be at least 1 day.",
      });
    }

    // --------------------------------------------------------
    // 7. Validate limits
    // --------------------------------------------------------
    const limitFields = [
      "rooms",
      "branches",
      "receptionists",
    ];

    if (limits !== undefined) {
      for (const field of limitFields) {
        if (
          limits[field] !== undefined &&
          (!Number.isInteger(limits[field]) ||
            limits[field] < 0)
        ) {
          return res.status(400).json({
            success: false,
            message:
              `${field} limit must be a whole number and cannot be negative.`,
          });
        }
      }
    }

    // --------------------------------------------------------
    // 8. Validate features
    // --------------------------------------------------------
    const featureFields = [
      "foodService",
      "roomService",
    ];

    if (features !== undefined) {
      for (const field of featureFields) {
        if (
          features[field] !== undefined &&
          typeof features[field] !== "boolean"
        ) {
          return res.status(400).json({
            success: false,
            message:
              `${field} feature must be either enabled or disabled.`,
          });
        }
      }
    }

    // --------------------------------------------------------
    // 9. Validate boolean fields
    // --------------------------------------------------------
    if (
      autoRenewalAllowed !== undefined &&
      typeof autoRenewalAllowed !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Auto-renewal setting must be either enabled or disabled.",
      });
    }

    if (
      isActive !== undefined &&
      typeof isActive !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Plan active status must be either active or inactive.",
      });
    }

    // --------------------------------------------------------
    // 10. Create plan
    // --------------------------------------------------------
    const plan = await Plans.create({
      planName: planName.trim(),

      description: description?.trim() || "",

      pricing: {
        monthly: pricing?.monthly ?? 0,
        quarterly: pricing?.quarterly ?? 0,
        halfYearly: pricing?.halfYearly ?? 0,
        yearly: pricing?.yearly ?? 0,
      },

      actualPricing: {
        monthly: actualPricing?.monthly ?? 0,
        quarterly: actualPricing?.quarterly ?? 0,
        halfYearly: actualPricing?.halfYearly ?? 0,
        yearly: actualPricing?.yearly ?? 0,
      },

      trialDays: trialDays ?? 0,

      setupFee: setupFee ?? 0,

      limits: {
        rooms: limits?.rooms ?? 0,
        branches: limits?.branches ?? 0,
        receptionists: limits?.receptionists ?? 0,
      },

      features: {
        foodService: features?.foodService ?? false,
        roomService: features?.roomService ?? false,
      },

      validityDays: validityDays ?? 30,

      autoRenewalAllowed:
        autoRenewalAllowed ?? true,

      isActive: isActive ?? true,
    });

    log.info(`Plan created successfully: ${plan._id}`);

    return res.status(201).json({
      success: true,
      message: "Subscription plan created successfully.",
      data: plan,
    });
  } catch (error) {
    // --------------------------------------------------------
    // MongoDB duplicate key error
    // --------------------------------------------------------
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A plan with this name already exists. Please use a different plan name.",
      });
    }

    log.error(`Error creating plan: ${error.message}`);

    return res.status(500).json({
      success: false,
      message:
        "Unable to create the subscription plan right now. Please try again later.",
    });
  }
};

// ============================================================
// GET ALL PLANS
// ============================================================
export const getAllPlans = async (req, res) => {
  try {
    const plans = await Plans.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "Subscription plans retrieved successfully.",
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    log.error(`Error fetching plans: ${error.message}`);

    return res.status(500).json({
      success: false,
      message:
        "Unable to load subscription plans right now. Please try again later.",
    });
  }
};

// ============================================================
// GET ACTIVE PLANS
// ============================================================
export const getActivePlans = async (req, res) => {
  try {
    const plans = await Plans.find({
      isActive: true,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "Active subscription plans retrieved successfully.",
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    log.error(`Error fetching active plans: ${error.message}`);

    return res.status(500).json({
      success: false,
      message:
        "Unable to load active subscription plans right now. Please try again later.",
    });
  }
};

// ============================================================
// GET PLAN BY ID
// ============================================================
export const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // 1. Validate plan ID
    // --------------------------------------------------------
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid plan ID. Please provide a valid plan ID.",
      });
    }

    // --------------------------------------------------------
    // 2. Find plan
    // --------------------------------------------------------
    const plan = await Plans.findById(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message:
          "Subscription plan not found. The plan may have been deleted or the ID may be incorrect.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription plan retrieved successfully.",
      data: plan,
    });
  } catch (error) {
    log.error(`Error fetching plan: ${error.message}`);

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve the subscription plan right now. Please try again later.",
    });
  }
};

// ============================================================
// UPDATE PLAN
// ============================================================
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      planName,
      description,
      pricing,
      actualPricing,
      trialDays,
      setupFee,
      limits,
      features,
      validityDays,
      autoRenewalAllowed,
      isActive,
    } = req.body;

    // --------------------------------------------------------
    // 1. Validate plan ID
    // --------------------------------------------------------
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid plan ID. Please provide a valid plan ID.",
      });
    }

    // --------------------------------------------------------
    // 2. Find existing plan
    // --------------------------------------------------------
    const plan = await Plans.findById(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message:
          "Subscription plan not found. The plan may have been deleted or the ID may be incorrect.",
      });
    }

    // --------------------------------------------------------
    // 3. Validate and update plan name
    // --------------------------------------------------------
    if (planName !== undefined) {
      if (!planName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Plan name cannot be empty.",
        });
      }

      if (planName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message:
            "Plan name must contain at least 2 characters.",
        });
      }

      const duplicatePlan = await Plans.findOne({
        planName: planName.trim(),
        _id: { $ne: id },
      });

      if (duplicatePlan) {
        return res.status(409).json({
          success: false,
          message:
            "Another subscription plan already uses this name. Please choose a different name.",
        });
      }

      plan.planName = planName.trim();
    }

    // --------------------------------------------------------
    // 4. Update description
    // --------------------------------------------------------
    if (description !== undefined) {
      plan.description = description.trim();
    }

    // --------------------------------------------------------
    // 5. Validate and update pricing (Offer Price)
    // --------------------------------------------------------
    const priceFields = [
      "monthly",
      "quarterly",
      "halfYearly",
      "yearly",
    ];

    if (pricing !== undefined) {
      for (const field of priceFields) {
        if (
          pricing[field] !== undefined &&
          (typeof pricing[field] !== "number" ||
            pricing[field] < 0)
        ) {
          return res.status(400).json({
            success: false,
            message:
              `${field} plan price must be a valid amount greater than or equal to 0.`,
          });
        }
      }

      plan.pricing.monthly =
        pricing.monthly ?? plan.pricing.monthly;

      plan.pricing.quarterly =
        pricing.quarterly ?? plan.pricing.quarterly;

      plan.pricing.halfYearly =
        pricing.halfYearly ?? plan.pricing.halfYearly;

      plan.pricing.yearly =
        pricing.yearly ?? plan.pricing.yearly;
    }

    // --------------------------------------------------------
    // 5b. Validate and update actual pricing (MRP / Strikethrough Price)
    // --------------------------------------------------------
    if (actualPricing !== undefined) {
      for (const field of priceFields) {
        if (
          actualPricing[field] !== undefined &&
          (typeof actualPricing[field] !== "number" ||
            actualPricing[field] < 0)
        ) {
          return res.status(400).json({
            success: false,
            message:
              `${field} actual price must be a valid amount greater than or equal to 0.`,
          });
        }
      }

      if (!plan.actualPricing) {
        plan.actualPricing = { monthly: 0, quarterly: 0, halfYearly: 0, yearly: 0 };
      }

      plan.actualPricing.monthly =
        actualPricing.monthly ?? plan.actualPricing.monthly ?? 0;

      plan.actualPricing.quarterly =
        actualPricing.quarterly ?? plan.actualPricing.quarterly ?? 0;

      plan.actualPricing.halfYearly =
        actualPricing.halfYearly ?? plan.actualPricing.halfYearly ?? 0;

      plan.actualPricing.yearly =
        actualPricing.yearly ?? plan.actualPricing.yearly ?? 0;
    }

    // --------------------------------------------------------
    // 6. Validate trial days
    // --------------------------------------------------------
    if (trialDays !== undefined) {
      if (
        !Number.isInteger(trialDays) ||
        trialDays < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Trial period must be a whole number of days and cannot be negative.",
        });
      }

      plan.trialDays = trialDays;
    }

    // --------------------------------------------------------
    // 7. Validate setup fee
    // --------------------------------------------------------
    if (setupFee !== undefined) {
      if (
        typeof setupFee !== "number" ||
        setupFee < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Setup fee must be a valid amount greater than or equal to 0.",
        });
      }

      plan.setupFee = setupFee;
    }

    // --------------------------------------------------------
    // 8. Validate validity days
    // --------------------------------------------------------
    if (validityDays !== undefined) {
      if (
        !Number.isInteger(validityDays) ||
        validityDays < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Plan validity must be at least 1 day.",
        });
      }

      plan.validityDays = validityDays;
    }

    // --------------------------------------------------------
    // 9. Validate and update limits
    // --------------------------------------------------------
    if (limits !== undefined) {
      const limitFields = [
        "rooms",
        "branches",
        "receptionists",
      ];

      for (const field of limitFields) {
        if (
          limits[field] !== undefined &&
          (!Number.isInteger(limits[field]) ||
            limits[field] < 0)
        ) {
          return res.status(400).json({
            success: false,
            message:
              `${field} limit must be a whole number and cannot be negative.`,
          });
        }
      }

      if (limits.rooms !== undefined) {
        plan.limits.rooms = limits.rooms;
      }

      if (limits.branches !== undefined) {
        plan.limits.branches = limits.branches;
      }

      if (limits.receptionists !== undefined) {
        plan.limits.receptionists =
          limits.receptionists;
      }
    }

    // --------------------------------------------------------
    // 10. Validate and update features
    // --------------------------------------------------------
    if (features !== undefined) {
      const featureFields = [
        "foodService",
        "roomService",
      ];

      for (const field of featureFields) {
        if (
          features[field] !== undefined &&
          typeof features[field] !== "boolean"
        ) {
          return res.status(400).json({
            success: false,
            message:
              `${field} feature must be either enabled or disabled.`,
          });
        }
      }

      if (features.foodService !== undefined) {
        plan.features.foodService =
          features.foodService;
      }

      if (features.roomService !== undefined) {
        plan.features.roomService =
          features.roomService;
      }
    }

    // --------------------------------------------------------
    // 11. Validate auto renewal
    // --------------------------------------------------------
    if (autoRenewalAllowed !== undefined) {
      if (typeof autoRenewalAllowed !== "boolean") {
        return res.status(400).json({
          success: false,
          message:
            "Auto-renewal setting must be either enabled or disabled.",
        });
      }

      plan.autoRenewalAllowed =
        autoRenewalAllowed;
    }

    // --------------------------------------------------------
    // 12. Validate active status
    // --------------------------------------------------------
    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message:
            "Plan active status must be either active or inactive.",
        });
      }

      plan.isActive = isActive;
    }

    // --------------------------------------------------------
    // 13. Save updated plan
    // --------------------------------------------------------
    const updatedPlan = await plan.save();

    log.info(`Plan updated successfully: ${updatedPlan._id}`);

    return res.status(200).json({
      success: true,
      message: "Subscription plan updated successfully.",
      data: updatedPlan,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Another subscription plan is already using this name.",
      });
    }

    log.error(`Error updating plan: ${error.message}`);

    return res.status(500).json({
      success: false,
      message:
        "Unable to update the subscription plan right now. Please try again later.",
    });
  }
};

// ============================================================
// DELETE PLAN
// ============================================================
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // 1. Validate plan ID
    // --------------------------------------------------------
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid plan ID. Please provide a valid plan ID.",
      });
    }

    // --------------------------------------------------------
    // 2. Find plan
    // --------------------------------------------------------
    const plan = await Plans.findById(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message:
          "Subscription plan not found. It may have already been deleted.",
      });
    }

    // --------------------------------------------------------
    // 3. Delete plan
    // --------------------------------------------------------
    await Plans.findByIdAndDelete(id);

    log.info(`Plan deleted successfully: ${id}`);

    return res.status(200).json({
      success: true,
      message: "Subscription plan has been deleted successfully.",
      data: { _id: id },
    });
  } catch (error) {
    log.error(`Error deleting plan: ${error.message}`);

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete the subscription plan right now. Please try again later.",
    });
  }
};

// ============================================================
// GET FREE TRIAL CONFIG
// ============================================================
export const getFreeTrialConfig = async (req, res) => {
  try {
    let settings = await FreeTrialSettings.findOne();
    if (!settings) {
      settings = await FreeTrialSettings.create({
        isEnabled: true,
        trialDays: 14,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        isEnabled: settings.isEnabled,
        trialDays: settings.trialDays,
      },
    });
  } catch (error) {
    log.error(`[getFreeTrialConfig] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Unable to load free trial configuration.",
    });
  }
};

// ============================================================
// UPDATE FREE TRIAL CONFIG
// ============================================================
export const updateFreeTrialConfig = async (req, res) => {
  try {
    const { isEnabled, trialDays } = req.body;

    let settings = await FreeTrialSettings.findOne();
    if (!settings) {
      settings = new FreeTrialSettings();
    }

    if (typeof isEnabled === "boolean") {
      settings.isEnabled = isEnabled;
    }

    if (trialDays !== undefined) {
      const parsedDays = Number(trialDays);
      if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 365) {
        return res.status(400).json({
          success: false,
          message: "Free trial days must be a valid number between 1 and 365 days.",
        });
      }
      settings.trialDays = parsedDays;
    }

    settings.updatedBy = req.user?._id || null;
    await settings.save();

    log.info(`[updateFreeTrialConfig] Updated: isEnabled=${settings.isEnabled}, trialDays=${settings.trialDays}`);

    return res.status(200).json({
      success: true,
      message: "Free trial configuration updated successfully.",
      data: {
        isEnabled: settings.isEnabled,
        trialDays: settings.trialDays,
      },
    });
  } catch (error) {
    log.error(`[updateFreeTrialConfig] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Unable to update free trial configuration.",
    });
  }
};

// ============================================================
// GET GLOBAL BILLING CYCLE CONFIG
// ============================================================
export const getBillingCycleConfig = async (req, res) => {
  try {
    let settings = await BillingCycleSettings.findOne();
    if (!settings) {
      settings = await BillingCycleSettings.create({
        monthly: true,
        quarterly: true,
        halfYearly: true,
        yearly: true,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        monthly: settings.monthly ?? true,
        quarterly: settings.quarterly ?? true,
        halfYearly: settings.halfYearly ?? true,
        yearly: settings.yearly ?? true,
      },
    });
  } catch (error) {
    log.error(`[getBillingCycleConfig] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Unable to load billing cycle configuration.",
    });
  }
};

// ============================================================
// UPDATE GLOBAL BILLING CYCLE CONFIG
// ============================================================
export const updateBillingCycleConfig = async (req, res) => {
  try {
    const { monthly, quarterly, halfYearly, yearly } = req.body;

    let settings = await BillingCycleSettings.findOne();
    if (!settings) {
      settings = new BillingCycleSettings();
    }

    const nextMonthly = typeof monthly === "boolean" ? monthly : settings.monthly;
    const nextQuarterly = typeof quarterly === "boolean" ? quarterly : settings.quarterly;
    const nextHalfYearly = typeof halfYearly === "boolean" ? halfYearly : settings.halfYearly;
    const nextYearly = typeof yearly === "boolean" ? yearly : settings.yearly;

    // Ensure at least one cycle is active
    if (!nextMonthly && !nextQuarterly && !nextHalfYearly && !nextYearly) {
      return res.status(400).json({
        success: false,
        message: "At least one billing cycle must remain enabled.",
      });
    }

    settings.monthly = nextMonthly;
    settings.quarterly = nextQuarterly;
    settings.halfYearly = nextHalfYearly;
    settings.yearly = nextYearly;
    settings.updatedBy = req.user?._id || null;

    await settings.save();

    log.info(`[updateBillingCycleConfig] Updated: monthly=${settings.monthly}, quarterly=${settings.quarterly}, halfYearly=${settings.halfYearly}, yearly=${settings.yearly}`);

    return res.status(200).json({
      success: true,
      message: "Billing cycle configuration updated successfully.",
      data: {
        monthly: settings.monthly,
        quarterly: settings.quarterly,
        halfYearly: settings.halfYearly,
        yearly: settings.yearly,
      },
    });
  } catch (error) {
    log.error(`[updateBillingCycleConfig] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Unable to update billing cycle configuration.",
    });
  }
};