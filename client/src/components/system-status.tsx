import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function SystemStatus() {

  // Fetch system status
  const { data: systemStatus, isLoading } = useQuery<Array<{
    id: string;
    component: string;
    status: string;
    details?: string | null;
    last_update: string | Date;
  }>>({
    queryKey: ["/api/system/status"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey.join("/"));
      if (!response.ok) throw new Error("Failed to fetch system status");
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'fas fa-check-circle text-accent';
      case 'testing': return 'fas fa-spinner fa-spin text-warning';
      case 'error': return 'fas fa-exclamation-triangle text-destructive';
      default: return 'fas fa-question-circle text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-accent/10 text-accent';
      case 'testing': return 'bg-warning/10 text-warning';
      case 'error': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'network': return 'fas fa-wifi text-2xl';
      case 'data_stream': return 'fas fa-satellite-dish text-2xl';
      default: return 'fas fa-cog text-2xl';
    }
  };

  const getComponentLabel = (component: string) => {
    switch (component) {
      case 'network': return 'Network';
      case 'data_stream': return 'Data Stream';
      default: return component;
    }
  };

  const getComponentDetails = (component: string, status: string, details?: string) => {
    if (details) return details;
    
    switch (component) {
      case 'network':
        return status === 'active' ? 'Online' : 'Offline';
      case 'data_stream':
        return status === 'active' ? 'Connected to NOAA' : 'Offline';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <section className="mb-8" aria-busy="true">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[1, 2].map(i => (
                <div key={i} className="bg-secondary/10 rounded-lg p-4 text-center">
                  <Skeleton className="h-8 w-8 mx-auto mb-2" />
                  <Skeleton className="h-4 w-16 mx-auto mb-1" />
                  <Skeleton className="h-3 w-20 mx-auto" />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-10 w-32" />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  const statusByComponent = systemStatus?.reduce((acc: Record<string, typeof systemStatus[0]>, status: typeof systemStatus[0]) => {
    acc[status.component] = status;
    return acc;
  }, {} as Record<string, typeof systemStatus[0]>) || {};

  const expectedComponents = ['network', 'data_stream'];

  return (
    <section className="mb-8">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-6">System Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {expectedComponents.map(component => {
              const status = statusByComponent[component];
              const componentStatus = status?.status || 'unknown';
              const componentDetails = getComponentDetails(component, componentStatus, status?.details ?? undefined);
              
              return (
                <div 
                  key={component}
                  className={`rounded-lg p-4 text-center ${getStatusColor(componentStatus)}`}
                >
                  <i className={`${getComponentIcon(component)} ${getStatusColor(componentStatus).includes('accent') ? 'text-accent' : getStatusColor(componentStatus).includes('warning') ? 'text-warning' : getStatusColor(componentStatus).includes('destructive') ? 'text-destructive' : 'text-muted-foreground'} mb-2`} aria-hidden="true" />
                  <div className="text-sm font-medium">{getComponentLabel(component)}</div>
                  <div className="text-xs" data-testid={`text-${component}-status`}>
                    {componentDetails}
                  </div>
                </div>
              );
            })}
          </div>
          

          {/* Detailed Status Information */}
          {systemStatus && systemStatus.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-lg font-semibold mb-4">Detailed Status</h3>
              <div className="space-y-2">
                {systemStatus.map((status: typeof systemStatus[0]) => (
                  <div key={status.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <i className={getStatusIcon(status.status)} aria-hidden="true" />
                      <div>
                        <div className="font-medium">{getComponentLabel(status.component)}</div>
                        <div className="text-sm text-muted-foreground">{status.details ?? ''}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={getStatusColor(status.status)}>
                        {status.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(status.last_update).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
