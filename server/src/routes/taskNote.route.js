import express from "express";
import { userAuth } from "../middlewares/userAuth.middleware.js";
import {
    getTaskNoteSummary,
    getTasks,
    createTask,
    updateTask,
    toggleTaskComplete,
    deleteTask,
    getShoppingItems,
    createShoppingItem,
    updateShoppingItem,
    toggleShoppingItemPurchased,
    deleteShoppingItem,
    getNotes,
    createNote,
    updateNote,
    deleteNote,
} from "../controllers/taskNote.controller.js";

const router = express.Router();

router.use(userAuth);

// Summary / Counts
router.get("/summary", getTaskNoteSummary);

// Tasks
router.route("/tasks")
    .get(getTasks)
    .post(createTask);

router.route("/tasks/:id")
    .put(updateTask)
    .delete(deleteTask);

router.patch("/tasks/:id/toggle", toggleTaskComplete);

// Shopping items
router.route("/shopping")
    .get(getShoppingItems)
    .post(createShoppingItem);

router.route("/shopping/:id")
    .put(updateShoppingItem)
    .delete(deleteShoppingItem);

router.patch("/shopping/:id/toggle", toggleShoppingItemPurchased);

// Notes
router.route("/notes")
    .get(getNotes)
    .post(createNote);

router.route("/notes/:id")
    .put(updateNote)
    .delete(deleteNote);

export default router;
