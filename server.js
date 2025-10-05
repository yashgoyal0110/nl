import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Contributor from "./Contributor.js";
import cors from "cors"; // Add this import

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
};
await connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Allow all origins

app.get("/:id", async (req, res) => {
    try {
        console.log(req.params.id);
        const item = await Contributor.findById(req.params.id);
        if (!item) return res.status(404).json({ error: "Not found" });
        res.json(item);
    } catch (err) {
        res.status(400).json({ error: "Invalid ID" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});