// Import mongoose — the tool that lets us talk to MongoDB
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Connect to MongoDB using the URL from our .env file
    // 'videoapp' is the name of our database — MongoDB creates it automatically
    await mongoose.connect(process.env.MONGO_URI);

    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    // If connection fails, print the error and stop the server
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1); // exit with error code 1
  }
};

// Export so we can use this in server.js
module.exports = connectDB;