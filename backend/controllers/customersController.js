import mongoose from "mongoose";
import Customer from "../models/customers.js";
import { log } from "../util/logger.js";

/**
 * =====================================================
 * HELPERS
 * =====================================================
 */

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * =====================================================
 * GET TENANT IDS
 * =====================================================
 *
 * IMPORTANT:
 * hotelId and branchId must ALWAYS come from
 * the authenticated user.
 *
 * Never trust hotelId / branchId from req.body.
 * =====================================================
 */

const getTenantIds = (req, res) => {
  const hotelId = req.user?.hotelId;
  const branchId = req.user?.branchId;

  /**
   * Hotel validation
   */
  if (!hotelId) {
    res.status(403).json({
      success: false,
      message:
        "Your account is not connected to a hotel.",
    });

    return null;
  }

  /**
   * Branch validation
   */
  if (!branchId) {
    res.status(403).json({
      success: false,
      message:
        "Your account is not connected to a hotel branch.",
    });

    return null;
  }

  /**
   * MongoDB ObjectId validation
   */
  if (!isValidObjectId(hotelId)) {
    res.status(403).json({
      success: false,
      message:
        "Your hotel account information is invalid.",
    });

    return null;
  }

  if (!isValidObjectId(branchId)) {
    res.status(403).json({
      success: false,
      message:
        "Your hotel branch information is invalid.",
    });

    return null;
  }

  return {
    hotelId,
    branchId,
  };
};


/**
 * =====================================================
 * 1. CREATE CUSTOMER
 * =====================================================
 *
 * Customer DB contains ONLY customer information.
 * Booking information is handled by bookingController.
 *
 * POST /api/customers
 *
 * hotelId and branchId are automatically taken
 * from req.user.
 * =====================================================
 */

export const createCustomer = async (req, res) => {
  try {
    /**
     * -------------------------------------------------
     * GET TENANT
     * -------------------------------------------------
     */

    const tenant = getTenantIds(req, res);

    if (!tenant) {
      return;
    }

    const {
      hotelId,
      branchId,
    } = tenant;

    /**
     * -------------------------------------------------
     * GET BODY
     * -------------------------------------------------
     */

    const {
      customerName,
      phoneNumber,
      alternativePhone,
      email,
      address,
      idProofType,
      idProofNumber,
    } = req.body;

    /**
     * -------------------------------------------------
     * REQUIRED VALIDATION
     * -------------------------------------------------
     */

    if (
      !customerName ||
      !String(customerName).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer name is required.",
      });
    }

    if (
      !phoneNumber ||
      !String(phoneNumber).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number is required.",
      });
    }

    if (
      !address ||
      !String(address).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Address is required.",
      });
    }

    if (
      !idProofType ||
      !String(idProofType).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID proof type is required.",
      });
    }

    if (
      !idProofNumber ||
      !String(idProofNumber).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID proof number is required.",
      });
    }

    /**
     * -------------------------------------------------
     * CREATE CUSTOMER
     * -------------------------------------------------
     *
     * IMPORTANT:
     * hotelId and branchId are NOT taken from frontend.
     */

    const customer = await Customer.create({
      hotelId,
      branchId,

      customerName:
        String(customerName).trim(),

      phoneNumber:
        String(phoneNumber).trim(),

      alternativePhone:
        alternativePhone
          ? String(
              alternativePhone
            ).trim()
          : "",

      email:
        email
          ? String(email)
              .trim()
              .toLowerCase()
          : "",

      address:
        String(address).trim(),

      idProofType:
        String(idProofType).trim(),

      idProofNumber:
        String(idProofNumber).trim(),
    });

    /**
     * -------------------------------------------------
     * LOG
     * -------------------------------------------------
     */

    log.info(
      `[CUSTOMER] Created successfully | Hotel: ${hotelId} | Branch: ${branchId} | Customer: ${customer._id} | Name: ${customer.customerName}`
    );

    /**
     * -------------------------------------------------
     * SUCCESS
     * -------------------------------------------------
     */

    return res.status(201).json({
      success: true,
      message:
        "Customer created successfully.",
      data: customer,
    });
  } catch (error) {
    console.error(
      "CREATE CUSTOMER ERROR:",
      error
    );

    log.error(
      `[CUSTOMER] Error creating customer: ${error.message}`
    );

    /**
     * -------------------------------------------------
     * MONGOOSE VALIDATION ERROR
     * -------------------------------------------------
     */

    if (
      error.name ===
      "ValidationError"
    ) {
      const messages =
        Object.values(
          error.errors
        ).map(
          (err) =>
            err.message
        );

      return res.status(400).json({
        success: false,
        message:
          messages.join(", "),
      });
    }

    /**
     * -------------------------------------------------
     * DUPLICATE KEY
     * -------------------------------------------------
     */

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Customer already exists.",
      });
    }

    /**
     * -------------------------------------------------
     * SERVER ERROR
     * -------------------------------------------------
     */

    return res.status(500).json({
      success: false,
      message:
        "Failed to create customer. Please try again.",
    });
  }
};


