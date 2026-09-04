import mongoose from "mongoose";
import XLSX from "xlsx";
import connectDB from "./src/db/db.js";
import { httpServer } from "./src/server.js";

const PORT = 8023;
const BASE = `http://localhost:${PORT}`;

let cookie = "";
let pass = 0;
let fail = 0;

const request = async (path, { method = "GET", body, headers = {}, raw } = {}) => {
    const response = await fetch(`${BASE}${path}`, {
        method,
        headers: Object.assign(
            {},
            body && !raw ? { "Content-Type": "application/json" } : {},
            cookie ? { Cookie: cookie } : {},
            headers
        ),
        body: raw ? body : (body ? JSON.stringify(body) : undefined)
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
        fail++;
        process.exitCode = 1;
    }
};

const EXPENSE_HEADERS = [
    "Title (Required)", "Category (Required)", "Amount (Required)",
    "Vendor Name (Optional)", "Payment Status (Optional)",
    "Date (Optional)", "Festival Year (Optional)", "Note (Optional)"
];

async function uploadExpenses(rows) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([EXPENSE_HEADERS, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const form = new FormData();
    form.append("type", "expenses");
    form.append("file", new Blob([buffer]), "test-expenses.xlsx");
    return request("/api/bulk-import/upload", { method: "POST", body: form, raw: true });
}

console.log("Connecting to MongoDB...");
await connectDB();
await new Promise((resolve) => httpServer.listen(PORT, resolve));
console.log(`Test server listening on :${PORT}`);

try {
    // 1. User Authentication
    const email = `cattest${Date.now()}@test.com`;
    const regRes = await request("/api/users/register", {
        method: "POST",
        body: { name: "Category Tester", email, username: `cattest_${Date.now()}`, password: "Password123!" }
    });
    expect(regRes.status === 201 || regRes.status === 200, "User registered");

    const loginRes = await request("/api/users/login", {
        method: "POST",
        body: { email, password: "Password123!" }
    });
    expect(loginRes.status === 200, "User logged in");
    const setCookie = loginRes.headers.get("set-cookie");
    if (setCookie) {
        cookie = setCookie.split(";")[0];
    }

    // 2. Ensure Active Festival Year
    const year = "2026";
    const createYearRes = await request("/api/festivals", {
        method: "POST",
        body: { year }
    });
    expect(createYearRes.status === 201, "Festival year created");
    const yearId = createYearRes.data?.data?._id;
    if (yearId) {
        await request(`/api/festivals/active/${yearId}`, { method: "PATCH" });
    }

    // 3. Initial Categories Fetch
    const initialCats = await request("/api/categories");
    expect(initialCats.status === 200, "GET /api/categories succeeded");
    expect(initialCats.data?.data?.systemCategories?.length === 7, "7 system categories returned");
    expect(initialCats.data?.data?.customCategories?.length === 0, "Initial custom categories empty");

    // 4. Category Validation Tests
    const emptyCat = await request("/api/categories", { method: "POST", body: { name: "" } });
    expect(emptyCat.status === 400, "Empty category name rejected");

    const shortCat = await request("/api/categories", { method: "POST", body: { name: "A" } });
    expect(shortCat.status === 400, "Too short category name rejected");

    const longCat = await request("/api/categories", { method: "POST", body: { name: "A".repeat(55) } });
    expect(longCat.status === 400, "Too long category name rejected");

    const sysConflict = await request("/api/categories", { method: "POST", body: { name: "Sound" } });
    expect(sysConflict.status === 400, "Conflict with default category 'Sound' rejected");

    const sysConflictCase = await request("/api/categories", { method: "POST", body: { name: "  fOoD   " } });
    expect(sysConflictCase.status === 400, "Case-insensitive conflict with default category 'Food' rejected");

    // 5. Create Custom Categories
    const createStage = await request("/api/categories", { method: "POST", body: { name: "Stage & Tent" } });
    expect(createStage.status === 201 && createStage.data?.data?.name === "Stage & Tent", "Created 'Stage & Tent' category");
    const stageId = createStage.data?.data?._id;

    // Duplicate custom category check
    const dupExact = await request("/api/categories", { method: "POST", body: { name: "Stage & Tent" } });
    expect(dupExact.status === 400, "Duplicate exact category name rejected");

    const dupCase = await request("/api/categories", { method: "POST", body: { name: "  stage & tent  " } });
    expect(dupCase.status === 400, "Duplicate case & whitespace variation rejected");

    // Create a temporary unused category
    const createUnused = await request("/api/categories", { method: "POST", body: { name: "Temporary Unused" } });
    expect(createUnused.status === 201, "Created 'Temporary Unused' category");
    const unusedId = createUnused.data?.data?._id;

    // 6. Verify GET /api/categories returns both
    const catsAfterCreate = await request("/api/categories");
    expect(catsAfterCreate.data?.data?.customCategories?.length === 2, "Custom categories list contains 2 entries");
    expect(catsAfterCreate.data?.data?.allActiveCategories?.includes("Stage & Tent"), "allActiveCategories includes 'Stage & Tent'");

    // 7. Create Expenses using Custom and System categories
    const expCustom = await request("/api/expenses", {
        method: "POST",
        body: {
            title: "Main Stage and Pandal Setup",
            amount: 35000,
            category: "Stage & Tent",
            vendorName: "Royal Pandal Co",
            paymentStatus: "paid",
            festivalYear: year
        }
    });
    expect(expCustom.status === 201, "Expense created with custom category 'Stage & Tent'");
    expect(expCustom.data?.data?.category === "Stage & Tent", "Expense response preserves custom category name");
    expect(Boolean(expCustom.data?.data?.categoryId), "Expense response has categoryId linked");
    const customExpenseId = expCustom.data?.data?._id;

    const expSystem = await request("/api/expenses", {
        method: "POST",
        body: {
            title: "Traditional Floral Decoration",
            amount: 12000,
            category: "Decoration",
            paymentStatus: "paid",
            festivalYear: year
        }
    });
    expect(expSystem.status === 201, "Expense created with system category 'Decoration'");
    expect(expSystem.data?.data?.category === "Decoration", "System category preserved");

    // 8. Edit Expense
    const editExp = await request(`/api/expenses/${customExpenseId}`, {
        method: "PUT",
        body: {
            title: "Main Stage and Pandal Setup - Updated",
            amount: 40000,
            category: "Stage & Tent",
            note: "Includes extra waterproof sheets"
        }
    });
    expect(editExp.status === 200 && editExp.data?.data?.amount === 40000, "Expense edited and category preserved");

    // 9. Filter Expenses by Custom Category
    const filterCustom = await request(`/api/expenses?festivalYear=${year}&category=Stage+%26+Tent`);
    expect(filterCustom.status === 200, "Filter by custom category succeeded");
    expect(filterCustom.data?.data?.expenses?.length === 1, "Only 1 expense matching 'Stage & Tent' returned");
    expect(filterCustom.data?.data?.expenses[0]?.title.includes("Pandal Setup"), "Matching expense correctly returned");

    const filterSystem = await request(`/api/expenses?festivalYear=${year}&category=Decoration`);
    expect(filterSystem.status === 200 && filterSystem.data?.data?.expenses?.length === 1, "Filter by default category succeeded");

    // 10. Dashboard Analytics & Reports Verification
    const stats = await request(`/api/reports/dashboard?festivalYear=${year}`);
    expect(stats.status === 200, "Dashboard stats fetched");
    const categoryBreakdown = stats.data?.data?.expensesByCategory || [];
    const stageBreakdown = categoryBreakdown.find((c) => c.category === "Stage & Tent");
    expect(Boolean(stageBreakdown), "Dashboard expensesByCategory includes 'Stage & Tent'");
    expect(stageBreakdown?.amount === 40000, "Dashboard category breakdown has accurate amount");

    const ledgerRes = await request(`/api/reports/ledger?festivalYear=${year}`);
    expect(ledgerRes.status === 200, "Ledger fetched");
    const ledgerTx = ledgerRes.data?.data?.find((tx) => tx.title.includes("Pandal Setup"));
    expect(ledgerTx?.category === "Stage & Tent", "Ledger preserves custom category");

    // 11. Bulk Import: Custom Category Support
    const uploadRes = await uploadExpenses([
        ["Custom Cat Expense", "Stage & Tent", 8000, "Vendor A", "Paid", "2026-08-10", "2026", "Note A"],
        ["Invalid Cat Expense", "NonExistentRandomCategory", 5000, "Vendor B", "Paid", "2026-08-11", "2026", "Note B"]
    ]);
    expect(uploadRes.status === 200, "Bulk import preview uploaded");
    const preview = uploadRes.data?.data;
    expect(preview?.validRows === 1 && preview?.data?.[0]?.category === "Stage & Tent", "Valid custom category accepted in bulk import");
    expect(preview?.invalidRows === 1 && preview?.errors?.[0]?.field === "category", "Invalid non-existent category rejected in bulk import");

    // 12. Category Usage Count Check
    const catsWithUsage = await request("/api/categories");
    const stageInfo = catsWithUsage.data?.data?.customCategories?.find((c) => c._id === stageId);
    expect(stageInfo?.expenseCount === 1, "Category usage count is 1 for 'Stage & Tent'");

    // 13. Safe Deletion Test: Attempt delete category in use
    const delInUse = await request(`/api/categories/${stageId}`, { method: "DELETE" });
    expect(delInUse.status === 400, "Delete category in use is blocked with 400");
    expect(delInUse.data?.data?.canDeactivate === true, "Response suggests deactivation");

    // Verify historical expense still has category intact
    const checkExpList = await request(`/api/expenses?festivalYear=${year}`);
    const foundExp = checkExpList.data?.data?.expenses?.find((e) => e._id === customExpenseId);
    expect(foundExp?.category === "Stage & Tent", "Historical expense category remains intact after blocked delete");

    // 14. Deactivation Test
    const deactRes = await request(`/api/categories/${stageId}`, {
        method: "PUT",
        body: { isActive: false }
    });
    expect(deactRes.status === 200 && deactRes.data?.data?.isActive === false, "Category successfully deactivated");

    // Try creating NEW expense with deactivated category -> should fail
    const createWithDeactivated = await request("/api/expenses", {
        method: "POST",
        body: {
            title: "New Stage Light",
            amount: 5000,
            category: "Stage & Tent",
            festivalYear: year
        }
    });
    expect(createWithDeactivated.status === 400, "Creating new expense with deactivated category is blocked");

    // 15. Delete Unused Category
    const delUnused = await request(`/api/categories/${unusedId}`, { method: "DELETE" });
    expect(delUnused.status === 200, "Unused category successfully deleted");

    // 16. Category Rename & Historical Expense Propagation
    // Reactivate Stage & Tent first
    await request(`/api/categories/${stageId}`, { method: "PUT", body: { isActive: true } });
    const renameRes = await request(`/api/categories/${stageId}`, {
        method: "PUT",
        body: { name: "Stage, Tent & Fabric" }
    });
    expect(renameRes.status === 200 && renameRes.data?.data?.name === "Stage, Tent & Fabric", "Category renamed successfully");

    // Verify expense category was updated to the new name
    const listAfterRename = await request(`/api/expenses?festivalYear=${year}`);
    const updatedExp = listAfterRename.data?.data?.expenses?.find((e) => e._id === customExpenseId);
    expect(updatedExp?.category === "Stage, Tent & Fabric", "Historical expense automatically updated to new category name");

    console.log(`\nTEST RESULTS: ${pass} passed, ${fail} failed.`);
} catch (err) {
    console.error("Test execution error:", err);
    process.exitCode = 1;
} finally {
    process.exit(process.exitCode || 0);
}
