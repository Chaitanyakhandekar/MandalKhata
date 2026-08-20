import React, { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import Navbar from "./Navbar.jsx";
import MobileBottomNav from "./MobileBottomNav.jsx";

const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="flex h-dvh w-full overflow-hidden bg-gray-50 text-gray-800 dark:bg-gray-950 dark:text-gray-100">
            {/* Sidebar Navigation */}
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden lg:pl-64">
                {/* Header Navbar */}
                <Navbar toggleSidebar={toggleSidebar} />

                {/* Sub-page Views Container */}
                <main
                    className="flex-1 overflow-y-auto px-3.5 py-5 sm:px-6 sm:py-8 pb-24 lg:pb-8"
                    style={{ paddingBottom: "max(5.5rem, calc(4.5rem + env(safe-area-inset-bottom)))" }}
                >
                    <div className="mx-auto w-full max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Fixed Bottom Navigation Bar */}
            <MobileBottomNav toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        </div>
    );
};

export default Layout;
