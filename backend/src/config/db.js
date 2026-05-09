import mongoose from 'mongoose';

let demoMode = false;

export const connectDatabase = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    demoMode = true;
    console.warn('[quickcheck] MONGODB_URI missing. API is running with in-memory demo data.');
    return null;
  }

  try {
    const connection = await mongoose.connect(uri);
    demoMode = false;
    console.log(`[quickcheck] MongoDB connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    demoMode = true;
    console.warn('[quickcheck] MongoDB connection failed. Falling back to in-memory demo data.');
    console.warn(error.message);
    return null;
  }
};

export const isDemoMode = () => demoMode;

