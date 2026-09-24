import api from "./api";


// ==========================================
// CREATE BRANCH
// ==========================================
export const createBranch = async (branchData) => {
  try {
    const response = await api.post(
      "/branches/add-branch",
      branchData
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message,
      }
    );
  }
};


// ==========================================
// GET ALL BRANCHES
// ==========================================
export const getAllBranches = async (hotelId) => {
  try {
    const response = await api.get(
      "/branches/list-branches",
      {
        params: hotelId ? { hotelId } : {},
      }
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message,
      }
    );
  }
};


// ==========================================
// GET BRANCH BY ID
// ==========================================
export const getBranchById = async (id) => {
  try {
    const response = await api.get(
      `/branches/${id}`
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message,
      }
    );
  }
};


// ==========================================
// UPDATE BRANCH
// ==========================================
export const updateBranch = async (id, branchData) => {
  try {
    const response = await api.put(
      `/branches/update-branch/${id}`,
      branchData
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message,
      }
    );
  }
};


// ==========================================
// DELETE BRANCH
// ==========================================
export const deleteBranch = async (id) => {
  try {
    const response = await api.delete(
      `/branches/delete-branch/${id}`
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message,
      }
    );
  }
};


// ==========================================
// GET BRANCH USAGE & LIMIT
// ==========================================
export const getBranchUsage = async (hotelId) => {
  try {
    const response = await api.get(
      "/branches/usage",
      {
        params: hotelId ? { hotelId } : {},
      }
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message,
      }
    );
  }
};