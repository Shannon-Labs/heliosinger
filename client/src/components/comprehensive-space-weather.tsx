import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComprehensiveSpaceWeatherData } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function ComprehensiveSpaceWeather() {
  const { data: spaceWeather, isLoading } = useQuery<ComprehensiveSpaceWeatherData>({
    queryKey: ["/api/space-weather/comprehensive"],
    queryFn: () => apiRequest("GET", "/api/space-weather/comprehensive"),
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comprehensive Space Weather</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!spaceWeather) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No space weather data available</p>
        </CardContent>
      </Card>
    );
  }

  const getKIndexColor = (kp: number) => {
    if (kp <= 2) return "bg-green-500/20 text-green-500";
    if (kp <= 4) return "bg-yellow-500/20 text-yellow-500";
    if (kp <= 6) return "bg-orange-500/20 text-orange-500";
    return "bg-red-500/20 text-red-500";
  };

  const getKIndexLabel = (kp: number) => {
    if (kp <= 2) return "Quiet";
    if (kp <= 4) return "Unsettled";
    if (kp <= 6) return "Storm";
    return "Severe Storm";
  };

  const getFlareClassColor = (flareClass?: string) => {
    if (!flareClass) return "bg-muted/20 text-muted-foreground";
    const firstChar = flareClass[0];
    if (firstChar === 'X') return "bg-red-500/20 text-red-500";
    if (firstChar === 'M') return "bg-orange-500/20 text-orange-500";
    if (firstChar === 'C') return "bg-yellow-500/20 text-yellow-500";
    return "bg-muted/20 text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <i className="fas fa-satellite-dish" />
          Comprehensive Space Weather
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Solar Wind */}
        {spaceWeather.solar_wind && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Solar Wind</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Velocity</div>
                <div className="text-lg font-bold">{spaceWeather.solar_wind.velocity.toFixed(1)} km/s</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Density</div>
                <div className="text-lg font-bold">{spaceWeather.solar_wind.density.toFixed(2)} p/cm³</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Bz</div>
                <div className="text-lg font-bold">{spaceWeather.solar_wind.bz.toFixed(1)} nT</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Temperature</div>
                <div className="text-lg font-bold">{(spaceWeather.solar_wind.temperature / 1000).toFixed(0)}k K</div>
              </div>
            </div>
          </div>
        )}

        {/* K-index */}
        {spaceWeather.k_index && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Geomagnetic Activity (K-index)</h3>
            <div className="flex items-center gap-4">
              <Badge className={getKIndexColor(spaceWeather.k_index.kp)}>
                Kp: {spaceWeather.k_index.kp.toFixed(1)}
              </Badge>
              <span className="text-sm">{getKIndexLabel(spaceWeather.k_index.kp)}</span>
              <span className="text-xs text-muted-foreground">
                A-index: {spaceWeather.k_index.a_running}
              </span>
            </div>
          </div>
        )}

        {/* X-ray Flux */}
        {spaceWeather.xray_flux && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Solar X-ray Flux</h3>
            <div className="flex items-center gap-4 flex-wrap">
              {spaceWeather.xray_flux.short_wave && (
                <div>
                  <div className="text-xs text-muted-foreground">Short Wave (0.05-0.4nm)</div>
                  <div className="text-lg font-bold">
                    {(spaceWeather.xray_flux.short_wave * 1e9).toFixed(2)} nW/m²
                  </div>
                </div>
              )}
              {spaceWeather.xray_flux.long_wave && (
                <div>
                  <div className="text-xs text-muted-foreground">Long Wave (0.1-0.8nm)</div>
                  <div className="text-lg font-bold">
                    {(spaceWeather.xray_flux.long_wave * 1e9).toFixed(2)} nW/m²
                  </div>
                </div>
              )}
              {spaceWeather.xray_flux.flare_class && (
                <Badge className={getFlareClassColor(spaceWeather.xray_flux.flare_class)}>
                  {spaceWeather.xray_flux.flare_class} Class Flare
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Proton Flux */}
        {spaceWeather.proton_flux && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Proton Flux (Radiation)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">10 MeV</div>
                <div className="text-lg font-bold">
                  {spaceWeather.proton_flux.flux_10mev.toExponential(2)} pfu
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">50 MeV</div>
                <div className="text-lg font-bold">
                  {spaceWeather.proton_flux.flux_50mev.toExponential(2)} pfu
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">100 MeV</div>
                <div className="text-lg font-bold">
                  {spaceWeather.proton_flux.flux_100mev.toExponential(2)} pfu
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Electron Flux */}
        {spaceWeather.electron_flux && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Electron Flux</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">2 MeV</div>
                <div className="text-lg font-bold">
                  {spaceWeather.electron_flux.flux_2mev.toExponential(2)} efu
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">0.8 MeV</div>
                <div className="text-lg font-bold">
                  {spaceWeather.electron_flux.flux_0_8mev.toExponential(2)} efu
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Magnetometer */}
        {spaceWeather.magnetometer && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Boulder Magnetometer</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">H Component</div>
                <div className="text-lg font-bold">
                  {spaceWeather.magnetometer.h_component.toFixed(1)} nT
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">D Component</div>
                <div className="text-lg font-bold">
                  {spaceWeather.magnetometer.d_component.toFixed(1)} nT
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Z Component</div>
                <div className="text-lg font-bold">
                  {spaceWeather.magnetometer.z_component.toFixed(1)} nT
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-4 border-t">
          Last updated: {new Date(spaceWeather.timestamp).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

