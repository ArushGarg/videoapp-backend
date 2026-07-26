const mongoose = require('mongoose');

// Define what a "User" document looks like in MongoDB
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,      // must be provided
      unique: true,        // no two users can have same username
      trim: true,          // removes extra spaces
      minlength: 3,
      maxlength: 20,
    },

    email: {
      type: String,
      required: true,
      unique: true,        // no duplicate emails
      lowercase: true,     // always stored in lowercase
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    avatar: {
      type: String,
      default: '',         // profile picture URL, empty by default
    },

    friends: [
      {
        // An array of user IDs — people this user is friends with
        // ObjectId is MongoDB's unique ID type
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',       // references the User model
      }
    ],

    isOnline: {
      type: Boolean,
      default: false,      // offline by default
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // timestamps: true automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// Create the model from the schema
// 'User' is the model name — MongoDB will create a 'users' collection
const User = mongoose.model('User', userSchema);

module.exports = User;