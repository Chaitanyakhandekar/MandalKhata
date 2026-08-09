import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { externalDonorApi } from "../api/externalDonor.api.js";
import { useMandalStore } from "../store/useMandalStore.js";
import {
    Plus,
    Search,
    Filter,
    X,
    Edit2,
    Trash2,
    Eye,
    Building2,
    ChevronLeft,
    ChevronRight,
    Power,
    HandCoins
} from "lucide-react";
import toast from "react-hot-toast";

const DONOR_TYPES = ["Individual", "Business", "Organization", "Shop", "Well-wisher"];

const ExternalDonors = () => {
    const { selectedYear } = useMandalStore();

    // List State
    const [donors, setDonors] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(false);

    // Filter States
    const [search, setSearch] = useState("");
    const [donorType, setDonorType] = useState("");
    const [status, setStatus] = useState("");

    // Modal States
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        donorName: "",
        donorType: "Individual",
        organizationName: "",
        phone: "",
        address: "",
        active: true,
        note: ""
    });
    const [formLoading, setFormLoading] = useState(false);

    // Donation History Modal State
    const [historyDonor, setHistoryDonor] = useState(null);
    const [historyDonations, setHistoryDonations] = useState([]);
    const [historyStats, setHistoryStats] = useState({ totalDonated: 0, donationCount: 0, total: 0, pages: 1 });
    const [historyPage, setHistoryPage] = useState(1);
    const [historyLoading, setHistoryLoading] = useState(false);

    const fetchDonors = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        try {
            const response = await externalDonorApi.getExternalDonors({
                festivalYear: selectedYear,
                search,
                donorType,
                active: status,
                page,
                limit: 15
            });
            if (response.success) {
                setDonors(response.data.donors);
                setTotal(response.data.total);
                setPages(response.data.pages);
            } else {
                toast.error(response.message || "Failed to load external donors");
            }
        } catch (err) {
            toast.error("An error occurred while loading external donors");
        } finally {
            setLoading(false);
        }
    }, [selectedYear, search, donorType, status, page]);

    useEffect(() => {
        fetchDonors();
    }, [fetchDonors]);

    const handleResetFilters = () => {
        setSearch("");
        setDonorType("");
        setStatus("");
        setPage(1);
    };

    // ---- Donor Form Handlers ----
    const openAddModal = () => {
        setEditingId(null);
        setFormData({
            donorName: "",
            donorType: "Individual",
            organizationName: "",
            phone: "",
            address: "",
            active: true,
            note: ""
        });
        setIsOpen(true);
    };

    const openEditModal = (donor) => {
        setEditingId(donor._id);
        setFormData({
            donorName: donor.donorName,
            donorType: donor.donorType || "Individual",
            organizationName: donor.organizationName || "",
            phone: donor.phone || "",
            address: donor.address || "",
            active: donor.active,
            note: donor.note || ""
        });
        setIsOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (!formData.donorName.trim()) {
            toast.error("Donor name is required");
            return;
        }

        setFormLoading(true);
        try {
            let response;
            if (editingId) {
                response = await externalDonorApi.updateExternalDonor(editingId, formData);
            } else {
                response = await externalDonorApi.createExternalDonor(formData);
            }

            if (response.success) {
                toast.success(editingId ? "External donor updated successfully" : "External donor created successfully");
                setIsOpen(false);
                fetchDonors();
            } else {
                toast.error(response.message || "Failed to save external donor");
            }
        } catch (err) {
            toast.error("An error occurred while saving the external donor");
        } finally {
            setFormLoading(false);
        }
    };

    const handleToggleActive = async (donor) => {
        const response = await externalDonorApi.toggleDonorActive(donor._id, !donor.active);
        if (response.success) {
            toast.success(response.message || "Donor status updated");
            fetchDonors();
        } else {
            toast.error(response.message || "Failed to update donor status");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this external donor?")) return;
        try {
            const response = await externalDonorApi.deleteExternalDonor(id);
            if (response.success) {
                toast.success("External donor deleted successfully");
                fetchDonors();
            } else {
                toast.error(response.message || "Failed to delete external donor");
            }
        } catch (err) {
            toast.error("An error occurred while deleting the external donor");
        }
    };

    // ---- Donation History Handlers ----
    const openHistoryModal = async (donor) => {
        setHistoryDonor(donor);
        setHistoryPage(1);
        setHistoryLoading(true);
        try {
            const response = await externalDonorApi.getDonorDetails(donor._id, {
                festivalYear: selectedYear,
                page: 1,
                limit: 10
            });
            if (response.success) {
                setHistoryDonations(response.data.donations);
                setHistoryStats({
                    totalDonated: response.data.totalDonated,
                    donationCount: response.data.donationCount,
                    total: response.data.total,
                    pages: response.data.pages
                });
            } else {
                toast.error(response.message || "Failed to load donation history");
            }
        } catch (err) {
            toast.error("An error occurred while loading donation history");
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchHistoryPage = async (targetPage) => {
        if (!historyDonor) return;
        setHistoryLoading(true);
        try {
            const response = await externalDonorApi.getDonorDetails(historyDonor._id, {
                festivalYear: selectedYear,
                page: targetPage,
                limit: 10
            });
            if (response.success) {
                setHistoryDonations(response.data.donations);
                setHistoryStats({
                    totalDonated: response.data.totalDonated,
                    donationCount: response.data.donationCount,
                    total: response.data.total,
                    pages: response.data.pages
                });
                setHistoryPage(targetPage);
            } else {
                toast.error(response.message || "Failed to load donation history");
            }
        } catch (err) {
            toast.error("An error occurred while loading more donations");
        } finally {
            setHistoryLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    return (
        <Layout>
            {/* Header */}
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                        External Donors
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                        Non-resident individuals, businesses, shops, organizations & well-wishers ({total} donors)
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/15 transition-all hover:bg-indigo-700"
                >
                    <Plus className="h-4.5 w-4.5" />
                    Add Donor
                </button>
            </div>

            {/* Filter Bar */}
            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <div className="relative md:col-span-2">
                        <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search donor, phone or organization..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-9 pr-3 text-xs placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950"
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                        <select
                            value={donorType}
                            onChange={(e) => { setDonorType(e.target.value); setPage(1); }}
                            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-9 pr-3 text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
                        >
                            <option value="">All Types</option>
                            {DONOR_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={status}
                            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 px-3 text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
                        >
                            <option value="">All Status</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                        <button
                            onClick={handleResetFilters}
                            className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Donors Table */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                            <p className="text-xs font-medium text-gray-400">Loading donors...</p>
                        </div>
                    </div>
                ) : donors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Building2 className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No external donors found</p>
                        <p className="text-xs text-gray-400 mt-1">Add shops, businesses, organizations and well-wishers donating to the mandal.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                        <th className="px-6 py-4">Donor</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Phone</th>
                                        <th className="px-6 py-4 text-right">Total Donated ({selectedYear})</th>
                                        <th className="px-6 py-4 text-center">Donations</th>
                                        <th className="px-6 py-4">Latest Donation</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                    {donors.map((donor) => (
                                        <tr key={donor._id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                            <td className="px-6 py-4.5">
                                                <div className="font-semibold text-gray-700 dark:text-gray-300">
                                                    {donor.donorName}
                                                </div>
                                                {donor.organizationName && (
                                                    <div className="text-[10px] text-gray-400 truncate max-w-xs mt-0.5">
                                                        {donor.organizationName}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <span className="inline-flex items-center rounded-lg bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-950/20 dark:text-sky-400">
                                                    {donor.donorType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4.5 text-xs text-gray-500 font-medium">
                                                {donor.phone || "—"}
                                            </td>
                                            <td className="px-6 py-4.5 text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(donor.totalDonated)}
                                            </td>
                                            <td className="px-6 py-4.5 text-center">
                                                <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                                                    {donor.donationCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4.5 text-xs text-gray-400">
                                                {donor.latestDonation
                                                    ? new Date(donor.latestDonation).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric"
                                                    })
                                                    : "—"}
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
                                                    donor.active
                                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                                }`}>
                                                    {donor.active ? "ACTIVE" : "INACTIVE"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openHistoryModal(donor)}
                                                        title="View donation history"
                                                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-sky-600 transition-colors"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(donor)}
                                                        title="Edit donor"
                                                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(donor)}
                                                        title={donor.active ? "Deactivate donor" : "Activate donor"}
                                                        className={`rounded-lg p-1 transition-colors ${
                                                            donor.active ? "text-gray-400 hover:bg-amber-50 hover:text-amber-600" : "text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                                                        }`}
                                                    >
                                                        <Power className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(donor._id)}
                                                        title="Delete donor"
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

                        {pages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-gray-800">
                                <span className="text-xs text-gray-500">Page {page} of {pages}</span>
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

            {/* Donor Form Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-gray-900 dark:border dark:border-gray-800">
                        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                {editingId ? "Edit External Donor" : "Add External Donor"}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit}>
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Donor Name *</label>
                                    <input
                                        type="text"
                                        name="donorName"
                                        required
                                        value={formData.donorName}
                                        onChange={handleInputChange}
                                        placeholder="Rajesh Enterprises"
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Donor Type *</label>
                                        <select
                                            name="donorType"
                                            value={formData.donorType}
                                            onChange={handleInputChange}
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        >
                                            {DONOR_TYPES.map((type) => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Phone Number</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="9876543210"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Organization / Business Name</label>
                                    <input
                                        type="text"
                                        name="organizationName"
                                        value={formData.organizationName}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Sharma Traders"
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        placeholder="Shop No. 12, Main Market..."
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Note / Remarks</label>
                                    <textarea
                                        name="note"
                                        value={formData.note}
                                        onChange={handleInputChange}
                                        rows="2"
                                        placeholder="Any remarks about this donor..."
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                    ></textarea>
                                </div>

                                {editingId && (
                                    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                                        <input
                                            type="checkbox"
                                            name="active"
                                            checked={formData.active}
                                            onChange={handleInputChange}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active donor</span>
                                        <span className="text-[10px] text-gray-400">Deactivated donors cannot receive new donations</span>
                                    </label>
                                )}
                            </div>

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
                                        editingId ? "Update Donor" : "Create Donor"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Donation History Modal */}
            {historyDonor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
                    <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-gray-900 dark:border dark:border-gray-800">
                        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                Donation History
                            </h3>
                            <button
                                onClick={() => setHistoryDonor(null)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Donor Summary */}
                            <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-950">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-5 w-5 text-indigo-500" />
                                            <span className="text-lg font-bold text-gray-800 dark:text-white">{historyDonor.donorName}</span>
                                            <span className="inline-flex items-center rounded-lg bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/20 dark:text-sky-400">
                                                {historyDonor.donorType}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {historyDonor.organizationName || "—"} · {historyDonor.phone || "—"} · {historyDonor.address || "—"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(historyStats.totalDonated)}
                                        </div>
                                        <div className="text-[10px] font-medium text-gray-400">
                                            Total donated in {selectedYear} · {historyStats.donationCount} donations
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Donations */}
                            {historyLoading ? (
                                <div className="flex h-40 items-center justify-center">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                                </div>
                            ) : historyDonations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <HandCoins className="h-10 w-10 text-gray-300 mb-2" />
                                    <p className="text-sm font-semibold text-gray-400">No donations recorded for {selectedYear}</p>
                                    <p className="text-xs text-gray-400 mt-1">Donations from this donor will appear here.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead className="sticky top-0">
                                                <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                                    <th className="px-5 py-3">Receipt</th>
                                                    <th className="px-5 py-3">Method</th>
                                                    <th className="px-5 py-3">Date</th>
                                                    <th className="px-5 py-3 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                                {historyDonations.map((don) => (
                                                    <tr key={don._id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                                        <td className="px-5 py-3.5 font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                                            {don.receiptNumber}
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                                                                don.paymentMethod === "cash"
                                                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                                                    : don.paymentMethod === "upi"
                                                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                                    : "bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400"
                                                            }`}>
                                                                {don.paymentMethod.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-xs text-gray-400">
                                                            {new Date(don.date).toLocaleDateString("en-IN", {
                                                                day: "numeric",
                                                                month: "short",
                                                                year: "numeric"
                                                            })}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                                            {formatCurrency(don.amount)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {historyStats.pages > 1 && (
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="text-xs text-gray-500">
                                                Page {historyPage} of {historyStats.pages}
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    disabled={historyPage === 1}
                                                    onClick={() => fetchHistoryPage(historyPage - 1)}
                                                    className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:hover:bg-gray-950"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </button>
                                                <button
                                                    disabled={historyPage === historyStats.pages}
                                                    onClick={() => fetchHistoryPage(historyPage + 1)}
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
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default ExternalDonors;