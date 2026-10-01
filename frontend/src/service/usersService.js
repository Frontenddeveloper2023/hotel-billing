import api from "./api";

export const sendOTPForLogin = async (email) => {
    const response = await api.post('/users/send-otp', { email });
    return response.data;
};

export const verifyOTPForLogin = async (email, otp) => {
    const response = await api.post('/users/verify-otp', { email, otp });
    return response.data;
};

// Hotel Login
export const sendHotelOTP = async (email) => {
    const response = await api.post('/users/hotel-send-otp', { email });
    return response.data;
};

export const verifyHotelOTP = async (email, otp) => {
    const response = await api.post('/users/hotel-verify-otp', {
        email,
        otp,
    });
    return response.data;
};

export const logout = async () => {
    const response = await api.post('/users/logout');
    return response.data;
};

export const getUser = async () => {
    const response = await api.get('/users/get-user');
    return response.data;
};