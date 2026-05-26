import { Donation } from "../models/donation.model.js";
import { FestivalYear } from "../models/festivalYear.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiUtils.js";

const getDonations = asyncHandler(async (req, res) => {
    const { festivalYear, search, paymentMethod, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};

    // Filter by festival year (always default to active year if not provided)
    if (festivalYear) {
        query.festivalYear = festivalYear;
    } else {
        const activeYear = await FestivalYear.findOne({ isActive: true });
        if (activeYear) {
            query.festivalYear = activeYear.year;
        }
    }

    // Keyword search (donorName or receiptNumber)
    if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        query.$or = [
            { donorName: regex },
            { receiptNumber: regex },
            { phone: regex }
        ];
    }

    // Payment method filter
    if (paymentMethod && ["cash", "upi", "bank"].includes(paymentMethod)) {
        query.paymentMethod = paymentMethod;
    }

    // Date range filter
    if (startDate || endDate) {
        query.date = {};
        if (startDate) {
            query.date.$gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.date.$lte = end;
        }
    }

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);

    const donations = await Donation.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skipIndex)
        .limit(parseInt(limit))
        .populate("createdBy", "name username");

    const total = await Donation.countDocuments(query);

    return res.status(200).json(new ApiResponse(200, {
        donations,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
    }, "Donations fetched successfully"));
});

const createDonation = asyncHandler(async (req, res) => {
    const { donorName, amount, paymentMethod, phone, note, date, festivalYear } = req.body;

    if (!donorName || !donorName.trim()) {
        return res.status(400).json(new ApiResponse(400, null, "Donor name is required", false));
    }

    if (amount === undefined || amount === null || Number(amount) < 0) {
        return res.status(400).json(new ApiResponse(400, null, "Valid donation amount is required", false));
    }

    // Resolve festival year
    let targetYear = festivalYear;
    if (!targetYear) {
        const activeYear = await FestivalYear.findOne({ isActive: true });
        if (!activeYear) {
            return res.status(400).json(new ApiResponse(400, null, "No active festival year found. Please create a year first.", false));
        }
        targetYear = activeYear.year;
    }

    // Auto-generate sequential receipt number
    let count = await Donation.countDocuments({ festivalYear: targetYear });
    let receiptNumber;
    let isUnique = false;

    while (!isUnique) {
        count++;
        receiptNumber = `MK-${targetYear}-${String(count).padStart(4, '0')}`;
        const existing = await Donation.findOne({ receiptNumber });
        if (!existing) {
            isUnique = true;
        }
    }

    const donation = await Donation.create({
        donorName: donorName.trim(),
        amount: Number(amount),
        paymentMethod: paymentMethod || "cash",
        phone: phone ? phone.trim() : "",
        note: note ? note.trim() : "",
        date: date ? new Date(date) : new Date(),
        receiptNumber,
        festivalYear: targetYear,
        createdBy: req.user._id
    });

    const populatedDonation = await Donation.findById(donation._id).populate("createdBy", "name username");

    return res.status(201).json(new ApiResponse(201, populatedDonation, "Donation recorded successfully"));
});

const updateDonation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { donorName, amount, paymentMethod, phone, note, date } = req.body;

    const donation = await Donation.findById(id);
    if (!donation) {
        return res.status(404).json(new ApiResponse(404, null, "Donation not found", false));
    }

    const updateData = {};
    if (donorName !== undefined) updateData.donorName = donorName.trim();
    if (amount !== undefined) {
        if (Number(amount) < 0) {
            return res.status(400).json(new ApiResponse(400, null, "Amount cannot be negative", false));
        }
        updateData.amount = Number(amount);
    }
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (phone !== undefined) updateData.phone = phone.trim();
    if (note !== undefined) updateData.note = note.trim();
    if (date !== undefined) updateData.date = new Date(date);

    const updatedDonation = await Donation.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
    ).populate("createdBy", "name username");

    return res.status(200).json(new ApiResponse(200, updatedDonation, "Donation updated successfully"));
});

const deleteDonation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const donation = await Donation.findById(id);
    if (!donation) {
        return res.status(404).json(new ApiResponse(404, null, "Donation not found", false));
    }

    await Donation.findByIdAndDelete(id);

    return res.status(200).json(new ApiResponse(200, null, "Donation deleted successfully"));
});

export {
    getDonations,
    createDonation,
    updateDonation,
    deleteDonation
};
