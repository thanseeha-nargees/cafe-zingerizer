import mongoose from "mongoose";

const connectDb = async ()=>{ 
    const mongoUrl = process.env.MONGO_URL?.trim();

    if (!mongoUrl) {
        throw new Error("MONGO_URL is not configured");
    }

    try {
        await mongoose.connect(mongoUrl)
        console.log('mongodb connected')
    } catch (error ) {
        console.log("mongodb connection failed", error instanceof Error ? error.message : error)
        throw error
    }

}

export default connectDb
