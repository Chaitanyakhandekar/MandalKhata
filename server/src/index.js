import connectDB from "./db/db.js"
import { httpServer } from "./server.js";
import { FestivalYear } from "./models/festivalYear.model.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

connectDB().then(async () => {
  // Ensure per-user year uniqueness and remove any legacy global unique index
  // on "year" that would block different users from creating the same year.
  await FestivalYear.syncIndexes();
  const PORT = process.env.PORT || 8000;
  httpServer.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
