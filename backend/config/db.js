import mongoose from "mongoose";
import { log } from "../util/logger.js";

const connectDB = async () => {
    try {
        const connStr = process.env.MONGODB_URL;

        if (!connStr) {
            throw new Error(
                "MONGODB_URL environment variable is not defined"
            );
        }

        const conn = await mongoose.connect(connStr);

        log(
            `[Database] MongoDB Connected successfully: ${conn.connection.host}`
        );

        console.log(
            `[Database] MongoDB Connected: ${conn.connection.host}`
        );

    } catch (error) {
        console.error(
            `[Database] Connection Error: ${error.message}`
        );

        log(
            `[Database] Connection Error: ${error.message}`
        );

        process.exit(1);
    }
};

export default connectDB;