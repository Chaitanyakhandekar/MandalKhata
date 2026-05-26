import React from "react";
import { Navigate } from "react-router-dom";
import { userAuthStore } from "../../store/userStore.js";

const ProtectedRouteAuth = ({ children }) => {
    const { user } = userAuthStore();

    if (user) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRouteAuth;
