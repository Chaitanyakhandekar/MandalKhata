import mongoose from "mongoose";
import connectDB from "./src/db/db.js";
import { httpServer } from "./src/server.js";

const PORT = 8024;
const BASE = `http://localhost:${PORT}`;

let cookie = "";
let pass = 0;
let fail = 0;

const request = async (path, { method = "GET", body, headers = {} } = {}) => {
    const response = await fetch(`${BASE}${path}`, {
        method,
        headers: Object.assign(
            {},
            body ? { "Content-Type": "application/json" } : {},
            cookie ? { Cookie: cookie } : {},
            headers
        ),
        body: body ? JSON.stringify(body) : undefined
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

console.log("Connecting to MongoDB...");
await connectDB();
await new Promise((resolve) => httpServer.listen(PORT, resolve));
console.log(`Test server listening on :${PORT}`);

try {
    // 1. Auth setup
    const email = `totexp_${Date.now()}@test.com`;
    await request("/api/users/register", {
        method: "POST",
        body: { name: "Total Tester", email, username: `tot_${Date.now()}`, password: "Password123!" }
    });
    const loginRes = await request("/api/users/login", {
        method: "POST",
        body: { email, password: "Password123!" }
    });
    const setCookie = loginRes.headers.get("set-cookie");
    if (setCookie) {
        cookie = setCookie.split(";")[0];
    }

    const year = "2026";
    const yearRes = await request("/api/festivals", { method: "POST", body: { year } });
    const yearId = yearRes.data?.data?._id;
    if (yearId) {
        await request(`/api/festivals/active/${yearId}`, { method: "PATCH" });
    }

    // 2. Initial empty state
    const emptyRes = await request(`/api/expenses?festivalYear=${year}`);
    expect(emptyRes.status === 200, "Empty expenses fetched successfully");
    expect(emptyRes.data?.data?.total === 0, "Initial total count is 0");
    expect(emptyRes.data?.data?.totalAmount === 0, "Initial totalAmount is 0");

    // 3. Create Custom Category "Stage Setup"
    const catRes = await request("/api/categories", { method: "POST", body: { name: "Stage Setup" } });
    expect(catRes.status === 201, "Custom category created");

    // 4. Create 4 Distinct Expenses
    // Expense 1: Decoration, 10000, paid, 2026-08-01, Vendor: "Floral Bliss", Note: "Flowers"
    const exp1 = await request("/api/expenses", {
        method: "POST",
        body: {
            title: "Flower Garlands",
            amount: 10000,
            category: "Decoration",
            vendorName: "Floral Bliss",
            paymentStatus: "paid",
            date: "2026-08-01",
            festivalYear: year,
            note: "Flowers"
        }
    });

    // Expense 2: Stage Setup (custom), 25000, paid, 2026-08-02, Vendor: "Mandal Stages", Note: "Main stage"
    const exp2 = await request("/api/expenses", {
        method: "POST",
        body: {
            title: "Pandal and Stage Setup",
            amount: 25000,
            category: "Stage Setup",
            vendorName: "Mandal Stages",
            paymentStatus: "paid",
            date: "2026-08-02",
            festivalYear: year,
            note: "Main stage"
        }
    });

    // Expense 3: Food, 15000, pending, 2026-08-10, Vendor: "Caterer Bros", Note: "Bhog sweets"
    const exp3 = await request("/api/expenses", {
        method: "POST",
        body: {
            title: "Maha Prasad Sweets",
            amount: 15000,
            category: "Food",
            vendorName: "Caterer Bros",
            paymentStatus: "pending",
            date: "2026-08-10",
            festivalYear: year,
            note: "Bhog sweets"
        }
    });

    // Expense 4: Sound, 8000, paid, 2026-08-15, Vendor: "DJ Beats", Note: "Speakers"
    const exp4 = await request("/api/expenses", {
        method: "POST",
        body: {
            title: "Audio System Hire",
            amount: 8000,
            category: "Sound",
            vendorName: "DJ Beats",
            paymentStatus: "paid",
            date: "2026-08-15",
            festivalYear: year,
            note: "Speakers"
        }
    });

    const exp1Id = exp1.data?.data?._id;
    const exp2Id = exp2.data?.data?._id;
    const exp3Id = exp3.data?.data?._id;
    const exp4Id = exp4.data?.data?._id;

    // Total expected sum: 10000 + 25000 + 15000 + 8000 = 58000
    const totalAll = await request(`/api/expenses?festivalYear=${year}`);
    expect(totalAll.data?.data?.total === 4, "Total expense count is 4");
    expect(totalAll.data?.data?.totalAmount === 58000, "Total expense amount is 58000");

    // 5. Pagination independence: Verify total represents full dataset when paginated
    const page1 = await request(`/api/expenses?festivalYear=${year}&page=1&limit=2`);
    expect(page1.data?.data?.expenses?.length === 2, "Page 1 returns 2 expenses");
    expect(page1.data?.data?.total === 4, "Page 1 still reports total count 4");
    expect(page1.data?.data?.totalAmount === 58000, "Page 1 still reports totalAmount 58000 across all pages");

    const page2 = await request(`/api/expenses?festivalYear=${year}&page=2&limit=2`);
    expect(page2.data?.data?.expenses?.length === 2, "Page 2 returns 2 expenses");
    expect(page2.data?.data?.total === 4, "Page 2 still reports total count 4");
    expect(page2.data?.data?.totalAmount === 58000, "Page 2 still reports totalAmount 58000 across all pages");

    // 6. Search filter
    const searchRes = await request(`/api/expenses?festivalYear=${year}&search=Floral`);
    expect(searchRes.data?.data?.total === 1, "Search for 'Floral' matches 1 expense");
    expect(searchRes.data?.data?.totalAmount === 10000, "Search totalAmount is 10000");

    // 7. System Category filter
    const catDecoRes = await request(`/api/expenses?festivalYear=${year}&category=Decoration`);
    expect(catDecoRes.data?.data?.total === 1, "Category Decoration matches 1 expense");
    expect(catDecoRes.data?.data?.totalAmount === 10000, "Category Decoration totalAmount is 10000");

    // 8. Custom Category filter
    const catCustomRes = await request(`/api/expenses?festivalYear=${year}&category=Stage+Setup`);
    expect(catCustomRes.data?.data?.total === 1, "Custom category Stage Setup matches 1 expense");
    expect(catCustomRes.data?.data?.totalAmount === 25000, "Custom category Stage Setup totalAmount is 25000");

    // 9. Payment Status filter
    const statusPaidRes = await request(`/api/expenses?festivalYear=${year}&paymentStatus=paid`);
    // Paid: 10000 + 25000 + 8000 = 43000
    expect(statusPaidRes.data?.data?.total === 3, "Payment status 'paid' matches 3 expenses");
    expect(statusPaidRes.data?.data?.totalAmount === 43000, "Payment status 'paid' totalAmount is 43000");

    const statusPendingRes = await request(`/api/expenses?festivalYear=${year}&paymentStatus=pending`);
    expect(statusPendingRes.data?.data?.total === 1, "Payment status 'pending' matches 1 expense");
    expect(statusPendingRes.data?.data?.totalAmount === 15000, "Payment status 'pending' totalAmount is 15000");

    // 10. Date Range filter
    // 2026-08-01 to 2026-08-05: flower (10000) + stage (25000) = 35000
    const dateRes = await request(`/api/expenses?festivalYear=${year}&startDate=2026-08-01&endDate=2026-08-05`);
    expect(dateRes.data?.data?.total === 2, "Date range filter matches 2 expenses");
    expect(dateRes.data?.data?.totalAmount === 35000, "Date range totalAmount is 35000");

    // 11. Combined Filters
    // paid + date <= 2026-08-05 + search 'stage'
    const combinedRes = await request(`/api/expenses?festivalYear=${year}&paymentStatus=paid&startDate=2026-08-01&endDate=2026-08-05&search=stage`);
    expect(combinedRes.data?.data?.total === 1, "Combined filters match 1 expense");
    expect(combinedRes.data?.data?.totalAmount === 25000, "Combined filters totalAmount is 25000");

    // 12. Non-matching filter (Empty result)
    const noMatchRes = await request(`/api/expenses?festivalYear=${year}&search=NonExistentItemXYZ`);
    expect(noMatchRes.data?.data?.total === 0, "Non-matching search returns total count 0");
    expect(noMatchRes.data?.data?.totalAmount === 0, "Non-matching search returns totalAmount 0");
    expect(noMatchRes.data?.data?.expenses?.length === 0, "Non-matching search returns empty expenses array");

    // 13. Edit Expense: Change amount of exp4 (Audio System Hire) from 8000 to 12000
    const editRes = await request(`/api/expenses/${exp4Id}`, {
        method: "PUT",
        body: { amount: 12000 }
    });
    expect(editRes.status === 200, "Expense edited");
    // New total: 10000 + 25000 + 15000 + 12000 = 62000
    const afterEdit = await request(`/api/expenses?festivalYear=${year}`);
    expect(afterEdit.data?.data?.totalAmount === 62000, "Total updated to 62000 after editing expense amount");

    // 14. Delete Expense: Delete exp1 (10000)
    const delRes = await request(`/api/expenses/${exp1Id}`, { method: "DELETE" });
    expect(delRes.status === 200, "Expense deleted");
    // New total: 25000 + 15000 + 12000 = 52000, count: 3
    const afterDel = await request(`/api/expenses?festivalYear=${year}`);
    expect(afterDel.data?.data?.total === 3, "Total count updated to 3 after deletion");
    expect(afterDel.data?.data?.totalAmount === 52000, "Total amount updated to 52000 after deletion");

    console.log(`\nALL TOTAL EXPENSES TESTS PASSED: ${pass} passed, ${fail} failed.`);
} catch (err) {
    console.error("Test execution error:", err);
    process.exitCode = 1;
} finally {
    process.exit(process.exitCode || 0);
}
