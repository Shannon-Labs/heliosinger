import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ComprehensiveSpaceWeatherData } from '@shared/schema';
import { useChangeTracking } from '@/hooks/use-change-tracking';

interface EnhancedSpaceWeatherVizProps {
  data: ComprehensiveSpaceWeatherData | undefined;
}

export function EnhancedSpaceWeatherViz({ data }: EnhancedSpaceWeatherVizProps) {
  const { changes } = useChangeTracking(data);
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
  const velocityHistoryRef = useRef<number[]>([]);
  const maxHistoryLength = 20;

  useEffect(() => {
    if (data?.solar_wind?.velocity) {
      velocityHistoryRef.current = [
        ...velocityHistoryRef.current,
        data.solar_wind.velocity,
      ].slice(-maxHistoryLength);
    }
  }, [data?.solar_wind?.velocity]);

  useEffect(() => {
    if (changes.length > 0) {
      const newFields = new Set(changes.map(c => c.field));
      setHighlightedFields(newFields);
      const timer = setTimeout(() => setHighlightedFields(new Set()), 2000);
      return () => clearTimeout(timer);
    }
  }, [changes]);

  if (!data?.solar_wind) {
    return null;
  }

  const { velocity, density, bz, temperature } = data.solar_wind;
  const kp = data.k_index?.kp || 0;

  const getVelocityColor = (v: number) => {
    if (v < 400) return 'text-green-500';
    if (v < 600) return 'text-yellow-500';
    if (v < 750) return 'text-orange-500';
    return 'text-red-500';
  };

  const getDensityColor = (d: number) => {
    if (d < 3) return 'text-green-500';
    if (d < 8) return 'text-yellow-500';
    if (d < 15) return 'text-orange-500';
    return 'text-red-500';
  };

  const getBzColor = (bz: number) => {
    if (bz > 5) return 'text-blue-500';
    if (bz > -5) return 'text-muted-foreground';
    return 'text-red-500';
  };

  const getBzDirection = (bz: number) => {
    if (bz > 5) return 'Northward (quiet)';
    if (bz > -5) return 'Neutral';
    return 'Southward (geoeffective)';
  };

  const getKpColor = (kp: number) => {
    if (kp <= 2) return 'bg-green-500/20 text-green-500 border-green-500/30';
    if (kp <= 4) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    if (kp <= 6) return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    return 'bg-red-500/20 text-red-500 border-red-500/30';
  };

  const getKpLabel = (kp: number) => {
    if (kp <= 2) return 'Quiet';
    if (kp <= 4) return 'Unsettled';
    if (kp <= 6) return 'Storm';
    return 'Severe Storm';
  };

  // Calculate velocity trend
  const velocityTrend = velocityHistoryRef.current.length >= 2
    ? velocityHistoryRef.current[velocityHistoryRef.current.length - 1] -
      velocityHistoryRef.current[velocityHistoryRef.current.length - 2]
    : 0;

  const isHighlighted = (field: string) => highlightedFields.has(field);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <i className="fas fa-chart-line text-primary" />
          Enhanced Space Weather Visualizations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Velocity with trend */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Solar Wind Velocity</h3>
            {velocityTrend !== 0 && (
              <Badge variant="outline" className="text-xs">
                {velocityTrend > 0 ? '↑' : '↓'} {Math.abs(velocityTrend).toFixed(1)} km/s
              </Badge>
            )}
          </div>
          <div
            className={`p-4 rounded-lg border-2 transition-all ${
              isHighlighted('velocity')
                ? 'bg-accent/20 border-accent animate-pulse'
                : 'bg-muted/30 border-border'
            }`}
          >
            <div className={`text-3xl font-bold ${getVelocityColor(velocity)}`}>
              {velocity.toFixed(1)} km/s
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {velocity < 400 && 'Slow - quiet conditions'}
              {velocity >= 400 && velocity < 600 && 'Moderate - normal activity'}
              {velocity >= 600 && velocity < 750 && 'Fast - active conditions'}
              {velocity >= 750 && 'Very fast - storm conditions'}
            </div>
            {/* Simple trend visualization */}
            {velocityHistoryRef.current.length >= 2 && (
              <div className="mt-3 h-8 flex items-end gap-1">
                {velocityHistoryRef.current.slice(-10).map((v, i) => {
                  const maxV = Math.max(...velocityHistoryRef.current);
                  const minV = Math.min(...velocityHistoryRef.current);
                  const height = ((v - minV) / (maxV - minV || 1)) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-primary/30 rounded-t transition-all"
                      style={{ height: `${Math.max(height, 10)}%` }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Density */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Particle Density</h3>
          <div
            className={`p-4 rounded-lg border-2 transition-all ${
              isHighlighted('density')
                ? 'bg-accent/20 border-accent animate-pulse'
                : 'bg-muted/30 border-border'
            }`}
          >
            <div className={`text-3xl font-bold ${getDensityColor(density)}`}>
              {density.toFixed(2)} p/cm³
            </div>
            {/* Density gauge visualization */}
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  density < 3 ? 'bg-green-500' :
                  density < 8 ? 'bg-yellow-500' :
                  density < 15 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min((density / 20) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bz with direction */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Magnetic Field (Bz)</h3>
          <div
            className={`p-4 rounded-lg border-2 transition-all ${
              isHighlighted('bz')
                ? 'bg-accent/20 border-accent animate-pulse'
                : 'bg-muted/30 border-border'
            }`}
          >
            <div className={`text-3xl font-bold ${getBzColor(bz)}`}>
              {bz > 0 ? '+' : ''}{bz.toFixed(1)} nT
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {getBzDirection(bz)}
            </div>
            {/* Bz direction indicator */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1 bg-muted rounded-full relative">
                <div
                  className={`absolute top-0 h-full w-1 transition-all ${
                    bz > 0 ? 'bg-blue-500' : bz < -5 ? 'bg-red-500' : 'bg-muted-foreground'
                  }`}
                  style={{
                    left: `${Math.min(Math.max(((bz + 30) / 60) * 100, 0), 100)}%`,
                  }}
                />
              </div>
              <div className="text-xs text-muted-foreground w-20 text-right">
                {bz < -5 && 'Geoeffective'}
                {bz >= -5 && bz <= 5 && 'Neutral'}
                {bz > 5 && 'Northward'}
              </div>
            </div>
          </div>
        </div>

        {/* K-index */}
        {data.k_index && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Geomagnetic Activity (K-index)</h3>
            <div
              className={`p-4 rounded-lg border-2 transition-all ${
                isHighlighted('kp')
                  ? 'bg-accent/20 border-accent animate-pulse'
                  : getKpColor(kp)
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">Kp {kp.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {getKpLabel(kp)}
                  </div>
                </div>
                <Badge className={getKpColor(kp)}>
                  {getKpLabel(kp)}
                </Badge>
              </div>
              {/* K-index scale */}
              <div className="mt-3 flex items-center gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                  <div
                    key={level}
                    className={`flex-1 h-2 rounded transition-all ${
                      level <= kp
                        ? level <= 2 ? 'bg-green-500' :
                          level <= 4 ? 'bg-yellow-500' :
                          level <= 6 ? 'bg-orange-500' : 'bg-red-500'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Temperature */}
        {temperature && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Temperature</h3>
            <div
              className={`p-4 rounded-lg border-2 transition-all ${
                isHighlighted('temperature')
                  ? 'bg-accent/20 border-accent animate-pulse'
                  : 'bg-muted/30 border-border'
              }`}
            >
              <div className="text-3xl font-bold">
                {(temperature / 1000).toFixed(0)}k K
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {temperature < 100000 && 'Cool'}
                {temperature >= 100000 && temperature < 200000 && 'Moderate'}
                {temperature >= 200000 && 'Hot'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

