import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { donationApi } from "../api/donation.api.js";
import { householdApi } from "../api/household.api.js";
import { externalDonorApi } from "../api/externalDonor.api.js";
import { buildingConfigApi } from "../api/buildingConfig.api.js";
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
    Home as HomeIcon,
    Building2,
    Users,
    AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";

const DONOR_CATEGORIES = ["Individual", "Business", "Organization", "Shop", "Well-wisher"];

const Donations = () => {
    const { selectedYear } = useMandalStore();

    // List State
    const [donations, setDonations] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(false);

    // Filter States
    const [search, setSearch] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [donorTypeFilter, setDonorTypeFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Modal Form States
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [donorType, setDonorType] = useState("resident");
    const [formData, setFormData] = useState({
        donorName: "",
        amount: "",
        paymentMethod: "cash",
        phone: "",
        note: "",
        date: new Date().toISOString().split("T")[0]
    });
    const [donorCategory, setDonorCategory] = useState("Individual");
    const [organizationName, setOrganizationName] = useState("");
    const [address, setAddress] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    // Household Selector State
    const [selectedHousehold, setSelectedHousehold] = useState(null);
    const [householdQuery, setHouseholdQuery] = useState("");
    const [householdResults, setHouseholdResults] = useState([]);
    const [showHouseholdDropdown, setShowHouseholdDropdown] = useState(false);
    const [householdSearching, setHouseholdSearching] = useState(false);

    // Resident entry mode: "select" | "manual"
    const [residentMode, setResidentMode] = useState("select");
    const [buildingConfigs, setBuildingConfigs] = useState([]);
    const [manualBuilding, setManualBuilding] = useState("");
    const [manualWing, setManualWing] = useState("");
    const [manualFlat, setManualFlat] = useState("");
    const [manualHeadOfFamily, setManualHeadOfFamily] = useState("");
    const [manualPhone, setManualPhone] = useState("");
    const [manualMemberCount, setManualMemberCount] = useState(1);
    const [conflictHousehold, setConflictHousehold] = useState(null);
    const [conflictMessage, setConflictMessage] = useState("");

    const manualBuildings = [...new Set(buildingConfigs.map((cfg) => Number(cfg.building)))].sort((a, b) => a - b);
    const manualWingOptions = buildingConfigs.filter((cfg) => Number(cfg.building) === Number(manualBuilding));
    const manualConfig = manualWingOptions.find((cfg) => cfg.wing === manualWing);

    const expandFlatRanges = (ranges) => {
        const flats = [];
        (ranges || []).forEach((range) => {
            const start = Number(range.start);
            const end = Number(range.end);
            if (Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= start) {
                for (let i = start; i <= end; i++) flats.push(i);
            }
        });
        return flats;
    };

    const manualFlatOptions = manualConfig
        ? (Array.isArray(manualConfig.flatRanges) && manualConfig.flatRanges.length > 0
            ? expandFlatRanges(manualConfig.flatRanges)
            : Array.from({ length: manualConfig.expectedFlats || 0 }, (_, i) => i + 1))
        : [];

    // External Donor Selector State
    const [selectedDonor, setSelectedDonor] = useState(null);
    const [donorQuery, setDonorQuery] = useState("");
    const [donorResults, setDonorResults] = useState([]);
    const [showDonorDropdown, setShowDonorDropdown] = useState(false);
    const [donorSearching, setDonorSearching] = useState(false);
    const [donorMode, setDonorMode] = useState("new"); // "existing" | "new"

    const fetchDonations = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        try {
            const response = await donationApi.getDonations({
                festivalYear: selectedYear,
                search,
                paymentMethod,
                donorType: donorTypeFilter,
                startDate,
                endDate,
                page,
                limit: 15
            });
            if (response.success) {
                setDonations(response.data.donations);
                setTotal(response.data.total);
                setTotalAmount(response.data.totalAmount || 0);
                setPages(response.data.pages);
            } else {
                toast.error(response.message || "Failed to load donations");
            }
        } catch (err) {
            toast.error("An error occurred while loading donations");
        } finally {
            setLoading(false);
        }
    }, [selectedYear, search, paymentMethod, donorTypeFilter, startDate, endDate, page]);

    useEffect(() => {
        fetchDonations();
    }, [fetchDonations]);

    // Handle filter reset
    const handleResetFilters = () => {
        setSearch("");
        setPaymentMethod("");
        setDonorTypeFilter("");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    const resetFormState = () => {
        setFormData({
            donorName: "",
            amount: "",
            paymentMethod: "cash",
            phone: "",
            note: "",
            date: new Date().toISOString().split("T")[0]
        });
        setDonorCategory("Individual");
        setOrganizationName("");
        setAddress("");
        setSelectedHousehold(null);
        setHouseholdQuery("");
        setHouseholdResults([]);
        setSelectedDonor(null);
        setDonorQuery("");
        setDonorResults([]);
        setResidentMode("select");
        setBuildingConfigs([]);
        setManualBuilding("");
        setManualWing("");
        setManualFlat("");
        setManualHeadOfFamily("");
        setManualPhone("");
        setManualMemberCount(1);
        setConflictHousehold(null);
        setConflictMessage("");
    };

    const loadBuildingConfigs = async () => {
        try {
            const response = await buildingConfigApi.getBuildingConfigs();
            if (response.success) {
                setBuildingConfigs(response.data || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Open Modal for Add
    const openAddModal = () => {
        setEditingId(null);
        setDonorType("external");
        setDonorMode("new");
        resetFormState();
        setIsOpen(true);
        loadBuildingConfigs();
    };

    // Open Modal for Edit
    const openEditModal = (donation) => {
        setEditingId(donation._id);
        resetFormState();

        const existingDonorType = donation.donorType || "external";
        setDonorType(existingDonorType);

        if (existingDonorType === "resident" && donation.household) {
            setSelectedHousehold({
                _id: donation.household._id,
                building: donation.household.building,
                wing: donation.household.wing,
                flatNumber: donation.household.flatNumber,
                headOfFamily: donation.household.headOfFamily,
                phone: donation.household.phone,
                memberCount: donation.household.memberCount
            });
            setHouseholdQuery(`${donation.household.building} · ${donation.household.wing} · ${donation.household.flatNumber}`);
        } else if (donation.externalDonor) {
            setSelectedDonor({
                _id: donation.externalDonor._id,
                donorName: donation.externalDonor.donorName,
                donorType: donation.externalDonor.donorType,
                organizationName: donation.externalDonor.organizationName
            });
            setDonorMode("existing");
            setDonorQuery(donation.externalDonor.donorName);
        } else {
            setDonorMode("new");
        }

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

    // ---- Household Search ----
    const searchHouseholds = async (query) => {
        setHouseholdQuery(query);
        setShowHouseholdDropdown(true);
        if (!query.trim()) {
            setHouseholdResults([]);
            return;
        }
        setHouseholdSearching(true);
        try {
            const response = await householdApi.getHouseholds({ search: query, active: "true", limit: 8 });
            if (response.success) {
                setHouseholdResults(response.data.households);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setHouseholdSearching(false);
        }
    };

    const selectHousehold = (household) => {
        setSelectedHousehold(household);
        setHouseholdQuery(`${household.building} · ${household.wing} · ${household.flatNumber}`);
        setShowHouseholdDropdown(false);
        setFormData((prev) => ({ ...prev, donorName: household.headOfFamily }));
    };

    const clearHousehold = () => {
        setSelectedHousehold(null);
        setHouseholdQuery("");
        setHouseholdResults([]);
    };

    // ---- External Donor Search ----
    const searchDonors = async (query) => {
        setDonorQuery(query);
        setShowDonorDropdown(true);
        if (!query.trim()) {
            setDonorResults([]);
            return;
        }
        setDonorSearching(true);
        try {
            const response = await externalDonorApi.getExternalDonors({ search: query, active: "true", limit: 8 });
            if (response.success) {
                setDonorResults(response.data.donors);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setDonorSearching(false);
        }
    };

    const selectDonor = (donor) => {
        setSelectedDonor(donor);
        setDonorQuery(donor.donorName);
        setShowDonorDropdown(false);
        setFormData((prev) => ({ ...prev, donorName: donor.donorName }));
    };

    const clearDonor = () => {
        setSelectedDonor(null);
        setDonorQuery("");
        setDonorResults([]);
    };

    // ---- Manual entry conflict helpers ----
    const useConflictHousehold = () => {
        const h = conflictHousehold;
        if (!h) return;
        setSelectedHousehold(h);
        setHouseholdQuery(`${h.building} · ${h.wing} · ${h.flatNumber}`);
        setHouseholdResults([]);
        setResidentMode("select");
        setConflictHousehold(null);
        setConflictMessage("");
    };

    const handleConflictHouseholdAndDonate = async () => {
        if (!conflictHousehold) return;
        setFormLoading(true);
        try {
            const updateResponse = await householdApi.updateHousehold(conflictHousehold._id, {
                headOfFamily: manualHeadOfFamily.trim(),
                phone: manualPhone.trim(),
                memberCount: manualMemberCount ? Number(manualMemberCount) : conflictHousehold.memberCount
            });
            if (!updateResponse.success) {
                toast.error(updateResponse.message || "Failed to update household");
                return;
            }

            const payload = {
                ...formData,
                amount: Number(formData.amount),
                donorType: "resident",
                householdId: conflictHousehold._id,
                festivalYear: selectedYear
            };
            delete payload.donorName;
            delete payload.phone;

            const response = await donationApi.createDonation(payload);
            if (response.success) {
                toast.success("Donation recorded successfully");
                setIsOpen(false);
                fetchDonations();
                setConflictHousehold(null);
                setConflictMessage("");
            } else {
                toast.error(response.message || "Failed to record donation");
            }
        } catch (err) {
            toast.error("An error occurred while recording the donation");
        } finally {
            setFormLoading(false);
        }
    };

    // Handle Submit Add/Edit
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (donorType === "resident") {
            if (residentMode === "select") {
                if (!selectedHousehold) {
                    toast.error("Please select a resident household");
                    return;
                }
            } else {
                if (!manualBuilding) {
                    toast.error("Please select a building");
                    return;
                }
                if (!manualWing) {
                    toast.error("Please select a wing");
                    return;
                }
                if (!manualFlat) {
                    toast.error("Please select a flat number");
                    return;
                }
                if (!manualHeadOfFamily.trim()) {
                    toast.error("Occupant name is required");
                    return;
                }
                if (!manualMemberCount || Number(manualMemberCount) < 1) {
                    toast.error("Member count must be at least 1");
                    return;
                }
            }
        } else if (donorMode === "new") {
            if (!formData.donorName.trim()) {
                toast.error("Donor name is required");
                return;
            }
        } else if (!selectedDonor) {
            toast.error("Please select an external donor");
            return;
        }

        if (!formData.amount || Number(formData.amount) <= 0) {
            toast.error("Valid amount is required");
            return;
        }

        setFormLoading(true);
        try {
            const payload = {
                ...formData,
                amount: Number(formData.amount),
                donorType
            };

            if (donorType === "resident") {
                if (residentMode === "select") {
                    payload.householdId = selectedHousehold._id;
                    delete payload.donorName;
                    delete payload.phone;
                    delete payload.address;
                    delete payload.organizationName;
                    delete payload.donorCategory;
                } else {
                    payload.building = Number(manualBuilding);
                    payload.wing = manualWing;
                    payload.flatNumber = Number(manualFlat);
                    payload.headOfFamily = manualHeadOfFamily.trim();
                    payload.phone = manualPhone.trim();
                    payload.memberCount = Number(manualMemberCount);
                    delete payload.donorName;
                    delete payload.address;
                    delete payload.organizationName;
                    delete payload.donorCategory;
                }
            } else {
                if (donorMode === "existing" && selectedDonor) {
                    payload.externalDonorId = selectedDonor._id;
                    delete payload.donorName;
                } else {
                    payload.donorCategory = donorCategory;
                    payload.organizationName = organizationName;
                    payload.address = address;
                }
            }

            let response;
            if (editingId) {
                response = await donationApi.updateDonation(editingId, payload);
            } else {
                response = await donationApi.createDonation({
                    ...payload,
                    festivalYear: selectedYear
                });
            }

            if (response.success) {
                toast.success(editingId ? "Donation updated successfully" : "Donation recorded successfully");
                setIsOpen(false);
                fetchDonations();
            } else {
                if (!editingId && response.statusCode === 409 && response.data && response.data.household) {
                    setConflictHousehold(response.data.household);
                    setConflictMessage(response.message || "A household already exists for this flat");
                } else {
                    toast.error(response.message || "Failed to save donation");
                }
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

    const getDonorTypeBadge = (don) => {
        if (don.donorType === "resident") {
            return { label: "RESIDENT", classes: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400" };
        }
        if (don.donorType === "external") {
            return { label: "EXTERNAL", classes: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400" };
        }
        return { label: "REGULAR", classes: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" };
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
                        Record contributions from resident households & external donors ({total} items found)
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                    {/* Search Field */}
                    <div className="relative lg:col-span-2">
                        <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name or receipt..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-9 pr-3 text-xs placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950"
                        />
                    </div>

                    {/* Donor Type Selector */}
                    <div className="relative">
                        <Users className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                        <select
                            value={donorTypeFilter}
                            onChange={(e) => { setDonorTypeFilter(e.target.value); setPage(1); }}
                            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-9 pr-3 text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
                        >
                            <option value="">All Donor Types</option>
                            <option value="resident">Resident</option>
                            <option value="external">External Donor</option>
                        </select>
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

                    {/* End Date + Reset */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Calendar className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-9 pr-3 text-xs text-gray-500 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950"
                            />
                        </div>
                        <button
                            onClick={handleResetFilters}
                            className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
                        >
                            Reset
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
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                        <th className="px-6 py-4">Receipt No.</th>
                                        <th className="px-6 py-4">Donor</th>
                                        <th className="px-6 py-4">Source</th>
                                        <th className="px-6 py-4">Method</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                    {donations.map((don) => {
                                        const badge = getDonorTypeBadge(don);
                                        return (
                                            <tr key={don._id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                                <td className="px-6 py-4.5 font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                                    {don.receiptNumber}
                                                </td>
                                                <td className="px-6 py-4.5">
                                                    <div className="font-semibold text-gray-700 dark:text-gray-300">
                                                        {don.donorName}
                                                    </div>
                                                    {don.household && (
                                                        <div className="text-[10px] text-indigo-400 mt-0.5">
                                                            B{don.household.building} · Wing {don.household.wing} · Flat {don.household.flatNumber}
                                                            <span className="text-gray-400 ml-1">
                                                                · {don.household.memberCount} members
                                                            </span>
                                                        </div>
                                                    )}
                                                    {don.externalDonor && don.externalDonor.organizationName && (
                                                        <div className="text-[10px] text-gray-400 truncate max-w-xs mt-0.5">
                                                            {don.externalDonor.organizationName}
                                                        </div>
                                                    )}
                                                    {don.note && (
                                                        <div className="text-[10px] text-gray-400 truncate max-w-xs mt-0.5">
                                                            {don.note}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4.5">
                                                    <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold ${badge.classes}`}>
                                                        {badge.label}
                                                    </span>
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
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50/80 border-t border-gray-200 dark:bg-gray-800/20 dark:border-gray-800">
                                        <td colSpan="5" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Total ({total} {total === 1 ? "donation" : "donations"})
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(totalAmount)}
                                        </td>
                                        <td className="px-6 py-4"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Mobile donation cards */}
                        <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800/40">
                            {donations.map((don) => {
                                const badge = getDonorTypeBadge(don);
                                return (
                                    <div key={don._id} className="px-5 py-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                                    {don.receiptNumber}
                                                </div>
                                                <div className="mt-0.5 font-semibold text-sm text-gray-700 dark:text-gray-300">
                                                    {don.donorName}
                                                </div>
                                                {don.household && (
                                                    <div className="text-[11px] text-indigo-400 mt-0.5">
                                                        B{don.household.building} · Wing {don.household.wing} · Flat {don.household.flatNumber}
                                                        <span className="text-gray-400 ml-1">
                                                            · {don.household.memberCount} {don.household.memberCount === 1 ? "member" : "members"}
                                                        </span>
                                                    </div>
                                                )}
                                                {don.externalDonor && don.externalDonor.organizationName && (
                                                    <div className="text-[11px] text-gray-400 truncate mt-0.5">
                                                        {don.externalDonor.organizationName}
                                                    </div>
                                                )}
                                                {don.note && (
                                                    <div className="text-[11px] text-gray-400 truncate mt-0.5">
                                                        {don.note}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                                    {formatCurrency(don.amount)}
                                                </div>
                                                <div className="mt-0.5 text-[11px] text-gray-400">
                                                    {new Date(don.date).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric"
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-semibold ${badge.classes}`}>
                                                {badge.label}
                                            </span>
                                            <span
                                                className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-semibold ${
                                                    don.paymentMethod === "cash"
                                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                                        : don.paymentMethod === "upi"
                                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                        : "bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400"
                                                }`}
                                            >
                                                {don.paymentMethod.toUpperCase()}
                                            </span>
                                            <div className="ml-auto flex items-center gap-1.5">
                                                <button
                                                    onClick={() => openEditModal(don)}
                                                    title="Edit donation"
                                                    aria-label="Edit donation"
                                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors dark:border-gray-800 dark:hover:bg-gray-800"
                                                >
                                                    <Edit2 className="h-4.5 w-4.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(don._id)}
                                                    title="Delete donation"
                                                    aria-label="Delete donation"
                                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors dark:border-gray-800 dark:hover:bg-red-950/20"
                                                >
                                                    <Trash2 className="h-4.5 w-4.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Mobile total row */}
                            <div className="flex items-center justify-between bg-gray-50/80 px-5 py-4 dark:bg-gray-800/20">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Total ({total} {total === 1 ? "donation" : "donations"})
                                </span>
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(totalAmount)}
                                </span>
                            </div>
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
                    <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-gray-900 dark:border dark:border-gray-800">
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
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                {/* Donor Type Selector */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                        Donor Type *
                                    </label>
                                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => setDonorType("resident")}
                                            className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
                                                donorType === "resident"
                                                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-850"
                                            }`}
                                        >
                                            <HomeIcon className="h-4 w-4" />
                                            Resident Household
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDonorType("external")}
                                            className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
                                                donorType === "external"
                                                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-850"
                                            }`}
                                        >
                                            <Building2 className="h-4 w-4" />
                                            External Donor
                                        </button>
                                    </div>
                                </div>

                                {donorType === "resident" ? (
                                    <>
                                        {/* Resident entry mode selector */}
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                Resident Donation Option *
                                            </label>
                                            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setResidentMode("select"); setConflictHousehold(null); setConflictMessage(""); }}
                                                    className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
                                                        residentMode === "select"
                                                            ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                                            : "border-gray-200 hover:bg-gray-50 dark:border-gray-850"
                                                    }`}
                                                >
                                                    <HomeIcon className="h-4 w-4" />
                                                    Select from Household
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setResidentMode("manual"); setConflictHousehold(null); setConflictMessage(""); }}
                                                    className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
                                                        residentMode === "manual"
                                                            ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                                            : "border-gray-200 hover:bg-gray-50 dark:border-gray-850"
                                                    }`}
                                                >
                                                    <Building2 className="h-4 w-4" />
                                                    Enter Manually & Assign Household
                                                </button>
                                            </div>
                                        </div>

                                        {residentMode === "select" ? (
                                            <>
                                        {/* Household Selector */}
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                Resident Household *
                                            </label>
                                            <div className="relative mt-2">
                                                <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={householdQuery}
                                                    onChange={(e) => searchHouseholds(e.target.value)}
                                                    onFocus={() => setShowHouseholdDropdown(true)}
                                                    placeholder="Search by name, building, wing or flat..."
                                                    className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-8 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                                />
                                                {householdQuery && !selectedHousehold && (
                                                    <button
                                                        type="button"
                                                        onClick={clearHousehold}
                                                        className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {showHouseholdDropdown && (
                                                    <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
                                                        {householdSearching ? (
                                                            <div className="flex items-center justify-center gap-2 py-4">
                                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                                                                <span className="text-xs text-gray-400">Searching...</span>
                                                            </div>
                                                        ) : householdResults.length === 0 ? (
                                                            <p className="px-4 py-4 text-xs text-gray-400 text-center">
                                                                {householdQuery.trim() ? "No matching households. Try a different name or flat number." : "Type to search registered households"}
                                                            </p>
                                                        ) : (
                                                            householdResults.map((h) => (
                                                                <button
                                                                    type="button"
                                                                    key={h._id}
                                                                    onClick={() => selectHousehold(h)}
                                                                    className="flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left hover:bg-indigo-50/50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800/40"
                                                                >
                                                                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                                                                        B{h.building}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                                            Wing {h.wing} · Flat {h.flatNumber}
                                                                        </div>
                                                                        <div className="truncate text-[11px] text-gray-400">
                                                                            {h.headOfFamily} · {h.memberCount} {h.memberCount === 1 ? "member" : "members"} · {h.phone || "no phone"}
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Selected Household Card */}
                                            {selectedHousehold && (
                                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <HomeIcon className="h-4 w-4 shrink-0 text-indigo-500" />
                                                            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                                                Building {selectedHousehold.building} · Wing {selectedHousehold.wing} · Flat {selectedHousehold.flatNumber}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-1">
                                                            {selectedHousehold.headOfFamily} · {selectedHousehold.phone || "no phone"}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:bg-gray-900 dark:text-indigo-400">
                                                        <Users className="h-3.5 w-3.5" />
                                                        {selectedHousehold.memberCount} {selectedHousehold.memberCount === 1 ? "member" : "members"}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                            </>
                                        ) : (
                                            <>
                                                {buildingConfigs.length === 0 && (
                                                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
                                                        No building &amp; wing configurations found. Configure expected flats for your buildings and wings from the Households page first.
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Building *</label>
                                                        <select
                                                            value={manualBuilding}
                                                            onChange={(e) => { setManualBuilding(e.target.value); setManualWing(""); setManualFlat(""); }}
                                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                                        >
                                                            <option value="">Select</option>
                                                            {manualBuildings.map((b) => (
                                                                <option key={b} value={b}>Building {b}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Wing *</label>
                                                        <select
                                                            value={manualWing}
                                                            disabled={!manualBuilding}
                                                            onChange={(e) => { setManualWing(e.target.value); setManualFlat(""); }}
                                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:opacity-50 dark:border-gray-850 dark:bg-gray-950"
                                                        >
                                                            <option value="">Select</option>
                                                            {manualWingOptions.map((cfg) => (
                                                                <option key={cfg._id} value={cfg.wing}>Wing {cfg.wing}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Flat No. *</label>
                                                        <select
                                                            value={manualFlat}
                                                            disabled={!manualConfig}
                                                            onChange={(e) => setManualFlat(e.target.value)}
                                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:opacity-50 dark:border-gray-850 dark:bg-gray-950"
                                                        >
                                                            <option value="">Select</option>
                                                            {manualFlatOptions.map((f) => (
                                                                <option key={f} value={f}>Flat {f}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Occupant Name *</label>
                                                        <input
                                                            type="text"
                                                            value={manualHeadOfFamily}
                                                            onChange={(e) => setManualHeadOfFamily(e.target.value)}
                                                            placeholder="Head of the family / occupant"
                                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Phone Number</label>
                                                        <input
                                                            type="tel"
                                                            value={manualPhone}
                                                            onChange={(e) => setManualPhone(e.target.value)}
                                                            placeholder="9876543210"
                                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Family Member Count *</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={manualMemberCount}
                                                            onChange={(e) => setManualMemberCount(e.target.value)}
                                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                                        />
                                                    </div>
                                                    <div className="flex items-end">
                                                        <p className="text-[11px] text-gray-400 leading-relaxed pb-1">
                                                            The resident will be registered as a new household ({manualBuilding ? `Building ${manualBuilding}` : "Building -"} · {manualWing ? `Wing ${manualWing}` : "-"} · Flat {manualFlat || "-"}) and counted in statistics &amp; Mahaprasad planning.
                                                        </p>
                                                    </div>
                                                </div>

                                                {conflictHousehold && (
                                                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                                                        <div className="flex items-start gap-2">
                                                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5 dark:text-amber-400" />
                                                            <div>
                                                                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">{conflictMessage}</p>
                                                                <p className="text-[11px] text-amber-700/80 mt-1 dark:text-amber-400/80">
                                                                    {conflictHousehold.headOfFamily} · {conflictHousehold.phone || "no phone"} · {conflictHousehold.memberCount} {conflictHousehold.memberCount === 1 ? "member" : "members"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={useConflictHousehold}
                                                                className="rounded-lg border border-indigo-600 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500 dark:bg-gray-900 dark:text-indigo-400"
                                                            >
                                                                Use This Existing Household
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleConflictHouseholdAndDonate}
                                                                disabled={formLoading}
                                                                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                                                            >
                                                                Update Occupant Info &amp; Create Donation
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setConflictHousehold(null)}
                                                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-800"
                                                            >
                                                                Keep Editing
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {/* External Donor preference toggle */}
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setDonorMode("existing")}
                                                className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                                                    donorMode === "existing"
                                                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                                        : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-850"
                                                }`}
                                            >
                                                Select Existing Donor
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDonorMode("new")}
                                                className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                                                    donorMode === "new"
                                                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                                        : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-850"
                                                }`}
                                            >
                                                Add New Donor
                                            </button>
                                        </div>

                                        {donorMode === "existing" ? (
                                            <div>
                                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                    External Donor *
                                                </label>
                                                <div className="relative mt-2">
                                                    <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={donorQuery}
                                                        onChange={(e) => searchDonors(e.target.value)}
                                                        onFocus={() => setShowDonorDropdown(true)}
                                                        placeholder="Search donor name, phone or business..."
                                                        className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-8 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                                    />
                                                    {donorQuery && !selectedDonor && (
                                                        <button
                                                            type="button"
                                                            onClick={clearDonor}
                                                            className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {showDonorDropdown && (
                                                        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
                                                            {donorSearching ? (
                                                                <div className="flex items-center justify-center gap-2 py-4">
                                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                                                                    <span className="text-xs text-gray-400">Searching...</span>
                                                                </div>
                                                            ) : donorResults.length === 0 ? (
                                                                <p className="px-4 py-4 text-center text-xs text-gray-400">
                                                                    {donorQuery.trim() ? "No donors found. Use 'Add New Donor' instead." : "Type to search donors"}
                                                                </p>
                                                            ) : (
                                                                donorResults.map((donor) => (
                                                                    <button
                                                                        type="button"
                                                                        key={donor._id}
                                                                        onClick={() => selectDonor(donor)}
                                                                        className="flex w-full items-center justify-between border-b border-gray-50 px-4 py-3 text-left hover:bg-indigo-50/50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800/40"
                                                                    >
                                                                        <div>
                                                                            <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                                                {donor.donorName}
                                                                                {donor.organizationName && (
                                                                                    <span className="text-[10px] font-medium text-gray-400 ml-1.5">
                                                                                        {donor.organizationName}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-[11px] text-gray-400">
                                                                                {donor.donorType} · {donor.phone || "no phone"}
                                                                            </div>
                                                                        </div>
                                                                        <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                                                                            {donor.donationCount} donations
                                                                        </span>
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {selectedDonor && (
                                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                                                        <div>
                                                            <div className="text-sm font-bold text-amber-800 dark:text-amber-300">
                                                                {selectedDonor.donorName}
                                                            </div>
                                                            <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                                                                {selectedDonor.donorType}
                                                                {selectedDonor.organizationName ? ` · ${selectedDonor.organizationName}` : ""}
                                                                {selectedDonor.phone ? ` · ${selectedDonor.phone}` : ""}
                                                            </p>
                                                        </div>
                                                        <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-gray-900 dark:text-amber-400">
                                                            External Donor
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                        Donor Name *
                                                    </label>
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

                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                            Donor Type
                                                        </label>
                                                        <select
                                                            value={donorCategory}
                                                            onChange={(e) => setDonorCategory(e.target.value)}
                                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                                        >
                                                            {DONOR_CATEGORIES.map((category) => (
                                                                <option key={category} value={category}>{category}</option>
                                                            ))}
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
                                                </div>

                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                            Organization / Business
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={organizationName}
                                                            onChange={(e) => setOrganizationName(e.target.value)}
                                                            placeholder="e.g. Sharma Traders"
                                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                            Address
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={address}
                                                            onChange={(e) => setAddress(e.target.value)}
                                                            placeholder="Shop No. 12, Main Market"
                                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2 dark:border-gray-800">
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

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Note / Remark
                                        </label>
                                        <input
                                            type="text"
                                            name="note"
                                            value={formData.note}
                                            onChange={handleInputChange}
                                            placeholder="Special contribution or remarks..."
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer actions */}
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
        </Layout>
    );
};

export default Donations;