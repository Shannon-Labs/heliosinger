import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function HardwareConfig() {
  const [firmwareCode, setFirmwareCode] = useState("");
  const [showFirmware, setShowFirmware] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch hardware configurations
  const { data: hardwareConfigs = [], isLoading } = useQuery({
    queryKey: ["/api/hardware/configs"]
  });

  // Fetch system status
  const { data: systemStatus = [] } = useQuery({
    queryKey: ["/api/system/status"]
  });

  // Generate firmware mutation
  const generateFirmwareMutation = useMutation({
    mutationFn: async (configId: string) => {
      const response = await apiRequest("POST", "/api/hardware/generate-firmware", { configId });
      return response.json();
    },
    onSuccess: (data) => {
      setFirmwareCode(data.firmware_code);
      setShowFirmware(true);
      toast({
        title: "Firmware Generated",
        description: "ESP32 firmware code has been generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate firmware code",
        variant: "destructive",
      });
    }
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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(firmwareCode);
      toast({
        title: "Copied to Clipboard",
        description: "Firmware code has been copied to your clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadFirmware = () => {
    const blob = new Blob([firmwareCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solar_wind_chime.ino';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Firmware file (solar_wind_chime.ino) has been downloaded",
    });
  };

  if (isLoading) {
    return (
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Hardware Configuration</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  // Initialize selected config when configs are loaded
  if (hardwareConfigs?.length && !selectedConfigId) {
    setSelectedConfigId(hardwareConfigs[0].id);
  }

  const selectedConfig = hardwareConfigs?.find(config => config.id === selectedConfigId) || hardwareConfigs?.[0];
  const chimeStatus = systemStatus?.find(s => s.component === 'chimes');
  const networkStatus = systemStatus?.find(s => s.component === 'network');

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold mb-6">Hardware Configuration</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ESP32 Configuration */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <i className="fas fa-microchip mr-2 text-primary" />
              Hardware Configuration
            </h3>
            
            {/* Device Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Device:</label>
              <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                <SelectTrigger data-testid="select-hardware-device">
                  <SelectValue placeholder="Choose hardware configuration" />
                </SelectTrigger>
                <SelectContent>
                  {hardwareConfigs?.map(config => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.device_name}
                      {config.device_name === "Solar Lighthouse Prototype" && (
                        <Badge variant="secondary" className="ml-2">New</Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedConfig ? (
              <div className="space-y-4">
                <div className="bg-secondary/30 rounded-lg p-4">
                  <div className="text-sm font-medium mb-2">Pin Configuration</div>
                  <div className="font-mono text-sm space-y-1">
                    <div>GPIO {selectedConfig.pin_velocity}: <span className="text-primary">Velocity Chime</span></div>
                    <div>GPIO {selectedConfig.pin_density}: <span className="text-accent">Density Chime</span></div>
                    <div>GPIO {selectedConfig.pin_bz}: <span className="text-warning">Bz Chime</span></div>
                    <div>GPIO {selectedConfig.pin_status_led}: <span className="text-muted-foreground">Status LED</span></div>
                    <div>GPIO {selectedConfig.pin_sda}: <span className="text-muted-foreground">SDA (I2C)</span></div>
                    <div>GPIO {selectedConfig.pin_scl}: <span className="text-muted-foreground">SCL (I2C)</span></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">WiFi Status:</span>
                    <Badge variant={networkStatus?.status === 'active' ? 'default' : 'destructive'}>
                      {networkStatus?.status === 'active' ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Firmware Version:</span>
                    <span className="text-muted-foreground font-mono">{selectedConfig.firmware_version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Update Interval:</span>
                    <span className="text-warning">{selectedConfig.update_interval}s</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => generateFirmwareMutation.mutate(selectedConfigId)}
                  disabled={generateFirmwareMutation.isPending}
                  data-testid="button-generate-firmware"
                >
                  <i className={`fas ${generateFirmwareMutation.isPending ? 'fa-spinner fa-spin' : 'fa-download'} mr-2`} />
                  {generateFirmwareMutation.isPending ? "Generating..." : "Generate Firmware Code"}
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <i className="fas fa-exclamation-triangle text-2xl mb-2" />
                <p>No hardware configuration found</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Chime Hardware Setup */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <i className="fas fa-bell mr-2 text-accent" />
              Chime Hardware Setup
            </h3>
            
            <div className="space-y-4">
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="text-sm font-medium mb-2">Component List</div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Magnetic Door Chimes</span>
                    <span className="text-primary">3x 5V</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aluminum Tubes</span>
                    <span className="text-accent">3x Different Lengths</span>
                  </div>
                  <div className="flex justify-between">
                    <span>18650 Li-ion Battery</span>
                    <span className="text-warning">3.7V 3000mAh</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Solar Panel</span>
                    <span className="text-muted-foreground">6V 1W</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-secondary/30 rounded-lg p-4 h-32 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <i className="fas fa-drafting-compass text-3xl mb-2" />
                  <div className="text-sm">Hardware Assembly Diagram</div>
                  <div className="text-xs">ESP32 → Solenoids → Chimes</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline"
                  onClick={() => testChimesMutation.mutate()}
                  disabled={testChimesMutation.isPending}
                  data-testid="button-test-chimes"
                >
                  <i className={`fas ${testChimesMutation.isPending ? 'fa-spinner fa-spin' : 'fa-play-circle'} mr-2`} />
                  Test Chimes
                </Button>
                
                <Button variant="outline" data-testid="button-download-guide">
                  <i className="fas fa-file-download mr-2" />
                  Assembly Guide
                </Button>
              </div>
              
              {chimeStatus && (
                <div className="text-xs text-muted-foreground bg-muted bg-opacity-20 p-2 rounded">
                  <strong>Status:</strong> {chimeStatus.details}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Firmware Code Dialog */}
      <Dialog open={showFirmware} onOpenChange={setShowFirmware}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Generated ESP32 Firmware Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Button onClick={copyToClipboard} variant="outline" size="sm" data-testid="button-copy-firmware">
                <i className="fas fa-copy mr-2" />
                Copy to Clipboard
              </Button>
              <Button onClick={downloadFirmware} variant="outline" size="sm" data-testid="button-download-firmware">
                <i className="fas fa-download mr-2" />
                Download .ino File
              </Button>
            </div>
            <Textarea
              value={firmwareCode}
              readOnly
              className="font-mono text-xs h-96 resize-none"
              placeholder="Generated firmware code will appear here..."
            />
            <div className="text-xs text-muted-foreground">
              <p><strong>Installation Instructions:</strong></p>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                <li>Install Arduino IDE and ESP32 board support</li>
                <li>Install required libraries: ArduinoJson, WiFi</li>
                <li>Copy this code to a new Arduino sketch</li>
                <li>Update WiFi credentials and upload to ESP32</li>
                <li>Connect hardware according to pin configuration</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
