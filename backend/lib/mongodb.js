import mongoose from "mongoose";

let isConnected = false;

export async function connectMongoDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.log("⚠️  MONGODB_URI not configured, skipping MongoDB connection");
    return null;
  }

  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    
    isConnected = true;
    console.log("✅ MongoDB connected successfully");
    return mongoose.connection;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.log("⚠️  Falling back to SQLite");
    return null;
  }
}

export function getMongoDBConnection() {
  return mongoose.connection;
}

export async function disconnectMongoDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log("🔌 MongoDB disconnected");
  }
}

export { mongoose };
