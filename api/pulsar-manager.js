import PulsarClientService from '../src/services/pulsarClientService.js';

const pulsarClient = PulsarClientService.getInstance();

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { action } = req.body;
      
      switch (action) {
        case 'start':
          console.log('🚀 Starting Pulsar client...');
          const connected = await pulsarClient.connect();
          return res.status(200).json({
            success: connected,
            message: connected ? 'Pulsar client started successfully' : 'Failed to start Pulsar client',
            status: pulsarClient.getStatus()
          });

        case 'stop':
          console.log('🛑 Stopping Pulsar client...');
          await pulsarClient.disconnect();
          return res.status(200).json({
            success: true,
            message: 'Pulsar client stopped successfully',
            status: pulsarClient.getStatus()
          });

        case 'restart':
          console.log('🔄 Restarting Pulsar client...');
          await pulsarClient.disconnect();
          const reconnected = await pulsarClient.connect();
          return res.status(200).json({
            success: reconnected,
            message: reconnected ? 'Pulsar client restarted successfully' : 'Failed to restart Pulsar client',
            status: pulsarClient.getStatus()
          });

        case 'status':
          return res.status(200).json({
            success: true,
            message: 'Pulsar client status retrieved',
            status: pulsarClient.getStatus(),
            config: pulsarClient.getConfig()
          });

        case 'config':
          const { config } = req.body;
          if (config) {
            pulsarClient.updateConfig(config);
            return res.status(200).json({
              success: true,
              message: 'Pulsar configuration updated',
              config: pulsarClient.getConfig()
            });
          } else {
            return res.status(400).json({
              success: false,
              message: 'Configuration data is required'
            });
          }

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action. Supported actions: start, stop, restart, status, config'
          });
      }
    } catch (error) {
      console.error('❌ Pulsar manager API error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  } else if (req.method === 'GET') {
    // GET request returns current status
    try {
      return res.status(200).json({
        success: true,
        message: 'Pulsar client status',
        status: pulsarClient.getStatus(),
        config: pulsarClient.getConfig()
      });
    } catch (error) {
      console.error('❌ Error getting Pulsar status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get status',
        error: error.message
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use GET or POST.'
    });
  }
}
