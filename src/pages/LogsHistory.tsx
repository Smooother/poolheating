import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Activity,
  Search,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'setpoint_change' | 'price_update' | 'system_error' | 'automation_toggle';
  priceState: 'low' | 'normal' | 'high';
  price: number;
  oldSetpoint?: number;
  newSetpoint?: number;
  adapter: string;
  status: 'success' | 'failed' | 'warning';
  message: string;
}

// Mock log data
const generateMockLogs = (): LogEntry[] => {
  const logs: LogEntry[] = [];
  const now = new Date();
  
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000)); // Hourly entries
    const hour = timestamp.getHours();
    
    // Determine price state based on hour
    let priceState: 'low' | 'normal' | 'high';
    let price: number;
    
    if (hour >= 0 && hour <= 6) {
      priceState = 'low';
      price = 0.15 + Math.random() * 0.15;
    } else if (hour >= 16 && hour <= 20) {
      priceState = 'high';
      price = 0.55 + Math.random() * 0.30;
    } else {
      priceState = 'normal';
      price = 0.30 + Math.random() * 0.20;
    }

    // Create different types of log entries
    if (i % 15 === 0) {
      // System error occasionally
      logs.push({
        id: `log_${i}`,
        timestamp,
        type: 'system_error',
        priceState,
        price,
        adapter: 'cloud',
        status: 'failed',
        message: 'Heat pump connection timeout - retrying in 5 minutes'
      });
    } else if (i % 25 === 0) {
      // Automation toggle
      logs.push({
        id: `log_${i}`,
        timestamp,
        type: 'automation_toggle',
        priceState,
        price,
        adapter: 'system',
        status: 'success',
        message: 'Automation enabled by user'
      });
    } else if (i % 3 === 0) {
      // Price update
      logs.push({
        id: `log_${i}`,
        timestamp,
        type: 'price_update',
        priceState,
        price,
        adapter: 'nordpool',
        status: 'success',
        message: `Price updated for hour ${hour}:00 - ${priceState} price period`
      });
    } else {
      // Setpoint changes
      const oldSetpoint = 28.0;
      let newSetpoint = oldSetpoint;
      
      if (priceState === 'low') newSetpoint = 30.0;
      else if (priceState === 'high') newSetpoint = 26.0;
      
      logs.push({
        id: `log_${i}`,
        timestamp,
        type: 'setpoint_change',
        priceState,
        price,
        oldSetpoint,
        newSetpoint,
        adapter: 'simulator',
        status: Math.random() > 0.1 ? 'success' : 'failed',
        message: newSetpoint !== oldSetpoint 
          ? `Setpoint adjusted from ${oldSetpoint}°C to ${newSetpoint}°C due to ${priceState} price`
          : `Setpoint maintained at ${oldSetpoint}°C - normal price period`
      });
    }
  }
  
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const LogsHistory = () => {
  const [logs] = useState<LogEntry[]>(generateMockLogs());
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>(logs);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Apply filters
  const applyFilters = () => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.adapter.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(log => log.type === typeFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    setFilteredLogs(filtered);
  };

  // Apply filters when dependencies change
  useState(() => {
    applyFilters();
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'setpoint_change':
        return <TrendingUp className="h-4 w-4" />;
      case 'price_update':
        return <Activity className="h-4 w-4" />;
      case 'system_error':
        return <XCircle className="h-4 w-4" />;
      case 'automation_toggle':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'setpoint_change':
        return 'Setpoint Change';
      case 'price_update':
        return 'Price Update';
      case 'system_error':
        return 'System Error';
      case 'automation_toggle':
        return 'Automation Toggle';
      default:
        return type;
    }
  };

  const getPriceStateColor = (state: string) => {
    switch (state) {
      case 'low': return 'bg-success/10 text-success border-success/20';
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getSetpointChange = (log: LogEntry) => {
    if (log.oldSetpoint && log.newSetpoint) {
      const diff = log.newSetpoint - log.oldSetpoint;
      if (diff > 0) {
        return (
          <div className="flex items-center space-x-1 text-success">
            <TrendingUp className="h-3 w-3" />
            <span className="text-xs">+{diff}°C</span>
          </div>
        );
      } else if (diff < 0) {
        return (
          <div className="flex items-center space-x-1 text-destructive">
            <TrendingDown className="h-3 w-3" />
            <span className="text-xs">{diff}°C</span>
          </div>
        );
      } else {
        return (
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Minus className="h-3 w-3" />
            <span className="text-xs">0°C</span>
          </div>
        );
      }
    }
    return null;
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Type', 'Price State', 'Price (SEK/kWh)', 'Old Setpoint', 'New Setpoint', 'Adapter', 'Status', 'Message'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp.toISOString(),
        log.type,
        log.priceState,
        log.price.toFixed(3),
        log.oldSetpoint || '',
        log.newSetpoint || '',
        log.adapter,
        log.status,
        `"${log.message}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poolheat-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Logs & History</h1>
          <p className="text-sm sm:text-base text-muted-foreground">System events, price updates, and setpoint changes</p>
        </div>
        <Button onClick={exportLogs} variant="outline" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
        <Card className="status-card">
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Events</p>
                <p className="text-xl sm:text-2xl font-bold">{logs.length}</p>
              </div>
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="status-card">
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Successful</p>
                <p className="text-xl sm:text-2xl font-bold text-success">
                  {logs.filter(l => l.status === 'success').length}
                </p>
              </div>
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="status-card">
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Failed</p>
                <p className="text-xl sm:text-2xl font-bold text-destructive">
                  {logs.filter(l => l.status === 'failed').length}
                </p>
              </div>
              <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
            </div>
          </div>
        </Card>

        <Card className="status-card">
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Last 24h</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {logs.filter(l => l.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}
                </p>
              </div>
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="status-card">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setTimeout(applyFilters, 300);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={typeFilter} onValueChange={(value) => {
              setTypeFilter(value);
              setTimeout(applyFilters, 100);
            }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="setpoint_change">Setpoint Changes</SelectItem>
                <SelectItem value="price_update">Price Updates</SelectItem>
                <SelectItem value="system_error">System Errors</SelectItem>
                <SelectItem value="automation_toggle">Automation</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setTimeout(applyFilters, 100);
            }}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="status-card">
        <div className="p-4 sm:p-6">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Time</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Type</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Price</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap hidden sm:table-cell">Change</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">Adapter</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.slice(0, 20).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap">
                        {format(log.timestamp, 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          {getTypeIcon(log.type)}
                          <span className="text-xs sm:text-sm hidden sm:inline">{getTypeLabel(log.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                          <Badge className={getPriceStateColor(log.priceState)} variant="outline">
                            <span className="text-xs">{log.priceState}</span>
                          </Badge>
                          <span className="text-xs font-mono">{log.price.toFixed(3)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell whitespace-nowrap">
                        {getSetpointChange(log)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">{log.adapter}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          {getStatusIcon(log.status)}
                          <span className="text-xs sm:text-sm capitalize hidden sm:inline">{log.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px] sm:max-w-xs">
                        <p className="text-xs sm:text-sm truncate" title={log.message}>
                          {log.message}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {filteredLogs.length > 20 && (
            <div className="mt-4 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Showing 20 of {filteredLogs.length} entries. Export CSV for complete history.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LogsHistory;