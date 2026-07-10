import mongoose from "mongoose";

import dotenv from "dotenv";

dotenv.config();

const connectDB = async() => {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected MongoDB");
}

export default connectDB;