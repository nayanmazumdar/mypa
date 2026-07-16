const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');

// Store active SSE connections per shop
const shopConnections = new Map();

/**
 * GET /api/events — Server-Sent Events stream for real-time updates
 */
router.get('/', authenticate, (req, res) => {
  const shopId = req.user.shop_id;
  if (!shopId) return res.status(400).json({ success: false, message: 'No shop selected' });

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', shop_id: shopId })}\n\n`);

  // Register this connection
  if (!shopConnections.has(shopId)) {
    shopConnections.set(shopId, new Set());
  }
  shopConnections.get(shopId).add(res);

  // Keep alive ping every 30s
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    const connections = shopConnections.get(shopId);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) shopConnections.delete(shopId);
    }
  });
});

/**
 * Broadcast an event to all connected clients of a shop
 */
function broadcastToShop(shopId, event) {
  const connections = shopConnections.get(shopId);
  if (!connections || connections.size === 0) return;
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of connections) {
    try { res.write(data); } catch { /* connection dead, will be cleaned on close */ }
  }
}

module.exports = router;
module.exports.broadcastToShop = broadcastToShop;
