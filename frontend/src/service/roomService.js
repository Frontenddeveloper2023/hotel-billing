import api from "./api";

// =====================================================
// CREATE ROOM
// =====================================================

const createRoom = async (data) => {
    try {
        const response = await api.post(
            "/rooms/add",
            data
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


// =====================================================
// GET ALL ROOMS
// =====================================================

const listRooms = async () => {
    try {
        const response = await api.get(
            "/rooms/all"
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


// =====================================================
// GET SINGLE ROOM
// =====================================================

const getRoom = async (id) => {
    try {
        const response = await api.get(
            `/rooms/${id}`
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


// =====================================================
// UPDATE ROOM
// =====================================================

const updateRoom = async (id, data) => {
    try {
        const response = await api.put(
            `/rooms/${id}`,
            data
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


// =====================================================
// DELETE ROOM
// =====================================================

const deleteRoom = async (id) => {
    try {
        const response = await api.delete(
            `/rooms/${id}`
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


// =====================================================
// EXPORT
// =====================================================

export {
    createRoom,
    listRooms,
    getRoom,
    updateRoom,
    deleteRoom,
};