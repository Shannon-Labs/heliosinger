import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useChangeTracking, ChangeInfo } from '@/hooks/use-change-tracking';
import type { ComprehensiveSpaceWeatherData } from '@shared/schema';

interface ChangeTrackerProps {
  data: ComprehensiveSpaceWeatherData | undefined;
  enabled?: boolean;
}

export function ChangeTracker({ data, enabled = true }: ChangeTrackerProps) {
  const { changes, hasChanges } = useChangeTracking(data, enabled);
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (changes.length > 0) {
      // Highlight changed fields
      const newFields = new Set(changes.map(c => c.field));
      setHighlightedFields(newFields);
      
      // Clear highlight after animation
      const timer = setTimeout(() => {
        setHighlightedFields(new Set());
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [changes]);

  if (!enabled || !hasChanges) {
    return null;
  }

  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      return value.toFixed(1);
    }
    return String(value);
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      velocity: 'Velocity',
      density: 'Density',
      bz: 'Bz',
      temperature: 'Temperature',
      kp: 'K-index',
      a_index: 'A-index',
      condition: 'Condition',
    };
    return labels[field] || field;
  };

  const getChangeIndicator = (change: ChangeInfo) => {
    if (change.delta !== undefined) {
      if (change.delta > 0) {
        return <span className="text-accent">↑</span>;
      } else if (change.delta < 0) {
        return <span className="text-destructive">↓</span>;
      }
    }
    return <span className="text-muted-foreground">→</span>;
  };

  return (
    <Card className="bg-accent/5 border-accent/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <i className="fas fa-sync-alt animate-spin text-accent" />
          Recent Updates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {changes.slice(0, 3).map((change, index) => (
            <div
              key={`${change.field}-${change.timestamp.getTime()}`}
              className={`flex items-center justify-between text-sm p-2 rounded transition-all ${
                highlightedFields.has(change.field)
                  ? 'bg-accent/20 animate-pulse'
                  : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {getChangeIndicator(change)}
                <span className="font-medium">{getFieldLabel(change.field)}:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground line-through">
                  {formatValue(change.previous)}
                </span>
                <span className="font-bold text-foreground">
                  {formatValue(change.current)}
                </span>
                {change.delta !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    {change.delta > 0 ? '+' : ''}{change.delta.toFixed(1)}
                  </Badge>
                )}
              </div>
            </div>
          ))}
          {changes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              No recent changes
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