/**
 * =====================================================
 * 2. GET ALL CUSTOMERS
 * =====================================================
 *
 * GET /api/customers
 *
 * IMPORTANT:
 * Only customers belonging to the logged-in user's
 * hotel + branch are returned.
 * =====================================================
 */

export const getAllCustomers = async (
  req,
  res
) => {
  try {
    /**
     * -------------------------------------------------
     * GET TENANT
     * -------------------------------------------------
     */

    const tenant =
      getTenantIds(
        req,
        res
      );

    if (!tenant) {
      return;
    }

    const {
      hotelId,
      branchId,
    } = tenant;

    /**
     * -------------------------------------------------
     * FIND CUSTOMERS
     * -------------------------------------------------
     */

    const customers =
      await Customer.find({
        hotelId,
        branchId,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    /**
     * -------------------------------------------------
     * LOG
     * -------------------------------------------------
     */

    log.info(
      `[CUSTOMER] Fetched all customers | Hotel: ${hotelId} | Branch: ${branchId} | Count: ${customers.length}`
    );

    /**
     * -------------------------------------------------
     * RESPONSE
     * -------------------------------------------------
     */

    return res.status(200).json({
      success: true,
      count:
        customers.length,
      data:
        customers,
    });
  } catch (error) {
    console.error(
      "GET ALL CUSTOMERS ERROR:",
      error
    );

    log.error(
      `[CUSTOMER] Error fetching customers: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch customer records. Please try again.",
    });
  }
};


/**
 * =====================================================
 * 3. GET CUSTOMER BY ID
 * =====================================================
 *
 * GET /api/customers/:id
 *
 * =====================================================
 */

export const getCustomerById =
  async (req, res) => {
    try {
      /**
       * -------------------------------------------------
       * GET TENANT
       * -------------------------------------------------
       */

      const tenant =
        getTenantIds(
          req,
          res
        );

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      /**
       * -------------------------------------------------
       * PARAM ID
       * -------------------------------------------------
       */

      const { id } =
        req.params;

      /**
       * -------------------------------------------------
       * ID VALIDATION
       * -------------------------------------------------
       */

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Customer ID parameter is missing.",
        });
      }

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID format.",
        });
      }

      /**
       * -------------------------------------------------
       * FIND CUSTOMER
       * -------------------------------------------------
       *
       * IMPORTANT:
       * _id + hotelId + branchId
       */

      const customer =
        await Customer.findOne({
          _id: id,
          hotelId,
          branchId,
        }).lean();

      /**
       * -------------------------------------------------
       * NOT FOUND
       * -------------------------------------------------
       */

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer record not found.",
        });
      }

      /**
       * -------------------------------------------------
       * LOG
       * -------------------------------------------------
       */

      log.info(
        `[CUSTOMER] Fetched customer | Hotel: ${hotelId} | Branch: ${branchId} | Customer: ${id}`
      );

      /**
       * -------------------------------------------------
       * RESPONSE
       * -------------------------------------------------
       */

      return res.status(200).json({
        success: true,
        data:
          customer,
      });
    } catch (error) {
      console.error(
        "GET CUSTOMER ERROR:",
        error
      );

      log.error(
        `[CUSTOMER] Error fetching customer (${req.params.id}): ${error.message}`
      );

      if (
        error.name ===
        "CastError"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch customer. Please try again.",
      });
    }
  };


/**
 * =====================================================
 * 4. UPDATE CUSTOMER
 * =====================================================
 *
 * PUT /api/customers/:id
 *
 * ONLY customer information is updated here.
 *
 * No:
 * - rooms
 * - dates
 * - checkout
 * - payment
 * - booking information
 *
 * =====================================================
 */

export const updateCustomer =
  async (req, res) => {
    try {
      /**
       * -------------------------------------------------
       * GET TENANT
       * -------------------------------------------------
       */

      const tenant =
        getTenantIds(
          req,
          res
        );

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      /**
       * -------------------------------------------------
       * PARAM ID
       * -------------------------------------------------
       */

      const { id } =
        req.params;

      /**
       * -------------------------------------------------
       * ID VALIDATION
       * -------------------------------------------------
       */

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Customer ID parameter is missing.",
        });
      }

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID format.",
        });
      }

      /**
       * -------------------------------------------------
       * CHECK CUSTOMER
       * -------------------------------------------------
       *
       * IMPORTANT:
       * Search only inside current hotel + branch.
       */

      const existingCustomer =
        await Customer.findOne({
          _id: id,
          hotelId,
          branchId,
        });

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer record not found.",
        });
      }

      /**
       * -------------------------------------------------
       * GET CUSTOMER FIELDS ONLY
       * -------------------------------------------------
       *
       * We intentionally do NOT allow the frontend
       * to update hotelId or branchId.
       */

      const {
        customerName,
        phoneNumber,
        alternativePhone,
        email,
        address,
        idProofType,
        idProofNumber,
      } = req.body;

      const updateData = {};

      /**
       * -------------------------------------------------
       * CUSTOMER NAME
       * -------------------------------------------------
       */

      if (
        customerName !==
        undefined
      ) {
        if (
          !String(
            customerName
          ).trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Customer name cannot be empty.",
          });
        }

        updateData.customerName =
          String(
            customerName
          ).trim();
      }

      /**
       * -------------------------------------------------
       * PHONE
       * -------------------------------------------------
       */

      if (
        phoneNumber !==
        undefined
      ) {
        if (
          !String(
            phoneNumber
          ).trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Phone number cannot be empty.",
          });
        }

        updateData.phoneNumber =
          String(
            phoneNumber
          ).trim();
      }

      /**
       * -------------------------------------------------
       * ALTERNATIVE PHONE
       * -------------------------------------------------
       */

      if (
        alternativePhone !==
        undefined
      ) {
        updateData.alternativePhone =
          String(
            alternativePhone ||
              ""
          ).trim();
      }

      /**
       * -------------------------------------------------
       * EMAIL
       * -------------------------------------------------
       */

      if (
        email !==
        undefined
      ) {
        updateData.email =
          String(
            email || ""
          )
            .trim()
            .toLowerCase();
      }

      /**
       * -------------------------------------------------
       * ADDRESS
       * -------------------------------------------------
       */

      if (
        address !==
        undefined
      ) {
        if (
          !String(
            address
          ).trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Address cannot be empty.",
          });
        }

        updateData.address =
          String(
            address
          ).trim();
      }

      /**
       * -------------------------------------------------
       * ID PROOF TYPE
       * -------------------------------------------------
       */

      if (
        idProofType !==
        undefined
      ) {
        if (
          !String(
            idProofType
          ).trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "ID proof type cannot be empty.",
          });
        }

        updateData.idProofType =
          String(
            idProofType
          ).trim();
      }

      /**
       * -------------------------------------------------
       * ID PROOF NUMBER
       * -------------------------------------------------
       */

      if (
        idProofNumber !==
        undefined
      ) {
        if (
          !String(
            idProofNumber
          ).trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "ID proof number cannot be empty.",
          });
        }

        updateData.idProofNumber =
          String(
            idProofNumber
          ).trim();
      }

      /**
       * -------------------------------------------------
       * CHECK EMPTY UPDATE
       * -------------------------------------------------
       */

      if (
        Object.keys(
          updateData
        ).length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No customer details were provided for update.",
        });
      }

      /**
       * -------------------------------------------------
       * UPDATE CUSTOMER
       * -------------------------------------------------
       *
       * hotelId and branchId are included in the
       * query to prevent cross-tenant updates.
       */

      const updatedCustomer =
        await Customer.findOneAndUpdate(
          {
            _id: id,
            hotelId,
            branchId,
          },
          {
            $set:
              updateData,
          },
          {
            new: true,
            runValidators: true,
          }
        );

      /**
       * -------------------------------------------------
       * SAFETY CHECK
       * -------------------------------------------------
       */

      if (!updatedCustomer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer record not found.",
        });
      }

      /**
       * -------------------------------------------------
       * LOG
       * -------------------------------------------------
       */

      log.info(
        `[CUSTOMER] Updated successfully | Hotel: ${hotelId} | Branch: ${branchId} | Customer: ${id}`
      );

      /**
       * -------------------------------------------------
       * RESPONSE
       * -------------------------------------------------
       */

      return res.status(200).json({
        success: true,
        message:
          "Customer details updated successfully.",
        data:
          updatedCustomer,
      });
    } catch (error) {
      console.error(
        "UPDATE CUSTOMER ERROR:",
        error
      );

      log.error(
        `[CUSTOMER] Error updating customer (${req.params.id}): ${error.message}`
      );

      /**
       * -------------------------------------------------
       * VALIDATION ERROR
       * -------------------------------------------------
       */

      if (
        error.name ===
        "ValidationError"
      ) {
        const messages =
          Object.values(
            error.errors
          ).map(
            (err) =>
              err.message
          );

        return res.status(400).json({
          success: false,
          message:
            messages.join(", "),
        });
      }

      /**
       * -------------------------------------------------
       * DUPLICATE KEY
       * -------------------------------------------------
       */

      if (
        error.code ===
        11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Customer already exists.",
        });
      }

      /**
       * -------------------------------------------------
       * CAST ERROR
       * -------------------------------------------------
       */

      if (
        error.name ===
        "CastError"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID.",
        });
      }

      /**
       * -------------------------------------------------
       * SERVER ERROR
       * -------------------------------------------------
       */

      return res.status(500).json({
        success: false,
        message:
          "Failed to update customer. Please try again.",
      });
    }
  };


/**
 * =====================================================
 * 5. DELETE CUSTOMER
 * =====================================================
 *
 * DELETE /api/customers/:id
 *
 * =====================================================
 */

export const deleteCustomer =
  async (req, res) => {
    try {
      /**
       * -------------------------------------------------
       * GET TENANT
       * -------------------------------------------------
       */

      const tenant =
        getTenantIds(
          req,
          res
        );

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      /**
       * -------------------------------------------------
       * PARAM ID
       * -------------------------------------------------
       */

      const { id } =
        req.params;

      /**
       * -------------------------------------------------
       * VALIDATE ID
       * -------------------------------------------------
       */

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Customer ID parameter is missing.",
        });
      }

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID format.",
        });
      }

      /**
       * -------------------------------------------------
       * FIND + DELETE
       * -------------------------------------------------
       *
       * IMPORTANT:
       * _id + hotelId + branchId
       */

      const customer =
        await Customer.findOneAndDelete({
          _id: id,
          hotelId,
          branchId,
        });

      /**
       * -------------------------------------------------
       * NOT FOUND
       * -------------------------------------------------
       */

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer record not found.",
        });
      }

      /**
       * -------------------------------------------------
       * LOG
       * -------------------------------------------------
       */

      log.info(
        `[CUSTOMER] Deleted successfully | Hotel: ${hotelId} | Branch: ${branchId} | Customer: ${id} | Name: ${customer.customerName}`
      );

      /**
       * -------------------------------------------------
       * RESPONSE
       * -------------------------------------------------
       */

      return res.status(200).json({
        success: true,
        message:
          "Customer record deleted successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE CUSTOMER ERROR:",
        error
      );

      log.error(
        `[CUSTOMER] Error deleting customer (${req.params.id}): ${error.message}`
      );

      /**
       * -------------------------------------------------
       * CAST ERROR
       * -------------------------------------------------
       */

      if (
        error.name ===
        "CastError"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID.",
        });
      }

      /**
       * -------------------------------------------------
       * SERVER ERROR
       * -------------------------------------------------
       */

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete customer. Please try again.",
      });
    }
  };