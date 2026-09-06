import { Donation } from "../models/donation.model.js";
import { FestivalYear } from "../models/festivalYear.model.js";
import { Household } from "../models/household.model.js";
import { ExternalDonor } from "../models/externalDonor.model.js";
import { BuildingConfig } from "../models/buildingConfig.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiUtils.js";
import { isFlatInRanges, describeRanges, normalizeConfigRanges } from "../utils/flatRanges.util.js";

const DONOR_TYPES = ["resident", "external"];
const DONOR_CATEGORIES = ["Individual", "Business", "Organization", "Shop", "Well-wisher"];
const PHONE_REGEX = /^[0-9+\-\s]{7,15}$/;

/**
 * Helper to ensure legacy donation documents without payments array
 * are properly shaped with collectedAmount, pendingAmount, collectionStatus,
 * payments history, and per-payment-method breakdowns (Cash, UPI, Bank).
 */
const normalizeDonationDoc = (doc) => {
    const d = doc && typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
    if (!d) return d;

    let cashCollected = 0;
    let upiCollected = 0;
    let bankCollected = 0;

    if (!Array.isArray(d.payments) || d.payments.length === 0) {
        // Legacy donation: treated as fully collected if not explicitly marked otherwise
        const amountVal = d.amount || 0;
        d.collectedAmount = d.collectedAmount != null ? d.collectedAmount : amountVal;
        d.pendingAmount = d.pendingAmount != null ? d.pendingAmount : Math.max(amountVal - d.collectedAmount, 0);
        d.collectionStatus = d.collectionStatus || (d.pendingAmount === 0 ? "paid" : (d.collectedAmount > 0 ? "partially_collected" : "not_collected"));
        
        const defaultMethod = (d.paymentMethod || "cash").toLowerCase();
        if (d.collectedAmount > 0) {
            d.payments = [
                {
                    _id: d._id,
                    amount: d.collectedAmount,
                    paymentMethod: defaultMethod,
                    date: d.date || d.createdAt,
                    note: d.note || "",
                    createdAt: d.createdAt
                }
            ];
            if (defaultMethod === "upi") upiCollected = d.collectedAmount;
            else if (defaultMethod === "bank") bankCollected = d.collectedAmount;
            else cashCollected = d.collectedAmount;
        } else {
            d.payments = [];
        }
    } else {
        // Compute dynamically from individual payments
        let totalPaid = 0;
        d.payments.forEach(p => {
            const pAmt = Number(p.amount) || 0;
            totalPaid += pAmt;
            const pMethod = (p.paymentMethod || "cash").toLowerCase();
            if (pMethod === "upi") upiCollected += pAmt;
            else if (pMethod === "bank") bankCollected += pAmt;
            else cashCollected += pAmt;
        });

        d.collectedAmount = totalPaid;
        d.pendingAmount = Math.max((d.amount || 0) - totalPaid, 0);
        if (totalPaid === 0) {
            d.collectionStatus = "not_collected";
        } else if (d.pendingAmount === 0) {
            d.collectionStatus = "paid";
        } else {
            d.collectionStatus = "partially_collected";
        }
    }

    d.cashCollected = cashCollected;
    d.upiCollected = upiCollected;
    d.bankCollected = bankCollected;
    d.paymentMethodTotals = {
        cash: cashCollected,
        upi: upiCollected,
        bank: bankCollected
    };

    return d;
};

