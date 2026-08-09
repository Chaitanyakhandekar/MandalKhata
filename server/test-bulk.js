import mongoose from "mongoose";
import XLSX from "xlsx";
import connectDB from "./src/db/db.js";
import { httpServer } from "./src/server.js";

const PORT = 8011;
const BASE = `http://localhost:${PORT}`;

let cookie = "";
let pass = 0;

const request = async (path, { method = "GET", body, headers = {}, raw } = {}) => {
    const response = await fetch(`${BASE}${path}`, {
        method,
        headers: Object.assign(
            {},
            body && !raw ? { "Content-Type": "application/json" } : {},
            cookie ? { Cookie: cookie } : {},
            headers
        ),
        body: body
    });
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }
    return { status: response.status, data, headers: response.headers };
};

const expect = (condition, label) => {
    if (condition) {
        console.log(`  PASS  ${label}`);
        pass++;
    } else {
        console.log(`  FAIL  ${label}`);
        process.exitCode = 1;
    }
};

const TEMPLATE_HEADERS = {
    buildings: ["Building (Required)", "Wing (Required)", "Flat Start (Required)", "Flat End (Required)", "Remarks (Optional)"],
    households: ["Building (Required)", "Wing (Required)", "Flat Number (Required)", "Head of Family (Required)", "Member Count (Optional)", "Phone (Optional)", "Active (Optional)"],
    donations: ["Donor Type (Required)", "Donor Name (Optional)", "Building (Optional)", "Wing (Optional)", "Flat Number (Optional)", "Amount (Required)", "Payment Method (Optional)", "Phone (Optional)", "Organization Name (Optional)", "Donor Category (Optional)", "Date (Optional)", "Festival Year (Optional)", "Note (Optional)"],
    expenses: ["Title (Required)", "Category (Required)", "Amount (Required)", "Vendor Name (Optional)", "Payment Status (Optional)", "Date (Optional)", "Festival Year (Optional)", "Note (Optional)"]
};

async function uploadAndPreview(type, rows) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS[type], ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const form = new FormData();
    form.append("type", type);
    form.append("file", new Blob([buffer]), `test-${type}.xlsx`);
    return request("/api/bulk-import/upload", { method: "POST", body: form, raw: true });
}

async function confirm(type, dataRows) {
    return request("/api/bulk-import/confirm", {
        method: "POST",
        body: JSON.stringify({ type, rows: dataRows })
    });
}

console.log("Connecting to MongoDB...");
await connectDB();
await new Promise((resolve) => httpServer.listen(PORT, resolve));
console.log(`Test server listening on :${PORT}`);
console.log("---");

const email = `bulk${Date.now()}@test.com`;
const reg = await request("/api/users/register", {
    method: "POST",
    body: JSON.stringify({ name: "Bulk Tester", email, password: "Test1234!" })
});
expect(reg.status === 201, "register user");

const login = await request("/api/users/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "Test1234!" })
});
expect(login.status === 200, "login user");
const setCookie = login.headers.get("set-cookie") || "";
cookie = setCookie.split(";")[0];

const festival = await request("/api/festivals", {
    method: "POST",
    body: JSON.stringify({ year: "2077", isActive: true })
});
expect(festival.status === 201, "create festival year");

// ---- Template downloads -----------------------------------------------------
const tplBuildings = await request("/api/bulk-import/templates/buildings?format=xlsx");
expect(tplBuildings.status === 200, "BUILDINGS xlsx template downloads");
const tplBuildingsCsv = await request("/api/bulk-import/templates/buildings?format=csv");
expect(tplBuildingsCsv.status === 200 && tplBuildingsCsv.data.startsWith("# TEMPLATE: Buildings"), "BUILDINGS csv template downloads with header");
const tplBad = await request("/api/bulk-import/templates/nope?format=xlsx");
expect(tplBad.status === 400, "invalid template type rejected");
const tplBadFormat = await request("/api/bulk-import/templates/buildings?format=txt");
expect(tplBadFormat.status === 400, "invalid template format rejected");

