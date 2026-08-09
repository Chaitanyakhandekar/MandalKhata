import XLSX from "xlsx";
import { BuildingConfig } from "../models/buildingConfig.model.js";
import { Household } from "../models/household.model.js";
import { Donation } from "../models/donation.model.js";
import { Expense } from "../models/expense.model.js";
import { ExternalDonor } from "../models/externalDonor.model.js";
import { FestivalYear } from "../models/festivalYear.model.js";
import {
    isValidRange,
    findOverlappingRanges,
    isFlatInRanges,
    describeRanges,
    normalizeConfigRanges
} from "../utils/flatRanges.util.js";

const TEMPLATE_TYPES = ["buildings", "households", "donations", "expenses"];

const PHONE_REGEX = /^[0-9+\-\s]{7,15}$/;
const WING_REGEX = /^[A-Z0-9]{1,5}$/;
const EXPENSE_CATEGORIES = ["Decoration", "Sound", "Lighting", "Food", "Security", "Visarjan", "Miscellaneous"];
const DONOR_CATEGORIES = ["Individual", "Business", "Organization", "Shop", "Well-wisher"];

// ---------------------------------------------------------------------------
// Template definitions - single source of truth for all four import types
// ---------------------------------------------------------------------------

const TEMPLATES = {
    buildings: {
        name: "Buildings",
        headers: ["Building (Required)", "Wing (Required)", "Flat Start (Required)", "Flat End (Required)", "Remarks (Optional)"],
        sample: [
            [1, "A", 101, 120],
            [2, "B", 201, 240]
        ],
        instructions: [
            "One row per flat range (e.g. flats 101 to 120 in a single row).",
            "Required: Building (number), Wing (1 to 5 letters/digits, e.g. A), Flat Start, Flat End.",
            "Flat Start must be less than or equal to Flat End.",
            "Ranges for the same Building + Wing must not overlap - neither with other rows",
            "in this file, nor with ranges that are already configured.",
            "Importing adds new ranges to a Building + Wing. Existing ranges are never",
            "overwritten or deleted; overlapping ranges are rejected as duplicates.",
            "Remarks (Optional) is kept for reference only and is not stored."
        ]
    },
    households: {
        name: "Households / Residents",
        headers: ["Building (Required)", "Wing (Required)", "Flat Number (Required)", "Head of Family (Required)", "Member Count (Optional)", "Phone (Optional)", "Active (Optional)"],
        sample: [
            [1, "A", 101, "Arjun Mehta", 4, "9876543210", "Yes"],
            [1, "A", 102, "Sunita Sharma", 3, "9123456780", "Yes"]
        ],
        instructions: [
            "One row per flat.",
            "Required: Building, Wing, Flat Number, Head of Family (occupant name).",
            "The Building + Wing must already exist (import the Buildings template first) and",
            "the flat must be inside the configured flat ranges, otherwise the row is invalid.",
            "If an active household already exists for the same Building + Wing + Flat the row",
            "is reported as a duplicate and skipped - nothing is ever overwritten.",
            "Member Count (optional, at least 1, defaults to 1), Phone (optional),",
            "Active (Yes/No, defaults to Yes).",
            "Imported households are linked to their flat and automatically participate in",
            "registered-flat counts, resident population, building-wise and wing-wise",
            "statistics and Mahaprasad calculations."
        ]
    },
    donations: {
        name: "Donations",
        headers: ["Donor Type (Required)", "Donor Name (Optional)", "Building (Optional)", "Wing (Optional)", "Flat Number (Optional)", "Amount (Required)", "Payment Method (Optional)", "Phone (Optional)", "Organization Name (Optional)", "Donor Category (Optional)", "Date (Optional)", "Festival Year (Optional)", "Note (Optional)"],
        sample: [
            ["Resident", "", 1, "A", 101, 1500, "Cash", "9876543210", "", "", "2026-08-01", "2026", "Ganesh festival donation"],
            ["External Donor", "Ramesh Patel", "", "", "", 1000, "UPI", "", "Patel Traders", "Business", "2026-08-02", "2026", ""]
        ],
        instructions: [
            "Donor must be 'Resident' or 'External Donor'.",
            "RESIDENT: Building, Wing and Flat Number are required. The donation is linked to",
            "the household living at that flat. If no household is registered at the flat the",
            "row is reported as an error - import the Households template first or use the",
            "manual donation flow. A resident donation is never attached to an unrelated",
            "household.",
            "EXTERNAL DONOR: Donor Name is required; Building/Wing/Flat must be left blank.",
            "Organization Name and Donor Category (Individual, Business, Organization, Shop,",
            "Well-wisher) are optional. External donations stay separate from residents and",
            "never affect resident population or Mahaprasad calculations.",
            "Amount is required and must not be negative.",
            "Payment Method: Cash / UPI / Bank (blank defaults to Cash; Google Pay, PhonePe",
            "etc. are imported as UPI).",
            "Date: YYYY-MM-DD (blank uses the current date). Festival Year: the 4-digit year",
            "(e.g. 2026) shown in the app's year selector - blank uses the active festival year."
        ]
    },
    expenses: {
        name: "Expenses",
        headers: ["Title (Required)", "Category (Required)", "Amount (Required)", "Vendor Name (Optional)", "Payment Status (Optional)", "Date (Optional)", "Festival Year (Optional)", "Note (Optional)"],
        sample: [
            ["Stage and Sound Setup", "Sound", 50000, "Mandal Sound Co.", "Paid", "2026-07-20", "2026", "Main stage"],
            ["Ganesh Murti", "Miscellaneous", 25000, "", "Pending", "2026-08-01", "", ""]
        ],
        instructions: [
            "Required: Title, Category, Amount.",
            "Category must be one of the existing categories: Decoration, Sound, Lighting, Food,",
            "Security, Visarjan, Miscellaneous (common variations like 'decor' or 'bhog' are",
            "mapped automatically and reported as warnings).",
            "Payment Status: Paid / Pending (blank defaults to Paid).",
            "Vendor Name, Date (YYYY-MM-DD, blank uses the current date), Festival Year",
            "(4-digit year such as 2026, blank uses the active festival year) and Note are optional."
        ]
    }
};