const getDonations = asyncHandler(async (req, res) => {
    const {
        festivalYear,
        search,
        paymentMethod,
        collectionStatus,
        donorType,
        startDate,
        endDate,
        page = 1,
        limit = 50
    } = req.query;

    const andConditions = [{ createdBy: req.user._id }];

    // Filter by festival year (always default to active year if not provided)
    if (festivalYear) {
        andConditions.push({ festivalYear });
    } else {
        const activeYear = await FestivalYear.findOne({ isActive: true, createdBy: req.user._id });
        if (activeYear) {
            andConditions.push({ festivalYear: activeYear.year });
        }
    }

    // Keyword search (donorName or receiptNumber or phone or note)
    if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        andConditions.push({
            $or: [
                { donorName: regex },
                { receiptNumber: regex },
                { phone: regex },
                { note: regex }
            ]
        });
    }

    // Collection Status filter (all, not_collected, partially_collected, paid)
    if (collectionStatus && ["not_collected", "partially_collected", "paid"].includes(collectionStatus)) {
        if (collectionStatus === "paid") {
            // For backward compatibility: paid matches collectionStatus == 'paid' OR collectionStatus not set
            andConditions.push({
                $or: [
                    { collectionStatus: "paid" },
                    { collectionStatus: { $exists: false } },
                    { collectionStatus: null }
                ]
            });
        } else {
            andConditions.push({ collectionStatus });
        }
    }

    // Payment method filter (checks across multiple payments or top-level paymentMethod)
    if (paymentMethod && ["cash", "upi", "bank"].includes(paymentMethod)) {
        andConditions.push({
            $or: [
                { "payments.paymentMethod": paymentMethod },
                { paymentMethod: paymentMethod }
            ]
        });
    }

    // Donor type filter (resident / external)
    if (donorType && DONOR_TYPES.includes(donorType)) {
        andConditions.push({ donorType });
    }

    // Date range filter
    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) {
            dateFilter.$gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }
        andConditions.push({ date: dateFilter });
    }

    const query = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const skipIndex = (pageNum - 1) * limitNum;

    const rawDonations = await Donation.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skipIndex)
        .limit(limitNum)
        .populate("createdBy", "name username")
        .populate("household", "building wing flatNumber headOfFamily phone memberCount active")
        .populate("externalDonor", "donorName donorType organizationName active");

    const donations = rawDonations.map(normalizeDonationDoc);
    const total = await Donation.countDocuments(query);

    // Dynamic Financial Summary Aggregations
    const allMatches = await Donation.find(query).select("amount collectedAmount pendingAmount collectionStatus payments paymentMethod").lean();

    let totalPledgedAmount = 0;
    let totalCollectedAmount = 0;
    let totalPendingAmount = 0;
    let totalCashCollected = 0;
    let totalUpiCollected = 0;
    let totalBankCollected = 0;

    allMatches.forEach((m) => {
        const norm = normalizeDonationDoc(m);
        totalPledgedAmount += norm.amount || 0;
        totalCollectedAmount += norm.collectedAmount || 0;
        totalPendingAmount += norm.pendingAmount || 0;
        totalCashCollected += norm.cashCollected || 0;
        totalUpiCollected += norm.upiCollected || 0;
        totalBankCollected += norm.bankCollected || 0;
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                donations,
                total,
                totalAmount: totalPledgedAmount,
                totalPledgedAmount,
                totalCollectedAmount,
                totalPendingAmount,
                totalCashCollected,
                totalUpiCollected,
                totalBankCollected,
                page: pageNum,
                pages: Math.ceil(total / limitNum)
            },
            "Donations fetched successfully"
        )
    );
});

