import api from "./api";

// =====================================================
// CREATE USER (Admin or Receptionist with Dynamic Permissions)
// =====================================================

const createUser = async (data) => {
    const response = await api.post(
        "/users-access/add-user", 
        data
    );

    return response.data;
};

// =====================================================
// GET ALL USERS
// =====================================================

const listUsers = async () => {
    const response = await api.get(
        "/users-access/list-users" 
    );

    return response.data;
};

// =====================================================
// UPDATE USER (Dynamic permissions & profile)
// =====================================================

const updateUser = async (id, data) => {
    const response = await api.put(
        `/users-access/update-user/${id}`, 
        data
    );

    return response.data;
};

// =====================================================
// DELETE USER
// =====================================================

const deleteUser = async (id) => {
    const response = await api.delete(
        `/users-access/delete-user/${id}` 
    );

    return response.data;
};

// =====================================================
// EXPORT
// =====================================================

export {
    createUser,
    listUsers,
    updateUser,
    deleteUser,
};