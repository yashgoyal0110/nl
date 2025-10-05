import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://abcx74189:abcx74189@cluster1.nbwwxm1.mongodb.net/nl?retryWrites=true&w=majority")
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};
await connectDB();
export default connectDB;