// ---------------------------------------------------------------------------
// Header normalisation -> canonical field map (shared by all four types)
// ---------------------------------------------------------------------------

const HEADER_ALIASES = {
    building: ["building"],
    wing: ["wing"],
    flatStart: ["flat start", "flatstart", "from flat", "range start", "start flat", "start"],
    flatEnd: ["flat end", "flatend", "to flat", "range end", "end flat", "end"],
    headOfFamily: ["head of family", "headoffamily", "head of", "occupant name", "occupant", "resident name", "name"],
    memberCount: ["member count", "membercount", "members", "family size", "family count"],
    phone: ["phone", "mobile", "contact", "phone number", "mobile number", "contact number"],
    active: ["active", "status"],
    donorType: ["donor type", "donortype", "type"],
    donorName: ["donor name", "donorname", "name"],
    flatNumber: ["flat number", "flatnumber", "flat no", "flat no.", "flat"],
    amount: ["amount", "donation amount", "expense amount"],
    paymentMethod: ["payment method", "paymentmethod", "method"],
    date: ["date", "donation date", "expense date"],
    festivalYear: ["festival year", "festivalyear", "year"],
    note: ["note", "remarks", "comment", "comments"],
    title: ["title", "expense title", "description", "expense description"],
    category: ["category", "expense category"],
    vendorName: ["vendor name", "vendorname", "vendor"],
    paymentStatus: ["payment status", "paymentstatus", "status"],
    organizationName: ["organization name", "organizationname", "organisation name", "organisation", "business name", "business"],
    donorCategory: ["donor category", "donorcategory", "category of donor", "category of donation"]
};

const FIELD_BY_HEADER_KEY = {};
Object.keys(HEADER_ALIASES).forEach((field) => {
    HEADER_ALIASES[field].forEach((alias) => {
        FIELD_BY_HEADER_KEY[normalizeHeader(alias)] = field;
    });
});

const FIELD_LABELS = {
    building: "Building",
    wing: "Wing",
    flatStart: "Flat Start",
    flatEnd: "Flat End",
    headOfFamily: "Head of Family",
    memberCount: "Member Count",
    phone: "Phone",
    active: "Active",
    donorType: "Donor Type",
    donorName: "Donor Name",
    flatNumber: "Flat Number",
    amount: "Amount",
    paymentMethod: "Payment Method",
    date: "Date",
    festivalYear: "Festival Year",
    note: "Note",
    title: "Title",
    category: "Category",
    vendorName: "Vendor Name",
    paymentStatus: "Payment Status",
    organizationName: "Organization Name",
    donorCategory: "Donor Category"
};

function normalizeHeader(name) {
    return String(name)
        .toLowerCase()
        .replace(/[()*]/g, "")
        .replace(/\b(required|optional)\b/g, "")
        .replace(/[\s\-_]+/g, " ")
        .trim();
}

function buildColumnMap(headerRow) {
    const map = {};
    headerRow.forEach((header, index) => {
        const field = FIELD_BY_HEADER_KEY[normalizeHeader(header)];
        if (field && map[field] === undefined) {
            map[field] = index;
        }
    });
    return map;
}

// ---------------------------------------------------------------------------
// Cell parsing helpers
// ---------------------------------------------------------------------------

const cellText = (row, index) => {
    if (index === undefined || index === null) return "";
    const value = row[index];
    if (value === undefined || value === null) return "";
    return String(value).trim();
};

