const { RtcTokenBuilder, RtcRole } = require('agora-token');

// How long the token stays valid for, in seconds.
// After this, the client must request a new token before rejoining.
const TOKEN_EXPIRATION_SECONDS = 3600; // 1 hour

/**
 * Generates a signed Agora RTC token for a given channel + uid.
 *
 * uid: the integer UID the client will use to join the channel.
 *      Pass 0 to let Agora assign one automatically on join.
 * role: 'publisher' (can send + receive audio/video) or 'subscriber' (receive-only).
 *       For a normal 1:1 or group video call, both sides should be 'publisher'.
 */
const generateRtcToken = (channelName, uid = 0, role = 'publisher') => {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate || appId === 'your_agora_app_id') {
    throw new Error(
      'Agora credentials are not configured. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE in .env'
    );
  }

  const agoraRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    agoraRole,
    TOKEN_EXPIRATION_SECONDS, // token expiration
    TOKEN_EXPIRATION_SECONDS  // privilege expiration
  );

  return { token, appId, channelName, uid, expiresIn: TOKEN_EXPIRATION_SECONDS };
};

// Agora channel names allow letters, digits, and a limited set of symbols, max 64 bytes.
const isValidChannelName = (name) =>
  typeof name === 'string' &&
  name.length > 0 &&
  name.length <= 64 &&
  /^[a-zA-Z0-9!#$%&()+\-:;<=.>?@[\]^_{}|~, ]+$/.test(name);

module.exports = { generateRtcToken, isValidChannelName };