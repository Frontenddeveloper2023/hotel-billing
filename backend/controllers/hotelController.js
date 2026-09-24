import Hotels from "../models/Hotels.js";
import { log } from "../util/logger.js";

// ============================================================
// CREATE HOTEL
// ============================================================
export const createHotel = async (req, res) => {
  try {
    const {
      hotelName,
      ownerName,
      email,
      phone,
      address,
      gstNumber,
      taxEnabled,
      status,
    } = req.body;

    // --------------------------------------------------------
    // 1. Validate hotel name
    // --------------------------------------------------------
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

    // --------------------------------------------------------
    // 2. Validate owner name
    // --------------------------------------------------------
    if (!ownerName || !ownerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Owner name is required.",
      });
    }

    // --------------------------------------------------------
    // 3. Validate email
    // --------------------------------------------------------
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
        message: "Please enter a valid email address.",
      });
    }

    // --------------------------------------------------------
    // 4. Validate phone
    // --------------------------------------------------------
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

    // --------------------------------------------------------
    // 5. Check duplicate email
    // --------------------------------------------------------
    const existingEmail = await Hotels.findOne({
      email: normalizedEmail,
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message:
          "A hotel is already registered with this email address. Please use a different email.",
      });
    }

    // --------------------------------------------------------
    // 6. Check duplicate hotel name
    // --------------------------------------------------------
    const existingHotel = await Hotels.findOne({
      hotelName: hotelName.trim(),
    });

    if (existingHotel) {
      return res.status(409).json({
        success: false,
        message:
          "A hotel with this name already exists. Please use a different hotel name.",
      });
    }

    // --------------------------------------------------------
    // 7. Create hotel
    // --------------------------------------------------------
    const hotel = await Hotels.create({
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
        typeof taxEnabled === "boolean" ? taxEnabled : false,

      status: status || "active",
    });

    // --------------------------------------------------------
    // 8. Success log
    // --------------------------------------------------------
    log.info(`Hotel created successfully: ${hotel._id}`);

    return res.status(201).json({
      success: true,
      message: "Hotel registered successfully.",
      data: hotel,
    });
  } catch (error) {
    // --------------------------------------------------------
    // MongoDB duplicate key error
    // --------------------------------------------------------
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This hotel information is already registered. Please check the email or other unique details.",
      });
    }

    log.error(`Error creating hotel: ${error.message}`);

    return res.status(500).json({
      success: false,
      message:
        "Unable to register the hotel right now. Please try again later.",
    });
  }
};

// ============================================================
// GET ALL HOTELS
// ============================================================
export const getAllHotels = async (req, res) => {
  try {
    const hotels = await Hotels.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "Hotels retrieved successfully.",
      count: hotels.length,
      data: hotels,
    });
  } catch (error) {
    log.error(`Error fetching hotels: ${error.message}`);

    return res.status(500).json({
      success: false,
      message:
        "Unable to load hotels right now. Please try again later.",
    });
  }
};

// ============================================================
// GET SINGLE HOTEL
// ============================================================
export const getHotelById = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // Validate MongoDB ID
    // --------------------------------------------------------
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID. Please provide a valid hotel ID.",
      });
    }

    // --------------------------------------------------------
    // Find hotel
    // --------------------------------------------------------
    const hotel = await Hotels.findById(id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message:
          "Hotel not found. The hotel may have been deleted or the ID may be incorrect.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hotel details retrieved successfully.",
      data: hotel,
    });
  } catch (error) {
    log.error(`Error fetching hotel: ${error.message}`);

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve hotel details right now. Please try again later.",
    });
  }
};

