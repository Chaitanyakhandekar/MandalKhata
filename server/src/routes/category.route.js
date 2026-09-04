import { Router } from "express";
import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
} from "../controllers/category.controller.js";
import { userAuth } from "../middlewares/userAuth.middleware.js";

const router = Router();

// Apply auth middleware to all category routes
router.use(userAuth);

router.route("/")
    .get(getCategories)
    .post(createCategory);

router.route("/:id")
    .put(updateCategory)
    .delete(deleteCategory);

export default router;
