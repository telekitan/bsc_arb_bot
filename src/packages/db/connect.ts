import { connect } from "mongoose";

if (!process.env.MONGO_DB_URL) {
  throw new Error("MONGO_DB_URL, Must be defined in your .env FILE");
}

const connectDB = async () => {
  try {
    console.log("Connecting to MongoDb...\n---");

    await connect(process.env.MONGO_DB_URL!, {
      keepAlive: true,
      connectTimeoutMS: 60000,
      socketTimeoutMS: 60000,
    });
    console.log("Connected to MongoDb :)");
  } catch (err) {
    console.log("Could not connect to DB ", err);
  }
};

connectDB();
