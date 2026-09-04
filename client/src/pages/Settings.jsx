import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { festivalApi } from "../api/festival.api.js";
import { categoryApi } from "../api/category.api.js";
import { useMandalStore } from "../store/useMandalStore.js";
import {
    CalendarRange,
    Moon,
    Plus,
    Sun,
    ToggleLeft,
    ToggleRight,
    Trash2,
    ShieldAlert,
    Tags,
    Tag,
    Lock,
    Edit2,
    AlertCircle,
    X,
    CheckCircle2,
    XCircle,
    Archive
} from "lucide-react";
import { useThemeStore } from "../store/themeStore.js";
import toast from "react-hot-toast";

const Settings = () => {
    const { years, setYears, fetchYears } = useMandalStore();
    const { theme, setTheme } = useThemeStore();

    // Festival Year states
    const [newYear, setNewYear] = useState("");
    const [loading, setLoading] = useState(false);

    // Categories states
    const [categoriesData, setCategoriesData] = useState({
        systemCategories: [],
        customCategories: []
    });
    const [categoriesLoading, setCategoriesLoading] = useState(false);

    // Category Modals & Forms
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [categoryNameInput, setCategoryNameInput] = useState("");
    const [createLoading, setCreateLoading] = useState(false);

    const [editingCategory, setEditingCategory] = useState(null);
    const [editNameInput, setEditNameInput] = useState("");
    const [editLoading, setEditLoading] = useState(false);

    const [deleteModalData, setDeleteModalData] = useState(null); // { category, inUse, expenseCount }
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [toggleLoadingId, setToggleLoadingId] = useState(null);

    const fetchCategories = useCallback(async () => {
        setCategoriesLoading(true);
        try {
            const response = await categoryApi.getCategories();
            if (response && response.success) {
                setCategoriesData({
                    systemCategories: response.data.systemCategories || [],
                    customCategories: response.data.customCategories || []
                });
            } else {
                toast.error(response?.message || "Failed to load categories");
            }
        } catch {
            toast.error("Failed to load categories");
        } finally {
            setCategoriesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchYears();
        fetchCategories();
    }, [fetchYears, fetchCategories]);

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
        } catch {
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
                setYears(response.data);
                toast.success(`Festival year ${yearName} is now active!`);
            } else {
                toast.error(response.message || "Failed to activate year");
            }
        } catch {
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
        } catch {
            toast.error("An error occurred");
        }
    };

    // Handle Create Category
    const handleCreateCategory = async (e) => {
        e.preventDefault();
        const trimmed = categoryNameInput.trim();
        if (!trimmed) {
            toast.error("Please provide a category name");
            return;
        }
        if (trimmed.length < 2) {
            toast.error("Category name must be at least 2 characters");
            return;
        }
        if (trimmed.length > 50) {
            toast.error("Category name cannot exceed 50 characters");
            return;
        }

        setCreateLoading(true);
        try {
            const response = await categoryApi.createCategory({ name: trimmed });
            if (response && response.success) {
                toast.success(`Category '${trimmed}' created successfully`);
                setCategoryNameInput("");
                setIsCreateModalOpen(false);
                fetchCategories();
            } else {
                toast.error(response?.message || "Failed to create category");
            }
        } catch {
            toast.error("An error occurred while creating category");
        } finally {
            setCreateLoading(false);
        }
    };

    // Handle Edit Category
    const handleEditCategory = async (e) => {
        e.preventDefault();
        if (!editingCategory) return;

        const trimmed = editNameInput.trim();
        if (!trimmed) {
            toast.error("Please provide a category name");
            return;
        }
        if (trimmed.length < 2) {
            toast.error("Category name must be at least 2 characters");
            return;
        }
        if (trimmed.length > 50) {
            toast.error("Category name cannot exceed 50 characters");
            return;
        }
        if (trimmed === editingCategory.name) {
            setEditingCategory(null);
            return;
        }

        setEditLoading(true);
        try {
            const response = await categoryApi.updateCategory(editingCategory._id, { name: trimmed });
            if (response && response.success) {
                toast.success(`Category renamed to '${trimmed}'`);
                setEditingCategory(null);
                fetchCategories();
            } else {
                toast.error(response?.message || "Failed to update category");
            }
        } catch {
            toast.error("An error occurred while updating category");
        } finally {
            setEditLoading(false);
        }
    };

    // Handle Toggle Active/Inactive
    const handleToggleCategoryStatus = async (cat) => {
        setToggleLoadingId(cat._id);
        const nextStatus = !cat.isActive;
        try {
            const response = await categoryApi.updateCategory(cat._id, { isActive: nextStatus });
            if (response && response.success) {
                toast.success(`Category '${cat.name}' is now ${nextStatus ? "active" : "deactivated"}`);
                fetchCategories();
            } else {
                toast.error(response?.message || "Failed to change category status");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setToggleLoadingId(null);
        }
    };

    // Handle Delete or Deactivate Category
    const handleConfirmDelete = async () => {
        if (!deleteModalData?.category) return;
        setDeleteLoading(true);
        try {
            const response = await categoryApi.deleteCategory(deleteModalData.category._id);
            if (response && response.success) {
                toast.success(`Category '${deleteModalData.category.name}' deleted successfully`);
                setDeleteModalData(null);
                fetchCategories();
            } else {
                toast.error(response?.message || "Failed to delete category");
                if (response?.data?.expenseCount) {
                    setDeleteModalData((prev) => ({
                        ...prev,
                        inUse: true,
                        expenseCount: response.data.expenseCount
                    }));
                }
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleDeactivateInstead = async () => {
        if (!deleteModalData?.category) return;
        setDeleteLoading(true);
        try {
            const response = await categoryApi.updateCategory(deleteModalData.category._id, { isActive: false });
            if (response && response.success) {
                toast.success(`Category '${deleteModalData.category.name}' deactivated successfully`);
                setDeleteModalData(null);
                fetchCategories();
            } else {
                toast.error(response?.message || "Failed to deactivate category");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                    System Settings
                </h1>
                <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                    Configure active years, manage expense categories, and customize Mandal finance books
                </p>
            </div>

            {/* Festival Years & Appearance Grid */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left side: Add New Year + Appearance cards */}
                <div className="space-y-8">
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

                    {/* Appearance / Theme Card */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <h3 className="text-md font-bold text-gray-800 dark:text-white mb-1.5">
                            Appearance
                        </h3>
                        <p className="text-xs text-gray-400 mb-6">
                            Choose how MandalKhata looks on this device.
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setTheme("light")}
                                aria-pressed={theme === "light"}
                                className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-semibold transition ${
                                    theme === "light"
                                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                        : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-950"
                                }`}
                            >
                                <Sun className="h-4 w-4" />
                                Light
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                aria-pressed={theme === "dark"}
                                className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-semibold transition ${
                                    theme === "dark"
                                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                        : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-950"
                                }`}
                            >
                                <Moon className="h-4 w-4" />
                                Dark
                            </button>
                        </div>
                    </div>
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

            {/* EXPENSE CATEGORIES MANAGEMENT SECTION */}
            <div className="mt-10 border-t border-gray-200 pt-8 dark:border-gray-800">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <Tags className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                                Expense Categories
                            </h2>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 dark:text-gray-400">
                            Manage default system categories and configure custom expense categories for your Mandal
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            setCategoryNameInput("");
                            setIsCreateModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-indigo-600/15 transition hover:bg-indigo-700 active:scale-[0.98]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Custom Category
                    </button>
                </div>

                <div className="space-y-8">
                    {/* 1. System Default Categories */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-gray-400" />
                                <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-white">
                                    System Default Categories
                                </h3>
                            </div>
                            <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                7 Built-in
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-5">
                            Core festival categories that are permanent, immutable, and available across all festival books.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
                            {categoriesData.systemCategories.map((cat) => (
                                <div
                                    key={cat.name}
                                    className="flex flex-col justify-between rounded-xl border border-gray-150 bg-gray-50/60 p-3 transition-colors hover:border-gray-200 dark:border-gray-800/80 dark:bg-gray-850/50"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <Tag className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                                            System
                                        </span>
                                    </div>
                                    <span className="font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-200 truncate">
                                        {cat.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. Custom Categories Management */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Tags className="h-4 w-4 text-indigo-500" />
                                <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-white">
                                    Custom Categories
                                </h3>
                            </div>
                            <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">
                                {categoriesData.customCategories.length} Created
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-5">
                            Custom expense categories created for your Mandal. Inactive categories remain visible on past expenses but cannot be selected for new expenses.
                        </p>

                        {categoriesLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                            </div>
                        ) : categoriesData.customCategories.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-10 px-4 text-center dark:border-gray-800">
                                <Tag className="h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
                                <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                                    No custom categories yet
                                </p>
                                <p className="text-xs text-gray-400 max-w-sm mt-1 mb-4">
                                    Create custom categories like "Stage & Tent", "Puja Samagri", or "Transportation" to tailor your expenses.
                                </p>
                                <button
                                    onClick={() => {
                                        setCategoryNameInput("");
                                        setIsCreateModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 px-3.5 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-400"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Your First Category
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                                <th className="px-6 py-3">Category Name</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3">Usage</th>
                                                <th className="px-6 py-3 text-center">Toggle Status</th>
                                                <th className="px-6 py-3 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                            {categoriesData.customCategories.map((cat) => (
                                                <tr key={cat._id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                                    <td className="px-6 py-4 font-semibold text-sm text-gray-800 dark:text-gray-200">
                                                        {cat.name}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {cat.isActive ? (
                                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                                <XCircle className="h-3 w-3" />
                                                                Deactivated
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {cat.expenseCount > 0 ? (
                                                            <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                                                                {cat.expenseCount} {cat.expenseCount === 1 ? "expense" : "expenses"}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">
                                                                Unused
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center">
                                                            <button
                                                                onClick={() => handleToggleCategoryStatus(cat)}
                                                                disabled={toggleLoadingId === cat._id}
                                                                aria-label={`Toggle status for ${cat.name}`}
                                                                className={`transition-colors ${
                                                                    cat.isActive
                                                                        ? "text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                                                        : "text-gray-300 hover:text-gray-400 dark:text-gray-600"
                                                                }`}
                                                            >
                                                                {cat.isActive ? (
                                                                    <ToggleRight className="h-8 w-8" />
                                                                ) : (
                                                                    <ToggleLeft className="h-8 w-8" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingCategory(cat);
                                                                    setEditNameInput(cat.name);
                                                                }}
                                                                title="Rename category"
                                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-400 dark:hover:text-indigo-400"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setDeleteModalData({
                                                                        category: cat,
                                                                        inUse: (cat.expenseCount || 0) > 0,
                                                                        expenseCount: cat.expenseCount || 0
                                                                    });
                                                                }}
                                                                title={cat.expenseCount > 0 ? "Deactivate (in use by expenses)" : "Delete category"}
                                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-300 hover:text-red-600 dark:border-gray-800 dark:text-gray-500 dark:hover:text-red-400"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Category Cards */}
                                <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800/40">
                                    {categoriesData.customCategories.map((cat) => (
                                        <div key={cat._id} className="py-4 space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">
                                                        {cat.name}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        {cat.isActive ? (
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                                                                <CheckCircle2 className="h-2.5 w-2.5" />
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                                <XCircle className="h-2.5 w-2.5" />
                                                                Deactivated
                                                            </span>
                                                        )}
                                                        {cat.expenseCount > 0 ? (
                                                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                                                                {cat.expenseCount} {cat.expenseCount === 1 ? "expense" : "expenses"}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-400">
                                                                Unused
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleToggleCategoryStatus(cat)}
                                                    disabled={toggleLoadingId === cat._id}
                                                    aria-label={`Toggle status for ${cat.name}`}
                                                    className="shrink-0 text-indigo-600 dark:text-indigo-400"
                                                >
                                                    {cat.isActive ? (
                                                        <ToggleRight className="h-8 w-8" />
                                                    ) : (
                                                        <ToggleLeft className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                                                    )}
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2 pt-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingCategory(cat);
                                                        setEditNameInput(cat.name);
                                                    }}
                                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-850"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                    Rename
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setDeleteModalData({
                                                            category: cat,
                                                            inUse: (cat.expenseCount || 0) > 0,
                                                            expenseCount: cat.expenseCount || 0
                                                        });
                                                    }}
                                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    {cat.expenseCount > 0 ? "Deactivate" : "Delete"}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* CREATE CATEGORY MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                    <Tag className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                        Add Custom Category
                                    </h3>
                                    <p className="text-xs text-gray-400">
                                        Create a custom expense category
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCategory} className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                    Category Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    maxLength={50}
                                    placeholder="e.g. Stage & Tent, Puja Samagri"
                                    value={categoryNameInput}
                                    onChange={(e) => setCategoryNameInput(e.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                />
                                <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                                    <span>2 to 50 characters</span>
                                    <span>{categoryNameInput.trim().length}/50</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-850"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/15 hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {createLoading ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    ) : (
                                        <>
                                            <Plus className="h-3.5 w-3.5" />
                                            Create Category
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT CATEGORY MODAL */}
            {editingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                    <Edit2 className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                        Rename Category
                                    </h3>
                                    <p className="text-xs text-gray-400">
                                        Update category display name
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingCategory(null)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleEditCategory} className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                    Category Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    maxLength={50}
                                    value={editNameInput}
                                    onChange={(e) => setEditNameInput(e.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                />
                                <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                                    <span>Renaming will update existing expenses referencing this category</span>
                                    <span>{editNameInput.trim().length}/50</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingCategory(null)}
                                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-850"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/15 hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {editLoading ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE / DEACTIVATE CONFIRMATION MODAL */}
            {deleteModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                                    deleteModalData.inUse
                                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                                        : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                                }`}>
                                    <AlertCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                        {deleteModalData.inUse ? "Category Cannot Be Deleted" : "Delete Category"}
                                    </h3>
                                    <p className="text-xs text-gray-400">
                                        {deleteModalData.category.name}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDeleteModalData(null)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {deleteModalData.inUse ? (
                            <div className="space-y-4">
                                <div className="rounded-xl bg-amber-50/80 p-4 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
                                    <p className="font-semibold mb-1">
                                        Category is referenced by {deleteModalData.expenseCount} existing expense(s).
                                    </p>
                                    <p className="text-[11px] leading-relaxed">
                                        Deleting this category would compromise historical accounting audits and records.
                                        You can safely <strong>deactivate</strong> it so it will no longer be available for new expenses while preserving historical integrity.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setDeleteModalData(null)}
                                        className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-850"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        disabled={deleteLoading}
                                        onClick={handleDeactivateInstead}
                                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-amber-600/15 hover:bg-amber-700 disabled:opacity-50"
                                    >
                                        {deleteLoading ? (
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                        ) : (
                                            <>
                                                <Archive className="h-3.5 w-3.5" />
                                                Deactivate Category
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    Are you sure you want to delete category <strong>"{deleteModalData.category.name}"</strong>?
                                    This category is not used by any expenses and will be permanently removed.
                                </p>

                                <div className="flex items-center gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setDeleteModalData(null)}
                                        className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-850"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={deleteLoading}
                                        onClick={handleConfirmDelete}
                                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-red-600/15 hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {deleteLoading ? (
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                        ) : (
                                            <>
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Delete Category
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Settings;