const createDonation = asyncHandler(async (req, res) => {
    const {
        donorName,
        amount,
        paymentMethod,
        initialPayments,
        phone,
        note,
        date,
        festivalYear,
        donorType,
        householdId,
        externalDonorId,
        donorCategory,
        organizationName,
        address,
        building,
        wing,
        flatNumber,
        headOfFamily,
        memberCount
    } = req.body;

    const resolvedDonorType = donorType || "external";
    if (!DONOR_TYPES.includes(resolvedDonorType)) {
        return res.status(400).json(new ApiResponse(400, null, "Donor type must be either 'resident' or 'external'", false));
    }

    const pledgedAmount = Number(amount);
    if (amount === undefined || amount === null || Number.isNaN(pledgedAmount) || pledgedAmount < 0) {
        return res.status(400).json(new ApiResponse(400, null, "Valid donation pledged amount is required", false));
    }

    // Process initial payments
    const paymentsList = [];
    let totalCollected = 0;
    const donationDate = date ? new Date(date) : new Date();

    if (Array.isArray(initialPayments) && initialPayments.length > 0) {
        for (let i = 0; i < initialPayments.length; i++) {
            const p = initialPayments[i];
            const pAmount = Number(p.amount);
            if (isNaN(pAmount) || pAmount <= 0) {
                return res.status(400).json(new ApiResponse(400, null, `Payment #${i + 1} amount must be greater than 0`, false));
            }
            const validMethod = ["cash", "upi", "bank"].includes(p.paymentMethod) ? p.paymentMethod : "cash";
            const pDate = p.date ? new Date(p.date) : donationDate;
            paymentsList.push({
                amount: pAmount,
                paymentMethod: validMethod,
                date: pDate,
                note: p.note ? String(p.note).trim() : "",
                receivedBy: req.user._id,
                createdAt: new Date()
            });
            totalCollected += pAmount;
        }

        if (totalCollected > pledgedAmount) {
            return res.status(400).json(
                new ApiResponse(
                    400,
                    null,
                    `Total initial payments (₹${totalCollected.toLocaleString("en-IN")}) cannot exceed the pledged amount of ₹${pledgedAmount.toLocaleString("en-IN")}`,
                    false
                )
            );
        }
    } else if (initialPayments !== undefined && Array.isArray(initialPayments) && initialPayments.length === 0) {
        // User explicitly specified zero initial payments (Pledge Only / Collect Later)
        totalCollected = 0;
    } else {
        // Backward-compatible default: full payment using paymentMethod if pledgedAmount > 0
        const defaultMethod = ["cash", "upi", "bank"].includes(paymentMethod) ? paymentMethod : "cash";
        if (pledgedAmount > 0) {
            paymentsList.push({
                amount: pledgedAmount,
                paymentMethod: defaultMethod,
                date: donationDate,
                note: note ? note.trim() : "",
                receivedBy: req.user._id,
                createdAt: new Date()
            });
            totalCollected = pledgedAmount;
        }
    }

    const pendingAmount = Math.max(pledgedAmount - totalCollected, 0);
    let collectionStatus = "paid";
    if (totalCollected === 0) {
        collectionStatus = "not_collected";
    } else if (pendingAmount > 0) {
        collectionStatus = "partially_collected";
    }

    const primaryPaymentMethod = paymentsList[0]?.paymentMethod || paymentMethod || "cash";

    let resolvedDonorName = donorName ? donorName.trim() : "";
    let resolvedHousehold = null;
    let resolvedExternalDonor = null;

    if (resolvedDonorType === "resident") {
        if (!householdId) {
            // Enter Manually & Assign Household path
            const buildingValue = Number(building);
            const flatValue = Number(flatNumber);
            const memberValue = Number(memberCount);

            if (building === undefined || building === null || !Number.isInteger(buildingValue) || buildingValue < 1) {
                return res.status(400).json(new ApiResponse(400, null, "Building number must be a valid number (1 or above)", false));
            }
            if (!wing || !wing.trim() || !/^[A-Z0-9]{1,5}$/.test(wing.trim().toUpperCase())) {
                return res.status(400).json(new ApiResponse(400, null, "Wing must be 1 to 5 letters or digits (e.g. A, B)", false));
            }
            if (flatNumber === undefined || flatNumber === null || !Number.isInteger(flatValue) || flatValue < 1) {
                return res.status(400).json(new ApiResponse(400, null, "Flat number must be a valid number (1 or above)", false));
            }
            if (!headOfFamily || !headOfFamily.trim()) {
                return res.status(400).json(new ApiResponse(400, null, "Occupant name is required for the new household", false));
            }
            if (memberCount !== undefined && memberCount !== null && (!Number.isInteger(memberValue) || memberValue < 1)) {
                return res.status(400).json(new ApiResponse(400, null, "Member count must be at least 1", false));
            }
            if (phone !== undefined && phone !== null && phone.trim() && !PHONE_REGEX.test(phone.trim())) {
                return res.status(400).json(new ApiResponse(400, null, "Phone number must be 7 to 15 digits (may include +, -, spaces)", false));
            }

            const wingValue = wing.trim().toUpperCase();

            const config = await BuildingConfig.findOne({ createdBy: req.user._id, building: buildingValue, wing: wingValue });
            if (!config) {
                return res.status(400).json(new ApiResponse(400, null, `No configuration found for Building ${buildingValue}, Wing ${wingValue}. Configure the building and wing first.`, false));
            }
            const wingRanges = normalizeConfigRanges(config);
            if (!isFlatInRanges(wingRanges, flatValue)) {
                return res.status(400).json(new ApiResponse(400, null, `Flat ${flatValue} is not part of the configured flats for Building ${buildingValue}, Wing ${wingValue} (configured ranges: ${describeRanges(wingRanges)}).`, false));
            }

            const existingHousehold = await Household.findOne({
                createdBy: req.user._id,
                building: buildingValue,
                wing: wingValue,
                flatNumber: flatValue
            });

            if (existingHousehold) {
                if (existingHousehold.active) {
                    const conflictMessage = `A household already exists for Building ${buildingValue}, Wing ${wingValue}, Flat ${flatValue} (${existingHousehold.headOfFamily}). Use the existing household or update its occupant information before completing this donation.`;
                    return res.status(409).json(new ApiResponse(409, { household: existingHousehold }, conflictMessage, false));
                }

                existingHousehold.active = true;
                existingHousehold.headOfFamily = headOfFamily.trim();
                existingHousehold.phone = phone ? phone.trim() : existingHousehold.phone;
                existingHousehold.memberCount = Number.isInteger(memberValue) && memberValue >= 1 ? memberValue : existingHousehold.memberCount;
                await existingHousehold.save();

                resolvedHousehold = existingHousehold._id;
                resolvedDonorName = existingHousehold.headOfFamily;
            } else {
                let household;
                try {
                    household = await Household.create({
                        building: buildingValue,
                        wing: wingValue,
                        flatNumber: flatValue,
                        headOfFamily: headOfFamily.trim(),
                        phone: phone ? phone.trim() : "",
                        memberCount: Number.isInteger(memberValue) && memberValue >= 1 ? memberValue : 1,
                        active: true,
                        createdBy: req.user._id
                    });
                } catch (error) {
                    if (error.code === 11000) {
                        const raceHousehold = await Household.findOne({
                            createdBy: req.user._id,
                            building: buildingValue,
                            wing: wingValue,
                            flatNumber: flatValue,
                            active: true
                        });
                        if (raceHousehold) {
                            const conflictMessage = `A household already exists for Building ${buildingValue}, Wing ${wingValue}, Flat ${flatValue} (${raceHousehold.headOfFamily}).`;
                            return res.status(409).json(new ApiResponse(409, { household: raceHousehold }, conflictMessage, false));
                        }
                    }
                    throw error;
                }

                resolvedHousehold = household._id;
                resolvedDonorName = household.headOfFamily;
            }
        } else {
            const household = await Household.findOne({ _id: householdId, createdBy: req.user._id });
            if (!household) {
                return res.status(400).json(new ApiResponse(400, null, "Selected household not found", false));
            }
            if (!household.active) {
                return res.status(400).json(new ApiResponse(400, null, "Selected household is currently inactive. Activate it to record donations.", false));
            }
            resolvedDonorName = household.headOfFamily;
            resolvedHousehold = household._id;
        }
    } else {
        if (!resolvedDonorName) {
            return res.status(400).json(new ApiResponse(400, null, "Donor name is required", false));
        }

        if (externalDonorId) {
            const donor = await ExternalDonor.findOne({ _id: externalDonorId, createdBy: req.user._id });
            if (!donor) {
                return res.status(400).json(new ApiResponse(400, null, "Selected external donor not found", false));
            }
            if (!donor.active) {
                return res.status(400).json(new ApiResponse(400, null, "Selected external donor is currently inactive. Activate it to record donations.", false));
            }
            resolvedExternalDonor = donor._id;
            resolvedDonorName = donor.donorName;
        } else {
            let donor = await ExternalDonor.findOne({ createdBy: req.user._id, donorName: resolvedDonorName, active: true });
            if (!donor) {
                donor = await ExternalDonor.create({
                    donorName: resolvedDonorName,
                    donorType: donorCategory && DONOR_CATEGORIES.includes(donorCategory) ? donorCategory : "Individual",
                    organizationName: organizationName ? organizationName.trim() : "",
                    phone: phone ? phone.trim() : "",
                    address: address ? address.trim() : "",
                    active: true,
                    createdBy: req.user._id
                });
            }
            resolvedExternalDonor = donor._id;
        }
    }

    // Resolve festival year
    let targetYear = festivalYear;
    if (!targetYear) {
        const activeYear = await FestivalYear.findOne({ isActive: true, createdBy: req.user._id });
        if (!activeYear) {
            return res.status(400).json(new ApiResponse(400, null, "No active festival year found. Please create a year first.", false));
        }
        targetYear = activeYear.year;
    }

    // Auto-generate sequential receipt number
    let count = await Donation.countDocuments({ festivalYear: targetYear, createdBy: req.user._id });
    let receiptNumber;
    let donation;
    let isSaved = false;

    while (!isSaved) {
        count++;
        receiptNumber = `MK-${targetYear}-${String(count).padStart(4, "0")}`;
        try {
            donation = await Donation.create({
                donorName: resolvedDonorName,
                amount: pledgedAmount,
                collectedAmount: totalCollected,
                pendingAmount,
                collectionStatus,
                paymentMethod: primaryPaymentMethod,
                payments: paymentsList,
                phone: phone ? phone.trim() : "",
                note: note ? note.trim() : "",
                date: donationDate,
                donorType: resolvedDonorType,
                household: resolvedHousehold,
                externalDonor: resolvedExternalDonor,
                receiptNumber,
                festivalYear: targetYear,
                createdBy: req.user._id
            });
            isSaved = true;
        } catch (error) {
            if (error.code === 11000 && error.keyPattern && error.keyPattern.receiptNumber) {
                continue;
            }
            throw error;
        }
    }

    const populatedDonation = await Donation.findById(donation._id)
        .populate("createdBy", "name username")
        .populate("household", "building wing flatNumber headOfFamily")
        .populate("externalDonor", "donorName donorType organizationName");

    return res.status(201).json(new ApiResponse(201, normalizeDonationDoc(populatedDonation), "Donation recorded successfully"));
});

