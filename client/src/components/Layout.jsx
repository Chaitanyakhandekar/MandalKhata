import React, { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import Navbar from "./Navbar.jsx";

const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-800 dark:bg-gray-950 dark:text-gray-100">
            {/* Sidebar Navigation */}
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden lg:pl-64">
                {/* Header Navbar */}
                <Navbar toggleSidebar={toggleSidebar} />

                {/* Sub-page Views Container */}
                <main className="flex-1 overflow-y-auto px-6 py-8">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
