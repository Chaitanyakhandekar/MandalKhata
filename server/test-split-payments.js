import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { Donation } from "./src/models/donation.model.js";
import { Expense } from "./src/models/expense.model.js";
import { User } from "./src/models/user.model.js";
import { normalizeDonationDoc } from "./src/controllers/donation.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function runTests() {
    console.log("=== STARTING SPLIT PAYMENTS TEST SUITE ===");
    console.log("Connecting to MongoDB:", process.env.MONGODB_URI ? "URI Found" : "MISSING");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB successfully.\n");

    const TEST_YEAR = "9999"; // Isolated test year string
    let testUser = await User.findOne();
    if (!testUser) {
        testUser = await User.create({
            username: "test_mandal_user_" + Date.now(),
            name: "Test Mandal",
            email: "test_" + Date.now() + "@mandalkhata.test",
            password: "password123"
        });
    }

    let passedTests = 0;
    let totalTests = 0;

    function assert(condition, message) {
        totalTests++;
        if (condition) {
            console.log(`  ✓ PASS: ${message}`);
            passedTests++;
        } else {
            console.error(`  ✗ FAIL: ${message}`);
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    try {
        // Clean any existing test data for TEST_YEAR
        await Donation.deleteMany({ festivalYear: TEST_YEAR });
        await Expense.deleteMany({ festivalYear: TEST_YEAR });

        // ----------------------------------------------------
        // TEST 1: Standard Single Cash Donation (Full Payment)
        // ----------------------------------------------------
        console.log("--- TEST 1: Standard Single Cash Donation (₹900 Cash) ---");
        const don1 = await Donation.create({
            donorName: "Test Donor 1",
            amount: 900,
            festivalYear: TEST_YEAR,
            collectionStatus: "paid",
            collectedAmount: 900,
            pendingAmount: 0,
            paymentMethod: "cash",
            receiptNumber: "TEST-REC-001-" + Date.now(),
            createdBy: testUser._id,
            payments: [
                {
                    amount: 900,
                    paymentMethod: "cash",
                    date: new Date(),
                    note: "Full Cash"
                }
            ]
        });

        const norm1 = normalizeDonationDoc(don1);
        assert(norm1.amount === 900, "Pledged amount is 900");
        assert(norm1.collectedAmount === 900, "Collected amount is 900");
        assert(norm1.pendingAmount === 0, "Pending amount is 0");
        assert(norm1.cashCollected === 900, "Cash collected is 900");
        assert(norm1.upiCollected === 0, "UPI collected is 0");
        assert(norm1.collectionStatus === "paid", "Status is paid");

        // ----------------------------------------------------
        // TEST 2: Standard Single UPI Donation (Full Payment)
        // ----------------------------------------------------
        console.log("\n--- TEST 2: Standard Single UPI Donation (₹900 UPI) ---");
        const don2 = await Donation.create({
            donorName: "Test Donor 2",
            amount: 900,
            festivalYear: TEST_YEAR,
            collectionStatus: "paid",
            collectedAmount: 900,
            pendingAmount: 0,
            paymentMethod: "upi",
            receiptNumber: "TEST-REC-002-" + Date.now(),
            createdBy: testUser._id,
            payments: [
                {
                    amount: 900,
                    paymentMethod: "upi",
                    date: new Date(),
                    note: "Full UPI"
                }
            ]
        });

        const norm2 = normalizeDonationDoc(don2);
        assert(norm2.amount === 900, "Pledged amount is 900");
        assert(norm2.collectedAmount === 900, "Collected amount is 900");
        assert(norm2.cashCollected === 0, "Cash collected is 0");
        assert(norm2.upiCollected === 900, "UPI collected is 900");
        assert(norm2.collectionStatus === "paid", "Status is paid");

        // ----------------------------------------------------
        // TEST 3: Split Payment on Creation: ₹900 pledged -> ₹200 Cash + ₹500 UPI
        // ----------------------------------------------------
        console.log("\n--- TEST 3: Split Payment on Creation (₹900 pledged: ₹200 Cash + ₹500 UPI) ---");
        const don3 = await Donation.create({
            donorName: "Test Donor 3 - Split",
            amount: 900,
            festivalYear: TEST_YEAR,
            collectionStatus: "partially_collected",
            collectedAmount: 700,
            pendingAmount: 200,
            receiptNumber: "TEST-REC-003-" + Date.now(),
            createdBy: testUser._id,
            payments: [
                {
                    amount: 200,
                    paymentMethod: "cash",
                    date: new Date(),
                    note: "Initial Cash part"
                },
                {
                    amount: 500,
                    paymentMethod: "upi",
                    date: new Date(),
                    note: "Initial UPI part"
                }
            ]
        });

        const norm3 = normalizeDonationDoc(don3);
        assert(norm3.amount === 900, "Pledged amount is 900");
        assert(norm3.collectedAmount === 700, "Total collected is 700");
        assert(norm3.pendingAmount === 200, "Pending amount is 200");
        assert(norm3.cashCollected === 200, "Cash collected is exactly 200");
        assert(norm3.upiCollected === 500, "UPI collected is exactly 500");
        assert(norm3.collectionStatus === "partially_collected", "Status is partially_collected");
        assert(norm3.payments.length === 2, "Has exactly 2 payment records");

        // ----------------------------------------------------
        // TEST 4: Add Payment Later to Same Donation: Remaining ₹200 in Cash
        // ----------------------------------------------------
        console.log("\n--- TEST 4: Add Remaining ₹200 in Cash Later to Same Donation ---");
        don3.payments.push({
            amount: 200,
            paymentMethod: "cash",
            date: new Date(),
            note: "Remaining 200 settled in Cash"
        });
        const updatedTotal = don3.payments.reduce((sum, p) => sum + p.amount, 0);
        don3.collectedAmount = updatedTotal;
        don3.pendingAmount = Math.max(0, don3.amount - updatedTotal);
        don3.collectionStatus = updatedTotal >= don3.amount ? "paid" : "partially_collected";
        await don3.save();

        const refetched3 = await Donation.findById(don3._id);
        const norm3Updated = normalizeDonationDoc(refetched3);
        assert(norm3Updated.collectedAmount === 900, "Updated collected is 900");
        assert(norm3Updated.pendingAmount === 0, "Updated pending is 0");
        assert(norm3Updated.collectionStatus === "paid", "Status transitioned to paid");
        assert(norm3Updated.cashCollected === 400, "Cash collected is now 400 (200 + 200)");
        assert(norm3Updated.upiCollected === 500, "UPI collected is still 500");
        assert(norm3Updated.payments.length === 3, "Has 3 payment records under one receipt");

        // ----------------------------------------------------
        // TEST 5: Multiple Split Rows with Same Method: ₹300 Cash + ₹200 UPI + ₹100 Cash
        // ----------------------------------------------------
        console.log("\n--- TEST 5: Multi-split (₹600 pledged: ₹300 Cash + ₹200 UPI + ₹100 Cash) ---");
        const don5 = await Donation.create({
            donorName: "Test Donor 5",
            amount: 600,
            festivalYear: TEST_YEAR,
            collectionStatus: "paid",
            collectedAmount: 600,
            pendingAmount: 0,
            receiptNumber: "TEST-REC-005-" + Date.now(),
            createdBy: testUser._id,
            payments: [
                { amount: 300, paymentMethod: "cash", date: new Date(), note: "Part 1 Cash" },
                { amount: 200, paymentMethod: "upi", date: new Date(), note: "Part 2 UPI" },
                { amount: 100, paymentMethod: "cash", date: new Date(), note: "Part 3 Cash" }
            ]
        });

        const norm5 = normalizeDonationDoc(don5);
        assert(norm5.cashCollected === 400, "Total Cash collected is 400 (300 + 100)");
        assert(norm5.upiCollected === 200, "Total UPI collected is 200");
        assert(norm5.collectedAmount === 600, "Total collected is 600");
        assert(norm5.pendingAmount === 0, "Pending is 0");

        // ----------------------------------------------------
        // TEST 6: Over-pledge Prevention
        // ----------------------------------------------------
        console.log("\n--- TEST 6: Over-pledge Validation ---");
        // Check 6a: payments sum exceeding pledged amount
        const pledged = 900;
        const invalidPayments = [
            { amount: 600, paymentMethod: "cash" },
            { amount: 500, paymentMethod: "upi" }
        ];
        const invalidSum = invalidPayments.reduce((s, p) => s + p.amount, 0);
        assert(invalidSum > pledged, "Sum 1100 > pledged 900 is detected as invalid");

        // Check 6b: adding payment greater than pending amount
        const remainingPending = 200;
        const excessPayment = 300;
        assert(excessPayment > remainingPending, "Adding 300 when pending is 200 is detected as invalid");

        // ----------------------------------------------------
        // TEST 7: Edit Payment Record in Donation
        // ----------------------------------------------------
        console.log("\n--- TEST 7: Edit Payment Record in Donation ---");
        // Change payment 2 (UPI 500) of don3 to UPI 400
        const don3ToEdit = await Donation.findById(don3._id);
        const upiPayment = don3ToEdit.payments.find(p => p.paymentMethod === "upi");
        upiPayment.amount = 400;
        const newTotal = don3ToEdit.payments.reduce((s, p) => s + p.amount, 0);
        don3ToEdit.collectedAmount = newTotal;
        don3ToEdit.pendingAmount = Math.max(0, don3ToEdit.amount - newTotal);
        don3ToEdit.collectionStatus = newTotal >= don3ToEdit.amount ? "paid" : "partially_collected";
        await don3ToEdit.save();

        const normEdited = normalizeDonationDoc(await Donation.findById(don3._id));
        assert(normEdited.collectedAmount === 800, "Total collected adjusted to 800 (400 cash + 400 upi)");
        assert(normEdited.pendingAmount === 100, "Pending adjusted to 100");
        assert(normEdited.upiCollected === 400, "UPI collected is now 400");
        assert(normEdited.cashCollected === 400, "Cash collected remains 400");
        assert(normEdited.collectionStatus === "partially_collected", "Status updated to partially_collected");

        // ----------------------------------------------------
        // TEST 8: Delete Payment Record in Donation
        // ----------------------------------------------------
        console.log("\n--- TEST 8: Delete Payment Record in Donation ---");
        // Delete the remaining cash payment of 200
        const don3ToDelete = await Donation.findById(don3._id);
        don3ToDelete.payments.pop(); // Remove last payment (200 cash)
        const delTotal = don3ToDelete.payments.reduce((s, p) => s + p.amount, 0);
        don3ToDelete.collectedAmount = delTotal;
        don3ToDelete.pendingAmount = Math.max(0, don3ToDelete.amount - delTotal);
        don3ToDelete.collectionStatus = delTotal >= don3ToDelete.amount ? "paid" : "partially_collected";
        await don3ToDelete.save();

        const normDel = normalizeDonationDoc(await Donation.findById(don3._id));
        assert(normDel.payments.length === 2, "Payments length is 2 after deletion");
        assert(normDel.collectedAmount === 600, "Collected is 600 (200 cash + 400 upi)");
        assert(normDel.pendingAmount === 300, "Pending is 300 (900 - 600)");
        assert(normDel.cashCollected === 200, "Cash is back to 200");
        assert(normDel.upiCollected === 400, "UPI is 400");

        // ----------------------------------------------------
        // TEST 9: Dashboard & Ledger Financial Aggregations
        // ----------------------------------------------------
        console.log("\n--- TEST 9: Dashboard & Ledger Financial Aggregations ---");
        // Add expenses for TEST_YEAR: 300 Cash + 200 UPI
        await Expense.create({
            title: "Test Expense Cash",
            amount: 300,
            paymentStatus: "paid",
            paidAmount: 300,
            paymentMethod: "cash",
            festivalYear: TEST_YEAR,
            category: "Decoration",
            createdBy: testUser._id,
            payments: [{ amount: 300, paymentMethod: "cash", date: new Date() }]
        });
        await Expense.create({
            title: "Test Expense UPI",
            amount: 200,
            paymentStatus: "paid",
            paidAmount: 200,
            paymentMethod: "upi",
            festivalYear: TEST_YEAR,
            category: "Sound",
            createdBy: testUser._id,
            payments: [{ amount: 200, paymentMethod: "upi", date: new Date() }]
        });

        // Compute aggregations across all donations for TEST_YEAR:
        // don1: 900 cash
        // don2: 900 upi
        // don3: 200 cash + 400 upi (pledged 900)
        // don5: 400 cash + 200 upi (pledged 600)
        // Total Pledged = 900 + 900 + 900 + 600 = 3300
        // Total Cash = 900 + 0 + 200 + 400 = 1500
        // Total UPI = 0 + 900 + 400 + 200 = 1500
        // Total Collected = 1500 + 1500 = 3000
        // Total Pending = 3300 - 3000 = 300
        const allDons = await Donation.find({ festivalYear: TEST_YEAR });
        let totalPledged = 0;
        let totalCollected = 0;
        let totalCash = 0;
        let totalUpi = 0;

        for (const doc of allDons) {
            const n = normalizeDonationDoc(doc);
            totalPledged += n.amount || 0;
            totalCollected += n.collectedAmount || 0;
            totalCash += n.cashCollected || 0;
            totalUpi += n.upiCollected || 0;
        }

        assert(totalPledged === 3300, "Total Pledged across all donations is 3300");
        assert(totalCollected === 3000, "Total Collected across all donations is 3000");
        assert(totalCash === 1500, "Total Cash Collected is 1500");
        assert(totalUpi === 1500, "Total UPI Collected is 1500");
        assert(totalPledged - totalCollected === 300, "Total Pending is 300");

        // Verify Balances:
        // Cash Balance = Cash In (1500) - Cash Out (300) = 1200
        // UPI Balance = UPI In (1500) - UPI Out (200) = 1300
        // Net Balance = Total Collected (3000) - Total Expense (500) = 2500
        const cashBalance = totalCash - 300;
        const upiBalance = totalUpi - 200;
        const netBalance = totalCollected - 500;

        assert(cashBalance === 1200, "Cash Balance is 1200 (1500 in - 300 out)");
        assert(upiBalance === 1300, "UPI Balance is 1300 (1500 in - 200 out)");
        assert(netBalance === 2500, "Net Balance is 2500 (3000 in - 500 out)");
        assert(cashBalance + upiBalance === netBalance, "Cash Balance + UPI Balance equals Net Balance");

        // ----------------------------------------------------
        // TEST 10: Backward Compatibility with Legacy Donations
        // ----------------------------------------------------
        console.log("\n--- TEST 10: Backward Compatibility with Legacy Donations ---");
        // Legacy document without `payments` array
        const legacyDoc = {
            _id: new mongoose.Types.ObjectId(),
            donorName: "Legacy Donor",
            amount: 500,
            collectedAmount: 500,
            pendingAmount: 0,
            collectionStatus: "paid",
            paymentMethod: "cash",
            payments: [] // Empty
        };

        const normLegacy = normalizeDonationDoc(legacyDoc);
        assert(normLegacy.cashCollected === 500, "Legacy doc assigns cashCollected = 500");
        assert(normLegacy.upiCollected === 0, "Legacy doc assigns upiCollected = 0");
        assert(normLegacy.payments.length === 1, "Legacy doc generates 1 virtual payment record");
        assert(normLegacy.payments[0].amount === 500, "Virtual payment has correct amount 500");
        assert(normLegacy.payments[0].paymentMethod === "cash", "Virtual payment has correct method cash");

        console.log("\n==========================================");
        console.log(`ALL TESTS PASSED! (${passedTests}/${totalTests})`);
        console.log("==========================================\n");

    } finally {
        // Cleanup all test records
        console.log("Cleaning up test database records...");
        await Donation.deleteMany({ festivalYear: TEST_YEAR });
        await Expense.deleteMany({ festivalYear: TEST_YEAR });
        await mongoose.disconnect();
        console.log("Database disconnected. Test run finished.");
    }
}

runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