const cellNumber = (row, index) => {
    if (index === undefined || index === null) return null;
    const value = row[index];
    if (value === undefined || value === null || String(value).trim() === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const parseYesNo = (value) => {
    if (value === undefined || value === null || String(value).trim() === "") return null;
    const s = String(value).trim().toLowerCase();
    if (["yes", "y", "true", "1", "active", "enabled"].includes(s)) return true;
    if (["no", "n", "false", "0", "inactive", "disabled"].includes(s)) return false;
    return null;
};

const parseDate = (value) => {
    if (value === undefined || value === null) return null;
    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : new Date(value.getTime());
    }
    const s = String(value).trim();
    if (!s) return null;
    let match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (match) {
        const result = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        return isNaN(result.getTime()) ? null : result;
    }
    match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (match) {
        let year = Number(match[3]);
        if (year < 100) year = year > 40 ? 1900 + year : 2000 + year;
        const result = new Date(year, Number(match[2]) - 1, Number(match[1]));
        return isNaN(result.getTime()) ? null : result;
    }
    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? null : parsed;
};

const normalizePaymentMethod = (value) => {
    const s = String(value === undefined || value === null || value === "" ? "cash" : value).trim().toLowerCase();
    if (["cash", "check", "cheque"].includes(s)) return "cash";
    if (["upi", "gpay", "google pay", "googlepay", "phonepe", "paytm", "bhim"].includes(s)) return "upi";
    if (["bank", "bank transfer", "banktransfer", "transfer", "neft", "rtgs", "banking"].includes(s)) return "bank";
    return null;
};

const normalizeDonorType = (value) => {
    const s = String(value === undefined || value === null || value === "" ? "" : value).trim().toLowerCase();
    if (!s) return null;
    if (s.startsWith("resident") || s.startsWith("residential")) return "resident";
    if (s.includes("external") || s === "donor" || s === "outside") return "external";
    return null;
};

const normalizeCategory = (value) => {
    const s = String(value === undefined || value === null || value === "" ? "" : value).trim().toLowerCase();
    if (!s) return null;
    const exact = EXPENSE_CATEGORIES.find((c) => c.toLowerCase() === s);
    if (exact) return { value: exact, normalized: false };
    if (s.startsWith("deco")) return { value: "Decoration", normalized: true };
    if (s.startsWith("sound") || s.includes("speaker") || s.includes("dj")) return { value: "Sound", normalized: true };
    if (s.startsWith("light")) return { value: "Lighting", normalized: true };
    if (s.startsWith("food") || s === "bhog" || s.includes("prasad")) return { value: "Food", normalized: true };
    if (s.startsWith("security")) return { value: "Security", normalized: true };
    if (s.startsWith("visarjan") || s.includes("visor") || s.includes("immersion")) return { value: "Visarjan", normalized: true };
    if (s.startsWith("misc") || s === "other" || s === "others" || s.includes("general")) return { value: "Miscellaneous", normalized: true };
    return null;
};

const normalizePaymentStatus = (value) => {
    const s = String(value === undefined || value === null || value === "" ? "paid" : value).trim().toLowerCase();
    if (["paid", "cleared", "yes", "true", "done"].includes(s)) return "paid";
    if (["pending", "due", "unpaid", "no", "false"].includes(s)) return "pending";
    return null;
};

const normalizeDonorCategory = (value) => {
    const s = String(value === undefined || value === null || value === "" ? "" : value).trim().toLowerCase();
    if (!s) return null;
    const match = DONOR_CATEGORIES.find((c) => c.toLowerCase() === s || c.toLowerCase() === s.replace(/\s+/g, ""));
    if (match) return match;
    if (s === "org" || s === "organisation" || s === "company") return "Organization";
    return null;
};

const normalizeFestivalYear = (value, activeYear) => {
    const s = String(value === undefined || value === null ? "" : value).trim();
    if (!s) return { year: activeYear, defaulted: true };
    if (!/^\d{4}$/.test(s)) return null;
    return { year: s, defaulted: false };
};

// ---------------------------------------------------------------------------
// Workbook parsing
// ---------------------------------------------------------------------------

function readDataRows(filePath) {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheetName = workbook.SheetNames.includes("Data") ? "Data" : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const dataRows = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;
        const firstCell = row[0] === undefined || row[0] === null ? "" : String(row[0]).trim();
        if (firstCell.startsWith("#")) continue;
        const hasAnyValue = row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== "");
        if (!hasAnyValue) continue;
        dataRows.push(row);
    }
    return dataRows;
}

function ensureColumns(columns, requiredFields) {
    const missing = requiredFields.filter((field) => columns[field] === undefined);
    if (missing.length > 0) {
        const error = new Error(`The file is missing required column(s): ${missing.map((field) => FIELD_LABELS[field] || field).join(", ")}. Download the template again.`);
        error.statusCode = 400;
        throw error;
    }
}

// ---------------------------------------------------------------------------
// Template builders
// ---------------------------------------------------------------------------

function buildXlsxBuffer(template) {
    const workbook = XLSX.utils.book_new();
    const dataSheet = XLSX.utils.aoa_to_sheet([template.headers]);
    const sampleSheet = XLSX.utils.aoa_to_sheet([template.headers, ...template.sample]);
    const infoSheet = XLSX.utils.aoa_to_sheet(template.instructions.map((line) => [line]));
    infoSheet["!cols"] = [{ wch: 95 }];
    XLSX.utils.book_append_sheet(workbook, dataSheet, "Data");
    XLSX.utils.book_append_sheet(workbook, sampleSheet, "Sample Data");
    XLSX.utils.book_append_sheet(workbook, infoSheet, "Instructions");
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function buildCsvBuffer(template) {
    const lines = [];
    lines.push(`# TEMPLATE: ${template.name}`);
    template.instructions.forEach((line) => lines.push(`# ${line}`));
    lines.push("#");
    lines.push("# EXAMPLE ROWS - remove before importing:");
    template.sample.forEach((row) => {
        lines.push("# " + row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","));
    });
    lines.push("");
    lines.push(template.headers.join(","));
    return Buffer.from("\uFEFF" + lines.join("\r\n"), "utf8");
}

export function buildTemplateBuffer({ type, format }) {
    const template = TEMPLATES[type];
    if (!template) {
        const error = new Error("Invalid template type. Use buildings, households, donations or expenses.");
        error.statusCode = 400;
        throw error;
    }
    if (format === "csv") return buildCsvBuffer(template);
    if (format === "xlsx") return buildXlsxBuffer(template);
    const error = new Error("Invalid format. Use xlsx or csv.");
    error.statusCode = 400;
    throw error;
}

// ---------------------------------------------------------------------------
// Validation pipeline (read-only - nothing is written to the database)
// ---------------------------------------------------------------------------

async function activeFestivalYearFor(userId) {
    const activeYear = await FestivalYear.findOne({ isActive: true, createdBy: userId });
    return activeYear ? activeYear.year : null;
}