// ---- buildings file ---------------------------------------------------------
const buildingsRows = [
    [1, "A", 101, 120],
    [1, "A", 121, 140],
    [1, "A", 130, 150],
    [2, "B", 201, 240],
    ["x", "C", 10, 20],
    [3, "D", 50, 40]
];
const buildingsPreview = await uploadAndPreview("buildings", buildingsRows);
if (buildingsPreview.status !== 200) console.log("PREVIEW RESPONSE:", JSON.stringify(buildingsPreview.data).slice(0, 2000));
const csvDebug = JSON.stringify(tplBuildingsCsv.data).slice(0, 300);
console.log("CSV DEBUG:", csvDebug);
expect(buildingsPreview.status === 200 && buildingsPreview.data.data.totalRows === 6, "buildings preview total 6 rows");
expect(buildingsPreview.data.data.validRows === 3, "buildings preview 3 valid (create)");
expect(buildingsPreview.data.data.duplicateRows === 1, "buildings preview 1 intra-file duplicate");
expect(buildingsPreview.data.data.invalidRows === 2, "buildings preview 2 invalid (bad building, start>end)");

const buildingsConfirm = await confirm("buildings", buildingsPreview.data.data.data);
expect(buildingsConfirm.data.data && buildingsConfirm.data.data.imported === 3, "buildings confirm imports 3 ranges");
expect(buildingsConfirm.data.data.updated === 0, "buildings confirm nothing extends existing");

// ---- households file --------------------------------------------------------
const householdsRows = [
    [1, "A", 101, "Arjun Mehta", 4, "9876543210", "Yes"],
    [1, "A", 101, "Duplicate Person"],
    [1, "A", 102, "Sunita Sharma", 3, "", "Yes"],
    [9, "Z", 5, "Ghost"],
    [1, "A", 9999, "Out Range"],
    [1, "A", 103, ""]
];
const householdsPreview = await uploadAndPreview("households", householdsRows);
expect(householdsPreview.status === 200 && householdsPreview.data.data.totalRows === 6, "households preview total 6");
expect(householdsPreview.data.data.validRows === 2, "households preview 2 valid");
expect(householdsPreview.data.data.duplicateRows === 1, "households preview 1 in-file duplicate");
expect(householdsPreview.data.data.invalidRows === 3, "households preview 3 invalid (no config, out of range, empty head)");

const householdsConfirm = await confirm("households", householdsPreview.data.data.data);
expect(householdsConfirm.data.data.imported === 2, "households confirm imported 2");

// ---- donations file ----------------------------------------------------------
const donationsRows = [
    ["Resident", "", 1, "A", 101, 1500, "Cash", "9876543210", "", "", "2026-08-01", "2077", "Test resident donation"],
    ["Resident", "", 1, "A", 777, 2000, "UPI", "", "", "", "", "2077", ""],
    ["External Donor", "Ramesh Patel", "", "", "", 3000, "Bank", "", "Patel Traders", "Business", "2026-08-02", "2077", ""],
    ["", "Anonymous", "", "", "", 100, "Cash", "", "", "", "", "2077", ""]
];
const donationsPreview = await uploadAndPreview("donations", donationsRows);
expect(donationsPreview.status === 200 && donationsPreview.data.data.totalRows === 4, "donations preview total 4");
expect(donationsPreview.data.data.validRows === 2, "donations preview 2 valid (1 resident + 1 external)");
expect(donationsPreview.data.data.invalidRows === 2, "donations preview 2 invalid (no household, missing donor type)");

const donationsConfirm = await confirm("donations", donationsPreview.data.data.data);
expect(donationsConfirm.data.data.imported === 2, "donations confirm imported 2");

// ---- expenses file -----------------------------------------------------------
const expensesRows = [
    ["Stage Setup", "Sound", 50000, "Mandal Sound", "Paid", "2026-08-01", "2077", "x"],
    ["Deco Work", "decor", 1000, "", "", "2026-08-02", "", "auto year + normalized category"],
    ["Bad Cat", "WrongCat", 10, "", "", "", "", ""],
    ["No Amount", "Lighting", "", "", "", "", "", ""]
];
const expensesPreview = await uploadAndPreview("expenses", expensesRows);
if (!expensesPreview.data.data) {
    const norm = (s) => String(s).toLowerCase().replace(/[()*]/g, "").replace(/\b(required|optional)\b/g, "").replace(/[\s\-_]+/g, " ").trim();
    console.log("NORMALIZED LOCALLY:", TEMPLATE_HEADERS.expenses.map(norm).join(" | "));
    console.log("EXPENSES PREVIEW RESPONSE:", JSON.stringify(expensesPreview.data).slice(0, 1200));
}
expect(expensesPreview.status === 200 && expensesPreview.data.data.totalRows === 4, "expenses preview total 4");
expect(expensesPreview.data.data.validRows === 2, "expenses preview 2 valid");
expect(expensesPreview.data.data.invalidRows === 2, "expenses preview 2 invalid (category, amount)");
expect(expensesPreview.data.data.warnings.length === 1, "expenses preview 1 category-mapping warning");
if (expensesPreview.data.data.warnings.length !== 1) console.log("EXPENSES WARNINGS:", JSON.stringify(expensesPreview.data.data.warnings));

