const mongoose = require('mongoose');

// A single friend request from one user to another. Once accepted, both
// users' `friends` arrays (on the User model) get each other's id added —
// this document just tracks the request itself and its outcome.
const friendRequestSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Prevents sending a second request to someone while one is already pending
// between the same two users in the same direction. This is a *partial*
// index (only applies while status is 'pending'), so a new request can be
// sent again later after a previous one was accepted/rejected.
friendRequestSchema.index(
  { from: 1, to: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

module.exports = mongoose.model('FriendRequest', friendRequestSchema);