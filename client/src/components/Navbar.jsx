import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { userAuthStore } from "../store/userStore.js";
import { useMandalStore } from "../store/useMandalStore.js";
import { userApi } from "../api/user.api.js";
import { Menu, LogOut, CalendarRange, User } from "lucide-react";
import toast from "react-hot-toast";

const Navbar = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    const { user, logout } = userAuthStore();
    const { years, selectedYear, setSelectedYear, fetchYears } = useMandalStore();

    useEffect(() => {
        fetchYears();
    }, [fetchYears]);

    const handleLogout = async () => {
        const response = await userApi.logout();
        if (response.success) {
            logout();
            toast.success("Logged out successfully");
            navigate("/login");
        } else {
            toast.error(response.message || "Failed to log out");
        }
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
            {/* Left side: Hamburger (mobile only) & Breadcrumb */}
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div className="hidden items-center gap-1.5 text-sm font-medium text-gray-400 lg:flex dark:text-gray-500">
                    <span>Mandal Management</span>
                    <span>/</span>
                    <span className="text-gray-800 dark:text-gray-200">Dashboard</span>
                </div>
            </div>

            {/* Right side: Active Year Selector, User Info & Logout */}
            <div className="flex items-center gap-4">
                {/* Year Dropdown Selector */}
                {years.length > 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <CalendarRange className="h-4 w-4 text-indigo-500" />
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-gray-700 outline-none dark:text-gray-300"
                        >
                            {years.map((y) => (
                                <option key={y._id} value={y.year}>
                                    Year: {y.year} {y.isActive ? "(Active)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Profile Widget */}
                {user && (
                    <div className="flex items-center gap-3 border-l border-gray-200 pl-4 dark:border-gray-800">
                        <div className="hidden flex-col items-end lg:flex">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {user.name}
                            </span>
                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                @{user.username}
                            </span>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-md shadow-indigo-500/10">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                )}

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    title="Log Out"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-colors duration-200 dark:border-gray-800 dark:hover:border-red-900/50 dark:hover:bg-red-950/20"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
};

export default Navbar;
