import mongoose from 'mongoose';

let demoMode = false;

export const connectDatabase = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is required. Demo mode has been disabled for production-style isolated data storage.');
  }

  try {
    const connection = await mongoose.connect(uri);
    demoMode = false;
    console.log(`[quickcheck] MongoDB connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    demoMode = false;
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
};

export const isDemoMode = () => demoMode;

