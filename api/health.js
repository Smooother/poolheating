export default async function handler(req, res) {
  // Enable CORS for mobile app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const now = new Date();
    const timezone = 'Europe/Stockholm';
    
    // Basic health check
    const health = {
      ok: true,
      time: now.toISOString(),
      tz: timezone,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: now.getTime()
    };

    return res.status(200).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message,
      time: new Date().toISOString()
    });
  }
}
