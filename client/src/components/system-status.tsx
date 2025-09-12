import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function SystemStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch system status
  const { data: systemStatus, isLoading } = useQuery({
    queryKey: ["/api/system/status"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Test chimes mutation
  const testChimesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/system/test-chimes"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/status"] });
      toast({
        title: "Chime Test Started",
        description: "Testing all chimes - check hardware for audio feedback",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to start chime test",
        variant: "destructive",
      });
    }
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
      case 'data_stream': return 'fas fa-database text-2xl';
      case 'power': return 'fas fa-battery-three-quarters text-2xl';
      case 'chimes': return 'fas fa-bell text-2xl';
      default: return 'fas fa-cog text-2xl';
    }
  };

  const getComponentLabel = (component: string) => {
    switch (component) {
      case 'network': return 'Network';
      case 'data_stream': return 'Data Stream';
      case 'power': return 'Power';
      case 'chimes': return 'Chimes';
      default: return component;
    }
  };

  const getComponentDetails = (component: string, status: string, details?: string) => {
    if (details) return details;
    
    switch (component) {
      case 'network':
        return status === 'active' ? 'Connected' : 'Disconnected';
      case 'data_stream':
        return status === 'active' ? 'Receiving' : 'Offline';
      case 'power':
        return status === 'active' ? '78% Solar' : 'Battery Low';
      case 'chimes':
        return status === 'active' ? '3 Active' : status === 'testing' ? 'Testing...' : 'Inactive';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <section className="mb-8">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => (
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

  const statusByComponent = systemStatus?.reduce((acc, status) => {
    acc[status.component] = status;
    return acc;
  }, {} as Record<string, any>) || {};

  const expectedComponents = ['network', 'data_stream', 'power', 'chimes'];

  return (
    <section className="mb-8">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-6">System Status & Control</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {expectedComponents.map(component => {
              const status = statusByComponent[component];
              const componentStatus = status?.status || 'unknown';
              const componentDetails = getComponentDetails(component, componentStatus, status?.details);
              
              return (
                <div 
                  key={component}
                  className={`rounded-lg p-4 text-center ${getStatusColor(componentStatus)}`}
                >
                  <i className={`${getComponentIcon(component)} ${getStatusColor(componentStatus).includes('accent') ? 'text-accent' : getStatusColor(componentStatus).includes('warning') ? 'text-warning' : getStatusColor(componentStatus).includes('destructive') ? 'text-destructive' : 'text-muted-foreground'} mb-2`} />
                  <div className="text-sm font-medium">{getComponentLabel(component)}</div>
                  <div className="text-xs" data-testid={`text-${component}-status`}>
                    {componentDetails}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={() => testChimesMutation.mutate()}
              disabled={testChimesMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-test-all-chimes"
            >
              <i className={`fas ${testChimesMutation.isPending ? 'fa-spinner fa-spin' : 'fa-play-circle'} mr-2`} />
              {testChimesMutation.isPending ? "Testing..." : "Test All Chimes"}
            </Button>
            
            <Button 
              variant="secondary"
              data-testid="button-calibrate-system"
            >
              <i className="fas fa-cog mr-2" />
              Calibrate System
            </Button>
            
            <Button 
              variant="outline"
              data-testid="button-export-data"
            >
              <i className="fas fa-download mr-2" />
              Export Data
            </Button>
            
            <Button 
              variant="ghost"
              data-testid="button-documentation"
            >
              <i className="fas fa-book mr-2" />
              Documentation
            </Button>
          </div>

          {/* Detailed Status Information */}
          {systemStatus && systemStatus.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-lg font-semibold mb-4">Detailed Status</h3>
              <div className="space-y-2">
                {systemStatus.map(status => (
                  <div key={status.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <i className={getStatusIcon(status.status)} />
                      <div>
                        <div className="font-medium">{getComponentLabel(status.component)}</div>
                        <div className="text-sm text-muted-foreground">{status.details}</div>
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
