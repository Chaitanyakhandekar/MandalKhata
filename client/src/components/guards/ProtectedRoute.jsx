import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { userAuthStore } from "../../store/userStore.js";
import { userApi } from "../../api/user.api.js";

const ProtectedRoute = ({ children }) => {
    const { user, setUser } = userAuthStore();
    const [loading, setLoading] = useState(!user);

    useEffect(() => {
        const verifyUser = async () => {
            if (!user) {
                try {
                    const response = await userApi.authMe();
                    if (response && response.success) {
                        setUser(response.data);
                    } else {
                        setUser(null);
                    }
                } catch (error) {
                    setUser(null);
                } finally {
                    setLoading(false);
                }
            }
        };

        verifyUser();
    }, [user, setUser]);

    if (loading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading MandalKhata...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
