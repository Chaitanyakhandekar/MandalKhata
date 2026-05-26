import connectDB from "./db/db.js"
import { httpServer } from "./server.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

connectDB().then(async () => {
  const PORT = process.env.PORT || 8000;
  httpServer.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