const expensesConfirm = await confirm("expenses", expensesPreview.data.data.data);
expect(expensesConfirm.data.data.imported === 2, "expenses confirm imported 2");

// ---- Database verification -----------------------------------------------------
const user = await mongoose.models.User.findOne({ email });
expect(user !== null, "user exists in db");

const configCount = await mongoose.models.BuildingConfig.countDocuments({ createdBy: user._id });
const householdCount = await mongoose.models.Household.countDocuments({ createdBy: user._id });
const donationCount = await mongoose.models.Donation.countDocuments({ createdBy: user._id });
const expenseCount = await mongoose.models.Expense.countDocuments({ createdBy: user._id });
const donorCount = await mongoose.models.ExternalDonor.countDocuments({ createdBy: user._id });
expect(configCount === 2, `db: 2 building configs found (${configCount})`);
expect(householdCount === 2, `db: 2 households found (${householdCount})`);
expect(donationCount === 2, `db: 2 donations found (${donationCount})`);
expect(expenseCount === 2, `db: 2 expenses found (${expenseCount})`);
expect(donorCount === 1, `db: 1 external donor created (${donorCount})`);

const receipt = await mongoose.models.Donation.findOne({ createdBy: user._id, donorType: "resident" });
expect(receipt && String(receipt.receiptNumber).startsWith("MK-2077-"), `db: resident receipt number MK-2077-xxxx (${receipt ? receipt.receiptNumber : "none"})`);
const residentHousehold = await mongoose.models.Household.findOne({ createdBy: user._id, flatNumber: 101 });
expect(receipt && receipt.household && String(receipt.household) === String(residentHousehold._id), "db: resident donation linked to household at flat 101");

const dashResponse = await request("/api/reports/dashboard?festivalYear=2077");
const dash = dashResponse.data.data;
expect(dash.totalDonations === 4500, `dashboard total donations = 4500 (${dash.totalDonations})`);
expect(dash.totalExpenses === 51000, `dashboard total expenses = 51000 (${dash.totalExpenses})`);
expect(dash.totalResidentDonations === 1500, `dashboard resident donations = 1500 (${dash.totalResidentDonations})`);
expect(dash.totalExternalDonorDonations === 3000, `dashboard external donations = 3000 (${dash.totalExternalDonorDonations})`);
expect(dash.residentStats.totalHouseholds === 2, "dashboard registered households = 2");
expect(dash.residentStats.totalRegisteredFlats === 2, "dashboard registered flats = 2");
expect(dash.residentStats.totalExpectedFlats === 80, `dashboard expected flats = 80 (${dash.residentStats.totalExpectedFlats})`);
expect(dash.mahaprasad.registeredHouseholds === 2, "dashboard mahaprasad registeredHouseholds = 2");

// ---- Repeat preview/confirm is safe (no duplicates written) --------------------
const rePreview = await uploadAndPreview("buildings", buildingsRows);
if (!(rePreview.data.data.validRows === 0 && rePreview.data.data.duplicateRows === 4)) console.log("REPREVIEW:", JSON.stringify(rePreview.data.data).slice(0, 800));
expect(rePreview.data.data.validRows === 0 && rePreview.data.data.duplicateRows === 4, "re-preview buildings: 0 valid, 4 duplicates (everything overlaps existing)");
const reConfirm = await confirm("buildings", rePreview.data.data.data);
expect(reConfirm.status === 400 && String(reConfirm.data.message || "").includes("Nothing to import"), "re-confirm with 0 valid rows is rejected (nothing to import)");
const configCountAfterReimport = await mongoose.models.BuildingConfig.countDocuments({ createdBy: user._id });
expect(configCountAfterReimport === 2, "config count unchanged after re-confirm");

// ---- error report -------------------------------------------------------------
const report = await request("/api/bulk-import/error-report", {
    method: "POST",
    body: JSON.stringify({ type: "households", fileName: "test-file.xlsx", statuses: householdsPreview.data.data.errors })
});
expect(report.status === 200 && report.data.includes("Row Number") && report.data.includes("Reason"), "error report CSV generated");

console.log("---");
console.log(`${process.exitCode === 1 ? "SOME TESTS FAILED" : "ALL TESTS PASSED"} (${pass} expectations)`);
process.exit(process.exitCode || 0);