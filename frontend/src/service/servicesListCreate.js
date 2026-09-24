import api from "./api.js";

// 1. CREATE a new service
export const createServiceApi = async (serviceData) => {
    try {
        const response = await api.post("/room-services-List-controle/create-service", serviceData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error.message;
    }
};

// 2. GET all services
export const getAllServicesApi = async () => {
    try {
        const response = await api.get("/room-services-List-controle/get-all-services");
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error.message;
    }
};

// 3. GET a single service by ID
export const getServiceByIdApi = async (id) => {
    try {
        const response = await api.get(`/room-services-List-controle/get-service/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error.message;
    }
};

// 4. UPDATE an existing service by ID
export const updateServiceApi = async (id, serviceData) => {
    try {
        const response = await api.put(`/room-services-List-controle/update-service/${id}`, serviceData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error.message;
    }
};

// 5. DELETE a service by ID (Fixed missing path prefix)
export const deleteServiceApi = async (id) => {
    try {
        const response = await api.delete(`/room-services-List-controle/delete-service/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error.message;
    }
};