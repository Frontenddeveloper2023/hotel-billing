import api from "./api";

// ==========================================
// CREATE PLAN
// ==========================================
export const createPlan = async (planData) => {
  try {
    const response = await api.post(
      "/plans/add-plan",
      planData
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
// GET ALL PLANS
// ==========================================
export const getAllPlans = async () => {
  try {
    const response = await api.get(
      "/plans/list-plans"
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
// GET ACTIVE PLANS - ADMIN
// ==========================================
export const getActivePlans = async () => {
  try {
    const response = await api.get(
      "/plans/active-plans"
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
// GET ACTIVE PLANS - PUBLIC
// ==========================================
// Used by SaaSUser before login/registration
export const getPublicActivePlans = async () => {
  try {
    const response = await api.get(
      "/plans/public/active-plans"
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
// GET PLAN BY ID
// ==========================================
export const getPlanById = async (id) => {
  try {
    const response = await api.get(
      `/plans/${id}`
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
// UPDATE PLAN
// ==========================================
export const updatePlan = async (id, planData) => {
  try {
    const response = await api.put(
      `/plans/update-plan/${id}`,
      planData
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
// DELETE PLAN
// ==========================================
export const deletePlan = async (id) => {
  try {
    const response = await api.delete(
      `/plans/delete-plan/${id}`
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