export default async function handler(req, res) {
  return res.status(200).json({
    message: 'Environment variables test',
    hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    envKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
  });
}
