// app/models/user.server.ts
import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
import bcrypt from 'bcryptjs';
import { connectDb } from './db.server.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface IUser {
  username: string;
  passwordHash: string;
  favorites: string[];
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  favorites: { type: [String], default: [] },
});

export const User = models.User || model<IUser>('User', UserSchema);

// Helper to create or find the seed user
export async function seedUser() {
  try {
    console.log('Starting seed process...');
    console.log('Environment variables loaded:', {
      MONGO_URI: process.env.MONGO_URI ? 'Present' : 'Missing',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'Present' : 'Missing'
    });

    await connectDb();
    
    console.log('Checking for existing user...');
    const existing = await User.findOne({ username: 'ipgautomotive' });
    
    if (!existing) {
      console.log('Creating new user...');
      const hash = await bcrypt.hash('carmaker', 10);
      const newUser = await User.create({ 
        username: 'ipgautomotive', 
        passwordHash: hash, 
        favorites: [] 
      });
      console.log('User created successfully:', newUser.username);
    } else {
      console.log('User already exists:', existing.username);
    }
  } catch (error) {
    console.error('Error in seed process:', error);
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

// Execute the seed function if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running seed script...');
  seedUser()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}