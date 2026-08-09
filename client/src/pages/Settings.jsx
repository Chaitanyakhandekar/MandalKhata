import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import { festivalApi } from "../api/festival.api.js";
import { useMandalStore } from "../store/useMandalStore.js";
import { CalendarRange, Plus, ToggleLeft, ToggleRight, Trash2, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

const Settings = () => {
    const { years, setYears, fetchYears } = useMandalStore();

    const [newYear, setNewYear] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchYears();
    }, [fetchYears]);

    // Handle Create Festival Year
    const handleCreateYear = async (e) => {
        e.preventDefault();

        if (!newYear.trim()) {
            toast.error("Please provide a valid year");
            return;
        }

        const isNum = /^\d{4}$/.test(newYear.trim());
        if (!isNum) {
            toast.error("Year must be a 4-digit number (e.g. 2025)");
            return;
        }

        setLoading(true);
        try {
            const response = await festivalApi.createYear({ year: newYear.trim() });
            if (response.success) {
                toast.success(`Festival year ${newYear} created successfully`);
                setNewYear("");
                fetchYears();
            } else {
                toast.error(response.message || "Failed to create year");
            }
        } catch (err) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    // Handle Activate Year
    const handleActivateYear = async (id, yearName) => {
        try {
            const response = await festivalApi.setActiveYear(id);
            if (response.success) {
                setYears(response.data); // Update store
                toast.success(`Festival year ${yearName} is now active!`);
            } else {
                toast.error(response.message || "Failed to activate year");
            }
        } catch (err) {
            toast.error("An error occurred");
        }
    };

    // Handle Delete Year
    const handleDeleteYear = async (id, yearName) => {
        if (!window.confirm(`Are you sure you want to delete festival year ${yearName}? This cannot be undone.`)) return;

        try {
            const response = await festivalApi.deleteYear(id);
            if (response.success) {
                toast.success(`Festival year ${yearName} deleted successfully`);
                fetchYears();
            } else {
                toast.error(response.message || "Failed to delete year");
            }
        } catch (err) {
            toast.error("An error occurred");
        }
    };

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                    System Settings
                </h1>
                <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                    Configure active years and manage Mandal festival records
                </p>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left side: Add New Year Card */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <h3 className="text-md font-bold text-gray-800 dark:text-white mb-1.5">
                        Add Festival Year
                    </h3>
                    <p className="text-xs text-gray-400 mb-6">
                        Create a new finance book for a yearly festival (e.g. 2025, 2026).
                    </p>

                    <form onSubmit={handleCreateYear} className="space-y-4">
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Festival Year
                            </label>
                            <input
                                type="text"
                                required
                                value={newYear}
                                onChange={(e) => setNewYear(e.target.value)}
                                placeholder="2025"
                                maxLength={4}
                                className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/15 transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    Add Year
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Right side: Festival Years Table */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
                    <h3 className="text-md font-bold text-gray-800 dark:text-white mb-6">
                        Yearly Finance Books
                    </h3>

                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                    <th className="px-6 py-3">Festival Year</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-center">Toggle Active</th>
                                    <th className="px-6 py-3 text-center">Delete</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                {years.map((y) => (
                                    <tr key={y._id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                        <td className="px-6 py-4 font-bold text-sm text-gray-700 dark:text-gray-300">
                                            Year: {y.year}
                                        </td>
                                        <td className="px-6 py-4">
                                            {y.isActive ? (
                                                <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-lg bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-950/30 dark:text-gray-500">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center">
                                                {y.isActive ? (
                                                    <button
                                                        disabled
                                                        className="text-indigo-600 opacity-55 cursor-not-allowed"
                                                    >
                                                        <ToggleRight className="h-8 w-8" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleActivateYear(y._id, y.year)}
                                                        className="text-gray-300 hover:text-indigo-500 transition-colors"
                                                    >
                                                        <ToggleLeft className="h-8 w-8" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center">
                                                {y.isActive ? (
                                                    <span
                                                        title="Active year cannot be deleted"
                                                        className="text-gray-250 dark:text-gray-750"
                                                    >
                                                        <Trash2 className="h-4 w-4 opacity-30 cursor-not-allowed" />
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDeleteYear(y._id, y.year)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile festival year cards */}
                    <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800/40">
                        {years.map((y) => (
                            <div key={y._id} className="flex items-center justify-between gap-3 py-4">
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-sm text-gray-700 dark:text-gray-300">
                                        Year: {y.year}
                                    </div>
                                    <div className="mt-1">
                                        {y.isActive ? (
                                            <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-lg bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-950/30 dark:text-gray-500">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {y.isActive ? (
                                        <button
                                            disabled
                                            aria-label="Active year"
                                            className="text-indigo-600 opacity-55 cursor-not-allowed"
                                        >
                                            <ToggleRight className="h-8 w-8" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleActivateYear(y._id, y.year)}
                                            aria-label={`Activate year ${y.year}`}
                                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors dark:border-gray-800"
                                        >
                                            <ToggleLeft className="h-6 w-6" />
                                        </button>
                                    )}
                                    {y.isActive ? (
                                        <span
                                            title="Active year cannot be deleted"
                                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 text-gray-300 dark:border-gray-800 dark:text-gray-600"
                                        >
                                            <Trash2 className="h-4 w-4 opacity-30 cursor-not-allowed" />
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleDeleteYear(y._id, y.year)}
                                            aria-label={`Delete year ${y.year}`}
                                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors dark:border-gray-800"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex items-center gap-2 rounded-xl bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/20 dark:text-amber-500">
                        <ShieldAlert className="h-5 w-5 shrink-0" />
                        <p className="text-xs font-medium">
                            Setting a year as active dynamically pivots the entire app ledger and stats. Only one year can be active at any given moment.
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Settings;
