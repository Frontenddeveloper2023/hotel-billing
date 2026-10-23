import api from "./api";

// GET ALL ADMINS AND SUB-ADMINS
export const getAdminUsers = async () => {
  try {
    const response = await api.get("/saas-admin-settings/admins");
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message || "Failed to fetch admin users",
      }
    );
  }
};

// CREATE SUB-ADMIN (MAIN ADMIN ONLY)
export const createSubAdmin = async (payload) => {
  try {
    const response = await api.post("/saas-admin-settings/admins", payload);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message || "Failed to create sub-admin",
      }
    );
  }
};

// UPDATE SUB-ADMIN (MAIN ADMIN ONLY)
export const updateSubAdmin = async (id, payload) => {
  try {
    const response = await api.put(`/saas-admin-settings/admins/${id}`, payload);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message || "Failed to update sub-admin",
      }
    );
  }
};

// BLOCK / UNBLOCK SUB-ADMIN (MAIN ADMIN ONLY)
export const toggleBlockSubAdmin = async (id, status) => {
  try {
    const response = await api.put(`/saas-admin-settings/admins/${id}/block`, { status });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message || "Failed to change sub-admin status",
      }
    );
  }
};

// DELETE SUB-ADMIN (MAIN ADMIN ONLY)
export const deleteSubAdmin = async (id) => {
  try {
    const response = await api.delete(`/saas-admin-settings/admins/${id}`);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message || "Failed to delete sub-admin",
      }
    );
  }
};

// UPDATE MAIN ADMIN OWN PROFILE (EMAIL & NAME)
export const updateAdminProfile = async (payload) => {
  try {
    const response = await api.put("/saas-admin-settings/profile", payload);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message || "Failed to update profile",
      }
    );
  }
};
