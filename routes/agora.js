const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { generateRtcToken, isValidChannelName } = require('../utils/agoraToken');

// POST /api/agora/token
// body: { channelName: string, uid?: number, role?: 'publisher' | 'subscriber' }
//
// Any logged-in user can request a token for any channel name they know.
// This is fine for direct/invited calls (the channel name itself acts like
// a shared secret handed out over the socket signaling flow), but if you
// later add "public" or discoverable rooms, add an authorization check here
// (e.g. verify the requester is actually a participant of this call/channel).
router.post('/token', protect, (req, res) => {
  const { channelName, uid, role } = req.body;

  if (!isValidChannelName(channelName)) {
    return res.status(400).json({
      message:
        'A valid channelName is required (letters/digits/basic symbols, max 64 chars).',
    });
  }

  const parsedUid = uid === undefined || uid === null ? 0 : Number(uid);
  if (!Number.isInteger(parsedUid) || parsedUid < 0) {
    return res.status(400).json({ message: 'uid must be a non-negative integer, or omitted.' });
  }

  try {
    const result = generateRtcToken(channelName, parsedUid, role);
    res.json(result);
  } catch (error) {
    // Most likely cause: AGORA_APP_ID / AGORA_APP_CERTIFICATE not set yet in .env
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;