const addPaymentToDonation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, paymentMethod, date, note } = req.body;

    const donation = await Donation.findById(id);
    if (!donation) {
        return res.status(404).json(new ApiResponse(404, null, "Donation record not found", false));
    }

    if (donation.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json(new ApiResponse(403, null, "You can only add payments to your own donations", false));
    }

    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json(new ApiResponse(400, null, "Payment amount must be greater than 0", false));
    }

    const paymentNum = Number(amount);

    // Calculate current collected total
    let currentCollected = 0;
    if (Array.isArray(donation.payments) && donation.payments.length > 0) {
        currentCollected = donation.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    } else {
        currentCollected = donation.collectedAmount != null ? donation.collectedAmount : (donation.collectionStatus === "paid" ? donation.amount : 0);
    }

    const outstanding = Math.max(donation.amount - currentCollected, 0);

    if (outstanding <= 0) {
        return res.status(400).json(new ApiResponse(400, null, "This donation is already fully collected", false));
    }

    if (paymentNum > outstanding) {
        return res.status(400).json(
            new ApiResponse(
                400,
                null,
                `Payment amount (₹${paymentNum.toLocaleString("en-IN")}) cannot exceed remaining pending amount of ₹${outstanding.toLocaleString("en-IN")}`,
                false
            )
        );
    }

    const validPaymentMethod = ["cash", "upi", "bank"].includes(paymentMethod) ? paymentMethod : "cash";
    const paymentDate = date ? new Date(date) : new Date();

    const newPayment = {
        amount: paymentNum,
        paymentMethod: validPaymentMethod,
        date: paymentDate,
        note: note ? note.trim() : "",
        receivedBy: req.user._id,
        createdAt: new Date()
    };

    // If migrating legacy donation that had no payments array
    if (!Array.isArray(donation.payments) || donation.payments.length === 0) {
        if (currentCollected > 0) {
            donation.payments = [
                {
                    amount: currentCollected,
                    paymentMethod: donation.paymentMethod || "cash",
                    date: donation.date || donation.createdAt,
                    note: donation.note || "",
                    receivedBy: req.user._id,
                    createdAt: donation.createdAt
                }
            ];
        } else {
            donation.payments = [];
        }
    }

    donation.payments.push(newPayment);

    const newCollected = currentCollected + paymentNum;
    const newPending = Math.max(donation.amount - newCollected, 0);

    donation.collectedAmount = newCollected;
    donation.pendingAmount = newPending;
    donation.collectionStatus = newPending === 0 ? "paid" : "partially_collected";

    await donation.save();

    const populated = await Donation.findById(donation._id)
        .populate("createdBy", "name username")
        .populate("household", "building wing flatNumber headOfFamily")
        .populate("externalDonor", "donorName donorType organizationName");

    return res.status(200).json(new ApiResponse(200, normalizeDonationDoc(populated), "Payment added successfully"));
});

