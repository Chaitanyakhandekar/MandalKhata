import { Router } from "express";
import {
    getFestivalYears,
    createFestivalYear,
    setActiveFestivalYear,
    deleteFestivalYear
} from "../controllers/festival.controller.js";
import { userAuth } from "../middlewares/userAuth.middleware.js";

const router = Router();

// Apply auth middleware to all festival routes
router.use(userAuth);

router.route("/")
    .get(getFestivalYears)
    .post(createFestivalYear);

router.route("/:id")
    .delete(deleteFestivalYear);

router.route("/:id/active")
    .patch(setActiveFestivalYear);

export default router;
