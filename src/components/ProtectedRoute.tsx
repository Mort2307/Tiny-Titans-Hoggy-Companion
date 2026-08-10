import type {
  ReactNode,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";


type ProtectedRouteProps = {
  children: ReactNode;
};


function ProtectedRoute({
  children,
}: ProtectedRouteProps) {

  const {
    user,
    profile,
    loading,
    profileLoading,
  } = useAuth();


  const location =
    useLocation();


  if (
    loading ||
    profileLoading
  ) {

    return (

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          background: "#140022",
          color: "#F8F2FF",
        }}
      >

        <div>

          <div
            style={{
              fontSize: "48px",
              marginBottom: "16px",
            }}
          >
            🐍
          </div>

          <h2>
            Loading Tiny Titans...
          </h2>

          <p
            style={{
              color: "#C8B8D8",
            }}
          >
            Checking your account.
          </p>

        </div>

      </div>

    );

  }


  if (!user) {

    return (

      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />

    );

  }


  if (
    !profile ||
    !profile.setupComplete
  ) {

    return (

      <Navigate
        to="/account-setup"
        replace
      />

    );

  }


  return (
    <>{children}</>
  );

}


export default ProtectedRoute;