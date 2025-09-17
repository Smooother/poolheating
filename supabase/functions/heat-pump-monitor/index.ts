import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TuyaDeviceData {
  success?: boolean;
  result?: Array<{
    code: string;
    value: any;
  }>;
  status?: Array<{
    code: string;
    value: any;
  }>;
}

interface HeatPumpStatus {
  device_id: string;
  current_temp: number;
  water_temp: number;
  target_temp: number;
  speed_percentage: number;
  power_status: 'on' | 'off' | 'standby';
  mode?: string;
  is_online: boolean;
  last_communication: string;
}

async function fetchTuyaDeviceData(supabase: any): Promise<TuyaDeviceData | null> {
  try {
    // Get Tuya configuration
    const { data: config } = await supabase
      .from('tuya_config')
      .select('device_id, uid')
      .eq('id', 'default')
      .single();

    if (!config?.device_id) {
      console.log('No Tuya device configured');
      return null;
    }

    // Call the Tuya proxy to get device status
    const { data: deviceData, error } = await supabase.functions.invoke('tuya-proxy', {
      body: { 
        action: 'getDeviceStatus',
        uid: config.uid,
        deviceId: config.device_id
      }
    });

    if (error) {
      console.error('Failed to fetch device data from Tuya:', error);
      return null;
    }

    console.log('Raw Tuya device data:', JSON.stringify(deviceData, null, 2));
    return deviceData;
  } catch (error) {
    console.error('Error fetching Tuya device data:', error);
    return null;
  }
}

function mapTuyaDataToHeatPumpStatus(tuyaData: TuyaDeviceData, deviceId: string): HeatPumpStatus {
  console.log('Mapping Tuya data:', JSON.stringify(tuyaData, null, 2));
  
  // Handle different response formats from Tuya API
  let statusArray: Array<{ code: string; value: any }> = [];
  
  if (tuyaData.result && Array.isArray(tuyaData.result)) {
    statusArray = tuyaData.result;
  } else if (tuyaData.status && Array.isArray(tuyaData.status)) {
    statusArray = tuyaData.status;
  } else {
    console.error('No valid status array found in Tuya data:', tuyaData);
    // Return default values when no data is available
    return {
      device_id: deviceId,
      current_temp: 20.0,
      water_temp: 18.0,
      target_temp: 22.0,
      speed_percentage: 0,
      power_status: 'off',
      mode: 'auto',
      is_online: false,
      last_communication: new Date().toISOString()
    };
  }
  
  const statusMap = new Map(statusArray.map(item => [item.code, item.value]));
  console.log('Status map:', Object.fromEntries(statusMap));
  console.log('Available field codes:', statusArray.map(item => item.code));
  console.log('Looking for WinTemp, found:', statusMap.get('WinTemp'));
  
  // Map Tuya status codes to our heat pump data with proper number conversion
  const currentTemp = Number(statusMap.get('CurrentTemp') || statusMap.get('Temp') || statusMap.get('current_temp') || '26.5');
  const waterTemp = Number(statusMap.get('WinTemp') || statusMap.get('WaterTemp') || statusMap.get('water_temp') || '24.8');
  const targetTemp = Number(statusMap.get('SetTemp') || statusMap.get('TargetTemp') || statusMap.get('target_temp') || '28.0');
  const speedPercentage = Number(statusMap.get('SpeedPercentage') || statusMap.get('Speed') || statusMap.get('speed') || '75');
  const powerOn = statusMap.get('Power') === true || statusMap.get('switch') === true || statusMap.get('power') === true;
  const mode = String(statusMap.get('SetMode') || statusMap.get('mode') || 'auto');
  
  // Determine power status based on power state and current activity
  let powerStatus: 'on' | 'off' | 'standby' = 'off';
  if (powerOn) {
    powerStatus = speedPercentage > 0 ? 'on' : 'standby';
  }
  
  const result = {
    device_id: deviceId,
    current_temp: Math.max(0, Math.min(50, isNaN(currentTemp) ? 26.5 : currentTemp)),
    water_temp: Math.max(0, Math.min(50, isNaN(waterTemp) ? 24.8 : waterTemp)),
    target_temp: Math.max(0, Math.min(50, isNaN(targetTemp) ? 28.0 : targetTemp)),
    speed_percentage: Math.max(0, Math.min(100, isNaN(speedPercentage) ? 75 : speedPercentage)),
    power_status: powerStatus,
    mode,
    is_online: true,
    last_communication: new Date().toISOString()
  };
  
  console.log('Mapped heat pump status:', result);
  return result;
}

async function updateHeatPumpStatus(supabase: any, status: HeatPumpStatus): Promise<void> {
  try {
    // First, try to update existing record
    const { data: existing } = await supabase
      .from('heat_pump_status')
      .select('id')
      .eq('device_id', status.device_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing record
      const { error } = await supabase
        .from('heat_pump_status')
        .update({
          current_temp: status.current_temp,
          water_temp: status.water_temp,
          target_temp: status.target_temp,
          speed_percentage: status.speed_percentage,
          power_status: status.power_status,
          mode: status.mode,
          is_online: status.is_online,
          last_communication: status.last_communication,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing[0].id);

      if (error) {
        console.error('Failed to update heat pump status:', error);
      } else {
        console.log('Heat pump status updated successfully');
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from('heat_pump_status')
        .insert([status]);

      if (error) {
        console.error('Failed to insert heat pump status:', error);
      } else {
        console.log('Heat pump status inserted successfully');
      }
    }
  } catch (error) {
    console.error('Error updating heat pump status:', error);
  }
}

async function markDeviceOffline(supabase: any, deviceId: string): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('heat_pump_status')
      .select('id')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('heat_pump_status')
        .update({
          is_online: false,
          power_status: 'off',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing[0].id);
      
      console.log('Device marked as offline');
    }
  } catch (error) {
    console.error('Error marking device offline:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'monitor';

    if (action === 'monitor') {
      console.log('Starting heat pump monitoring cycle...');
      
      // Get Tuya device configuration
      const { data: config } = await supabase
        .from('tuya_config')
        .select('device_id')
        .eq('id', 'default')
        .single();

      if (!config?.device_id) {
        return new Response(
          JSON.stringify({ error: 'No Tuya device configured' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Fetch current device data
      const tuyaData = await fetchTuyaDeviceData(supabase);
      
      if (tuyaData) {
        // Map and store the data
        const heatPumpStatus = mapTuyaDataToHeatPumpStatus(tuyaData, config.device_id);
        await updateHeatPumpStatus(supabase, heatPumpStatus);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: heatPumpStatus,
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } else {
        // Mark device as offline if we can't reach it
        await markDeviceOffline(supabase, config.device_id);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Device unreachable',
            timestamp: new Date().toISOString()
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else if (action === 'status') {
      // Get latest status from database
      const { data: latestStatus, error } = await supabase
        .from('heat_pump_status')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch status' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: latestStatus?.[0] || null 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Heat pump monitor error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});