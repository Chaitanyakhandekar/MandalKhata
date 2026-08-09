import { Router } from "express";
import { userAuth } from "../middlewares/userAuth.middleware.js";
import { uploadSpreadsheet } from "../middlewares/bulkUpload.middleware.js";
import {
    downloadTemplate,
    uploadAndPreview,
    confirmUploadedImport,
    downloadErrorReport
} from "../controllers/bulkImport.controller.js";

const router = Router();

router.use(userAuth);

router.get("/templates/:type", downloadTemplate);
router.post("/upload", uploadSpreadsheet.single("file"), uploadAndPreview);
router.post("/confirm", confirmUploadedImport);
router.post("/error-report", downloadErrorReport);

export default router;