const updateDonationPayment = asyncHandler(async (req, res) => {
    const { id, paymentId } = req.params;
    const { amount, paymentMethod, date, note } = req.body;

    const donation = await Donation.findById(id);
    if (!donation) {
        return res.status(404).json(new ApiResponse(404, null, "Donation record not found", false));
    }

    if (donation.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json(new ApiResponse(403, null, "You can only update payments on your own donations", false));
    }

    const paymentIndex = (donation.payments || []).findIndex((p) => p._id.toString() === paymentId);
    if (paymentIndex === -1) {
        return res.status(404).json(new ApiResponse(404, null, "Payment record not found", false));
    }

    if (amount !== undefined) {
        const newAmount = Number(amount);
        if (isNaN(newAmount) || newAmount <= 0) {
            return res.status(400).json(new ApiResponse(400, null, "Payment amount must be greater than 0", false));
        }

        const otherPaymentsSum = donation.payments
            .filter((_, idx) => idx !== paymentIndex)
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        if (otherPaymentsSum + newAmount > donation.amount) {
            return res.status(400).json(
                new ApiResponse(
                    400,
                    null,
                    `Total payments (₹${(otherPaymentsSum + newAmount).toLocaleString("en-IN")}) cannot exceed the pledged amount of ₹${donation.amount.toLocaleString("en-IN")}`,
                    false
                )
            );
        }

        donation.payments[paymentIndex].amount = newAmount;
    }

    if (paymentMethod !== undefined) {
        const validMethod = ["cash", "upi", "bank"].includes(paymentMethod) ? paymentMethod : "cash";
        donation.payments[paymentIndex].paymentMethod = validMethod;
    }

    if (date !== undefined) {
        donation.payments[paymentIndex].date = new Date(date);
    }

    if (note !== undefined) {
        donation.payments[paymentIndex].note = note.trim();
    }

    // Recalculate totals
    const newCollected = donation.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const newPending = Math.max(donation.amount - newCollected, 0);

    donation.collectedAmount = newCollected;
    donation.pendingAmount = newPending;
    if (newCollected === 0) {
        donation.collectionStatus = "not_collected";
    } else if (newPending === 0) {
        donation.collectionStatus = "paid";
    } else {
        donation.collectionStatus = "partially_collected";
    }

    await donation.save();

    const populated = await Donation.findById(donation._id)
        .populate("createdBy", "name username")
        .populate("household", "building wing flatNumber headOfFamily")
        .populate("externalDonor", "donorName donorType organizationName");

    return res.status(200).json(new ApiResponse(200, normalizeDonationDoc(populated), "Payment record updated successfully"));
});

