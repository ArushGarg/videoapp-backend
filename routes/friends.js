const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

const userSummary = (u) => ({
  id: u._id,
  username: u.username,
  email: u.email,
  avatar: u.avatar,
  isOnline: u.isOnline,
});

// GET /api/friends
// Your accepted friends list, with the fields the call UI needs.
router.get('/', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .populate('friends', 'username email avatar isOnline')
      .lean();
    res.json({ friends: (me.friends || []).map(userSummary) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/friends/requests
// { incoming: [...], outgoing: [...] } — pending requests only.
router.get('/requests', protect, async (req, res) => {
  try {
    const [incoming, outgoing] = await Promise.all([
      FriendRequest.find({ to: req.user._id, status: 'pending' })
        .populate('from', 'username email avatar isOnline')
        .lean(),
      FriendRequest.find({ from: req.user._id, status: 'pending' })
        .populate('to', 'username email avatar isOnline')
        .lean(),
    ]);

    res.json({
      incoming: incoming.map((r) => ({ requestId: r._id, user: userSummary(r.from) })),
      outgoing: outgoing.map((r) => ({ requestId: r._id, user: userSummary(r.to) })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/friends/request  { toUserId }
router.post('/request', protect, async (req, res) => {
  try {
    const { toUserId } = req.body;
    if (!toUserId) return res.status(400).json({ message: 'toUserId is required' });
    if (toUserId === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't send a friend request to yourself" });
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) return res.status(404).json({ message: 'User not found' });

    if (req.user.friends.some((f) => f.toString() === toUserId)) {
      return res.status(400).json({ message: 'You are already friends' });
    }

    // If they already sent *us* a pending request, accept that instead of
    // creating a mirrored duplicate — avoids two pending requests crossing.
    const reverseRequest = await FriendRequest.findOne({
      from: toUserId,
      to: req.user._id,
      status: 'pending',
    });
    if (reverseRequest) {
      reverseRequest.status = 'accepted';
      await reverseRequest.save();
      await Promise.all([
        User.findByIdAndUpdate(req.user._id, { $addToSet: { friends: toUserId } }),
        User.findByIdAndUpdate(toUserId, { $addToSet: { friends: req.user._id } }),
      ]);
      return res.json({ message: 'Friend request accepted', status: 'accepted' });
    }

    const request = await FriendRequest.create({ from: req.user._id, to: toUserId });
    res.status(201).json({ message: 'Friend request sent', requestId: request._id });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Friend request already pending' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/friends/accept  { requestId }
router.post('/accept', protect, async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await FriendRequest.findById(requestId);

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    if (request.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    request.status = 'accepted';
    await request.save();

    await Promise.all([
      User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } }),
      User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } }),
    ]);

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/friends/reject  { requestId }
router.post('/reject', protect, async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await FriendRequest.findById(requestId);

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    if (request.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }

    request.status = 'rejected';
    await request.save();
    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/friends/request/:requestId — cancel a request you sent
router.delete('/request/:requestId', protect, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    if (request.from.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this request' });
    }
    await request.deleteOne();
    res.json({ message: 'Friend request cancelled' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/friends/:friendId — remove an existing friend (both directions)
router.delete('/:friendId', protect, async (req, res) => {
  try {
    const { friendId } = req.params;
    await Promise.all([
      User.findByIdAndUpdate(req.user._id, { $pull: { friends: friendId } }),
      User.findByIdAndUpdate(friendId, { $pull: { friends: req.user._id } }),
    ]);
    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;