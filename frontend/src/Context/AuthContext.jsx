import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  logout,
  getUser,
} from "../service/usersService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {

  // =====================================================
  // SEPARATE ADMIN + HOTEL SESSIONS
  // =====================================================

  const [adminUser, setAdminUser] = useState(null);
  const [hotelUser, setHotelUser] = useState(null);

  const [adminLoading, setAdminLoading] = useState(true);
  const [hotelLoading, setHotelLoading] = useState(true);


  // =====================================================
  // FETCH ADMIN USER
  // =====================================================

  const fetchAdminUser = async () => {
    try {

      const response = await getUser("admin");

      console.log(
        "[AuthContext] Admin getUser response:",
        response
      );

      const userObj =
        response?.user ||
        response?.data?.user ||
        response?.data ||
        response;

      if (
        userObj &&
        (
          userObj._id ||
          userObj.id ||
          userObj.email
        )
      ) {

        console.log(
          "[AuthContext] Admin user:",
          userObj
        );

        setAdminUser(userObj);

      } else {

        setAdminUser(null);
      }

    } catch (error) {

      if (error?.response?.status === 401) {
        setAdminUser(null);
      } else {
        console.error(
          "[AuthContext] Admin session check failed:",
          error
        );
      }

    } finally {

      setAdminLoading(false);
    }
  };


  // =====================================================
  // FETCH HOTEL USER
  // =====================================================

  const fetchHotelUser = async () => {
    try {
      let activePortal = sessionStorage.getItem("hotelPortal");
      let response;

      if (activePortal === "owner" || activePortal === "staff") {
        response = await getUser(activePortal);
      } else {
        // Unset tab: try owner first, then fallback to staff
        try {
          response = await getUser("owner");
          sessionStorage.setItem("hotelPortal", "owner");
        } catch (err) {
          if (err?.response?.status === 401) {
            response = await getUser("staff");
            sessionStorage.setItem("hotelPortal", "staff");
          } else {
            throw err;
          }
        }
      }

      console.log(
        "[AuthContext] Hotel getUser response:",
        response
      );

      const userObj =
        response?.user ||
        response?.data?.user ||
        response?.data ||
        response;

      if (
        userObj &&
        (
          userObj._id ||
          userObj.id ||
          userObj.email
        )
      ) {
        console.log(
          "[AuthContext] Hotel user:",
          userObj
        );
        setHotelUser(userObj);
      } else {
        setHotelUser(null);
      }

    } catch (error) {
      if (error?.response?.status === 401) {
        setHotelUser(null);
      } else {
        console.error(
          "[AuthContext] Hotel session check failed:",
          error
        );
      }
    } finally {
      setHotelLoading(false);
    }
  };


  // =====================================================
  // INITIAL SESSION CHECK
  // =====================================================

  useEffect(() => {

    fetchAdminUser();
    fetchHotelUser();

  }, []);


  // =====================================================
  // LOGIN USER
  // =====================================================

  const loginUser = async (user) => {

    console.log(
      "[AuthContext] Login:",
      user
    );

    if (user?.role === "admin") {
      sessionStorage.setItem("hotelPortal", "admin");
      setAdminUser(user);
      await fetchAdminUser();

    } else if (user?.role === "hotelOwner") {
      sessionStorage.setItem("hotelPortal", "owner");
      setHotelUser(user);
      await fetchHotelUser();

    } else if (user?.role === "receptionist") {
      sessionStorage.setItem("hotelPortal", "staff");
      setHotelUser(user);
      await fetchHotelUser();
    }
  };


  // =====================================================
  // LOGOUT USER
  // =====================================================

  const logoutUser = async (portal) => {

    try {
      const activePortal = portal || sessionStorage.getItem("hotelPortal") || "hotel";
      await logout(activePortal);

    } catch (error) {

      console.error(
        "[AuthContext] Logout failed:",
        error
      );

    } finally {
      sessionStorage.removeItem("hotelPortal");
      sessionStorage.removeItem("hotelToken");
      sessionStorage.removeItem("hotelCookieName");
      if (portal === "admin") {

        setAdminUser(null);

      } else {

        setHotelUser(null);
      }
    }
  };


  // =====================================================
  // REFRESH USER
  // =====================================================

  const refreshUser = async (portal) => {

    if (portal === "admin") {

      await fetchAdminUser();

    } else if (portal === "hotel") {

      await fetchHotelUser();
    }
  };



  

  // ================================
  // =====================
  // BACKWARD COMPATIBILITY
  // =====================================================
  //
  // Existing pages still using:
  //
  //   isAuthenticated
  //   userData
  //
  // will receive the currently available session.
  //
  // App.jsx will be updated next to use the correct
  // portal-specific session.
  // =====================================================

  const isAuthenticated =
    Boolean(adminUser || hotelUser);

  const userData =
    adminUser || hotelUser || null;

  const loading =
    adminLoading || hotelLoading;


  // =====================================================
  // CONTEXT PROVIDER
  // =====================================================

  return (
    <AuthContext.Provider
      value={{
        // New separate sessions
        adminUser,
        hotelUser,

        adminLoading,
        hotelLoading,

        // Existing values
        isAuthenticated,
        userData,
        loading,

        // Functions
        loginUser,
        logoutUser,
        refreshUser,

        // Optional direct refresh functions
        fetchAdminUser,
        fetchHotelUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


// =====================================================
// USE AUTH
// =====================================================

export const useAuth = () => {

  const context = useContext(AuthContext);

  if (!context) {

    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};