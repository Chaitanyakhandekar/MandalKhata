import React, { useEffect, useState, useCallback, useMemo } from "react";
import Layout from "../components/Layout.jsx";
import { expenseApi } from "../api/expense.api.js";
import { categoryApi } from "../api/category.api.js";
import { useMandalStore } from "../store/useMandalStore.js";
import {
    Plus,
    Search,
    Filter,
    Calendar,
    Edit2,
    Trash2,
    X,
    Receipt,
    ChevronLeft,
    ChevronRight,
    Eye,
    Upload,
    ImageIcon
} from "lucide-react";
import toast from "react-hot-toast";

const DEFAULT_EXPENSE_CATEGORIES = [
    "Decoration",
    "Sound",
    "Lighting",
    "Food",
    "Security",
    "Visarjan",
    "Miscellaneous"
];

const Expenses = () => {
    const { selectedYear } = useMandalStore();

    // List State
    const [expenses, setExpenses] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(false);

    // Filter States
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Modal Form States
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: "",
        amount: "",
        category: "Decoration",
        vendorName: "",
        paymentStatus: "paid",
        note: "",
        date: new Date().toISOString().split("T")[0]
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    // Bill Image Overlay Modal State
    const [previewImageUrl, setPreviewImageUrl] = useState("");

    // Dynamic Categories State
    const [allCategories, setAllCategories] = useState(DEFAULT_EXPENSE_CATEGORIES);
    const [activeCategories, setActiveCategories] = useState(DEFAULT_EXPENSE_CATEGORIES);

    const fetchCategories = useCallback(async () => {
        try {
            const response = await categoryApi.getCategories();
            if (response && response.success && response.data) {
                if (Array.isArray(response.data.allCategories) && response.data.allCategories.length > 0) {
                    setAllCategories(response.data.allCategories);
                }
                if (Array.isArray(response.data.allActiveCategories) && response.data.allActiveCategories.length > 0) {
                    setActiveCategories(response.data.allActiveCategories);
                }
            }
        } catch {
            // Keep default fallback
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // Ensure form select includes current category even if deactivated
    const formCategories = useMemo(() => {
        if (formData.category && !activeCategories.includes(formData.category)) {
            return [...activeCategories, formData.category];
        }
        return activeCategories;
    }, [activeCategories, formData.category]);

    const fetchExpenses = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        try {
            const response = await expenseApi.getExpenses({
                festivalYear: selectedYear,
                search,
                category,
                paymentStatus,
                startDate,
                endDate,
                page,
                limit: 15
            });
            if (response.success) {
                setExpenses(response.data.expenses);
                setTotal(response.data.total);
                setPages(response.data.pages);
            } else {
                toast.error(response.message || "Failed to load expenses");
            }
        } catch (err) {
            toast.error("An error occurred while loading expenses");
        } finally {
            setLoading(false);
        }
    }, [selectedYear, search, category, paymentStatus, startDate, endDate, page]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    // Handle Reset Filter
    const handleResetFilters = () => {
        setSearch("");
        setCategory("");
        setPaymentStatus("");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    // Open Modal for Add
    const openAddModal = () => {
        setEditingId(null);
        setFormData({
            title: "",
            amount: "",
            category: "Decoration",
            vendorName: "",
            paymentStatus: "paid",
            note: "",
            date: new Date().toISOString().split("T")[0]
        });
        setSelectedFile(null);
        setFilePreview("");
        setIsOpen(true);
    };

    // Open Modal for Edit
    const openEditModal = (expense) => {
        setEditingId(expense._id);
        setFormData({
            title: expense.title,
            amount: expense.amount,
            category: expense.category,
            vendorName: expense.vendorName || "",
            paymentStatus: expense.paymentStatus,
            note: expense.note || "",
            date: new Date(expense.date).toISOString().split("T")[0]
        });
        setSelectedFile(null);
        setFilePreview(expense.billImage || "");
        setIsOpen(true);
    };

    // Handle form inputs
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Handle file selection
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size cannot exceed 5MB");
                return;
            }
            setSelectedFile(file);
            setFilePreview(URL.createObjectURL(file));
        }
    };

    // Submit Add/Edit Form
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            toast.error("Expense title is required");
            return;
        }

        if (!formData.amount || Number(formData.amount) <= 0) {
            toast.error("Valid expense amount is required");
            return;
        }

        setFormLoading(true);
        const data = new FormData();
        data.append("title", formData.title);
        data.append("amount", Number(formData.amount));
        data.append("category", formData.category);
        data.append("vendorName", formData.vendorName);
        data.append("paymentStatus", formData.paymentStatus);
        data.append("note", formData.note);
        data.append("date", formData.date);

        if (selectedFile) {
            data.append("billImage", selectedFile);
        }

        try {
            let response;
            if (editingId) {
                // Update
                response = await expenseApi.updateExpense(editingId, data);
            } else {
                // Create
                data.append("festivalYear", selectedYear);
                response = await expenseApi.createExpense(data);
            }

            if (response.success) {
                toast.success(editingId ? "Expense updated successfully" : "Expense recorded successfully");
                setIsOpen(false);
                fetchExpenses();
            } else {
                toast.error(response.message || "Failed to save expense");
            }
        } catch (err) {
            toast.error("An error occurred while saving the expense");
        } finally {
            setFormLoading(false);
        }
    };

    // Handle Delete Expense
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this expense record? This will also remove the uploaded bill.")) return;

        try {
            const response = await expenseApi.deleteExpense(id);
            if (response.success) {
                toast.success("Expense deleted successfully");
                fetchExpenses();
            } else {
                toast.error(response.message || "Failed to delete expense");
            }
        } catch (err) {
            toast.error("An error occurred while deleting the expense");
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(val);
    };

    return (
        <Layout>
            {/* Header section with CTA */}
            <div className="mb-4 sm:mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                        Mandal Expenses
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 dark:text-gray-400">
                        Track and audit outgoing expenses and uploaded bills ({total} items found)
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-semibold text-white shadow-md shadow-rose-600/15 transition-all hover:bg-rose-700"
                >
                    <Plus className="h-4 w-4" />
                    Record Expense
                </button>
            </div>

            {/* Filtering Bar (Compact & Mobile-Optimized) */}
            <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-2 sm:p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="grid grid-cols-2 gap-1.5 sm:gap-3 lg:grid-cols-5">
                    {/* Search Field */}
                    <div className="relative col-span-2 lg:col-span-2">
                        <Search className="absolute top-2 left-2 h-3 w-3 text-gray-400 sm:top-2.5 sm:left-2.5 sm:h-3.5 sm:w-3.5" />
                        <input
                            type="text"
                            placeholder="Search title, vendor..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50/50 py-1 sm:py-2 pl-6 sm:pl-8 pr-6 sm:pr-7 text-[10px] sm:text-xs placeholder:text-[10px] sm:placeholder:text-xs placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                        />
                        {search && (
                            <button
                                onClick={() => { setSearch(""); setPage(1); }}
                                className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Category Selector */}
                    <div className="relative col-span-1">
                        <Filter className="absolute top-2 left-2 h-3 w-3 text-gray-400 sm:top-2.5 sm:left-2.5 sm:h-3.5 sm:w-3.5" />
                        <select
                            value={category}
                            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                            className="w-full appearance-none rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50/50 py-1 sm:py-2 pl-6 sm:pl-8 pr-2.5 text-[10px] sm:text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                        >
                            <option value="">All Categories</option>
                            {allCategories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Payment Status Selector */}
                    <div className="relative col-span-1">
                        <Filter className="absolute top-2 left-2 h-3 w-3 text-gray-400 sm:top-2.5 sm:left-2.5 sm:h-3.5 sm:w-3.5" />
                        <select
                            value={paymentStatus}
                            onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
                            className="w-full appearance-none rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50/50 py-1 sm:py-2 pl-6 sm:pl-8 pr-2.5 text-[10px] sm:text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                        >
                            <option value="">All Statuses</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>

                    {/* Start Date + Reset */}
                    <div className="flex gap-1.5 col-span-2 sm:col-span-1">
                        <div className="flex-1">
                            <input
                                type="date"
                                value={startDate}
                                title="Filter Date"
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                className="w-full rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50/50 py-1 sm:py-2 px-1.5 sm:px-2 text-[10px] sm:text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                            />
                        </div>
                        {(search || category || paymentStatus || startDate) && (
                            <button
                                onClick={handleResetFilters}
                                title="Reset Filters"
                                className="shrink-0 rounded-lg sm:rounded-xl border border-gray-200 bg-white px-2 sm:px-2.5 py-1 sm:py-2 text-[10px] sm:text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* List Table Container */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                            <p className="text-xs font-medium text-gray-400">Loading records...</p>
                        </div>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Receipt className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No expenses logged</p>
                        <p className="text-xs text-gray-400 mt-1">Start by recording your first expense for {selectedYear}!</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                        <th className="px-6 py-4">Bill Image</th>
                                        <th className="px-6 py-4">Title / Item</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Vendor</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                    {expenses.map((exp) => (
                                        <tr key={exp._id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                            <td className="px-6 py-4.5">
                                                {exp.billImage ? (
                                                    <div
                                                        onClick={() => setPreviewImageUrl(exp.billImage)}
                                                        className="group relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-gray-100 shadow-sm"
                                                    >
                                                        <img
                                                            src={exp.billImage}
                                                            alt="Bill attachment"
                                                            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30 opacity-0 transition-opacity group-hover:opacity-100">
                                                            <Eye className="h-4 w-4 text-white" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 border border-dashed border-gray-200 text-gray-300 dark:bg-gray-950 dark:border-gray-800">
                                                        <ImageIcon className="h-5 w-5" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <div className="font-semibold text-gray-700 dark:text-gray-300">
                                                    {exp.title}
                                                </div>
                                                {exp.note && (
                                                    <div className="text-[10px] text-gray-400 truncate max-w-xs mt-0.5">
                                                        {exp.note}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5 dark:bg-gray-950 dark:border-gray-850">
                                                    {exp.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4.5 text-xs text-gray-500 font-medium">
                                                {exp.vendorName || "—"}
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <span
                                                    className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
                                                        exp.paymentStatus === "paid"
                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                                    }`}
                                                >
                                                    {exp.paymentStatus.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4.5 text-xs text-gray-400">
                                                {new Date(exp.date).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </td>
                                            <td className="px-6 py-4.5 text-right font-bold text-sm text-rose-600 dark:text-rose-400">
                                                {formatCurrency(exp.amount)}
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(exp)}
                                                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(exp._id)}
                                                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile expense cards */}
                        <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800/40">
                            {expenses.map((exp) => (
                                <div key={exp._id} className="px-5 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                                                {exp.title}
                                            </div>
                                            {exp.note && (
                                                <div className="mt-0.5 truncate text-[11px] text-gray-400">
                                                    {exp.note}
                                                </div>
                                            )}
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5 dark:bg-gray-950 dark:border-gray-850">
                                                    {exp.category}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                                                        exp.paymentStatus === "paid"
                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                                    }`}
                                                >
                                                    {exp.paymentStatus.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-gray-400">
                                                {exp.vendorName || "—"}
                                                {" · "}
                                                {new Date(exp.date).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </div>
                                        </div>
                                        <div className="shrink-0">
                                            {exp.billImage ? (
                                                <button
                                                    onClick={() => setPreviewImageUrl(exp.billImage)}
                                                    title="View bill"
                                                    aria-label="View bill image"
                                                    className="group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-gray-100 shadow-sm"
                                                >
                                                    <img
                                                        src={exp.billImage}
                                                        alt="Bill attachment"
                                                        className="h-full w-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30">
                                                        <Eye className="h-4 w-4 text-white" />
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 border border-dashed border-gray-200 text-gray-300 dark:bg-gray-950 dark:border-gray-800">
                                                    <ImageIcon className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-2">
                                        <div className="text-base font-bold text-rose-600 dark:text-rose-400">
                                            {formatCurrency(exp.amount)}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => openEditModal(exp)}
                                                title="Edit expense"
                                                aria-label="Edit expense"
                                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors dark:border-gray-800 dark:hover:bg-gray-800"
                                            >
                                                <Edit2 className="h-4.5 w-4.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(exp._id)}
                                                title="Delete expense"
                                                aria-label="Delete expense"
                                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors dark:border-gray-800 dark:hover:bg-red-950/20"
                                            >
                                                <Trash2 className="h-4.5 w-4.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination component */}
                        {pages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-gray-800">
                                <span className="text-xs text-gray-500">
                                    Page {page} of {pages}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(page - 1)}
                                        className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:hover:bg-gray-950"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        disabled={page === pages}
                                        onClick={() => setPage(page + 1)}
                                        className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:hover:bg-gray-950"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Record/Edit Expense Modal Form */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-gray-900 dark:border dark:border-gray-800">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                {editingId ? "Edit Expense Record" : "Record New Expense"}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleFormSubmit}>
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Expense Title *
                                        </label>
                                        <input
                                            type="text"
                                            name="title"
                                            required
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            placeholder="Ganesh Idol Deposit"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Amount (₹) *
                                        </label>
                                        <input
                                            type="number"
                                            name="amount"
                                            required
                                            min="0"
                                            value={formData.amount}
                                            onChange={handleInputChange}
                                            placeholder="12000"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Category *
                                        </label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        >
                                            {formCategories.map((cat) => (
                                                <option key={cat} value={cat}>
                                                    {cat}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Vendor / Shop Name
                                        </label>
                                        <input
                                            type="text"
                                            name="vendorName"
                                            value={formData.vendorName}
                                            onChange={handleInputChange}
                                            placeholder="Shree Arts Idol Workshop"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Payment Status *
                                        </label>
                                        <select
                                            name="paymentStatus"
                                            value={formData.paymentStatus}
                                            onChange={handleInputChange}
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        >
                                            <option value="paid">Paid</option>
                                            <option value="pending">Pending</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Expense Date *
                                        </label>
                                        <input
                                            type="date"
                                            name="date"
                                            required
                                            value={formData.date}
                                            onChange={handleInputChange}
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>

                                    {/* Upload System */}
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Bill Image Attachment
                                        </label>
                                        <div className="mt-2 flex flex-wrap items-center gap-3">
                                            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-950">
                                                <Upload className="h-4 w-4" />
                                                Choose File
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                            </label>
                                            <span className="min-w-0 max-w-full truncate text-xs text-gray-400">
                                                {selectedFile ? selectedFile.name : "No file attached"}
                                            </span>
                                        </div>

                                        {filePreview && (
                                            <div className="relative mt-4 h-32 w-32 overflow-hidden rounded-xl border border-gray-250">
                                                <img
                                                    src={filePreview}
                                                    alt="Preview bill"
                                                    className="h-full w-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedFile(null);
                                                        setFilePreview("");
                                                    }}
                                                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900/65 text-white hover:bg-gray-900"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Note / Description
                                        </label>
                                        <textarea
                                            name="note"
                                            value={formData.note}
                                            onChange={handleInputChange}
                                            rows="2"
                                            placeholder="Detailed description..."
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 rounded-b-3xl sm:flex-row sm:items-center sm:justify-end sm:gap-3 dark:border-gray-800 dark:bg-gray-950">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-xs font-semibold text-gray-500 hover:bg-gray-50 sm:w-auto dark:border-gray-800 dark:bg-gray-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
                                >
                                    {formLoading ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    ) : (
                                        editingId ? "Update Record" : "Create Record"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bill Image View Overlay */}
            {previewImageUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
                    onClick={() => setPreviewImageUrl("")}
                >
                    <div
                        className="relative max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-gray-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setPreviewImageUrl("")}
                            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-900/50 text-white transition hover:bg-gray-950"
                        >
                            <X className="h-4.5 w-4.5" />
                        </button>
                        <img
                            src={previewImageUrl}
                            alt="Full bill view"
                            className="max-h-[85vh] max-w-full object-contain"
                        />
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Expenses;
