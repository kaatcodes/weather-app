// app/models/db.server.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

let db: typeof mongoose | null = null;

export async function connectDb() {
  try {
    if (db) {
      console.log('Using existing database connection');
      return db;
    }
    
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI environment variable is missing');
    }

    console.log('Connecting to MongoDB...');
    console.log('Connection URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')); // Hide credentials
    
    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    // Connect with options
    db = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      retryReads: true,
    });
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error during MongoDB disconnection:', err);
        process.exit(1);
      }
    });
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}