export async function previewImport({ filePath, fileName, type, userId }) {
    if (!TEMPLATE_TYPES.includes(type)) {
        const error = new Error("Invalid import type. Use buildings, households, donations or expenses.");
        error.statusCode = 400;
        throw error;
    }
    const dataRows = readDataRows(filePath);
    if (dataRows.length === 0) {
        const error = new Error("The file contains no data rows. Download the template and add your data below the header row.");
        error.statusCode = 400;
        throw error;
    }
    const columns = buildColumnMap(dataRows[0]);
    const rawRows = dataRows.slice(1);

    if (type === "buildings") return finalizePreview(await validateBuildings(columns, rawRows, userId), type, fileName);
    if (type === "households") return finalizePreview(await validateHouseholds(columns, rawRows, userId), type, fileName);
    if (type === "donations") return finalizePreview(await validateDonations(columns, rawRows, userId), type, fileName);
    return finalizePreview(await validateExpenses(columns, rawRows, userId), type, fileName);
}

function finalizePreview({ rows, warnings }, type, fileName) {
    let validRows = 0;
    let updatedRows = 0;
    let duplicateRows = 0;
    let invalidRows = 0;
    const data = [];
    const statuses = rows.map((entry) => {
        if (entry.status === "valid") validRows++;
        else if (entry.status === "update") {
            validRows++;
            updatedRows++;
        } else if (entry.status === "duplicate") duplicateRows++;
        else invalidRows++;
        if (entry.status === "valid" || entry.status === "update") {
            data.push({ row: entry.row, ...entry.data, _action: entry.status });
        }
        return {
            row: entry.row,
            status: entry.status,
            field: entry.field || null,
            fieldLabel: entry.field ? FIELD_LABELS[entry.field] || entry.field : null,
            message: entry.message || null
        };
    });
    return {
        type,
        fileName,
        totalRows: rows.length,
        validRows,
        updatedRows,
        duplicateRows,
        invalidRows,
        warnings,
        errors: rows
            .filter((entry) => entry.status === "invalid" || entry.status === "duplicate")
            .map((entry) => ({
                row: entry.row,
                field: entry.field || null,
                fieldLabel: entry.field ? FIELD_LABELS[entry.field] || entry.field : null,
                message: entry.message
            })),
        statuses,
        data
    };
}

// ---- Buildings -------------------------------------------------------------

async function validateBuildings(columns, rawRows, userId) {
    ensureColumns(columns, ["building", "wing", "flatStart", "flatEnd"]);
    const warnings = [];
    const rows = [];
    const groupedValues = new Map();

    rawRows.forEach((cells, index) => {
        const row = index + 2;
        const building = cellNumber(cells, columns.building);
        const wing = cellText(cells, columns.wing).toUpperCase();
        const start = cellNumber(cells, columns.flatStart);
        const end = cellNumber(cells, columns.flatEnd);

        if (building === null || !Number.isInteger(building) || building < 1) {
            rows.push({ row, status: "invalid", field: "building", message: "Building must be a whole number of 1 or above" });
            return;
        }
        if (!wing || !WING_REGEX.test(wing)) {
            rows.push({ row, status: "invalid", field: "wing", message: "Wing must be 1 to 5 letters or digits (e.g. A, B)" });
            return;
        }
        if (start === null || end === null || !Number.isInteger(start) || !Number.isInteger(end)) {
            rows.push({ row, status: "invalid", field: "flatStart", message: "Flat Start and Flat End must be whole numbers" });
            return;
        }
        if (!isValidRange({ start, end })) {
            rows.push({ row, status: "invalid", field: "flatEnd", message: "Flat Start must be less than or equal to Flat End" });
            return;
        }

        const key = `${building}|${wing}`;
        const group = groupedValues.get(key) || [];
        const overlap = findOverlappingRanges([...group.map((r) => ({ start: r.start, end: r.end })), { start, end }]);
        if (overlap) {
            rows.push({ row, status: "duplicate", field: "flatStart", message: `Range ${start}-${end} overlaps another row in this file` });
            return;
        }
        group.push({ row, building, wing, start, end });
        groupedValues.set(key, group);
        rows.push({ row, status: "pending", building, wing, start, end });
    });

    for (const [key, group] of groupedValues) {
        const existingConfig = await BuildingConfig.findOne({
            createdBy: userId,
            building: group[0].building,
            wing: group[0].wing
        });
        const existingRanges = existingConfig ? normalizeConfigRanges(existingConfig) : [];
        for (const entry of group) {
            const entryIndex = rows.findIndex((r) => r.row === entry.row);
            if (existingRanges.length > 0) {
                const overlap = findOverlappingRanges([...existingRanges, { start: entry.start, end: entry.end }]);
                if (overlap) {
                    rows[entryIndex] = { row: entry.row, status: "duplicate", field: "flatStart", message: `Range ${entry.start}-${entry.end} overlaps already configured ranges (${describeRanges(existingRanges)})` };
                    continue;
                }
                rows[entryIndex] = { row: entry.row, status: "update", field: null, message: null, data: { building: entry.building, wing: entry.wing, start: entry.start, end: entry.end } };
            } else {
                rows[entryIndex] = { row: entry.row, status: "valid", field: null, message: null, data: { building: entry.building, wing: entry.wing, start: entry.start, end: entry.end } };
            }
        }
    }

    return { rows, warnings };
}

// ---- Households / Residents -------------------------------------------------

