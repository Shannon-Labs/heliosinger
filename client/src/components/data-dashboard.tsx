import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function DataDashboard() {
  // Fetch solar wind history for charts
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/solar-wind/history"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey.join("/") + "?limit=24");
      if (!response.ok) throw new Error("Failed to fetch history data");
      return response.json();
    }
  });

  // Fetch system status for connection info
  const { data: systemStatus } = useQuery({
    queryKey: ["/api/system/status"]
  });

  const dataStreamStatus = systemStatus?.find(s => s.component === 'data_stream');
  const networkStatus = systemStatus?.find(s => s.component === 'network');

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getParameterTrend = (data: any[], parameter: string) => {
    if (!data || data.length < 2) return 'stable';
    
    const recent = data.slice(-3);
    const values = recent.map(d => d[parameter]);
    const trend = values[values.length - 1] - values[0];
    
    if (Math.abs(trend) < (values[0] * 0.1)) return 'stable';
    return trend > 0 ? 'rising' : 'falling';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return 'fas fa-arrow-up text-warning';
      case 'falling': return 'fas fa-arrow-down text-accent';
      default: return 'fas fa-minus text-muted-foreground';
    }
  };

  const generateSparklineData = (data: any[], parameter: string) => {
    if (!data || data.length === 0) return [];
    
    const values = data.slice(-12).map(d => d[parameter]);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    
    return values.map(value => ({
      value,
      normalized: ((value - min) / range) * 100
    }));
  };

  if (historyLoading) {
    return (
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Real-time Data Dashboard</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-48 w-full mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  const latestReading = historyData?.[0];
  
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold mb-6">Real-time Data Dashboard</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* NOAA DSCOVR Data Stream */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">NOAA DSCOVR Data Stream</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${dataStreamStatus?.status === 'active' ? 'bg-accent pulse-animation' : 'bg-destructive'}`} />
                <span className="text-sm" data-testid="text-data-connection-status">
                  {dataStreamStatus?.status === 'active' ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              {latestReading ? (
                <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm">
                  <div className="text-muted-foreground mb-2">
                    Last Update: <span data-testid="text-last-update">{formatTimestamp(latestReading.timestamp)}</span>
                  </div>
                  <div className="space-y-1">
                    <div>
                      <span className="text-primary">velocity:</span> <span data-testid="text-raw-velocity">{latestReading.velocity.toFixed(1)}</span> km/s
                    </div>
                    <div>
                      <span className="text-accent">density:</span> <span data-testid="text-raw-density">{latestReading.density.toFixed(2)}</span> p/cm³
                    </div>
                    <div>
                      <span className="text-warning">bz_gsm:</span> <span data-testid="text-raw-bz">{latestReading.bz.toFixed(1)}</span> nT
                    </div>
                    {latestReading.bt && (
                      <div>
                        <span className="text-muted-foreground">bt:</span> <span data-testid="text-raw-bt">{latestReading.bt.toFixed(1)}</span> nT
                      </div>
                    )}
                    {latestReading.temperature && (
                      <div>
                        <span className="text-muted-foreground">temperature:</span> <span data-testid="text-raw-temperature">{Math.round(latestReading.temperature)}</span> K
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-secondary/30 rounded-lg p-4 text-center text-muted-foreground">
                  <i className="fas fa-database text-2xl mb-2" />
                  <div>No recent data available</div>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span>Update Frequency:</span>
                  <span className="text-accent">60 seconds</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data Source:</span>
                  <span className="text-primary">NOAA SWPC</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>API Endpoint:</span>
                  <span className="text-warning font-mono text-xs">real-time-solar-wind.json</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Network Status:</span>
                  <Badge variant={networkStatus?.status === 'active' ? 'default' : 'destructive'}>
                    {networkStatus?.status === 'active' ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Parameter History Charts */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Parameter History (24h)</h3>
            <div className="space-y-6">
              
              {/* Velocity Trend */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">Solar Wind Velocity</span>
                  <div className="flex items-center space-x-2">
                    <i className={getTrendIcon(getParameterTrend(historyData, 'velocity'))} />
                    <span className="text-xs text-muted-foreground">
                      {getParameterTrend(historyData, 'velocity')}
                    </span>
                  </div>
                </div>
                <div className="h-12 bg-secondary/30 rounded-lg p-2 flex items-end justify-center">
                  {historyData && historyData.length > 0 ? (
                    <div className="w-full h-full flex items-end justify-between space-x-1">
                      {generateSparklineData(historyData, 'velocity').map((point, i) => (
                        <div 
                          key={i}
                          className="flex-1 bg-primary rounded-t transition-all duration-300"
                          style={{ height: `${Math.max(10, point.normalized)}%` }}
                          title={`${point.value.toFixed(1)} km/s`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No data available</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Range: {historyData && historyData.length > 0 ? 
                    `${Math.min(...historyData.map(d => d.velocity)).toFixed(0)} - ${Math.max(...historyData.map(d => d.velocity)).toFixed(0)} km/s` 
                    : 'N/A'}
                </div>
              </div>

              {/* Density Trend */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-accent">Plasma Density</span>
                  <div className="flex items-center space-x-2">
                    <i className={getTrendIcon(getParameterTrend(historyData, 'density'))} />
                    <span className="text-xs text-muted-foreground">
                      {getParameterTrend(historyData, 'density')}
                    </span>
                  </div>
                </div>
                <div className="h-12 bg-secondary/30 rounded-lg p-2 flex items-end justify-center">
                  {historyData && historyData.length > 0 ? (
                    <div className="w-full h-full flex items-end justify-between space-x-1">
                      {generateSparklineData(historyData, 'density').map((point, i) => (
                        <div 
                          key={i}
                          className="flex-1 bg-accent rounded-t transition-all duration-300"
                          style={{ height: `${Math.max(10, point.normalized)}%` }}
                          title={`${point.value.toFixed(2)} p/cm³`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No data available</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Range: {historyData && historyData.length > 0 ? 
                    `${Math.min(...historyData.map(d => d.density)).toFixed(1)} - ${Math.max(...historyData.map(d => d.density)).toFixed(1)} p/cm³` 
                    : 'N/A'}
                </div>
              </div>

              {/* Bz Trend */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-warning">Bz Magnetic Field</span>
                  <div className="flex items-center space-x-2">
                    <i className={getTrendIcon(getParameterTrend(historyData, 'bz'))} />
                    <span className="text-xs text-muted-foreground">
                      {getParameterTrend(historyData, 'bz')}
                    </span>
                  </div>
                </div>
                <div className="h-12 bg-secondary/30 rounded-lg p-2 flex items-end justify-center relative">
                  {historyData && historyData.length > 0 ? (
                    <>
                      {/* Zero line indicator */}
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-px bg-muted-foreground/30 border-dashed border-t"></div>
                      </div>
                      <div className="w-full h-full flex items-end justify-between space-x-1 relative">
                        {generateSparklineData(historyData, 'bz').map((point, i) => {
                          const originalValue = historyData[historyData.length - 12 + i]?.bz || 0;
                          const isNegative = originalValue < 0;
                          return (
                            <div 
                              key={i}
                              className={`flex-1 rounded-t transition-all duration-300 ${
                                isNegative ? 'bg-destructive' : 'bg-warning'
                              }`}
                              style={{ height: `${Math.max(5, point.normalized)}%` }}
                              title={`${originalValue.toFixed(1)} nT`}
                            />
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">No data available</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Range: {historyData && historyData.length > 0 ? 
                    `${Math.min(...historyData.map(d => d.bz)).toFixed(1)} - ${Math.max(...historyData.map(d => d.bz)).toFixed(1)} nT` 
                    : 'N/A'}
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
              Historical trends help identify space weather patterns and forecast upcoming chord changes
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
