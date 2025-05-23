// scripts/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  favorites: { type: [String], default: [] },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seedUser() {
  try {
    console.log('Starting seed process...');
    console.log('Environment variables loaded:', {
      MONGO_URI: process.env.MONGO_URI ? 'Present' : 'Missing',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'Present' : 'Missing'
    });

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
    });
    
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

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error in seed process:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    process.exit(1);
  }
}

seedUser()
  .then(() => {
    console.log('Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  }); 