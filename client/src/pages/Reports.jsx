import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { reportApi } from "../api/report.api.js";
import { donationApi } from "../api/donation.api.js";
import { expenseApi } from "../api/expense.api.js";
import { useMandalStore } from "../store/useMandalStore.js";
import { userAuthStore } from "../store/userStore.js";
import { jsPDF } from "jspdf";
import {
    BarChart3,
    FileSpreadsheet,
    FileText,
    TrendingUp,
    TrendingDown,
    Scale,
    Calendar,
    Download
} from "lucide-react";
import toast from "react-hot-toast";

import {
    exportOverallFinancialReport,
    exportDonationsReport,
    exportExpensesReport
} from "../utils/reportPdf.js";

const Reports = () => {
    const { selectedYear } = useMandalStore();

    // Summary Aggregates State
    const [stats, setStats] = useState({
        totalDonations: 0,
        totalExpenses: 0,
        currentBalance: 0,
        totalTransactions: 0,
        totalResidentDonations: 0,
        totalExternalDonorDonations: 0
    });
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState("overall"); // "overall", "donations", "expenses"
    const [exportLoading, setExportLoading] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            if (!selectedYear) return;
            setLoading(true);
            try {
                const response = await reportApi.getDashboardStats({ festivalYear: selectedYear });
                if (response.success) {
                    setStats({
                        totalDonations: response.data.totalDonations,
                        totalExpenses: response.data.totalExpenses,
                        currentBalance: response.data.currentBalance,
                        totalTransactions: response.data.totalTransactions,
                        totalResidentDonations: response.data.totalResidentDonations,
                        totalExternalDonorDonations: response.data.totalExternalDonorDonations
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [selectedYear]);

    // Format Currency
    const formatCurrency = (val) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(val);
    };

    // Helper: format date for report
    const formatDate = (d) => {
        return new Date(d).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    // Helper: get organization / mandal name
    const getOrgName = () => {
        const user = userAuthStore.getState().user;
        return (user && user.name && String(user.name).trim()) || "Unique Residency Mandal";
    };

    // 1. Export PDF Function for all report types
    const handleExportPDF = async () => {
        if (!selectedYear) {
            toast.error("Please select a festival year first");
            return;
        }

        setExportLoading(true);
        const orgName = getOrgName();

        try {
            if (reportType === "overall") {
                const donRes = await donationApi.getDonations({ festivalYear: selectedYear, limit: 1000 });
                const expRes = await expenseApi.getExpenses({ festivalYear: selectedYear, limit: 1000 });

                const incomeRows = (donRes?.success && donRes?.data?.donations ? donRes.data.donations : [])
                    .slice()
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                const expenseRows = (expRes?.success && expRes?.data?.expenses ? expRes.data.expenses : [])
                    .slice()
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                exportOverallFinancialReport({
                    festivalYear: selectedYear,
                    incomeRows,
                    expenseRows,
                    orgName
                });
                toast.success("Financial statement PDF downloaded successfully");
            } else if (reportType === "donations") {
                const donRes = await donationApi.getDonations({ festivalYear: selectedYear, limit: 1000 });
                const donations = donRes?.success && donRes?.data?.donations ? donRes.data.donations : [];

                if (donations.length === 0) {
                    toast.error("No donations found for this festival year");
                    return;
                }

                exportDonationsReport({
                    festivalYear: selectedYear,
                    donations,
                    orgName
                });
                toast.success("Donations report PDF downloaded successfully");
            } else if (reportType === "expenses") {
                const expRes = await expenseApi.getExpenses({ festivalYear: selectedYear, limit: 1000 });
                const expenses = expRes?.success && expRes?.data?.expenses ? expRes.data.expenses : [];

                if (expenses.length === 0) {
                    toast.error("No expenses found for this festival year");
                    return;
                }

                exportExpensesReport({
                    festivalYear: selectedYear,
                    expenses,
                    orgName
                });
                toast.success("Expenses report PDF downloaded successfully");
            }
        } catch (err) {
            toast.error("Failed to generate PDF statement");
            console.error(err);
        } finally {
            setExportLoading(false);
        }
    };

    // 2. Export Excel-ready CSV
    const handleExportCSV = async () => {
        if (!selectedYear) return;
        setExportLoading(true);
        try {
            let csvContent = "";
            let fileName = "";

            if (reportType === "donations") {
                const res = await donationApi.getDonations({ festivalYear: selectedYear, limit: 1000 });
                if (res?.success && res?.data?.donations) {
                    fileName = `MandalKhata_Donations_${selectedYear}.csv`;
                    csvContent += "Receipt Number,Donor Name,Donor Type,Flat,Amount,Payment Method,Phone,Date,Note\n";
                    res.data.donations.forEach((don) => {
                        const typeLabel = don.donorType === "resident" ? "RESIDENT" : don.donorType === "external" ? "EXTERNAL" : "REGULAR";
                        const flatInfo = don.household ? `B${don.household.building} Wing ${don.household.wing} Flat ${don.household.flatNumber}` : "";
                        csvContent += `"${don.receiptNumber}","${(don.donorName || "").replace(/"/g, '""')}","${typeLabel}","${flatInfo}",${don.amount},"${don.paymentMethod}","${don.phone || ""}","${formatDate(don.date)}","${(don.note || "").replace(/"/g, '""')}"\n`;
                    });
                }
            } else if (reportType === "expenses") {
                const res = await expenseApi.getExpenses({ festivalYear: selectedYear, limit: 1000 });
                if (res?.success && res?.data?.expenses) {
                    fileName = `MandalKhata_Expenses_${selectedYear}.csv`;
                    csvContent += "Title,Total Amount,Paid Amount,Outstanding,Category,Vendor Name,Payment Status,Date,Note\n";
                    res.data.expenses.forEach((exp) => {
                        const paid = exp.paidAmount != null ? exp.paidAmount : (exp.paymentStatus === "paid" ? exp.amount : 0);
                        const due = Math.max(exp.amount - paid, 0);
                        csvContent += `"${(exp.title || "").replace(/"/g, '""')}",${exp.amount},${paid},${due},"${exp.category}","${(exp.vendorName || "").replace(/"/g, '""')}","${exp.paymentStatus}","${formatDate(exp.date)}","${(exp.note || "").replace(/"/g, '""')}"\n`;
                    });
                }
            } else {
                // Overall ledger / timeline
                const resLedger = await reportApi.getLedger({ festivalYear: selectedYear });
                if (resLedger?.success && resLedger?.data) {
                    fileName = `MandalKhata_Ledger_${selectedYear}.csv`;
                    csvContent += "Type,Ref Number/Receipt,Title,Amount,Flow,Payment Method/Category,Date,Running Balance\n";
                    resLedger.data.forEach((tx) => {
                        csvContent += `"${tx.type}","${tx.referenceNumber}","${(tx.title || "").replace(/"/g, '""')}",${tx.amount},"${tx.type === "donation" ? "CREDIT" : "DEBIT"}","${tx.category || tx.paymentMethod}","${formatDate(tx.date)}",${tx.runningBalance}\n`;
                    });
                }
            }

            if (csvContent) {
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", fileName);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success("CSV file downloaded successfully");
            } else {
                toast.error("No records found to export");
            }
        } catch (err) {
            toast.error("Failed to generate CSV download");
            console.error(err);
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                    Financial Reports
                </h1>
                <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                    Compile summaries, download legal audits, and generate tables for year {selectedYear}
                </p>
            </div>

            {/* Core aggregates summary visual cards (2 per row on mobile) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-6 md:grid-cols-3 mb-5 sm:mb-8">
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-400">Collections</span>
                    </div>
                    <div className="mt-2.5 sm:mt-4">
                        <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(stats.totalDonations)}
                        </span>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Sum of all donations</p>
                    </div>
                </div>

                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
                            <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-400">Expenses</span>
                    </div>
                    <div className="mt-2.5 sm:mt-4">
                        <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(stats.totalExpenses)}
                        </span>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Sum of all expenses</p>
                    </div>
                </div>

                <div className="col-span-2 md:col-span-1 rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400">
                            <Scale className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-400">Balance</span>
                    </div>
                    <div className="mt-2.5 sm:mt-4">
                        <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(stats.currentBalance)}
                        </span>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Mandal running balance</p>
                    </div>
                </div>
            </div>

            {/* Configurations Card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-md shadow-gray-100/30 sm:p-8 dark:border-gray-800 dark:bg-gray-900 max-w-2xl mx-auto w-full">
                <div className="flex flex-col items-center justify-center text-center mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3 dark:bg-indigo-950/20 dark:text-indigo-400">
                        <BarChart3 className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Export Center</h3>
                    <p className="text-xs text-gray-400 mt-1">
                        Download tabular CSV configurations or high-fidelity PDF audits
                    </p>
                </div>

                {/* Form fields */}
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Select Report Category
                        </label>
                        <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <button
                                onClick={() => setReportType("overall")}
                                className={`rounded-xl border py-3 px-4 text-xs font-bold transition-all ${reportType === "overall"
                                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-850"
                                    }`}
                            >
                                Overall Ledger
                            </button>
                            <button
                                onClick={() => setReportType("donations")}
                                className={`rounded-xl border py-3 px-4 text-xs font-bold transition-all ${reportType === "donations"
                                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-850"
                                    }`}
                            >
                                Donations only
                            </button>
                            <button
                                onClick={() => setReportType("expenses")}
                                className={`rounded-xl border py-3 px-4 text-xs font-bold transition-all ${reportType === "expenses"
                                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-850"
                                    }`}
                            >
                                Expenses only
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 dark:border-gray-800">
                        {/* Download PDF button */}
                        <button
                            onClick={handleExportPDF}
                            disabled={exportLoading}
                            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 px-4 text-xs font-bold text-white shadow-lg shadow-indigo-600/10 hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {exportLoading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            ) : (
                                <>
                                    <Download className="h-4.5 w-4.5" />
                                    Download PDF
                                </>
                            )}
                        </button>

                        {/* Download Excel CSV button */}
                        <button
                            onClick={handleExportCSV}
                            disabled={exportLoading}
                            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 px-4 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-850 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900"
                        >
                            {exportLoading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                            ) : (
                                <>
                                    <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600" />
                                    Download CSV
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Reports;
