import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError, ApiResponse } from "../utils/apiUtils.js";
import { WasteReport } from "../models/wasteReport.model.js";
import { Location } from "../models/location.model.js";
import { uploadFileOnCloudinary, deleteFileFromCloudinary } from "../services/cloudinary.service.js";

const createWasteReport = asyncHandler(async (req, res) => {
    const { description, locationId, wasteType, estimatedQuantity, latitude, longitude, address } = req.body;

    if (!description || !description.trim()) {
        throw new ApiError(400, "Description is required.");
    }

    const locationData = { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] };

    let imageUrl = null;
    let cloudinaryId = null;

    if (req.file) {
        const uploadData = await uploadFileOnCloudinary(req.file.path);
        if (uploadData.success) {
            imageUrl = uploadData.secure_url;
            cloudinaryId = uploadData.public_id;
        }
    }

    const report = await WasteReport.create({
        reportedBy: req.user._id,
        locationId: locationId || null,
        description,
        imageUrl,
        cloudinaryId,
        wasteType: wasteType || "MIXED",
        estimatedQuantity: estimatedQuantity || "MEDIUM",
        location: locationData,
        address: address || null
    });

    return res.status(201).json(new ApiResponse(201, report, "Waste reported successfully."));
});

const getWasteReports = asyncHandler(async (req, res) => {
    const { status, wasteType, page = 1, limit = 20, lat, lng, radiusKm = 10 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (wasteType) filter.wasteType = wasteType;

    let reports;

    if (lat && lng) {
        reports = await WasteReport.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
                    distanceField: "distance",
                    maxDistance: parseFloat(radiusKm) * 1000,
                    spherical: true
                }
            },
            { $match: filter },
            { $sort: { createdAt: -1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
        ]);
    } else {
        const skip = (parseInt(page) - 1) * parseInt(limit);
        reports = await WasteReport.find(filter)
            .populate("reportedBy", "name username avatar")
            .populate("verifiedBy", "name username")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
    }

    const total = await WasteReport.countDocuments(filter);
    
    return res.status(200).json(new ApiResponse(200, { reports, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }, "Waste reports fetched successfully."));
});

const getMyReports = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = { reportedBy: req.user._id };
    if (status) filter.status = status;

    const reports = await WasteReport.find(filter)
        .populate("locationId", "name address city")
        .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, reports, "Your waste reports fetched successfully."));
});

const updateReportStatus = asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { status, eventId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
        throw new ApiError(400, "Valid report ID is required.");
    }

    if (!status || !["VERIFIED", "CLEANED", "REJECTED"].includes(status)) {
        throw new ApiError(400, "Status must be VERIFIED, CLEANED, or REJECTED.");
    }

    const report = await WasteReport.findById(reportId);
    if (!report) {
        throw new ApiError(404, "Report not found.");
    }

    const isOrganizer = report.reportedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "ADMIN";

    if (!isOrganizer && !isAdmin && req.user.role !== "ORGANIZER") {
        throw new ApiError(403, "Only report owner or admin can update status.");
    }

    report.status = status;
    if (status === "VERIFIED") {
        report.verifiedBy = req.user._id;
    }
    if (status === "CLEANED" && eventId) {
        report.cleanedByEventId = eventId;
        report.cleanedAt = new Date();
    }
    await report.save();

    return res.status(200).json(new ApiResponse(200, report, "Report status updated."));
});

const deleteReport = asyncHandler(async (req, res) => {
    const { reportId } = req.params;

    const report = await WasteReport.findById(reportId);
    if (!report) {
        throw new ApiError(404, "Report not found.");
    }

    const isOwner = report.reportedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
        throw new ApiError(403, "Only report owner or admin can delete.");
    }

    if (report.cloudinaryId) {
        await deleteFileFromCloudinary(report.cloudinaryId);
    }

    await WasteReport.findByIdAndDelete(reportId);

    return res.status(200).json(new ApiResponse(200, null, "Report deleted successfully."));
});

const getWasteStats = asyncHandler(async (req, res) => {
    const stats = await WasteReport.aggregate([
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 }
            }
        }
    ]);

    const byType = await WasteReport.aggregate([
        {
            $group: {
                _id: "$wasteType",
                count: { $sum: 1 }
            }
        }
    ]);

    const totalCleaned = await WasteReport.countDocuments({ status: "CLEANED" });
    const thisMonth = await WasteReport.countDocuments({
        status: "CLEANED",
        cleanedAt: { $gte: new Date(new Date().setDate(1)) }
    });

    return res.status(200).json(new ApiResponse(200, { stats, byType, totalCleaned, thisMonth }, "Stats fetched successfully."));
});

export {
    createWasteReport,
    getWasteReports,
    getMyReports,
    updateReportStatus,
    deleteReport,
    getWasteStats
};