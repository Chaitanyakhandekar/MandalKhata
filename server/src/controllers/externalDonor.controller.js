import { ExternalDonor } from "../models/externalDonor.model.js";
import { Donation } from "../models/donation.model.js";
import { FestivalYear } from "../models/festivalYear.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiUtils.js";

const DONOR_TYPES = ["Individual", "Business", "Organization", "Shop", "Well-wisher"];
const PHONE_REGEX = /^[0-9+\-\s]{7,15}$/;

const validatePhone = (phone) => {
    if (phone !== undefined && phone !== null && phone.trim() && !PHONE_REGEX.test(phone.trim())) {
        return "Phone number must be 7 to 15 digits (may include +, -, spaces)";
    }
    return null;
};

const getExternalDonors = asyncHandler(async (req, res) => {
    const { search, donorType, active, festivalYear, page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    let targetYear = festivalYear;
    if (!targetYear) {
        const activeYear = await FestivalYear.findOne({ isActive: true, createdBy: userId });
        if (activeYear) {
            targetYear = activeYear.year;
        }
    }

    const match = { createdBy: userId };

    if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        match.$or = [
            { donorName: regex },
            { phone: regex },
            { organizationName: regex }
        ];
    }

    if (donorType && DONOR_TYPES.includes(donorType)) {
        match.donorType = donorType;
    }

    if (active === "true") {
        match.active = true;
    } else if (active === "false") {
        match.active = false;
    }

    const donationMatch = { $expr: { $eq: ["$externalDonor", "$$donorId"] } };
    if (targetYear) {
        donationMatch.festivalYear = targetYear;
    }

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const skipIndex = (pageNum - 1) * limitNum;

    const donors = await ExternalDonor.aggregate([
        { $match: match },
        {
            $lookup: {
                from: "donations",
                let: { donorId: "$_id" },
                pipeline: [{ $match: donationMatch }],
                as: "donations"
            }
        },
        {
            $addFields: {
                totalDonated: { $ifNull: [{ $sum: "$donations.amount" }, 0] },
                donationCount: { $size: "$donations" },
                latestDonation: { $max: "$donations.date" }
            }
        },
        { $unset: "donations" },
        { $sort: { createdAt: -1 } },
        { $skip: skipIndex },
        { $limit: limitNum }
    ]);

    const total = await ExternalDonor.countDocuments(match);

    return res.status(200).json(new ApiResponse(200, {
        donors,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
    }, "External donors fetched successfully"));
});

const getExternalDonorDonations = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { festivalYear, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const donor = await ExternalDonor.findOne({ _id: id, createdBy: userId });
    if (!donor) {
        return res.status(404).json(new ApiResponse(404, null, "External donor not found", false));
    }

    let targetYear = festivalYear;
    if (!targetYear) {
        const activeYear = await FestivalYear.findOne({ isActive: true, createdBy: userId });
        if (activeYear) {
            targetYear = activeYear.year;
        }
    }

    const query = { externalDonor: donor._id };
    if (targetYear) {
        query.festivalYear = targetYear;
    }

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const skipIndex = (pageNum - 1) * limitNum;

    const donations = await Donation.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skipIndex)
        .limit(limitNum);

    const donationAggregate = await Donation.aggregate([
        { $match: query },
        { $group: { _id: null, totalDonated: { $sum: "$amount" }, donationCount: { $sum: 1 } } }
    ]);

    const total = await Donation.countDocuments(query);

    return res.status(200).json(new ApiResponse(200, {
        donor,
        donations,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        totalDonated: donationAggregate[0]?.totalDonated || 0,
        donationCount: donationAggregate[0]?.donationCount || 0
    }, "External donor details fetched successfully"));
});

const createExternalDonor = asyncHandler(async (req, res) => {
    const { donorName, donorType, organizationName, phone, address, note, active } = req.body;

    if (!donorName || !donorName.trim()) {
        return res.status(400).json(new ApiResponse(400, null, "Donor name is required", false));
    }

    if (donorType && !DONOR_TYPES.includes(donorType)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid donor type", false));
    }

    const phoneError = validatePhone(phone);
    if (phoneError) {
        return res.status(400).json(new ApiResponse(400, null, phoneError, false));
    }

    const donor = await ExternalDonor.create({
        donorName: donorName.trim(),
        donorType: donorType || "Individual",
        organizationName: organizationName ? organizationName.trim() : "",
        phone: phone ? phone.trim() : "",
        address: address ? address.trim() : "",
        note: note ? note.trim() : "",
        active: active === false ? false : true,
        createdBy: req.user._id
    });

    return res.status(201).json(new ApiResponse(201, donor, "External donor created successfully"));
});

const updateExternalDonor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { donorName, donorType, organizationName, phone, address, note, active } = req.body;

    const donor = await ExternalDonor.findOne({ _id: id, createdBy: req.user._id });
    if (!donor) {
        return res.status(404).json(new ApiResponse(404, null, "External donor not found", false));
    }

    if (donorType && !DONOR_TYPES.includes(donorType)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid donor type", false));
    }

    const phoneError = validatePhone(phone);
    if (phoneError) {
        return res.status(400).json(new ApiResponse(400, null, phoneError, false));
    }

    const updateData = {};
    if (donorName !== undefined && donorName.trim()) updateData.donorName = donorName.trim();
    if (donorType !== undefined) updateData.donorType = donorType;
    if (organizationName !== undefined) updateData.organizationName = organizationName.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (note !== undefined) updateData.note = note.trim();
    if (active !== undefined) updateData.active = !!active;

    const updatedDonor = await ExternalDonor.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    return res.status(200).json(new ApiResponse(200, updatedDonor, "External donor updated successfully"));
});

const toggleExternalDonorActive = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== "boolean") {
        return res.status(400).json(new ApiResponse(400, null, "Active status must be a boolean", false));
    }

    const donor = await ExternalDonor.findOne({ _id: id, createdBy: req.user._id });
    if (!donor) {
        return res.status(404).json(new ApiResponse(404, null, "External donor not found", false));
    }

    donor.active = active;
    await donor.save();

    return res.status(200).json(new ApiResponse(200, donor, active ? "External donor activated successfully" : "External donor deactivated successfully"));
});

const deleteExternalDonor = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const donor = await ExternalDonor.findOne({ _id: id, createdBy: req.user._id });
    if (!donor) {
        return res.status(404).json(new ApiResponse(404, null, "External donor not found", false));
    }

    const hasDonations = await Donation.exists({ externalDonor: donor._id });
    if (hasDonations) {
        return res.status(400).json(new ApiResponse(400, null, "This donor has donation records. Deactivate it instead of deleting to keep financial records intact.", false));
    }

    await ExternalDonor.findByIdAndDelete(id);

    return res.status(200).json(new ApiResponse(200, null, "External donor deleted successfully"));
});

export {
    getExternalDonors,
    getExternalDonorDonations,
    createExternalDonor,
    updateExternalDonor,
    toggleExternalDonorActive,
    deleteExternalDonor
};