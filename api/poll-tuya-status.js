/**
 * Vercel API endpoint to call Supabase Edge Function for Tuya status polling
 * This runs every 2 minutes via Vercel cron jobs
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🔄 Triggering Tuya status poll via Supabase Edge Function...');

    // Call the Supabase Edge Function
    const response = await fetch(
      'https://bagcdhlbkicwtepflczr.supabase.co/functions/v1/poll-status',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({})
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Supabase Edge Function failed:', response.status, errorText);
      return res.status(500).json({
        success: false,
        error: `Edge Function failed: ${response.status}`,
        details: errorText
      });
    }

    const result = await response.json();
    console.log('✅ Tuya status poll completed:', result);

    return res.status(200).json({
      success: true,
      message: 'Tuya status poll completed successfully',
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error calling Supabase Edge Function:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
