import mongoose from "mongoose";
import connectDB from "./src/db/db.js";
import { httpServer } from "./src/server.js";

const PORT = 8031;
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

const expect = (condition, label, actual) => {
    if (condition) {
        console.log(`  PASS  ${label}`);
        pass++;
    } else {
        console.log(`  FAIL  ${label}`, actual !== undefined ? `(got: ${JSON.stringify(actual)})` : "");
        fail++;
        process.exitCode = 1;
    }
};

console.log("Connecting to MongoDB...");
await connectDB();
await new Promise((resolve) => httpServer.listen(PORT, resolve));
console.log(`Test server listening on :${PORT}`);

try {
    // 1. User Registration & Auth
    const email = `partialtest_${Date.now()}@test.com`;
    const regRes = await request("/api/users/register", {
        method: "POST",
        body: { name: "Partial Payment Tester", email, username: `ptest_${Date.now()}`, password: "Password123!" }
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

    // 2. Set Festival Year
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

    // 3. Validation: Amount Paid for Partial Payment
    // 3a. amountPaid >= total expense amount must be rejected
    const overPaidRes = await request("/api/expenses", {
        method: "POST",
        body: {
            title: "Overpaid Invalid Partial",
            amount: 20000,
            category: "Sound",
            paymentType: "partial",
            amountPaid: 20000,
            paymentMethod: "upi",
            festivalYear: year
        }
    });
    expect(overPaidRes.status === 400, "amountPaid >= amount rejected for partial payment", overPaidRes.status);

    const overPaidRes2 = await request("/api/expenses", {
        method: "POST",
        body: {
            title: "Overpaid Invalid Partial 2",
            amount: 20000,
            category: "Sound",
            paymentType: "partial",
            amountPaid: 25000,
            paymentMethod: "upi",
            festivalYear: year
        }
    });
    expect(overPaidRes2.status === 400, "amountPaid > amount rejected for partial payment", overPaidRes2.status);

    // 3b. amountPaid <= 0 must be rejected
    const zeroPaidRes = await request("/api/expenses", {
        method: "POST",
        body: {
            title: "Zero Paid Invalid Partial",
            amount: 20000,
            category: "Sound",
            paymentType: "partial",
            amountPaid: 0,
            paymentMethod: "upi",
            festivalYear: year
        }
    });
    expect(zeroPaidRes.status === 400, "amountPaid = 0 rejected for partial payment", zeroPaidRes.status);

    const negPaidRes = await request("/api/expenses", {
        method: "POST",
        body: {
            title: "Negative Paid Invalid Partial",
            amount: 20000,
            category: "Sound",
            paymentType: "partial",
            amountPaid: -500,
            paymentMethod: "upi",
            festivalYear: year
        }
    });
    expect(negPaidRes.status === 400, "amountPaid < 0 rejected for partial payment", negPaidRes.status);

    // 4. Scenario 1: Create ₹20,000 expense with Full Payment + UPI
    const fullExpRes = await request("/api/expenses", {
        method: "POST",
        body: {
            title: "Stage Decoration Full",
            amount: 20000,
            category: "Decoration",
            paymentType: "full",
            paymentMethod: "upi",
            vendorName: "Shree Mandap Decorators",
            festivalYear: year
        }
    });
    expect(fullExpRes.status === 201, "Full payment expense created (status 201)");
    const fullExp = fullExpRes.data?.data;
    expect(fullExp?.amount === 20000, "Total Expense = ₹20,000", fullExp?.amount);
    expect(fullExp?.paidAmount === 20000, "Amount Paid = ₹20,000", fullExp?.paidAmount);
    expect(fullExp?.paymentStatus === "paid", "Status = paid", fullExp?.paymentStatus);
    expect(fullExp?.payments?.length === 1, "1 payment recorded", fullExp?.payments?.length);
    expect(fullExp?.payments?.[0]?.paymentMethod === "upi", "Payment method = upi", fullExp?.payments?.[0]?.paymentMethod);

    // 5. Scenario 2: Create ₹20,000 expense with Partial Payment + ₹2,000 + UPI
    const partialExpRes = await request("/api/expenses", {
        method: "POST",
        body: {
            title: "Sound System Advance",
            amount: 20000,
            category: "Sound",
            paymentType: "partial",
            amountPaid: 2000,
            paymentMethod: "upi",
            vendorName: "Vijay Sound",
            note: "Advance payment",
            festivalYear: year
        }
    });
    expect(partialExpRes.status === 201, "Partial payment expense created (status 201)");
    const partialExp = partialExpRes.data?.data;
    expect(partialExp?.amount === 20000, "Total Expense = ₹20,000", partialExp?.amount);
    expect(partialExp?.paidAmount === 2000, "Amount Paid = ₹2,000", partialExp?.paidAmount);
    expect(partialExp?.paymentStatus === "partially_paid", "Status = partially_paid", partialExp?.paymentStatus);
    expect(partialExp?.payments?.length === 1, "1 payment recorded", partialExp?.payments?.length);
    expect(partialExp?.payments?.[0]?.amount === 2000, "Initial payment amount = ₹2,000");

    // 6. Scenario 5: Check dynamic totals across filtered dataset
    const totalsRes1 = await request(`/api/expenses?festivalYear=${year}`);
    expect(totalsRes1.status === 200, "GET /api/expenses succeeded");
    expect(totalsRes1.data?.data?.total === 2, "2 expenses found");
    expect(totalsRes1.data?.data?.totalAmount === 40000, "Total Expenses = ₹40,000 (20k + 20k)", totalsRes1.data?.data?.totalAmount);
    expect(totalsRes1.data?.data?.totalPaidAmount === 22000, "Total Paid = ₹22,000 (20k + 2k)", totalsRes1.data?.data?.totalPaidAmount);
    expect(totalsRes1.data?.data?.totalOutstanding === 18000, "Total Outstanding = ₹18,000", totalsRes1.data?.data?.totalOutstanding);

    // 7. Ledger verification before subsequent payment
    // Must record actual money paid: 20k for fullExp, 2k for partialExp (Total cash outflow = 22k, NOT 40k!)
    const ledgerRes1 = await request(`/api/reports/ledger?festivalYear=${year}`);
    expect(ledgerRes1.status === 200, "GET /api/reports/ledger succeeded");
    const ledgerTxs1 = ledgerRes1.data?.data || [];
    const expenseOutflows1 = ledgerTxs1.filter((t) => t.type === "expense");
    expect(expenseOutflows1.length === 2, "2 ledger outflow entries found (1 for full, 1 for partial payment)", expenseOutflows1.length);
    const sumOutflows1 = expenseOutflows1.reduce((sum, t) => sum + t.amount, 0);
    expect(sumOutflows1 === 22000, "Ledger total outflow reflects actual ₹22,000 paid (NOT ₹40,000)", sumOutflows1);

    // 8. Scenario 3: Add Payment of ₹18,000 to the partially paid expense
    // 8a. Validation: Try to pay more than outstanding (e.g. ₹19,000 when outstanding is ₹18,000)
    const overAddRes = await request(`/api/expenses/${partialExp._id}/payments`, {
        method: "POST",
        body: {
            amount: 19000,
            paymentMethod: "bank"
        }
    });
    expect(overAddRes.status === 400, "Adding payment exceeding outstanding rejected (status 400)", overAddRes.status);

    // 8b. Add exactly ₹18,000
    const addPaymentRes = await request(`/api/expenses/${partialExp._id}/payments`, {
        method: "POST",
        body: {
            amount: 18000,
            paymentMethod: "bank",
            note: "Final settlement"
        }
    });
    expect(addPaymentRes.status === 200, "Add payment succeeded (status 200)");
    const settledExp = addPaymentRes.data?.data;
    expect(settledExp?.amount === 20000, "Total Expense remains ₹20,000", settledExp?.amount);
    expect(settledExp?.paidAmount === 20000, "Paid Amount now = ₹20,000", settledExp?.paidAmount);
    expect(settledExp?.paymentStatus === "paid", "Payment Status automatically updated to 'paid'", settledExp?.paymentStatus);
    expect(settledExp?.payments?.length === 2, "Payment history has 2 records", settledExp?.payments?.length);
    expect(settledExp?.payments?.[1]?.amount === 18000, "Second payment = ₹18,000");
    expect(settledExp?.payments?.[1]?.paymentMethod === "bank", "Second payment method = bank");

    // 8c. Cannot add payment to fully paid expense
    const alreadyPaidRes = await request(`/api/expenses/${partialExp._id}/payments`, {
        method: "POST",
        body: { amount: 500, paymentMethod: "cash" }
    });
    expect(alreadyPaidRes.status === 400, "Adding payment to fully paid expense rejected", alreadyPaidRes.status);

    // 9. Ledger verification after second payment
    // Should now have 3 outflow transactions (20k, 2k, 18k) totaling ₹40,000
    const ledgerRes2 = await request(`/api/reports/ledger?festivalYear=${year}`);
    const ledgerTxs2 = ledgerRes2.data?.data || [];
    const expenseOutflows2 = ledgerTxs2.filter((t) => t.type === "expense");
    expect(expenseOutflows2.length === 3, "3 ledger outflows after second payment", expenseOutflows2.length);
    const sumOutflows2 = expenseOutflows2.reduce((sum, t) => sum + t.amount, 0);
    expect(sumOutflows2 === 40000, "Ledger total outflow now ₹40,000", sumOutflows2);

    // 10. Scenario 6: Edit expense: try reducing total below paid amount
    const invalidEditRes = await request(`/api/expenses/${settledExp._id}`, {
        method: "PUT",
        body: {
            amount: 15000 // already paid 20k!
        }
    });
    expect(invalidEditRes.status === 400, "Reducing total expense amount below paid amount rejected", invalidEditRes.status);

    // 10b. Increase total amount to ₹25,000 -> status flips back to partially_paid with ₹5,000 outstanding!
    const validEditRes = await request(`/api/expenses/${settledExp._id}`, {
        method: "PUT",
        body: {
            amount: 25000
        }
    });
    expect(validEditRes.status === 200, "Increasing total expense to ₹25,000 accepted");
    const increasedExp = validEditRes.data?.data;
    expect(increasedExp?.amount === 25000, "Updated Total Expense = ₹25,000", increasedExp?.amount);
    expect(increasedExp?.paidAmount === 20000, "Paid Amount preserved as ₹20,000", increasedExp?.paidAmount);
    expect(increasedExp?.paymentStatus === "partially_paid", "Status flips to partially_paid", increasedExp?.paymentStatus);
    expect(increasedExp?.payments?.length === 2, "Payment history intact with 2 payments");

    // 11. Totals check after edit
    const totalsRes2 = await request(`/api/expenses?festivalYear=${year}`);
    expect(totalsRes2.data?.data?.totalAmount === 45000, "Total Expenses = ₹45,000 (20k + 25k)", totalsRes2.data?.data?.totalAmount);
    expect(totalsRes2.data?.data?.totalPaidAmount === 40000, "Total Paid = ₹40,000 (20k + 20k)", totalsRes2.data?.data?.totalPaidAmount);
    expect(totalsRes2.data?.data?.totalOutstanding === 5000, "Total Outstanding = ₹5,000", totalsRes2.data?.data?.totalOutstanding);

    // 12. Filter by payment status: partially_paid
    const partialFilterRes = await request(`/api/expenses?festivalYear=${year}&paymentStatus=partially_paid`);
    expect(partialFilterRes.status === 200, "GET /api/expenses?paymentStatus=partially_paid succeeded");
    expect(partialFilterRes.data?.data?.total === 1, "1 partially_paid expense matching filter");
    expect(partialFilterRes.data?.data?.totalAmount === 25000, "Filtered totalAmount = ₹25,000");
    expect(partialFilterRes.data?.data?.totalPaidAmount === 20000, "Filtered totalPaidAmount = ₹20,000");
    expect(partialFilterRes.data?.data?.totalOutstanding === 5000, "Filtered totalOutstanding = ₹5,000");

    // 13. Filter by payment status: paid
    const paidFilterRes = await request(`/api/expenses?festivalYear=${year}&paymentStatus=paid`);
    expect(paidFilterRes.data?.data?.total === 1, "1 paid expense matching filter");
    expect(paidFilterRes.data?.data?.totalAmount === 20000, "Filtered totalAmount = ₹20,000");
    expect(paidFilterRes.data?.data?.totalPaidAmount === 20000, "Filtered totalPaidAmount = ₹20,000");
    expect(paidFilterRes.data?.data?.totalOutstanding === 0, "Filtered totalOutstanding = ₹0");

    // 14. Scenario 11: Delete expense with payments
    const delRes = await request(`/api/expenses/${increasedExp._id}`, { method: "DELETE" });
    expect(delRes.status === 200, "DELETE /api/expenses/:id succeeded");

    const totalsAfterDel = await request(`/api/expenses?festivalYear=${year}`);
    expect(totalsAfterDel.data?.data?.total === 1, "1 expense remains after deletion");
    expect(totalsAfterDel.data?.data?.totalAmount === 20000, "Total Amount after deletion = ₹20,000");
    expect(totalsAfterDel.data?.data?.totalPaidAmount === 20000, "Total Paid after deletion = ₹20,000");
    expect(totalsAfterDel.data?.data?.totalOutstanding === 0, "Total Outstanding after deletion = ₹0");

    const ledgerAfterDel = await request(`/api/reports/ledger?festivalYear=${year}`);
    const outflowsAfterDel = (ledgerAfterDel.data?.data || []).filter((t) => t.type === "expense");
    expect(outflowsAfterDel.length === 1, "1 ledger outflow transaction remains after deletion");
    expect(outflowsAfterDel[0]?.amount === 20000, "Remaining ledger outflow = ₹20,000");

} catch (err) {
    console.error("Test execution failed:", err);
    fail++;
    process.exitCode = 1;
} finally {
    console.log("\n-----------------------------------------");
    console.log(`Test Summary: ${pass} passed, ${fail} failed`);
    console.log("-----------------------------------------\n");
    await mongoose.disconnect();
    process.exit(fail === 0 ? 0 : 1);
}
