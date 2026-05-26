import { Router } from "express";
import {
    getDashboardStats,
    getLedger
} from "../controllers/report.controller.js";
import { userAuth } from "../middlewares/userAuth.middleware.js";

const router = Router();

// Apply auth middleware to all report routes
router.use(userAuth);

router.route("/dashboard").get(getDashboardStats);
router.route("/ledger").get(getLedger);

export default router;
