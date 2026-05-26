import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { reportApi } from "../api/report.api.js";
import { donationApi } from "../api/donation.api.js";
import { expenseApi } from "../api/expense.api.js";
import { useMandalStore } from "../store/useMandalStore.js";
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

const Reports = () => {
    const { selectedYear } = useMandalStore();

    // Summary Aggregates State
    const [stats, setStats] = useState({
        totalDonations: 0,
        totalExpenses: 0,
        currentBalance: 0,
        totalTransactions: 0
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
                        totalTransactions: response.data.totalTransactions
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

    // 1. Export PDF Function
    const handleExportPDF = async () => {
        if (!selectedYear) return;
        setExportLoading(true);
        try {
            const doc = new jsPDF();
            
            // Header Styles
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(0, 0, 210, 40, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.text("MandalKhata Statement", 14, 18);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(`Ganesh Mandal Finance & Audit Report  |  Festival Year: ${selectedYear}`, 14, 28);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 160, 28);

            doc.setTextColor(15, 23, 42);

            let currentY = 55;

            // 1. Write Summary Metrics Table
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.text("Financial Summary Statistics", 14, currentY);
            currentY += 8;

            doc.setDrawColor(229, 231, 235); // border
            doc.setFillColor(249, 250, 251); // header bg
            doc.rect(14, currentY, 182, 8, "FD");
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("Metric Metric Title", 20, currentY + 5.5);
            doc.text("Amount (INR)", 140, currentY + 5.5);

            currentY += 8;
            doc.setFont("helvetica", "normal");

            // Row 1: Donations
            doc.rect(14, currentY, 182, 8);
            doc.text("Total Collections / Donations", 20, currentY + 5.5);
            doc.setFont("helvetica", "bold");
            doc.text(`+ Rs. ${stats.totalDonations.toLocaleString("en-IN")}`, 140, currentY + 5.5);
            doc.setFont("helvetica", "normal");
            currentY += 8;

            // Row 2: Expenses
            doc.rect(14, currentY, 182, 8);
            doc.text("Total Mandal Expenses", 20, currentY + 5.5);
            doc.setFont("helvetica", "bold");
            doc.text(`- Rs. ${stats.totalExpenses.toLocaleString("en-IN")}`, 140, currentY + 5.5);
            doc.setFont("helvetica", "normal");
            currentY += 8;

            // Row 3: Net Balance
            doc.setFillColor(243, 244, 246);
            doc.rect(14, currentY, 182, 10, "FD");
            doc.setFont("helvetica", "bold");
            doc.text("Net Running Balance Available", 20, currentY + 6.5);
            doc.text(`Rs. ${stats.currentBalance.toLocaleString("en-IN")}`, 140, currentY + 6.5);
            
            currentY += 22;

            if (reportType === "overall" || reportType === "donations") {
                // Fetch ALL donations
                const res = await donationApi.getDonations({ festivalYear: selectedYear, limit: 1000 });
                if (res.success && res.data.donations.length > 0) {
                    if (currentY > 230) { doc.addPage(); currentY = 20; }
                    
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(13);
                    doc.text("Logged Donations Ledger", 14, currentY);
                    currentY += 6;

                    // Table Header
                    doc.setFillColor(243, 244, 246);
                    doc.rect(14, currentY, 182, 8, "FD");
                    doc.setFontSize(8);
                    doc.text("Receipt #", 16, currentY + 5.5);
                    doc.text("Donor Name", 45, currentY + 5.5);
                    doc.text("Method", 105, currentY + 5.5);
                    doc.text("Date", 130, currentY + 5.5);
                    doc.text("Amount (Rs.)", 165, currentY + 5.5);

                    currentY += 8;
                    doc.setFont("helvetica", "normal");

                    res.data.donations.forEach(don => {
                        if (currentY > 270) { doc.addPage(); currentY = 20; }
                        doc.rect(14, currentY, 182, 8);
                        doc.text(don.receiptNumber, 16, currentY + 5.5);
                        doc.text(don.donorName.substring(0, 30), 45, currentY + 5.5);
                        doc.text(don.paymentMethod.toUpperCase(), 105, currentY + 5.5);
                        doc.text(formatDate(don.date), 130, currentY + 5.5);
                        doc.text(don.amount.toLocaleString("en-IN"), 165, currentY + 5.5);
                        currentY += 8;
                    });
                    
                    currentY += 15;
                }
            }

            if (reportType === "overall" || reportType === "expenses") {
                // Fetch ALL expenses
                const res = await expenseApi.getExpenses({ festivalYear: selectedYear, limit: 1000 });
                if (res.success && res.data.expenses.length > 0) {
                    if (currentY > 230) { doc.addPage(); currentY = 20; }
                    
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(13);
                    doc.text("Logged Expenses Audit", 14, currentY);
                    currentY += 6;

                    // Table Header
                    doc.setFillColor(243, 244, 246);
                    doc.rect(14, currentY, 182, 8, "FD");
                    doc.setFontSize(8);
                    doc.text("Expense Title", 16, currentY + 5.5);
                    doc.text("Category", 65, currentY + 5.5);
                    doc.text("Vendor Shop", 105, currentY + 5.5);
                    doc.text("Status", 145, currentY + 5.5);
                    doc.text("Amount (Rs.)", 168, currentY + 5.5);

                    currentY += 8;
                    doc.setFont("helvetica", "normal");

                    res.data.expenses.forEach(exp => {
                        if (currentY > 270) { doc.addPage(); currentY = 20; }
                        doc.rect(14, currentY, 182, 8);
                        doc.text(exp.title.substring(0, 25), 16, currentY + 5.5);
                        doc.text(exp.category, 65, currentY + 5.5);
                        doc.text((exp.vendorName || "—").substring(0, 20), 105, currentY + 5.5);
                        doc.text(exp.paymentStatus.toUpperCase(), 145, currentY + 5.5);
                        doc.text(exp.amount.toLocaleString("en-IN"), 168, currentY + 5.5);
                        currentY += 8;
                    });
                }
            }

            // Save PDF
            doc.save(`MandalKhata_${reportType}_report_${selectedYear}.pdf`);
            toast.success("PDF statement downloaded successfully");
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
                if (res.success) {
                    fileName = `MandalKhata_Donations_${selectedYear}.csv`;
                    csvContent += "Receipt Number,Donor Name,Amount,Payment Method,Phone,Date,Note\n";
                    res.data.donations.forEach(don => {
                        csvContent += `"${don.receiptNumber}","${don.donorName.replace(/"/g, '""')}",${don.amount},"${don.paymentMethod}","${don.phone || ""}","${formatDate(don.date)}","${(don.note || "").replace(/"/g, '""')}"\n`;
                    });
                }
            } else if (reportType === "expenses") {
                const res = await expenseApi.getExpenses({ festivalYear: selectedYear, limit: 1000 });
                if (res.success) {
                    fileName = `MandalKhata_Expenses_${selectedYear}.csv`;
                    csvContent += "Title,Amount,Category,Vendor Name,Payment Status,Date,Note\n";
                    res.data.expenses.forEach(exp => {
                        csvContent += `"${exp.title.replace(/"/g, '""')}",${exp.amount},"${exp.category}","${(exp.vendorName || "").replace(/"/g, '""')}","${exp.paymentStatus}","${formatDate(exp.date)}","${(exp.note || "").replace(/"/g, '""')}"\n`;
                    });
                }
            } else {
                // Overall summary
                const resLedger = await reportApi.getLedger({ festivalYear: selectedYear });
                if (resLedger.success) {
                    fileName = `MandalKhata_Ledger_${selectedYear}.csv`;
                    csvContent += "Type,Ref Number/Receipt,Title,Amount,Flow,Payment Method/Category,Date,Running Balance\n";
                    resLedger.data.forEach(tx => {
                        csvContent += `"${tx.type}","${tx.referenceNumber}","${tx.title.replace(/"/g, '""')}",${tx.amount},"${tx.type === "donation" ? "CREDIT" : "DEBIT"}","${tx.category || tx.paymentMethod}","${formatDate(tx.date)}",${tx.runningBalance}\n`;
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
                toast.error("No transactional logs found to export");
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

            {/* Core aggregates summary visual cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-semibold text-gray-400">Collections</span>
                    </div>
                    <div className="mt-4">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(stats.totalDonations)}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">Sum of all donations</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
                            <TrendingDown className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-semibold text-gray-400">Expenses</span>
                    </div>
                    <div className="mt-4">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(stats.totalExpenses)}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">Sum of all expenses</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400">
                            <Scale className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-semibold text-gray-400">Balance</span>
                    </div>
                    <div className="mt-4">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(stats.currentBalance)}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">Mandal running balance</p>
                    </div>
                </div>
            </div>

            {/* Configurations Card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900 max-w-2xl mx-auto">
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
                        <div className="mt-2.5 grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setReportType("overall")}
                                className={`rounded-xl border py-3 px-4 text-xs font-bold transition-all ${
                                    reportType === "overall"
                                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                        : "border-gray-200 hover:bg-gray-50 dark:border-gray-850"
                                }`}
                            >
                                Overall Ledger
                            </button>
                            <button
                                onClick={() => setReportType("donations")}
                                className={`rounded-xl border py-3 px-4 text-xs font-bold transition-all ${
                                    reportType === "donations"
                                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                        : "border-gray-200 hover:bg-gray-50 dark:border-gray-850"
                                }`}
                            >
                                Donations only
                            </button>
                            <button
                                onClick={() => setReportType("expenses")}
                                className={`rounded-xl border py-3 px-4 text-xs font-bold transition-all ${
                                    reportType === "expenses"
                                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                        : "border-gray-200 hover:bg-gray-50 dark:border-gray-850"
                                }`}
                            >
                                Expenses only
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6 grid grid-cols-2 gap-4 dark:border-gray-800">
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
