/**
 * API endpoint for managing Tuya Pulsar real-time connections
 * This endpoint provides control over the Pulsar client service
 */

// Note: We can't import TypeScript modules directly in a .js file
// We'll need to use a different approach or compile the TypeScript first

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { action } = req.body || {};

    switch (action) {
      case 'start':
        return await handleStart(req, res);
      case 'stop':
        return await handleStop(req, res);
      case 'status':
        return await handleStatus(req, res);
      case 'health':
        return await handleHealth(req, res);
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Use: start, stop, status, or health'
        });
    }
  } catch (error) {
    console.error('❌ Pulsar manager error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Start the Pulsar connection
 */
async function handleStart(req, res) {
  try {
    console.log('🔄 Starting Pulsar connection...');
    
    const result = await pulsarClientService.start();
    
    if (result.success) {
      console.log('✅ Pulsar connection started successfully');
      return res.status(200).json({
        success: true,
        message: result.message,
        status: pulsarClientService.getStatus()
      });
    } else {
      console.error('❌ Failed to start Pulsar connection:', result.message);
      return res.status(500).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('❌ Error starting Pulsar:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to start Pulsar connection'
    });
  }
}

/**
 * Stop the Pulsar connection
 */
async function handleStop(req, res) {
  try {
    console.log('🔄 Stopping Pulsar connection...');
    
    const result = await pulsarClientService.stop();
    
    if (result.success) {
      console.log('✅ Pulsar connection stopped successfully');
      return res.status(200).json({
        success: true,
        message: result.message,
        status: pulsarClientService.getStatus()
      });
    } else {
      console.error('❌ Failed to stop Pulsar connection:', result.message);
      return res.status(500).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('❌ Error stopping Pulsar:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop Pulsar connection'
    });
  }
}

/**
 * Get Pulsar connection status
 */
async function handleStatus(req, res) {
  try {
    const status = pulsarClientService.getStatus();
    
    return res.status(200).json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting Pulsar status:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get Pulsar status'
    });
  }
}

/**
 * Get Pulsar health information
 */
async function handleHealth(req, res) {
  try {
    const health = pulsarClientService.getHealthInfo();
    
    return res.status(200).json({
      success: true,
      health: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting Pulsar health:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get Pulsar health'
    });
  }
}