import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { donationApi } from "../api/donation.api.js";
import { useMandalStore } from "../store/useMandalStore.js";
import {
    Plus,
    Search,
    Filter,
    Calendar,
    Edit2,
    Trash2,
    X,
    Coins,
    ChevronLeft,
    ChevronRight,
    Download
} from "lucide-react";
import toast from "react-hot-toast";

const Donations = () => {
    const { selectedYear } = useMandalStore();

    // List State
    const [donations, setDonations] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(false);

    // Filter States
    const [search, setSearch] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Modal Form States
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        donorName: "",
        amount: "",
        paymentMethod: "cash",
        phone: "",
        note: "",
        date: new Date().toISOString().split("T")[0]
    });
    const [formLoading, setFormLoading] = useState(false);

    const fetchDonations = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        try {
            const response = await donationApi.getDonations({
                festivalYear: selectedYear,
                search,
                paymentMethod,
                startDate,
                endDate,
                page,
                limit: 15
            });
            if (response.success) {
                setDonations(response.data.donations);
                setTotal(response.data.total);
                setPages(response.data.pages);
            } else {
                toast.error(response.message || "Failed to load donations");
            }
        } catch (err) {
            toast.error("An error occurred while loading donations");
        } finally {
            setLoading(false);
        }
    }, [selectedYear, search, paymentMethod, startDate, endDate, page]);

    useEffect(() => {
        fetchDonations();
    }, [fetchDonations]);

    // Handle filter reset
    const handleResetFilters = () => {
        setSearch("");
        setPaymentMethod("");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    // Open Modal for Add
    const openAddModal = () => {
        setEditingId(null);
        setFormData({
            donorName: "",
            amount: "",
            paymentMethod: "cash",
            phone: "",
            note: "",
            date: new Date().toISOString().split("T")[0]
        });
        setIsOpen(true);
    };

    // Open Modal for Edit
    const openEditModal = (donation) => {
        setEditingId(donation._id);
        setFormData({
            donorName: donation.donorName,
            amount: donation.amount,
            paymentMethod: donation.paymentMethod,
            phone: donation.phone || "",
            note: donation.note || "",
            date: new Date(donation.date).toISOString().split("T")[0]
        });
        setIsOpen(true);
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Handle Submit Add/Edit
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (!formData.donorName.trim()) {
            toast.error("Donor name is required");
            return;
        }

        if (!formData.amount || Number(formData.amount) <= 0) {
            toast.error("Valid amount is required");
            return;
        }

        setFormLoading(true);
        try {
            let response;
            if (editingId) {
                // Update
                response = await donationApi.updateDonation(editingId, {
                    ...formData,
                    amount: Number(formData.amount)
                });
            } else {
                // Create
                response = await donationApi.createDonation({
                    ...formData,
                    amount: Number(formData.amount),
                    festivalYear: selectedYear
                });
            }

            if (response.success) {
                toast.success(editingId ? "Donation updated successfully" : "Donation recorded successfully");
                setIsOpen(false);
                fetchDonations();
            } else {
                toast.error(response.message || "Failed to save donation");
            }
        } catch (err) {
            toast.error("An error occurred while saving the donation");
        } finally {
            setFormLoading(false);
        }
    };

    // Handle Delete Donation
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this donation record?")) return;

        try {
            const response = await donationApi.deleteDonation(id);
            if (response.success) {
                toast.success("Donation deleted successfully");
                fetchDonations();
            } else {
                toast.error(response.message || "Failed to delete donation");
            }
        } catch (err) {
            toast.error("An error occurred while deleting the donation");
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
            {/* Header Title with CTA */}
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                        Mandal Donations
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                        Record and manage all incoming contributions ({total} items found)
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/15 transition-all hover:bg-indigo-700"
                >
                    <Plus className="h-4.5 w-4.5" />
                    Record Donation
                </button>
            </div>

            {/* Advanced Filtering bar */}
            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                    {/* Search Field */}
                    <div className="relative">
                        <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name or receipt..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-9 pr-3 text-xs placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950"
                        />
                    </div>

                    {/* Payment Method Selector */}
                    <div className="relative">
                        <Filter className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                        <select
                            value={paymentMethod}
                            onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}
                            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-9 pr-3 text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
                        >
                            <option value="">All Methods</option>
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="bank">Bank Transfer</option>
                        </select>
                    </div>

                    {/* Start Date */}
                    <div className="relative">
                        <Calendar className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-9 pr-3 text-xs text-gray-500 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950"
                        />
                    </div>

                    {/* End Date */}
                    <div className="relative">
                        <Calendar className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-9 pr-3 text-xs text-gray-500 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950"
                        />
                    </div>

                    {/* Reset Button */}
                    <div>
                        <button
                            onClick={handleResetFilters}
                            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-850"
                        >
                            Reset Filters
                        </button>
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
                ) : donations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Coins className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No donations found</p>
                        <p className="text-xs text-gray-400 mt-1">Start by recording your first donation for {selectedYear}!</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                        <th className="px-6 py-4">Receipt No.</th>
                                        <th className="px-6 py-4">Donor Name</th>
                                        <th className="px-6 py-4">Method</th>
                                        <th className="px-6 py-4">Phone</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                    {donations.map((don) => (
                                        <tr key={don._id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                            <td className="px-6 py-4.5 font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                                {don.receiptNumber}
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <div className="font-semibold text-gray-700 dark:text-gray-300">
                                                    {don.donorName}
                                                </div>
                                                {don.note && (
                                                    <div className="text-[10px] text-gray-400 truncate max-w-xs mt-0.5">
                                                        {don.note}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <span
                                                    className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
                                                        don.paymentMethod === "cash"
                                                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                                            : don.paymentMethod === "upi"
                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                            : "bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400"
                                                    }`}
                                                >
                                                    {don.paymentMethod.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4.5 text-xs text-gray-500 font-medium">
                                                {don.phone || "—"}
                                            </td>
                                            <td className="px-6 py-4.5 text-xs text-gray-400">
                                                {new Date(don.date).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </td>
                                            <td className="px-6 py-4.5 text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(don.amount)}
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(don)}
                                                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(don._id)}
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

                        {/* Pagination Layout */}
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

            {/* Donation Form Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-gray-900 dark:border dark:border-gray-800">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                {editingId ? "Edit Donation Record" : "Record New Donation"}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleFormSubmit}>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Donor Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="donorName"
                                            required
                                            value={formData.donorName}
                                            onChange={handleInputChange}
                                            placeholder="Gopal Krishna"
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
                                            placeholder="5000"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Payment Method *
                                        </label>
                                        <select
                                            name="paymentMethod"
                                            value={formData.paymentMethod}
                                            onChange={handleInputChange}
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="upi">UPI</option>
                                            <option value="bank">Bank Transfer</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="9876543210"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Donation Date *
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

                                    <div className="col-span-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Note / Remark
                                        </label>
                                        <textarea
                                            name="note"
                                            value={formData.note}
                                            onChange={handleInputChange}
                                            rows="2"
                                            placeholder="Special decoration contribution or remarks..."
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer actions */}
                            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 rounded-b-3xl dark:border-gray-800 dark:bg-gray-950">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
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
        </Layout>
    );
};

export default Donations;