// ============================================================
// UPDATE HOTEL
// ============================================================
export const updateHotel = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // 1. Validate hotel ID
    // --------------------------------------------------------
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID. Please provide a valid hotel ID.",
      });
    }

    const {
      hotelName,
      ownerName,
      email,
      phone,
      address,
      gstNumber,
      taxEnabled,
      status,
    } = req.body;

    // --------------------------------------------------------
    // 2. Check hotel exists
    // --------------------------------------------------------
    const existingHotel = await Hotels.findById(id);

    if (!existingHotel) {
      return res.status(404).json({
        success: false,
        message:
          "Hotel not found. The hotel may have been deleted or the ID may be incorrect.",
      });
    }

    // --------------------------------------------------------
    // 3. Validate hotel name if provided
    // --------------------------------------------------------
    if (hotelName !== undefined) {
      if (!hotelName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Hotel name cannot be empty.",
        });
      }

      if (hotelName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Hotel name must contain at least 2 characters.",
        });
      }

      const duplicateHotel = await Hotels.findOne({
        hotelName: hotelName.trim(),
        _id: { $ne: id },
      });

      if (duplicateHotel) {
        return res.status(409).json({
          success: false,
          message:
            "Another hotel is already using this hotel name. Please choose a different name.",
        });
      }
    }

    // --------------------------------------------------------
    // 4. Validate owner name
    // --------------------------------------------------------
    if (ownerName !== undefined && !ownerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Owner name cannot be empty.",
      });
    }

    // --------------------------------------------------------
    // 5. Validate email
    // --------------------------------------------------------
    let normalizedEmail;

    if (email !== undefined) {
      if (!email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Email address cannot be empty.",
        });
      }

      normalizedEmail = email.trim().toLowerCase();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address.",
        });
      }

      const duplicateEmail = await Hotels.findOne({
        email: normalizedEmail,
        _id: { $ne: id },
      });

      if (duplicateEmail) {
        return res.status(409).json({
          success: false,
          message:
            "Another hotel is already using this email address. Please use a different email.",
        });
      }
    }

    // --------------------------------------------------------
    // 6. Validate phone
    // --------------------------------------------------------
    if (phone !== undefined) {
      const normalizedPhone = phone.trim();

      if (!/^[0-9]{10}$/.test(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: "Phone number must contain exactly 10 digits.",
        });
      }
    }

    // --------------------------------------------------------
    // 7. Update fields only when provided
    // --------------------------------------------------------
    if (hotelName !== undefined) {
      existingHotel.hotelName = hotelName.trim();
    }

    if (ownerName !== undefined) {
      existingHotel.ownerName = ownerName.trim();
    }

    if (email !== undefined) {
      existingHotel.email = normalizedEmail;
    }

    if (phone !== undefined) {
      existingHotel.phone = phone.trim();
    }

    if (address !== undefined) {
      existingHotel.address = {
        street:
          address.street !== undefined
            ? address.street.trim()
            : existingHotel.address?.street || "",

        city:
          address.city !== undefined
            ? address.city.trim()
            : existingHotel.address?.city || "",

        state:
          address.state !== undefined
            ? address.state.trim()
            : existingHotel.address?.state || "",

        country:
          address.country !== undefined
            ? address.country.trim()
            : existingHotel.address?.country || "",

        pincode:
          address.pincode !== undefined
            ? address.pincode.trim()
            : existingHotel.address?.pincode || "",
      };
    }

    if (gstNumber !== undefined) {
      existingHotel.gstNumber = gstNumber.trim();
    }

    if (taxEnabled !== undefined) {
      if (typeof taxEnabled !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Tax enabled value must be true or false.",
        });
      }

      existingHotel.taxEnabled = taxEnabled;
    }

    if (status !== undefined) {
      const allowedStatuses = [
        "active",
        "inactive",
        "suspended",
        "cancelled",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid hotel status. Please use active, inactive, suspended, or cancelled.",
        });
      }

      existingHotel.status = status;
    }

    // --------------------------------------------------------
    // 8. Save changes
    // --------------------------------------------------------
    const updatedHotel = await existingHotel.save();

    log.info(`Hotel updated successfully: ${updatedHotel._id}`);

    return res.status(200).json({
      success: true,
      message: "Hotel details updated successfully.",
      data: updatedHotel,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This hotel information is already being used by another hotel.",
      });
    }

    log.error(`Error updating hotel: ${error.message}`);

    return res.status(500).json({
      success: false,
      message:
        "Unable to update hotel details right now. Please try again later.",
    });
  }
};

// ============================================================
// DELETE HOTEL
// ============================================================
export const deleteHotel = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // 1. Validate ID
    // --------------------------------------------------------
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID. Please provide a valid hotel ID.",
      });
    }

    // --------------------------------------------------------
    // 2. Find hotel
    // --------------------------------------------------------
    const hotel = await Hotels.findById(id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message:
          "Hotel not found. It may have already been deleted.",
      });
    }

    // --------------------------------------------------------
    // 3. Delete hotel
    // --------------------------------------------------------
    await Hotels.findByIdAndDelete(id);

    log.info(`Hotel deleted successfully: ${id}`);

    return res.status(200).json({
      success: true,
      message: "Hotel deleted successfully.",
    });
  } catch (error) {
    log.error(`Error deleting hotel: ${error.message}`);

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete the hotel right now. Please try again later.",
    });
  }
};