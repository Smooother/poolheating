/**
 * Hybrid Status Component - Shows Pulsar-first approach with API fallback
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Wifi, 
  WifiOff, 
  Zap, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Activity,
  Battery
} from 'lucide-react';
import { HybridTuyaService, TuyaDeviceStatus } from '@/services/hybridTuyaService';

export default function HybridStatus() {
  const [status, setStatus] = useState<TuyaDeviceStatus | null>(null);
  const [apiStats, setApiStats] = useState<any>(null);
  const [dataSource, setDataSource] = useState<'pulsar' | 'api' | 'database'>('pulsar');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const deviceStatus = await HybridTuyaService.getDeviceStatus();
      const stats = HybridTuyaService.getApiUsageStats();
      
      setStatus(deviceStatus);
      setApiStats(stats);
      
      // Determine data source based on what was used
      if (deviceStatus) {
        const lastUpdate = new Date(deviceStatus.last_updated);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        if (lastUpdate > fiveMinutesAgo) {
          setDataSource('pulsar');
        } else {
          setDataSource('database');
        }
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDataSourceIcon = () => {
    switch (dataSource) {
      case 'pulsar':
        return <Zap className="h-4 w-4 text-green-500" />;
      case 'api':
        return <Wifi className="h-4 w-4 text-blue-500" />;
      case 'database':
        return <Database className="h-4 w-4 text-orange-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getDataSourceBadge = () => {
    switch (dataSource) {
      case 'pulsar':
        return <Badge variant="default" className="bg-green-500">Real-time (Pulsar)</Badge>;
      case 'api':
        return <Badge variant="default" className="bg-blue-500">Live (API)</Badge>;
      case 'database':
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Cached</Badge>;
      default:
        return <Badge variant="destructive">Offline</Badge>;
    }
  };

  const getQuotaStatus = () => {
    if (!apiStats) return 'Unknown';
    
    const remaining = apiStats.quotaRemaining;
    if (remaining > 3) return 'Good';
    if (remaining > 1) return 'Warning';
    return 'Critical';
  };

  const getQuotaColor = () => {
    const status = getQuotaStatus();
    switch (status) {
      case 'Good': return 'text-green-500';
      case 'Warning': return 'text-yellow-500';
      case 'Critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Hybrid Status (Pulsar-First)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Source */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            {getDataSourceIcon()}
            Data Source
          </span>
          {getDataSourceBadge()}
        </div>

        {/* Device Status */}
        {status && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Power Status</span>
              <Badge variant={status.power_status === 'on' ? 'default' : 'secondary'}>
                {status.power_status.toUpperCase()}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Water Temperature</span>
              <span className="text-sm font-mono">{status.water_temp}°C</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Target Temperature</span>
              <span className="text-sm font-mono">{status.target_temp}°C</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fan Speed</span>
              <span className="text-sm font-mono">{status.speed_percentage}%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Updated</span>
              <span className="text-sm font-mono">
                {new Date(status.last_updated).toLocaleTimeString('sv-SE', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false 
                })}
              </span>
            </div>
          </>
        )}

        {/* API Quota Status */}
        {apiStats && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Battery className="h-4 w-4" />
                API Quota
              </span>
              <span className={`text-sm font-medium ${getQuotaColor()}`}>
                {getQuotaStatus()}
              </span>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Calls Made: {apiStats.callsMade}</span>
                <span>Remaining: {apiStats.quotaRemaining}</span>
              </div>
              <Progress 
                value={(apiStats.callsMade / 5) * 100} 
                className="h-2"
              />
            </div>
          </div>
        )}

        {/* Strategy Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-medium">Pulsar-First Strategy:</p>
              <ul className="mt-1 space-y-1">
                <li>• Real-time updates via Pulsar (no quota used)</li>
                <li>• API only for critical commands</li>
                <li>• Cached data as fallback</li>
                <li>• Maximizes functionality with minimal API usage</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={loadStatus} 
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            {loading ? (
              <Clock className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Refresh Status
          </Button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className={`w-2 h-2 rounded-full ${
            dataSource === 'pulsar' ? 'bg-green-500 animate-pulse' : 
            dataSource === 'api' ? 'bg-blue-500' : 
            'bg-orange-500'
          }`}></div>
          {dataSource === 'pulsar' && 'Real-time updates active'}
          {dataSource === 'api' && 'Using API (quota consumed)'}
          {dataSource === 'database' && 'Using cached data'}
        </div>
      </CardContent>
    </Card>
  );
}
