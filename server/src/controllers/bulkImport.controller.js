import fs from "fs";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiUtils.js";
import {
    buildTemplateBuffer,
    previewImport,
    confirmImport,
    buildErrorReportCsv
} from "../services/bulkImport.service.js";

const TEMPLATE_TYPES = ["buildings", "households", "donations", "expenses"];

export const downloadTemplate = asyncHandler(async (req, res) => {
    const { type } = req.params;
    const format = (req.query.format || "xlsx").toLowerCase();

    if (!TEMPLATE_TYPES.includes(type)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid template type. Use buildings, households, donations or expenses.", false));
    }
    if (!["xlsx", "csv"].includes(format)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid format. Use xlsx or csv.", false));
    }

    const buffer = buildTemplateBuffer({ type, format });
    const filename = `template-${type}.${format}`;
    res.setHeader("Content-Type", format === "csv"
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
});

export const uploadAndPreview = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json(new ApiResponse(400, null, "Please upload a spreadsheet file (.xlsx, .xls or .csv)", false));
    }
    const { type } = req.body;
    if (!TEMPLATE_TYPES.includes(type)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid import type. Use buildings, households, donations or expenses.", false));
    }

    try {
        const preview = await previewImport({
            filePath: req.file.path,
            fileName: req.file.originalname,
            type,
            userId: req.user._id
        });
        return res.status(200).json(new ApiResponse(200, preview, "File parsed and validated. Review the preview before confirming the import."));
    } finally {
        fs.unlink(req.file.path, () => {});
    }
});

export const confirmUploadedImport = asyncHandler(async (req, res) => {
    const { type, rows } = req.body;
    if (!TEMPLATE_TYPES.includes(type)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid import type. Use buildings, households, donations or expenses.", false));
    }

    const summary = await confirmImport({ type, rows, userId: req.user._id });
    return res.status(200).json(new ApiResponse(200, summary, `Import completed: ${summary.imported} imported, ${summary.updated} extended, ${summary.skipped} skipped, ${summary.failed} failed.`));
});

export const downloadErrorReport = asyncHandler(async (req, res) => {
    const { type, fileName, statuses } = req.body;
    if (!TEMPLATE_TYPES.includes(type)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid import type.", false));
    }
    if (!Array.isArray(statuses) || statuses.length === 0) {
        return res.status(400).json(new ApiResponse(400, null, "No failed rows to report. Fix the errors in the file and upload it again.", false));
    }

    const buffer = buildErrorReportCsv({ type, fileName, statuses });
    const filename = `${type}-import-errors.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
});