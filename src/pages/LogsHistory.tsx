import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Calendar,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { AutomationService, AutomationLog } from "@/services/automationService";
import { useToast } from "@/components/ui/use-toast";


const LogsHistory = () => {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AutomationLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AutomationLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load automation logs
  useEffect(() => {
    const loadLogs = async () => {
      try {
        setIsLoading(true);
        const automationLogs = await AutomationService.getLogs(100);
        setLogs(automationLogs);
        setFilteredLogs(automationLogs);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load automation logs",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();

    // Subscribe to new log entries
    const unsubscribe = AutomationService.subscribeToLogChanges((newLog) => {
      setLogs(prev => [newLog, ...prev]);
      setFilteredLogs(prev => [newLog, ...prev]);
    });

    return unsubscribe;
  }, [toast]);

  // Apply filters
  const applyFilters = () => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.action_reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.price_classification.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(log => 
        statusFilter === "success" ? log.new_pump_temp !== log.current_pump_temp :
        statusFilter === "no_change" ? log.new_pump_temp === log.current_pump_temp :
        true
      );
    }

    setFilteredLogs(filtered);
  };

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, logs]);

  const getStatusIcon = (log: AutomationLog) => {
    const hasChange = log.new_pump_temp !== log.current_pump_temp;
    if (hasChange) {
      return <CheckCircle className="h-4 w-4 text-success" />;
    } else {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriceStateColor = (state: string) => {
    switch (state) {
      case 'low': return 'bg-success/10 text-success border-success/20';
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getTemperatureChange = (log: AutomationLog) => {
    const currentTemp = log.current_pump_temp || 0;
    const newTemp = log.new_pump_temp;
    const diff = newTemp - currentTemp;
    
    if (Math.abs(diff) < 0.1) {
      return (
        <div className="flex items-center space-x-1 text-muted-foreground">
          <Minus className="h-3 w-3" />
          <span className="text-xs">No change</span>
        </div>
      );
    } else if (diff > 0) {
      return (
        <div className="flex items-center space-x-1 text-success">
          <TrendingUp className="h-3 w-3" />
          <span className="text-xs">+{diff.toFixed(1)}°C</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-1 text-destructive">
          <TrendingDown className="h-3 w-3" />
          <span className="text-xs">{diff.toFixed(1)}°C</span>
        </div>
      );
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Price Classification', 'Current Price', 'Pool Temp', 'Current Pump Temp', 'New Pump Temp', 'Reason'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.price_classification,
        log.current_price.toString(),
        log.current_pool_temp?.toString() || '',
        log.current_pump_temp?.toString() || '',
        log.new_pump_temp.toString(),
        `"${log.action_reason}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poolheat-automation-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
                <p className="text-xs sm:text-sm text-muted-foreground">Changes Made</p>
                <p className="text-xl sm:text-2xl font-bold text-success">
                  {logs.filter(l => Math.abs((l.new_pump_temp) - (l.current_pump_temp || 0)) >= 0.1).length}
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
                <p className="text-xs sm:text-sm text-muted-foreground">High Price</p>
                <p className="text-xl sm:text-2xl font-bold text-destructive">
                  {logs.filter(l => l.price_classification === 'high').length}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
            </div>
          </div>
        </Card>

        <Card className="status-card">
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Last 24h</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {logs.filter(l => new Date(l.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}
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
            
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
            }}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="success">Changes Made</SelectItem>
                <SelectItem value="no_change">No Change</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="status-card">
        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading automation logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No automation logs available. The automation system hasn't run yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-full inline-block align-middle">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Time</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Price</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Pool Temp</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Pump Change</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Action</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Reason</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.slice(0, 50).map((log) => (
                      <TableRow 
                        key={log.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap">
                          {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <Badge className={getPriceStateColor(log.price_classification)} variant="outline">
                              <span className="text-xs">{log.price_classification}</span>
                            </Badge>
                            <span className="text-xs font-mono">{log.current_price.toFixed(3)} SEK</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm">{log.current_pool_temp?.toFixed(1) || 'N/A'}°C</div>
                            <div className="text-xs text-muted-foreground">Target: {log.target_pool_temp.toFixed(1)}°C</div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm">{log.current_pump_temp?.toFixed(1) || 'N/A'}°C → {log.new_pump_temp.toFixed(1)}°C</div>
                            {getTemperatureChange(log)}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getStatusIcon(log)}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-xs sm:text-sm truncate" title={log.action_reason}>
                            {log.action_reason}
                          </p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Button variant="ghost" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          {filteredLogs.length > 50 && (
            <div className="mt-4 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Showing 50 of {filteredLogs.length} entries. Export CSV for complete history.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Log Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Automation Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Timing</h4>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedLog.timestamp), 'PPpp')}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Price Information</h4>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriceStateColor(selectedLog.price_classification)} variant="outline">
                        {selectedLog.price_classification}
                      </Badge>
                      <span className="text-sm">{selectedLog.current_price.toFixed(4)} SEK/kWh</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Forecast: {selectedLog.avg_price_forecast.toFixed(4)} SEK/kWh
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Pool Temperature</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Current: {selectedLog.current_pool_temp?.toFixed(1) || 'N/A'}°C</p>
                    <p className="text-sm">Target: {selectedLog.target_pool_temp.toFixed(1)}°C</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Heat Pump Temperature</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Current: {selectedLog.current_pump_temp?.toFixed(1) || 'N/A'}°C</p>
                    <p className="text-sm">New: {selectedLog.new_pump_temp.toFixed(1)}°C</p>
                    <div className="flex items-center mt-2">
                      {getTemperatureChange(selectedLog)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Automation Decision</h4>
                <p className="text-sm bg-muted p-3 rounded-md">
                  {selectedLog.action_reason}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogsHistory;