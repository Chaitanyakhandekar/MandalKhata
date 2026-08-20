import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Coins,
    Receipt,
    BookOpen,
    MoreHorizontal
} from "lucide-react";

const MobileBottomNav = ({ toggleSidebar, sidebarOpen }) => {
    const location = useLocation();

    const isPathActive = (path) => {
        if (path === "/") {
            return location.pathname === "/";
        }
        return location.pathname.startsWith(path);
    };

    const isOtherActive = () => {
        const mainPaths = ["/", "/donations", "/expenses", "/ledger"];
        return !mainPaths.some((p) => (p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)));
    };

    const navItems = [
        {
            name: "Dashboard",
            path: "/",
            icon: LayoutDashboard,
            active: isPathActive("/")
        },
        {
            name: "Donations",
            path: "/donations",
            icon: Coins,
            active: isPathActive("/donations")
        },
        {
            name: "Expenses",
            path: "/expenses",
            icon: Receipt,
            active: isPathActive("/expenses")
        },
        {
            name: "Ledger",
            path: "/ledger",
            icon: BookOpen,
            active: isPathActive("/ledger")
        }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 block border-t border-gray-200/80 bg-white/95 px-2 pt-2 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] backdrop-blur-lg lg:hidden dark:border-gray-800/80 dark:bg-gray-900/95 dark:shadow-[0_-4px_16px_rgba(0,0,0,0.4)]"
             style={{ paddingBottom: "max(0.6rem, env(safe-area-inset-bottom))" }}>
            <div className="grid grid-cols-5 items-center">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = item.active;

                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex flex-col items-center justify-center gap-1 py-1 text-center transition-colors ${
                                active
                                    ? "text-indigo-600 dark:text-indigo-400"
                                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                            }`}
                        >
                            <div
                                className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${
                                    active
                                        ? "bg-indigo-50 dark:bg-indigo-950/50 scale-105"
                                        : "bg-transparent"
                                }`}
                            >
                                <Icon className={`h-5 w-5 ${active ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
                            </div>
                            <span className={`text-[10.5px] tracking-tight ${active ? "font-bold" : "font-medium"}`}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}

                {/* More / Full Menu Trigger */}
                <button
                    onClick={toggleSidebar}
                    type="button"
                    className={`flex flex-col items-center justify-center gap-1 py-1 text-center transition-colors ${
                        sidebarOpen || isOtherActive()
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    }`}
                >
                    <div
                        className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${
                            sidebarOpen || isOtherActive()
                                ? "bg-indigo-50 dark:bg-indigo-950/50 scale-105"
                                : "bg-transparent"
                        }`}
                    >
                        <MoreHorizontal className={`h-5 w-5 ${sidebarOpen || isOtherActive() ? "stroke-[2.5]" : "stroke-[2]"}`} />
                    </div>
                    <span className={`text-[10.5px] tracking-tight ${sidebarOpen || isOtherActive() ? "font-bold" : "font-medium"}`}>
                        More
                    </span>
                </button>
            </div>
        </div>
    );
};

export default MobileBottomNav;
