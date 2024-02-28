import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async () => {
    try {
        const connectionIns = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log(`\n MONGODB connected !! DB Host: ${connectionIns.connection.host}`);
    } catch (error) {
        console.log("Mongodb Error: ", error);
        process.exit(1)
    }
}

export default connectDB;