const deleteDonationPayment = asyncHandler(async (req, res) => {
    const { id, paymentId } = req.params;

    const donation = await Donation.findById(id);
    if (!donation) {
        return res.status(404).json(new ApiResponse(404, null, "Donation record not found", false));
    }

    if (donation.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json(new ApiResponse(403, null, "You can only delete payments from your own donations", false));
    }

    const paymentIndex = (donation.payments || []).findIndex((p) => p._id.toString() === paymentId);
    if (paymentIndex === -1) {
        return res.status(404).json(new ApiResponse(404, null, "Payment record not found", false));
    }

    donation.payments.splice(paymentIndex, 1);

    // Recalculate totals
    const newCollected = donation.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const newPending = Math.max(donation.amount - newCollected, 0);

    donation.collectedAmount = newCollected;
    donation.pendingAmount = newPending;
    if (newCollected === 0) {
        donation.collectionStatus = "not_collected";
    } else if (newPending === 0) {
        donation.collectionStatus = "paid";
    } else {
        donation.collectionStatus = "partially_collected";
    }

    await donation.save();

    const populated = await Donation.findById(donation._id)
        .populate("createdBy", "name username")
        .populate("household", "building wing flatNumber headOfFamily")
        .populate("externalDonor", "donorName donorType organizationName");

    return res.status(200).json(new ApiResponse(200, normalizeDonationDoc(populated), "Payment record deleted successfully"));
});

