import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Supabase client for service role operations
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface PricePoint {
  start: Date;
  end: Date;
  value: number;
  currency: string;
  resolution: string;
}

const BIDDING_ZONES = ['SE1', 'SE2', 'SE3', 'SE4']

// ElprisetJustNu API adapter
async function fetchElprisetData(zone: string, date: Date): Promise<PricePoint[]> {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const dateStr = `${month}-${day}`
  
  const url = `https://www.elprisetjustnu.se/api/v1/prices/${year}/${dateStr}_${zone}.json`
  
  try {
    console.log(`Fetching price data for ${zone} on ${dateStr}:`, url)
    const response = await fetch(url)
    
    if (!response.ok) {
      console.warn(`No data available for ${zone} on ${dateStr}: ${response.status}`)
      return []
    }

    const data = await response.json()
    
    if (!Array.isArray(data)) {
      console.error(`Invalid response format for ${zone} on ${dateStr}`)
      return []
    }

    return data.map(item => ({
      start: new Date(item.time_start),
      end: new Date(item.time_end),
      value: item.SEK_per_kWh,
      currency: 'SEK',
      resolution: 'PT60M'
    }))
  } catch (error) {
    console.error(`Failed to fetch data for ${zone} on ${dateStr}:`, error)
    return []
  }
}

// Save price data to Supabase
async function savePriceData(points: PricePoint[], zone: string, provider = 'elpriset') {
  if (points.length === 0) return

  const rows = points.map(point => ({
    bidding_zone: zone,
    start_time: point.start.toISOString(),
    end_time: point.end.toISOString(),
    price_value: point.value,
    currency: point.currency,
    provider: provider,
    resolution: point.resolution
  }))

  const { data, error } = await supabase
    .from('price_data')
    .upsert(rows, { 
      onConflict: 'bidding_zone,start_time,end_time,provider',
      ignoreDuplicates: true 
    })

  if (error) {
    console.error(`Failed to save price data for ${zone}:`, error)
    throw error
  }

  console.log(`Saved ${rows.length} price points for ${zone}`)
}

// Get the last available date in database for a zone
async function getLastDataDate(zone: string): Promise<Date | null> {
  const { data, error } = await supabase
    .from('price_data')
    .select('start_time')
    .eq('bidding_zone', zone)
    .order('start_time', { ascending: false })
    .limit(1)

  if (error) {
    console.error(`Failed to get last data date for ${zone}:`, error)
    return null
  }

  return data.length > 0 ? new Date(data[0].start_time) : null
}

// Collect price data for the last 30 days or fill gaps
async function collectPriceData() {
  console.log('Starting daily price data collection...')
  
  for (const zone of BIDDING_ZONES) {
    try {
      const lastDataDate = await getLastDataDate(zone)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Start of today
      
      let startDate: Date
      
      if (!lastDataDate) {
        // No data exists, fetch last 30 days
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        console.log(`No existing data for ${zone}, fetching last 30 days from ${startDate.toISOString()}`)
      } else {
        // Data exists, fetch from day after last data until today
        startDate = new Date(lastDataDate.getTime() + 24 * 60 * 60 * 1000)
        console.log(`Existing data for ${zone} until ${lastDataDate.toISOString()}, fetching from ${startDate.toISOString()}`)
      }

      // Fetch data for each day from startDate to today
      const currentDate = new Date(startDate)
      let totalPoints = 0
      
      while (currentDate <= today) {
        const points = await fetchElprisetData(zone, currentDate)
        if (points.length > 0) {
          await savePriceData(points, zone)
          totalPoints += points.length
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1)
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      console.log(`Completed collection for ${zone}: ${totalPoints} total points`)
      
    } catch (error) {
      console.error(`Failed to collect data for ${zone}:`, error)
    }
  }
  
  console.log('Daily price data collection completed')
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Start the collection process
    await collectPriceData()
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Price data collection completed successfully',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Price collection error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})