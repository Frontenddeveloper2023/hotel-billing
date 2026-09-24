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

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [userData, setUserData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  // =====================================================
  // FETCH CURRENT USER
  // =====================================================

  const fetchUser = async () => {

    try {

      const response = await getUser();

      console.log(
        "[AuthContext] getUser response:",
        response
      );


      // -------------------------------------------------
      // GET USER OBJECT
      // -------------------------------------------------

      const userObj =
        response?.user ||
        response?.data?.user ||
        response?.data ||
        response;


      // -------------------------------------------------
      // USER FOUND
      // -------------------------------------------------

      if (
        userObj &&
        (
          userObj._id ||
          userObj.id ||
          userObj.email
        )
      ) {

        console.log(
          "[AuthContext] User:",
          userObj
        );

        console.log(
          "[AuthContext] Role:",
          userObj.role
        );

        console.log(
          "[AuthContext] Permissions:",
          userObj.permission
        );


        setIsAuthenticated(true);

        setUserData(userObj);

      } else {

        setIsAuthenticated(false);

        setUserData(null);
      }

    } catch (error) {

      console.error(
        "[AuthContext] Session check failed:",
        error
      );


      if (
        error?.response?.status === 401
      ) {

        setIsAuthenticated(false);

        setUserData(null);
      }

    } finally {

      setLoading(false);
    }
  };


  // =====================================================
  // INITIAL SESSION CHECK
  // =====================================================

  useEffect(() => {

    fetchUser();

  }, []);


  // =====================================================
  // LOGIN USER
  // =====================================================

  const loginUser = async (user) => {

    console.log(
      "[AuthContext] Login:",
      user
    );


    setIsAuthenticated(true);

    setUserData(user);


    // Fetch latest database permissions
    try {

      await fetchUser();

    } catch (error) {

      console.error(
        "[AuthContext] Refresh after login failed:",
        error
      );
    }
  };


  // =====================================================
  // LOGOUT
  // =====================================================

  const logoutUser = async () => {

    try {

      await logout();

    } catch (error) {

      console.error(
        "[AuthContext] Logout failed:",
        error
      );

    } finally {

      setIsAuthenticated(false);

      setUserData(null);
    }
  };


  // =====================================================
  // REFRESH USER
  // =====================================================

  const refreshUser = async () => {

    await fetchUser();
  };


  // =====================================================
  // CONTEXT PROVIDER
  // =====================================================

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userData,
        loading,

        loginUser,
        logoutUser,
        refreshUser,
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

  const context =
    useContext(AuthContext);


  if (!context) {

    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }


  return context;
};