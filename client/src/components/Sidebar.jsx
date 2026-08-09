import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Coins,
    Receipt,
    BookOpen,
    BarChart3,
    Settings,
    X,
    FolderKanban,
    Home as HomeIcon,
    Building2,
    UtensilsCrossed,
    FileSpreadsheet
} from "lucide-react";

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const location = useLocation();

    const menuItems = [
        { name: "Dashboard", path: "/", icon: LayoutDashboard },
        { name: "Households", path: "/households", icon: HomeIcon },
        { name: "External Donors", path: "/external-donors", icon: Building2 },
        { name: "Donations", path: "/donations", icon: Coins },
        { name: "Expenses", path: "/expenses", icon: Receipt },
        { name: "Ledger", path: "/ledger", icon: BookOpen },
        { name: "Mahaprasad", path: "/mahaprasad", icon: UtensilsCrossed },
        { name: "Reports", path: "/reports", icon: BarChart3 },
        { name: "Bulk Import", path: "/bulk-import", icon: FileSpreadsheet },
        { name: "Settings", path: "/settings", icon: Settings }
    ];

    const isActive = (path) => {
        if (path === "/") {
            return location.pathname === "/";
        }
        return location.pathname.startsWith(path);
    };

    return (
        <>
            {/* Mobile Sidebar Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed bottom-0 top-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-100 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                {/* Brand / Logo Section */}
                <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <FolderKanban className="h-6 w-6 text-indigo-400" />
                        <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            MandalKhata
                        </span>
                    </div>
                    {/* Mobile Close Button */}
                    <button
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 lg:hidden"
                        onClick={toggleSidebar}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                onClick={() => isOpen && toggleSidebar()}
                                className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group ${
                                    active
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                                }`}
                            >
                                <Icon
                                    className={`h-5 w-5 transition-transform duration-200 group-hover:scale-105 ${
                                        active ? "text-white" : "text-slate-400 group-hover:text-indigo-400"
                                    }`}
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer Credits */}
                <div
                    className="border-t border-slate-800 p-4 text-center"
                    style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
                >
                    <p className="text-xs text-slate-500">MandalKhata v1.0.0</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">Finance Management</p>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
