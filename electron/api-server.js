'use strict';
const express = require('express');
const cors = require('cors');
const { ipcMain } = require('electron');

function startApiServer() {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  // Exposed universal invoke endpoint for mobile devices on the network
  app.post('/api/invoke', async (req, res) => {
    try {
      const { channel, args = [] } = req.body;
      
      if (!channel) {
        return res.status(400).json({ error: 'Missing invoke channel' });
      }

      // Check if the handler was registered in our intercepted ipcMain map
      const handler = ipcMain._customHandlers?.get(channel);

      console.log(`[API Server] Processing ${channel} with args:`, args);

      if (!handler) {
        console.error(`[API Server] Handler not found for ${channel}`);
        return res.status(404).json({ error: `No handler implemented for channel: ${channel}` });
      }

      // The original handler expects (event, ...args)
      const mockEvent = {};
      const result = await handler(mockEvent, ...args);
      
      console.log(`[API Server] Success ${channel}:`, result ? '(data)' : 'null');
      res.json({ result });
    } catch (error) {
      console.error(`[API Server] Error on /api/invoke:`, error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  const PORT = 3001;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[API Server] Local network API running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = { startApiServer };
