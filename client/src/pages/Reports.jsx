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
    const [overview, setOverview] = useState({
        totalHouseholds: 0,
        totalRegisteredFlats: 0,
        totalExpectedFlats: 0,
        remainingFlats: 0,
        totalResidents: 0,
        buildings: [],
        wings: [],
        unregisteredFlats: []
    });
    const [mahaprasad, setMahaprasad] = useState({
        registeredHouseholds: 0,
        totalPeople: 0,
        expectedAttendancePercentage: 80,
        safetyBufferPercentage: 10,
        expectedAttendance: 0,
        recommendedMeals: 0
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
                    setOverview(response.data.residentStats || {});
                    setMahaprasad(response.data.mahaprasad || {});
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

    // 0. Classic two-sided Financial Report (Income | Amount | Expense | Amount)
    const exportFinancialReport = async () => {
        const donRes = await donationApi.getDonations({ festivalYear: selectedYear, limit: 1000 });
        const expRes = await expenseApi.getExpenses({ festivalYear: selectedYear, limit: 1000 });

        const incomeRows = (donRes && donRes.success && donRes.data && donRes.data.donations ? donRes.data.donations : [])
            .slice()
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        const expenseRows = (expRes && expRes.success && expRes.data && expRes.data.expenses ? expRes.data.expenses : [])
            .slice()
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const totalIncome = incomeRows.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
        const totalExpense = expenseRows.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const balance = totalIncome - totalExpense;

        const orgName = "Unique Residency Mandal";
        // const orgName = (userAuthStore.getState().user && userAuthStore.getState().user.name)
        //     ? String(userAuthStore.getState().user.name).trim()
        //     : "Ganesh Mandal";
        const title = `${orgName} Report ${selectedYear}`;

        const doc = new jsPDF({ unit: "mm", format: "a4" });
        doc.setLineWidth(0.25);
        doc.setDrawColor(0, 0, 0);
        doc.setTextColor(0, 0, 0);

        const pageWidth = 210;
        const left = 14;
        const tableWidth = pageWidth - left * 2;
        const amountCol = 27;
        const labelCol = (tableWidth - amountCol * 2) / 2;
        const widths = [labelCol, amountCol, labelCol, amountCol];

        const entryH = 8;
        const headerH = 9;
        const totalsH = 8.5;
        const pageBreakAt = 280;

        const fmt = (n) => (n || 0).toLocaleString("en-IN");

        let y = 36;

        const drawRow = (cells, { height = entryH, bold = false, fillColor = null, fontSize = 9, centered = false } = {}) => {
            if (y + height > pageBreakAt) {
                doc.addPage();
                y = 18;
                drawHeader();
            }
            if (fillColor) {
                doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
                doc.rect(left, y, tableWidth, height, "FD");
            }
            doc.setFont("helvetica", bold ? "bold" : "normal");
            doc.setFontSize(fontSize);
            let cx = left;
            for (let i = 0; i < 4; i++) {
                doc.rect(cx, y, widths[i], height);
                const value = cells[i] !== undefined && cells[i] !== null ? String(cells[i]) : "";
                let align = "left";
                let textX = cx + 2.5;
                if (centered) {
                    align = "center";
                    textX = cx + widths[i] / 2;
                } else if (i % 2 === 1) {
                    align = "right";
                    textX = cx + widths[i] - 2.5;
                }
                doc.text(value, textX, y + height / 2 + 1.4, { align });
                cx += widths[i];
            }
            y += height;
        };

        const drawHeader = () => {
            drawRow(["Income", "Amount", "Expense", "Amount"], {
                height: headerH,
                bold: true,
                fontSize: 9.5,
                centered: true,
                fill: [243, 244, 246]
            });
        };

        // Centered report title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text(title, pageWidth / 2, 24, { align: "center" });

        // Four-column bordered table
        drawHeader();

        const maxRows = Math.max(incomeRows.length, expenseRows.length);
        for (let i = 0; i < maxRows; i++) {
            const inc = incomeRows[i];
            const exp = expenseRows[i];
            drawRow([
                inc ? inc.donorName : "",
                inc ? fmt(inc.amount) : "",
                exp ? exp.title : "",
                exp ? fmt(exp.amount) : ""
            ], { height: entryH, fontSize: 9 });
        }

        // Total Income (left) / Total Expense (right)
        drawRow(["Total Income", fmt(totalIncome), "Total Expense", fmt(totalExpense)], {
            height: totalsH,
            bold: true,
            fontSize: 9.5,
            fill: [243, 244, 246]
        });

        // Remaining Balance (right side, under expense column)
        drawRow(["", "", "Remaining Balance", fmt(balance)], { height: totalsH, bold: true, fontSize: 9.5 });

        // Final total / closing amount - balanced on both sides
        drawRow(["Final Total", fmt(totalIncome), "Final Total", fmt(totalIncome)], {
            height: totalsH,
            bold: true,
            fontSize: 9.5,
            fill: [243, 244, 246]
        });

        const safeOrg = orgName.replace(/[^\w-]+/g, "_");
        doc.save(`${safeOrg}_Financial_Report_${selectedYear}.pdf`);
        toast.success("PDF statement downloaded successfully");
    };

    // 2. Export PDF Function
    const handleExportPDF = async () => {
        if (!selectedYear) return;

        if (reportType === "overall") {
            setExportLoading(true);
            try {
                await exportFinancialReport();
            } catch (err) {
                toast.error("Failed to generate PDF statement");
                console.error(err);
            } finally {
                setExportLoading(false);
            }
            return;
        }

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
            doc.text("Metric Title", 20, currentY + 5.5);
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

            if (reportType === "overall") {
                // Resident Statistics Section
                if (currentY > 230) { doc.addPage(); currentY = 20; }

                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.text("Resident Household & Building Statistics", 14, currentY);
                currentY += 8;

                doc.setDrawColor(229, 231, 235);
                doc.setFillColor(249, 250, 251);
                doc.rect(14, currentY, 182, 8, "FD");
                doc.setFontSize(9);
                doc.text("Statistics", 20, currentY + 5.5);
                doc.text("Values", 140, currentY + 5.5);
                currentY += 8;
                doc.setFont("helvetica", "normal");

                const residentMetricRows = [
                    ["Registered Households", `${overview.totalHouseholds || 0}`],
                    ["Total Resident Population", `${overview.totalResidents || 0}`],
                    ["Expected Flats (configured)", `${overview.totalExpectedFlats || 0}`],
                    ["Registered Flats", `${overview.totalRegisteredFlats || 0}`],
                    ["Remaining / Unregistered Flats", `${overview.remainingFlats || 0}`],
                    ["Resident Household Donations", `Rs. ${(stats.totalResidentDonations || 0).toLocaleString("en-IN")}`],
                    ["External Donor Collections", `Rs. ${(stats.totalExternalDonorDonations || 0).toLocaleString("en-IN")}`]
                ];

                residentMetricRows.forEach(row => {
                    if (currentY > 270) { doc.addPage(); currentY = 20; }
                    doc.rect(14, currentY, 182, 8);
                    doc.text(row[0], 20, currentY + 5.5);
                    doc.setFont("helvetica", "bold");
                    doc.text(row[1], 140, currentY + 5.5);
                    doc.setFont("helvetica", "normal");
                    currentY += 8;
                });

                currentY += 8;

                // Building & Wing Summary Table
                if (overview.buildings && overview.buildings.length > 0) {
                    if (currentY > 230) { doc.addPage(); currentY = 20; }

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(13);
                    doc.text("Building-wise Flat Registration", 14, currentY);
                    currentY += 6;

                    doc.setFillColor(243, 244, 246);
                    doc.rect(14, currentY, 182, 8, "FD");
                    doc.setFontSize(8);
                    doc.text("Building", 16, currentY + 5.5);
                    doc.text("Expected", 58, currentY + 5.5);
                    doc.text("Registered", 92, currentY + 5.5);
                    doc.text("Households", 125, currentY + 5.5);
                    doc.text("Remaining", 150, currentY + 5.5);
                    doc.text("People", 172, currentY + 5.5);
                    currentY += 8;
                    doc.setFont("helvetica", "normal");

                    overview.buildings.forEach(b => {
                        if (currentY > 270) { doc.addPage(); currentY = 20; }
                        doc.rect(14, currentY, 182, 8);
                        doc.text(`Building ${b.building}`, 16, currentY + 5.5);
                        doc.text(`${b.expectedFlats}`, 58, currentY + 5.5);
                        doc.text(`${b.registeredFlats}`, 92, currentY + 5.5);
                        doc.text(`${b.households || b.registeredFlats}`, 125, currentY + 5.5);
                        doc.text(`${b.remainingFlats}`, 150, currentY + 5.5);
                        doc.text(`${b.people}`, 172, currentY + 5.5);
                        currentY += 8;
                    });

                    currentY += 12;
                }

                // Wing-wise Summary Table
                if (overview.wings && overview.wings.length > 0) {
                    if (currentY > 230) { doc.addPage(); currentY = 20; }

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(13);
                    doc.text("Wing-wise Flat Registration", 14, currentY);
                    currentY += 6;

                    doc.setFillColor(243, 244, 246);
                    doc.rect(14, currentY, 182, 8, "FD");
                    doc.setFontSize(8);
                    doc.text("Building & Wing", 16, currentY + 5.5);
                    doc.text("Expected", 58, currentY + 5.5);
                    doc.text("Registered", 92, currentY + 5.5);
                    doc.text("Households", 125, currentY + 5.5);
                    doc.text("Remaining", 150, currentY + 5.5);
                    doc.text("People", 172, currentY + 5.5);
                    currentY += 8;
                    doc.setFont("helvetica", "normal");

                    overview.wings.forEach(w => {
                        if (currentY > 270) { doc.addPage(); currentY = 20; }
                        doc.rect(14, currentY, 182, 8);
                        doc.text(`Building ${w.building} · Wing ${w.wing}`, 16, currentY + 5.5);
                        doc.text(`${w.expectedFlats}`, 58, currentY + 5.5);
                        doc.text(`${w.registeredFlats}`, 92, currentY + 5.5);
                        doc.text(`${w.registeredFlats}`, 125, currentY + 5.5);
                        doc.text(`${w.remainingFlats}`, 150, currentY + 5.5);
                        doc.text(`${w.people}`, 172, currentY + 5.5);
                        currentY += 8;
                    });

                    currentY += 12;
                }

                // Unregistered Flats Section
                if (overview.unregisteredFlats && overview.unregisteredFlats.length > 0) {
                    if (currentY > 230) { doc.addPage(); currentY = 20; }

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(13);
                    doc.text("Flats Not Yet Registered", 14, currentY);
                    currentY += 6;

                    doc.setFillColor(243, 244, 246);
                    doc.rect(14, currentY, 182, 8, "FD");
                    doc.setFontSize(8);
                    doc.text("Building & Wing", 16, currentY + 5.5);
                    doc.text("Unregistered Flats", 58, currentY + 5.5);
                    currentY += 8;
                    doc.setFont("helvetica", "normal");

                    overview.unregisteredFlats.forEach(u => {
                        if (currentY > 270) { doc.addPage(); currentY = 20; }
                        doc.rect(14, currentY, 182, 8);
                        doc.text(`Building ${u.building} · Wing ${u.wing}`, 16, currentY + 5.5);
                        doc.text(u.flats.join(", "), 58, currentY + 5.5);
                        currentY += 8;
                    });

                    currentY += 12;
                }

                // Mahaprasad Planning Section
                if (currentY > 230) { doc.addPage(); currentY = 20; }

                doc.setFont("helvetica", "bold");
                doc.setFontSize(13);
                doc.text("Mahaprasad Planning (Resident Population Only)", 14, currentY);
                currentY += 6;

                doc.setFillColor(243, 244, 246);
                doc.rect(14, currentY, 182, 8, "FD");
                doc.setFontSize(8);
                doc.text("Planning Metric", 16, currentY + 5.5);
                doc.text("Value", 140, currentY + 5.5);
                currentY += 8;
                doc.setFont("helvetica", "normal");

                const mahaprasadMetricRows = [
                    ["Registered Households", `${mahaprasad.registeredHouseholds || 0}`],
                    ["Total Resident People", `${mahaprasad.totalPeople || 0}`],
                    ["Expected Attendance %", `${mahaprasad.expectedAttendancePercentage || 0}%`],
                    ["Safety Buffer %", `${mahaprasad.safetyBufferPercentage || 0}%`],
                    ["Expected Attendees", `${mahaprasad.expectedAttendance || 0}`],
                    ["Recommended Meals", `${mahaprasad.recommendedMeals || 0}`]
                ];

                mahaprasadMetricRows.forEach(row => {
                    if (currentY > 270) { doc.addPage(); currentY = 20; }
                    doc.rect(14, currentY, 182, 8);
                    doc.text(row[0], 20, currentY + 5.5);
                    doc.setFont("helvetica", "bold");
                    doc.text(row[1], 140, currentY + 5.5);
                    doc.setFont("helvetica", "normal");
                    currentY += 8;
                });

                currentY += 15;
            }

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
                    doc.text("Donor Name", 42, currentY + 5.5);
                    doc.text("Type", 92, currentY + 5.5);
                    doc.text("Method", 112, currentY + 5.5);
                    doc.text("Date", 135, currentY + 5.5);
                    doc.text("Amount (Rs.)", 168, currentY + 5.5);

                    currentY += 8;
                    doc.setFont("helvetica", "normal");

                    res.data.donations.forEach(don => {
                        if (currentY > 270) { doc.addPage(); currentY = 20; }
                        const typeLabel = don.donorType === "resident" ? "RES" : don.donorType === "external" ? "EXT" : "REG";
                        doc.rect(14, currentY, 182, 8);
                        doc.text(don.receiptNumber, 16, currentY + 5.5);
                        doc.text(don.donorName.substring(0, 26), 42, currentY + 5.5);
                        doc.text(typeLabel, 92, currentY + 5.5);
                        doc.text(don.paymentMethod.toUpperCase(), 112, currentY + 5.5);
                        doc.text(formatDate(don.date), 135, currentY + 5.5);
                        doc.text(don.amount.toLocaleString("en-IN"), 168, currentY + 5.5);
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
                    csvContent += "Receipt Number,Donor Name,Donor Type,Flat,Amount,Payment Method,Phone,Date,Note\n";
                    res.data.donations.forEach(don => {
                        const typeLabel = don.donorType === "resident" ? "RESIDENT" : don.donorType === "external" ? "EXTERNAL" : "REGULAR";
                        const flatInfo = don.household ? `B${don.household.building} Wing ${don.household.wing} Flat ${don.household.flatNumber}` : "";
                        csvContent += `"${don.receiptNumber}","${don.donorName.replace(/"/g, '""')}","${typeLabel}","${flatInfo}",${don.amount},"${don.paymentMethod}","${don.phone || ""}","${formatDate(don.date)}","${(don.note || "").replace(/"/g, '""')}"\n`;
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
