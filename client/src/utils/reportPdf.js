import { jsPDF } from "jspdf";

const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN");

const formatDate = (d) => {
    if (!d) return "-";
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
};

/**
 * Common PDF layout builder matching the exact Overall Ledger theme:
 * - A4 Portrait (210 x 297 mm)
 * - 14mm margins (182mm table width)
 * - Pure white background (no gray fills)
 * - 0.25mm black grid lines
 * - Centered bold title at top (fontSize: 15)
 * - Clean bold headers and totals
 */
const createTablePdf = ({ title, festivalYear, orgName = "Unique Residency Mandal" }) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210;
    const left = 14;
    const tableWidth = pageWidth - left * 2; // 182mm
    const pageBreakAt = 280;

    doc.setLineWidth(0.25);
    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);

    const fullTitle = `${orgName} ${title} ${festivalYear}`.replace(/\s+/g, " ").trim();

    // Centered Report Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(fullTitle, pageWidth / 2, 24, { align: "center" });

    let y = 36;

    const drawRow = (cells, widths, {
        height = 8,
        bold = false,
        fontSize = 9,
        alignments = [],
        headerCentered = false,
        onPageBreak = null
    } = {}) => {
        if (y + height > pageBreakAt) {
            doc.addPage();
            y = 18;
            if (onPageBreak) onPageBreak();
        }

        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        doc.setTextColor(0, 0, 0);

        let cx = left;
        for (let i = 0; i < widths.length; i++) {
            doc.rect(cx, y, widths[i], height);
            const value = cells[i] !== undefined && cells[i] !== null ? String(cells[i]) : "";

            let align = alignments[i] || "left";
            let textX = cx + 2.5;

            if (headerCentered) {
                align = "center";
                textX = cx + widths[i] / 2;
            } else if (align === "center") {
                textX = cx + widths[i] / 2;
            } else if (align === "right") {
                textX = cx + widths[i] - 2.5;
            }

            doc.text(value, textX, y + height / 2 + 1.4, { align });
            cx += widths[i];
        }
        y += height;
    };

    const save = (fileBase) => {
        const safeOrg = orgName.replace(/[^\w-]+/g, "_");
        doc.save(`${safeOrg}_${fileBase}_${festivalYear}.pdf`);
    };

    return {
        doc,
        pageWidth,
        left,
        tableWidth,
        drawRow,
        save
    };
};

/**
 * 1. Overall Financial Report (Income & Expense Balanced Ledger)
 */
export const exportOverallFinancialReport = ({
    festivalYear,
    incomeRows = [],
    expenseRows = [],
    orgName = "Unique Residency Mandal"
}) => {
    const totalIncome = incomeRows.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const totalExpense = expenseRows.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const balance = totalIncome - totalExpense;

    const pdf = createTablePdf({
        title: "Report",
        festivalYear,
        orgName
    });

    const amountCol = 27;
    const labelCol = (pdf.tableWidth - amountCol * 2) / 2; // (182 - 54) / 2 = 64
    const widths = [labelCol, amountCol, labelCol, amountCol];
    const alignments = ["left", "right", "left", "right"];

    const drawHeader = () => {
        pdf.drawRow(["Income", "Amount", "Expense", "Amount"], widths, {
            height: 9,
            bold: true,
            fontSize: 9.5,
            headerCentered: true
        });
    };

    drawHeader();

    const maxRows = Math.max(incomeRows.length, expenseRows.length);
    for (let i = 0; i < maxRows; i++) {
        const inc = incomeRows[i];
        const exp = expenseRows[i];
        pdf.drawRow([
            inc ? inc.donorName : "",
            inc ? fmt(inc.amount) : "",
            exp ? exp.title : "",
            exp ? fmt(exp.amount) : ""
        ], widths, {
            height: 8,
            fontSize: 9,
            alignments,
            onPageBreak: drawHeader
        });
    }

    // Total Income (left) / Total Expense (right)
    pdf.drawRow(["Total Income", fmt(totalIncome), "Total Expense", fmt(totalExpense)], widths, {
        height: 8.5,
        bold: true,
        fontSize: 9.5,
        alignments,
        onPageBreak: drawHeader
    });

    // Remaining Balance (right side)
    pdf.drawRow(["", "", "Remaining Balance", fmt(balance)], widths, {
        height: 8.5,
        bold: true,
        fontSize: 9.5,
        alignments,
        onPageBreak: drawHeader
    });

    // Final total / closing amount - balanced on both sides
    pdf.drawRow(["Final Total", fmt(totalIncome), "Final Total", fmt(totalIncome)], widths, {
        height: 8.5,
        bold: true,
        fontSize: 9.5,
        alignments,
        onPageBreak: drawHeader
    });

    pdf.save("Financial_Report");
};

