/**
 * Pulsar Status Component for Dashboard
 * Shows real-time Pulsar connection status and message count
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Square, Wifi, WifiOff, MessageSquare, Clock } from 'lucide-react';
import { pulsarService, PulsarStatus, PulsarHealth } from '@/services/pulsarService';
import { useToast } from '@/hooks/use-toast';

export default function PulsarStatus() {
  const [status, setStatus] = useState<PulsarStatus | null>(null);
  const [health, setHealth] = useState<PulsarHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { toast } = useToast();

  // Load initial status
  useEffect(() => {
    loadStatus();
  }, []);

  // Auto-refresh when connected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && status?.connected) {
      interval = setInterval(() => {
        loadStatus();
        loadHealth();
      }, 5000); // Refresh every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, status?.connected]);

  const loadStatus = async () => {
    try {
      const result = await pulsarService.getStatus();
      setStatus(result);
    } catch (error) {
      console.error('Error loading Pulsar status:', error);
    }
  };

  const loadHealth = async () => {
    try {
      const result = await pulsarService.getHealth();
      setHealth(result);
    } catch (error) {
      console.error('Error loading Pulsar health:', error);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const result = await pulsarService.start();
      setStatus(result);
      
      if (result.success) {
        toast({
          title: "Pulsar Started",
          description: "Real-time connection established successfully",
        });
        setAutoRefresh(true);
        loadHealth();
      } else {
        toast({
          title: "Start Failed",
          description: result.message || "Failed to start Pulsar connection",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start Pulsar connection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const result = await pulsarService.stop();
      setStatus(result);
      setAutoRefresh(false);
      
      if (result.success) {
        toast({
          title: "Pulsar Stopped",
          description: "Real-time connection stopped successfully",
        });
      } else {
        toast({
          title: "Stop Failed",
          description: result.message || "Failed to stop Pulsar connection",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop Pulsar connection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getConnectionIcon = () => {
    if (status?.connected) {
      return <Wifi className="h-4 w-4 text-green-500" />;
    }
    return <WifiOff className="h-4 w-4 text-red-500" />;
  };

  const getConnectionBadge = () => {
    if (status?.connected) {
      return <Badge variant="default" className="bg-green-500">Connected</Badge>;
    }
    return <Badge variant="destructive">Disconnected</Badge>;
  };

  const formatLastMessage = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString('sv-SE', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getConnectionIcon()}
          Real-time Updates (Pulsar)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection Status</span>
          {getConnectionBadge()}
        </div>

        {/* Message Count */}
        {health?.health && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages Received
            </span>
            <span className="text-sm font-mono">
              {health.health.messageCount}
            </span>
          </div>
        )}

        {/* Last Message */}
        {health?.health && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last Message
            </span>
            <span className="text-sm font-mono">
              {formatLastMessage(health.health.lastMessage)}
            </span>
          </div>
        )}

        {/* Error Display */}
        {status?.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">
              <strong>Error:</strong> {status.error}
            </p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2 pt-2">
          {!status?.connected ? (
            <Button 
              onClick={handleStart} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Real-time
            </Button>
          ) : (
            <Button 
              onClick={handleStop} 
              disabled={loading}
              variant="destructive"
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              Stop Real-time
            </Button>
          )}
          
          <Button 
            onClick={loadStatus} 
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
        </div>

        {/* Auto-refresh indicator */}
        {autoRefresh && status?.connected && (
          <div className="text-xs text-green-600 flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Auto-refreshing every 5 seconds
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          <p><strong>How to test:</strong></p>
          <ol className="list-decimal list-inside space-y-1 mt-1">
            <li>Click "Start Real-time" to connect</li>
            <li>Change your heat pump settings (temperature, power, etc.)</li>
            <li>Watch the message count increase automatically</li>
            <li>Check the dashboard for real-time updates</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