async function validateHouseholds(columns, rawRows, userId) {
    ensureColumns(columns, ["building", "wing", "flatNumber", "headOfFamily"]);
    const warnings = [];
    const rows = [];

    const configs = await BuildingConfig.find({ createdBy: userId });
    const configMap = new Map();
    configs.forEach((config) => configMap.set(`${config.building}|${config.wing}`, config));

    const households = await Household.find({ createdBy: userId });
    const householdMap = new Map();
    households.forEach((household) => householdMap.set(`${household.building}|${household.wing}|${household.flatNumber}`, household));

    const seenFlats = new Map();

    for (let i = 0; i < rawRows.length; i++) {
        const cells = rawRows[i];
        const row = i + 2;
        const building = cellNumber(cells, columns.building);
        const wing = cellText(cells, columns.wing).toUpperCase();
        const flatNumber = cellNumber(cells, columns.flatNumber);
        const headOfFamily = cellText(cells, columns.headOfFamily);
        const memberCount = cellNumber(cells, columns.memberCount);
        const phone = cellText(cells, columns.phone);
        const activeValue = parseYesNo(cellText(cells, columns.active) || "yes");
        let memberCountVal = 1;

        if (building === null || !Number.isInteger(building) || building < 1) {
            rows.push({ row, status: "invalid", field: "building", message: "Building must be a whole number of 1 or above" });
            continue;
        }
        if (!wing || !WING_REGEX.test(wing)) {
            rows.push({ row, status: "invalid", field: "wing", message: "Wing must be 1 to 5 letters or digits (e.g. A, B)" });
            continue;
        }
        if (flatNumber === null || !Number.isInteger(flatNumber) || flatNumber < 1) {
            rows.push({ row, status: "invalid", field: "flatNumber", message: "Flat Number must be a whole number of 1 or above" });
            continue;
        }
        if (!headOfFamily) {
            rows.push({ row, status: "invalid", field: "headOfFamily", message: "Head of Family (occupant name) is required" });
            continue;
        }
        if (memberCount === null) {
            warnings.push({ row, field: "memberCount", message: "Member Count was blank and defaults to 1" });
        } else if (!Number.isInteger(memberCount) || memberCount < 1) {
            rows.push({ row, status: "invalid", field: "memberCount", message: "Member Count must be a whole number of at least 1" });
            continue;
        } else {
            memberCountVal = memberCount;
        }
        if (activeValue === null || activeValue === undefined) {
            rows.push({ row, status: "invalid", field: "active", message: "Active must be Yes or No" });
            continue;
        }
        if (phone && !PHONE_REGEX.test(phone)) {
            rows.push({ row, status: "invalid", field: "phone", message: "Phone must be 7 to 15 digits (may include +, -, spaces)" });
            continue;
        }

        const config = configMap.get(`${building}|${wing}`);
        if (!config) {
            rows.push({ row, status: "invalid", field: "wing", message: `Building ${building}, Wing ${wing} is not configured. Import the Buildings template first.` });
            continue;
        }
        const wingRanges = normalizeConfigRanges(config);
        if (!isFlatInRanges(wingRanges, flatNumber)) {
            rows.push({ row, status: "invalid", field: "flatNumber", message: `Flat ${flatNumber} is outside the configured ranges (${describeRanges(wingRanges)}) for Building ${building}, Wing ${wing}` });
            continue;
        }

        const flatKey = `${building}|${wing}|${flatNumber}`;
        const existing = householdMap.get(flatKey);
        if (existing) {
            rows.push({
                row,
                status: "duplicate",
                field: "flatNumber",
                message: existing.active
                    ? `Duplicate - an active household already exists for Building ${building}, Wing ${wing}, Flat ${flatNumber} (${existing.headOfFamily})`
                    : `A household already exists for Building ${building}, Wing ${wing}, Flat ${flatNumber} but is inactive. Activate it on the Households page first.`
            });
            continue;
        }
        if (seenFlats.has(flatKey)) {
            rows.push({ row, status: "duplicate", field: "flatNumber", message: `Duplicate - another row in this file already imports Building ${building}, Wing ${wing}, Flat ${flatNumber}` });
            continue;
        }
        seenFlats.set(flatKey, true);

        rows.push({
            row,
            status: "valid",
            field: null,
            message: null,
            data: { building, wing, flatNumber, headOfFamily, memberCount: memberCountVal, phone: phone || "", active: activeValue === false ? false : true }
        });
    }

    return { rows, warnings };
}

// ---- Donations -------------------------------------------------------------