/**
 * 2. Donations Report (Exact same theme and grid structure)
 */
export const exportDonationsReport = ({
    festivalYear,
    donations = [],
    orgName = "Unique Residency Mandal"
}) => {
    const pdf = createTablePdf({
        title: "Donations Report",
        festivalYear,
        orgName
    });

    // 4 columns matching tableWidth = 182mm
    // Receipt # (32) + Donor Name (85) + Date (35) + Amount (30) = 182
    const widths = [32, 85, 35, 30];
    const alignments = ["center", "left", "center", "right"];

    const drawHeader = () => {
        pdf.drawRow(["Receipt #", "Donor Name", "Date", "Amount"], widths, {
            height: 9,
            bold: true,
            fontSize: 9.5,
            headerCentered: true
        });
    };

    drawHeader();

    const sorted = [...donations].sort((a, b) => new Date(a.date) - new Date(b.date));
    const totalIncome = sorted.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    sorted.forEach((don) => {
        pdf.drawRow([
            don.receiptNumber || "-",
            don.donorName || "",
            formatDate(don.date),
            fmt(don.amount)
        ], widths, {
            height: 8,
            fontSize: 9,
            alignments,
            onPageBreak: drawHeader
        });
    });

    // Total Income
    pdf.drawRow(["Total Income", "", "", fmt(totalIncome)], widths, {
        height: 8.5,
        bold: true,
        fontSize: 9.5,
        alignments: ["left", "left", "left", "right"],
        onPageBreak: drawHeader
    });

    // Final Total
    pdf.drawRow(["Final Total", "", "", fmt(totalIncome)], widths, {
        height: 8.5,
        bold: true,
        fontSize: 9.5,
        alignments: ["left", "left", "left", "right"],
        onPageBreak: drawHeader
    });

    pdf.save("Donations_Report");
};

/**
 * 3. Expenses Report (Exact same theme and grid structure)
 */
export const exportExpensesReport = ({
    festivalYear,
    expenses = [],
    orgName = "Unique Residency Mandal"
}) => {
    const pdf = createTablePdf({
        title: "Expenses Report",
        festivalYear,
        orgName
    });

    // 4 columns matching tableWidth = 182mm
    // Expense (85) + Category (35) + Date (32) + Amount (30) = 182
    const widths = [85, 35, 32, 30];
    const alignments = ["left", "left", "center", "right"];

    const drawHeader = () => {
        pdf.drawRow(["Expense", "Category", "Date", "Amount"], widths, {
            height: 9,
            bold: true,
            fontSize: 9.5,
            headerCentered: true
        });
    };

    drawHeader();

    const sorted = [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));
    const totalExpense = sorted.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    sorted.forEach((exp) => {
        pdf.drawRow([
            exp.title || "",
            exp.category || "-",
            formatDate(exp.date),
            fmt(exp.amount)
        ], widths, {
            height: 8,
            fontSize: 9,
            alignments,
            onPageBreak: drawHeader
        });
    });

    // Total Expense
    pdf.drawRow(["Total Expense", "", "", fmt(totalExpense)], widths, {
        height: 8.5,
        bold: true,
        fontSize: 9.5,
        alignments: ["left", "left", "left", "right"],
        onPageBreak: drawHeader
    });

    // Final Total
    pdf.drawRow(["Final Total", "", "", fmt(totalExpense)], widths, {
        height: 8.5,
        bold: true,
        fontSize: 9.5,
        alignments: ["left", "left", "left", "right"],
        onPageBreak: drawHeader
    });

    pdf.save("Expenses_Report");
};
