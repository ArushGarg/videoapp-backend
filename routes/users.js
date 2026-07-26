const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// GET /api/users
// Every other user, annotated with the caller's relationship to them:
// 'friends' | 'pending_sent' | 'pending_received' | 'none'.
// The frontend uses this to decide which button to show (Call, Cancel,
// Accept/Reject, or Add Friend) without a second round-trip per user.
router.get('/', protect, async (req, res) => {
  try {
    const [users, myPendingRequests] = await Promise.all([
      User.find({ _id: { $ne: req.user._id } })
        .select('username email avatar isOnline')
        .lean(),
      FriendRequest.find({
        status: 'pending',
        $or: [{ from: req.user._id }, { to: req.user._id }],
      }).lean(),
    ]);

    const friendIds = new Set(req.user.friends.map((id) => id.toString()));
    const sentTo = new Map(); // userId -> requestId (requests I sent)
    const receivedFrom = new Map(); // userId -> requestId (requests sent to me)

    for (const r of myPendingRequests) {
      if (r.from.toString() === req.user._id.toString()) {
        sentTo.set(r.to.toString(), r._id.toString());
      } else {
        receivedFrom.set(r.from.toString(), r._id.toString());
      }
    }

    res.json({
      users: users.map((u) => {
        const id = u._id.toString();
        let friendStatus = 'none';
        let requestId = null;

        if (friendIds.has(id)) {
          friendStatus = 'friends';
        } else if (sentTo.has(id)) {
          friendStatus = 'pending_sent';
          requestId = sentTo.get(id);
        } else if (receivedFrom.has(id)) {
          friendStatus = 'pending_received';
          requestId = receivedFrom.get(id);
        }

        return {
          id,
          username: u.username,
          email: u.email,
          avatar: u.avatar,
          isOnline: u.isOnline,
          friendStatus,
          requestId,
        };
      }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;