const updateDonation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { donorName, amount, paymentMethod, phone, note, date, donorType, householdId, externalDonorId } = req.body;

    const donation = await Donation.findById(id);
    if (!donation) {
        return res.status(404).json(new ApiResponse(404, null, "Donation not found", false));
    }

    if (donation.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json(new ApiResponse(403, null, "You can only update your own donations", false));
    }

    // Determine current collected amount
    let currentCollected = 0;
    if (Array.isArray(donation.payments) && donation.payments.length > 0) {
        currentCollected = donation.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    } else {
        currentCollected = donation.collectedAmount != null ? donation.collectedAmount : (donation.collectionStatus === "paid" ? donation.amount : 0);
    }

    const updateData = {};

    // Validate pledged amount
    if (amount !== undefined) {
        const amountValue = Number(amount);
        if (Number.isNaN(amountValue) || amountValue < 0) {
            return res.status(400).json(new ApiResponse(400, null, "Pledged amount cannot be negative", false));
        }

        if (amountValue < currentCollected) {
            return res.status(400).json(
                new ApiResponse(
                    400,
                    null,
                    `Pledged amount (₹${amountValue.toLocaleString("en-IN")}) cannot be less than already collected payments (₹${currentCollected.toLocaleString("en-IN")})`,
                    false
                )
            );
        }

        updateData.amount = amountValue;
        updateData.collectedAmount = currentCollected;
        updateData.pendingAmount = Math.max(amountValue - currentCollected, 0);
        if (currentCollected === 0) {
            updateData.collectionStatus = "not_collected";
        } else if (updateData.pendingAmount === 0) {
            updateData.collectionStatus = "paid";
        } else {
            updateData.collectionStatus = "partially_collected";
        }
    }

    // Handle donor type transitions
    if (donorType !== undefined && donation.donorType !== donorType) {
        if (!DONOR_TYPES.includes(donorType)) {
            return res.status(400).json(new ApiResponse(400, null, "Donor type must be either 'resident' or 'external'", false));
        }
        updateData.donorType = donorType;

        if (donorType === "resident") {
            const household = await Household.findOne({ _id: householdId, createdBy: req.user._id });
            if (!household || !household.active) {
                return res.status(400).json(new ApiResponse(400, null, "Please select a valid active resident household", false));
            }
            updateData.household = household._id;
            updateData.externalDonor = null;
            updateData.donorName = household.headOfFamily;
        } else {
            updateData.household = null;
            updateData.externalDonor = null;
            if (externalDonorId) {
                const donor = await ExternalDonor.findOne({ _id: externalDonorId, createdBy: req.user._id });
                if (!donor || !donor.active) {
                    return res.status(400).json(new ApiResponse(400, null, "Please select a valid active external donor", false));
                }
                updateData.externalDonor = donor._id;
                updateData.donorName = donor.donorName;
            } else if (donorName !== undefined && donorName.trim()) {
                updateData.donorName = donorName.trim();
            }
        }
    } else if (donation.donorType === "external" && externalDonorId !== undefined) {
        if (externalDonorId) {
            const donor = await ExternalDonor.findOne({ _id: externalDonorId, createdBy: req.user._id });
            if (!donor || !donor.active) {
                return res.status(400).json(new ApiResponse(400, null, "Please select a valid active external donor", false));
            }
            updateData.externalDonor = donor._id;
            updateData.donorName = donor.donorName;
        } else {
            updateData.externalDonor = null;
        }
    } else if (donation.donorType === "resident" && householdId !== undefined) {
        const household = await Household.findOne({ _id: householdId, createdBy: req.user._id });
        if (!household || !household.active) {
            return res.status(400).json(new ApiResponse(400, null, "Please select a valid active resident household", false));
        }
        updateData.household = household._id;
        updateData.donorName = household.headOfFamily;
    }

    if (donation.donorType !== "resident" && donorType !== "resident" && donorName !== undefined && donorName.trim()) {
        updateData.donorName = donorName.trim();
    }
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (phone !== undefined) updateData.phone = phone.trim();
    if (note !== undefined) updateData.note = note.trim();
    if (date !== undefined) updateData.date = new Date(date);

    const updatedDonation = await Donation.findByIdAndUpdate(id, { $set: updateData }, { new: true })
        .populate("createdBy", "name username")
        .populate("household", "building wing flatNumber headOfFamily")
        .populate("externalDonor", "donorName donorType organizationName");

    return res.status(200).json(new ApiResponse(200, normalizeDonationDoc(updatedDonation), "Donation updated successfully"));
});

const deleteDonation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const donation = await Donation.findById(id);
    if (!donation) {
        return res.status(404).json(new ApiResponse(404, null, "Donation not found", false));
    }

    if (donation.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json(new ApiResponse(403, null, "You can only delete your own donations", false));
    }

    await Donation.findByIdAndDelete(id);

    return res.status(200).json(new ApiResponse(200, null, "Donation deleted successfully"));
});

export {
    getDonations,
    createDonation,
    addPaymentToDonation,
    updateDonationPayment,
    deleteDonationPayment,
    updateDonation,
    deleteDonation,
    normalizeDonationDoc
};