import { Router } from "express";
import {
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense
} from "../controllers/expense.controller.js";
import { userAuth } from "../middlewares/userAuth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Apply auth middleware to all expense routes
router.use(userAuth);

router.route("/")
    .get(getExpenses)
    .post(upload.single("billImage"), createExpense);

router.route("/:id")
    .put(upload.single("billImage"), updateExpense)
    .delete(deleteExpense);

export default router;