async function validateDonations(columns, rawRows, userId) {
    ensureColumns(columns, ["donorType", "amount"]);
    const warnings = [];
    const rows = [];

    const households = await Household.find({ createdBy: userId });
    const householdMap = new Map();
    households.forEach((household) => {
        if (household.active) {
            householdMap.set(`${household.building}|${household.wing}|${household.flatNumber}`, household);
        }
    });

    const activeYear = await activeFestivalYearFor(userId);
    if (!activeYear) {
        for (let i = 0; i < rawRows.length; i++) {
            rows.push({ row: i + 2, status: "invalid", field: "festivalYear", message: "No active festival year found. Create a year first in Settings." });
        }
        return { rows, warnings };
    }

    for (let i = 0; i < rawRows.length; i++) {
        const cells = rawRows[i];
        const row = i + 2;
        const donorType = normalizeDonorType(cellText(cells, columns.donorType));
        const donorName = cellText(cells, columns.donorName);
        const building = cellNumber(cells, columns.building);
        const wing = cellText(cells, columns.wing).toUpperCase();
        const flatNumber = cellNumber(cells, columns.flatNumber);
        const amount = cellNumber(cells, columns.amount);
        const paymentMethod = normalizePaymentMethod(cellText(cells, columns.paymentMethod));
        const phone = cellText(cells, columns.phone);
        const organizationName = cellText(cells, columns.organizationName);
        const donorCategory = normalizeDonorCategory(cellText(cells, columns.donorCategory));
        const requestedDate = parseDate(cells[columns.date]);
        const yearResult = normalizeFestivalYear(cellText(cells, columns.festivalYear), activeYear);
        const note = cellText(cells, columns.note);

        if (!donorType) {
            rows.push({ row, status: "invalid", field: "donorType", message: "Donor Type must be 'Resident' or 'External Donor'" });
            continue;
        }
        if (!yearResult) {
            rows.push({ row, status: "invalid", field: "festivalYear", message: "Festival Year must be a 4-digit year (e.g. 2026) or left blank to use the active year" });
            continue;
        }
        if (amount === null || !Number.isFinite(amount) || amount < 0) {
            rows.push({ row, status: "invalid", field: "amount", message: "Amount is required and must not be negative" });
            continue;
        }
        if (!paymentMethod) {
            rows.push({ row, status: "invalid", field: "paymentMethod", message: "Payment Method must be Cash, UPI or Bank" });
            continue;
        }
        if (!donorCategory && cellText(cells, columns.donorCategory)) {
            rows.push({ row, status: "invalid", field: "donorCategory", message: `Donor Category must be one of: ${DONOR_CATEGORIES.join(", ")}` });
            continue;
        }
        if (phone && !PHONE_REGEX.test(phone)) {
            rows.push({ row, status: "invalid", field: "phone", message: "Phone must be 7 to 15 digits (may include +, -, spaces)" });
            continue;
        }

        if (donorType === "resident") {
            if (building === null || !Number.isInteger(building) || building < 1) {
                rows.push({ row, status: "invalid", field: "building", message: "Building is required for Resident donations and must be a whole number of 1 or above" });
                continue;
            }
            if (!wing || !WING_REGEX.test(wing)) {
                rows.push({ row, status: "invalid", field: "wing", message: "Wing is required for Resident donations (1 to 5 letters/digits)" });
                continue;
            }
            if (flatNumber === null || !Number.isInteger(flatNumber) || flatNumber < 1) {
                rows.push({ row, status: "invalid", field: "flatNumber", message: "Flat Number is required for Resident donations" });
                continue;
            }
            const household = householdMap.get(`${building}|${wing}|${flatNumber}`);
            if (!household) {
                rows.push({ row, status: "invalid", field: "flatNumber", message: `No household registered at Building ${building}, Wing ${wing}, Flat ${flatNumber}. Import the Households template first or use the manual donation flow. Donation was NOT linked to an unrelated household.` });
                continue;
            }
            rows.push({
                row,
                status: "valid",
                field: null,
                message: null,
                data: {
                    donorType: "resident",
                    householdId: household._id,
                    donorName: household.headOfFamily,
                    building: Number(building),
                    wing,
                    flatNumber: Number(flatNumber),
                    amount,
                    paymentMethod,
                    phone: phone || "",
                    organizationName: "",
                    donorCategory: null,
                    date: requestedDate || new Date(),
                    festivalYear: yearResult.year,
                    note
                }
            });
        } else {
            if (!donorName) {
                rows.push({ row, status: "invalid", field: "donorName", message: "Donor Name is required for External Donor donations" });
                continue;
            }
            rows.push({
                row,
                status: "valid",
                field: null,
                message: null,
                data: {
                    donorType: "external",
                    householdId: null,
                    donorName,
                    building: null,
                    wing: "",
                    flatNumber: null,
                    amount,
                    paymentMethod,
                    phone: phone || "",
                    organizationName: organizationName || "",
                    donorCategory: donorCategory || "Individual",
                    date: requestedDate || new Date(),
                    festivalYear: yearResult.year,
                    note
                }
            });
        }
    }

    return { rows, warnings };
}

// ---- Expenses ---------------------------------------------------------------

async function validateExpenses(columns, rawRows, userId) {
    ensureColumns(columns, ["title", "category", "amount"]);
    const warnings = [];
    const rows = [];

    const activeYear = await activeFestivalYearFor(userId);
    if (!activeYear) {
        for (let i = 0; i < rawRows.length; i++) {
            rows.push({ row: i + 2, status: "invalid", field: "festivalYear", message: "No active festival year found. Create a year first in Settings." });
        }
        return { rows, warnings };
    }

    for (let i = 0; i < rawRows.length; i++) {
        const cells = rawRows[i];
        const row = i + 2;
        const title = cellText(cells, columns.title);
        const amount = cellNumber(cells, columns.amount);
        const categoryResult = normalizeCategory(cellText(cells, columns.category));
        const vendorName = cellText(cells, columns.vendorName);
        const paymentStatus = normalizePaymentStatus(cellText(cells, columns.paymentStatus));
        const requestedDate = parseDate(cells[columns.date]);
        const yearResult = normalizeFestivalYear(cellText(cells, columns.festivalYear), activeYear);
        const note = cellText(cells, columns.note);

        if (!title) {
            rows.push({ row, status: "invalid", field: "title", message: "Title is required" });
            continue;
        }
        if (!yearResult) {
            rows.push({ row, status: "invalid", field: "festivalYear", message: "Festival Year must be a 4-digit year (e.g. 2026) or left blank to use the active year" });
            continue;
        }
        if (amount === null || !Number.isFinite(amount) || amount < 0) {
            rows.push({ row, status: "invalid", field: "amount", message: "Amount is required and must not be negative" });
            continue;
        }
        if (!categoryResult) {
            rows.push({ row, status: "invalid", field: "category", message: `Category must be one of: ${EXPENSE_CATEGORIES.join(", ")}` });
            continue;
        }
        if (!paymentStatus) {
            rows.push({ row, status: "invalid", field: "paymentStatus", message: "Payment Status must be Paid or Pending" });
            continue;
        }
        if (categoryResult.normalized) {
            warnings.push({ row, field: "category", message: `Category '${cellText(cells, columns.category)}' was matched to ${categoryResult.value}` });
        }
        rows.push({
            row,
            status: "valid",
            field: null,
            message: null,
            data: {
                title,
                amount,
                category: categoryResult.value,
                vendorName: vendorName || "",
                paymentStatus,
                date: requestedDate || new Date(),
                festivalYear: yearResult.year,
                note
            }
        });
    }

    return { rows, warnings };
}

