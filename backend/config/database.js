import mongoose from 'mongoose';

export const connectDB = async () => {
    // Skip MongoDB connection if URI is not configured
    if (!process.env.MONGODB_URI) {
        console.log('ℹ️  MongoDB URI not configured - running without database');
        console.log('ℹ️  Stock screening will work, but user features are disabled');
        return null;
    }

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        console.log('⚠️  Server will continue without database. Some features may not work.');
        return null;
    }
};
