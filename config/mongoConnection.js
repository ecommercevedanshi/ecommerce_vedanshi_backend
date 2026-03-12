import config from "./configration.js";
import mongoose from "mongoose";

const connectToDb = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUrl, {
      dbName: config.dbName,
    });
    console.log(`Connected to MongoDB. Host: ${conn.connection.host}, DB: ${conn.connection.name}`);
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
};

export default connectToDb;