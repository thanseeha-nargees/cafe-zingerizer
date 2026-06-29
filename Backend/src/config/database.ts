import mongoose from "mongoose";

const connectDb = async ()=>{ 

    try {
        await mongoose.connect(process.env.MONGO_URL as string)
        console.log('mongodb connected')
    } catch (error ) {
        console.log(error)
    }

}

export default connectDb