// ---------------------------------------------------------------------------
// Confirmed import (writes to the database)
// ---------------------------------------------------------------------------

export async function confirmImport({ type, rows, userId }) {
    if (!TEMPLATE_TYPES.includes(type)) {
        const error = new Error("Invalid import type. Use buildings, households, donations or expenses.");
        error.statusCode = 400;
        throw error;
    }
    if (!Array.isArray(rows) || rows.length === 0) {
        const error = new Error("Nothing to import. Preview the file first and confirm only valid rows.");
        error.statusCode = 400;
        throw error;
    }

    if (type === "buildings") return confirmBuildings(rows, userId);
    if (type === "households") return confirmHouseholds(rows, userId);
    if (type === "donations") return confirmDonations(rows, userId);
    return confirmExpenses(rows, userId);
}

function summarizeResults(results) {
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const failedRows = [];
    results.forEach((entry) => {
        if (entry.status === "imported") imported++;
        else if (entry.status === "updated") updated++;
        else if (entry.status === "skipped") skipped++;
        else {
            failed++;
            failedRows.push({ row: entry.row, field: entry.field || null, message: entry.message });
        }
    });
    return { imported, updated, skipped, failed, failedRows };
}

async function confirmBuildings(rows, userId) {
    const results = [];
    const grouped = new Map();
    rows.forEach((r) => {
        const building = Number(r.building);
        const wing = String(r.wing).toUpperCase();
        const key = `${building}|${wing}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push({ row: r.row, building, wing, start: Number(r.start), end: Number(r.end) });
    });

    for (const ranges of grouped.values()) {
        const { building, wing } = ranges[0];
        const existingConfig = await BuildingConfig.findOne({ createdBy: userId, building, wing });
        const existingRanges = existingConfig ? normalizeConfigRanges(existingConfig) : [];
        const toAdd = [];
        for (const range of ranges) {
            const overlap = findOverlappingRanges([
                ...existingRanges,
                ...toAdd.map((t) => ({ start: t.start, end: t.end })),
                { start: range.start, end: range.end }
            ]);
            if (overlap) {
                results.push({ row: range.row, status: "failed", field: "flatStart", message: `Range ${range.start}-${range.end} overlaps already configured ranges (${describeRanges(existingRanges)}) at confirmation time` });
                continue;
            }
            toAdd.push(range);
        }
        if (toAdd.length === 0) continue;
        if (existingConfig) {
            existingConfig.flatRanges = [...existingRanges, ...toAdd.map((t) => ({ start: t.start, end: t.end }))];
            await existingConfig.save();
            toAdd.forEach((range) => results.push({ row: range.row, status: "updated" }));
        } else {
            await BuildingConfig.create({ building, wing, flatRanges: toAdd.map((t) => ({ start: t.start, end: t.end })), createdBy: userId });
            toAdd.forEach((range) => results.push({ row: range.row, status: "imported" }));
        }
    }
    return { ...summarizeResults(results), failedRows: results.filter((r) => r.status === "failed").map((r) => ({ row: r.row, field: r.field, message: r.message })) };
}

async function confirmHouseholds(rows, userId) {
    const results = [];
    const existing = await Household.find({ createdBy: userId });
    const existingMap = new Map();
    existing.forEach((h) => existingMap.set(`${h.building}|${h.wing}|${h.flatNumber}`, h));

    for (const r of rows) {
        const building = Number(r.building);
        const wing = String(r.wing).toUpperCase();
        const flatNumber = Number(r.flatNumber);
        const key = `${building}|${wing}|${flatNumber}`;
        const current = existingMap.get(key);
        if (current) {
            results.push({
                row: r.row,
                status: "failed",
                field: "flatNumber",
                message: current.active
                    ? "Duplicate - an active household already exists for this flat (created while you reviewed the preview)"
                    : "A household already exists for this flat but is inactive. Activate it first."
            });
            continue;
        }
        const config = await BuildingConfig.findOne({ createdBy: userId, building, wing });
        if (!config || !isFlatInRanges(normalizeConfigRanges(config), flatNumber)) {
            results.push({ row: r.row, status: "failed", field: "flatNumber", message: "Flat is not within the configured ranges at confirmation time" });
            continue;
        }
        await Household.create({
            building,
            wing,
            flatNumber,
            headOfFamily: String(r.headOfFamily || ""),
            phone: r.phone || "",
            memberCount: Number(r.memberCount) || 1,
            active: r.active === false ? false : true,
            createdBy: userId
        });
        existingMap.set(key, {});
        results.push({ row: r.row, status: "imported" });
    }
    return { ...summarizeResults(results), failedRows: results.filter((r) => r.status === "failed").map((r) => ({ row: r.row, field: r.field, message: r.message })) };
}

async function confirmDonations(rows, userId) {
    const results = [];
    const yearCounts = new Map();
    const donorCache = new Map();

    const nextReceiptNumber = async (festivalYear) => {
        let count = yearCounts.get(festivalYear);
        if (count === undefined) {
            count = await Donation.countDocuments({ festivalYear, createdBy: userId });
            yearCounts.set(festivalYear, count);
        }
        while (true) {
            count++;
            yearCounts.set(festivalYear, count);
            const receiptNumber = `MK-${festivalYear}-${String(count).padStart(4, "0")}`;
            const duplicate = await Donation.findOne({ receiptNumber });
            if (!duplicate) return receiptNumber;
        }
    };

    for (const r of rows) {
        try {
            if (!/^\d{4}$/.test(String(r.festivalYear))) throw new Error("Festival Year must be a 4-digit year (e.g. 2026)");
            let resolvedHousehold = null;
            let resolvedExternalDonor = null;
            let resolvedDonorName = String(r.donorName || "");

            if (r.donorType === "resident") {
                if (!r.householdId) throw new Error("Resident donation has no linked household");
                const household = await Household.findOne({ _id: r.householdId, createdBy: userId });
                if (!household) throw new Error("Linked household no longer exists at confirmation time");
                if (!household.active) throw new Error("Linked household is inactive at confirmation time. Activate it first.");
                resolvedHousehold = household._id;
                resolvedDonorName = household.headOfFamily;
            } else {
                if (!resolvedDonorName) throw new Error("Donor Name is required");
                const cacheKey = resolvedDonorName.toLowerCase();
                if (!donorCache.has(cacheKey)) {
                    let donor = await ExternalDonor.findOne({ createdBy: userId, donorName: resolvedDonorName, active: true });
                    if (!donor) {
                        donor = await ExternalDonor.create({
                            donorName: resolvedDonorName,
                            donorType: r.donorCategory && DONOR_CATEGORIES.includes(r.donorCategory) ? r.donorCategory : "Individual",
                            organizationName: r.organizationName || "",
                            phone: r.phone || "",
                            address: "",
                            active: true,
                            createdBy: userId
                        });
                    }
                    donorCache.set(cacheKey, donor);
                }
                resolvedExternalDonor = donorCache.get(cacheKey)._id;
            }

            const receiptNumber = await nextReceiptNumber(String(r.festivalYear));
            await Donation.create({
                donorName: resolvedDonorName,
                amount: Number(r.amount),
                paymentMethod: r.paymentMethod || "cash",
                phone: r.phone || "",
                note: r.note || "",
                date: r.date ? new Date(r.date) : new Date(),
                donorType: r.donorType,
                household: resolvedHousehold,
                externalDonor: resolvedExternalDonor,
                receiptNumber,
                festivalYear: String(r.festivalYear),
                createdBy: userId
            });
            results.push({ row: r.row, status: "imported" });
        } catch (error) {
            results.push({ row: r.row, status: "failed", field: error.message.startsWith("Linked") || error.message.includes("no longer exists") ? "flatNumber" : null, message: error.message });
        }
    }
    return { ...summarizeResults(results), failedRows: results.filter((r) => r.status === "failed").map((r) => ({ row: r.row, field: r.field, message: r.message })) };
}

async function confirmExpenses(rows, userId) {
    const results = [];
    for (const r of rows) {
        try {
            if (!/^\d{4}$/.test(String(r.festivalYear))) throw new Error("Festival Year must be a 4-digit year (e.g. 2026)");
            const category = normalizeCategory(r.category);
            if (!category) throw new Error(`Invalid category: ${r.category}`);
            await Expense.create({
                title: String(r.title || ""),
                amount: Number(r.amount),
                category: category.value,
                vendorName: r.vendorName || "",
                paymentStatus: normalizePaymentStatus(r.paymentStatus) || "paid",
                note: r.note || "",
                date: r.date ? new Date(r.date) : new Date(),
                festivalYear: String(r.festivalYear),
                createdBy: userId
            });
            results.push({ row: r.row, status: "imported" });
        } catch (error) {
            results.push({ row: r.row, status: "failed", field: "category", message: error.message });
        }
    }
    return { ...summarizeResults(results), failedRows: results.filter((r) => r.status === "failed").map((r) => ({ row: r.row, field: r.field, message: r.message })) };
}

// ---------------------------------------------------------------------------
// Error report download
// ---------------------------------------------------------------------------

const escapeCsvCell = (value) => {
    const s = value === undefined || value === null ? "" : String(value);
    return `"${s.replace(/"/g, '""')}"`;
};

export function buildErrorReportCsv({ type, fileName, statuses }) {
    const template = TEMPLATES[type];
    const lines = [];
    lines.push(escapeCsvCell("Import Error Report") + "," + escapeCsvCell((template ? template.name : type) + " - " + (fileName || "uploaded file")));
    lines.push("");
    lines.push([escapeCsvCell("Row Number"), escapeCsvCell("Status"), escapeCsvCell("Field"), escapeCsvCell("Reason")].join(","));
    (statuses || []).forEach((entry) => {
        lines.push([
            escapeCsvCell(entry.row),
            escapeCsvCell(entry.status),
            escapeCsvCell(entry.fieldLabel || entry.field || ""),
            escapeCsvCell(entry.message || "")
        ].join(","));
    });
    return Buffer.from("\uFEFF" + lines.join("\r\n"), "utf8");
}

export { TEMPLATE_TYPES };
