import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEventHistory, formatRelativeTime, type SpaceWeatherEvent } from '@/hooks/use-event-history';
import type { ComprehensiveSpaceWeatherData } from '@shared/schema';

interface EventsTickerProps {
  currentData: ComprehensiveSpaceWeatherData | undefined;
  previousData: ComprehensiveSpaceWeatherData | undefined;
}

export function EventsTicker({ currentData, previousData }: EventsTickerProps) {
  const { events } = useEventHistory(currentData, previousData);

  if (events.length === 0) {
    return null;
  }

  const getEventIcon = (type: SpaceWeatherEvent['type']) => {
    switch (type) {
      case 'cme':
        return 'fas fa-sun';
      case 'condition_change':
        return 'fas fa-exchange-alt';
      case 'kp_threshold':
        return 'fas fa-chart-line';
      case 'velocity_spike':
        return 'fas fa-arrow-up';
      case 'bz_event':
        return 'fas fa-magnet';
      default:
        return 'fas fa-circle';
    }
  };

  const getEventColor = (type: SpaceWeatherEvent['type']) => {
    switch (type) {
      case 'cme':
        return 'text-warning';
      case 'condition_change':
        return 'text-primary';
      case 'kp_threshold':
        return 'text-accent';
      case 'velocity_spike':
        return 'text-primary';
      case 'bz_event':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getEventLabel = (type: SpaceWeatherEvent['type']) => {
    switch (type) {
      case 'cme':
        return 'CME Impact';
      case 'condition_change':
        return 'Condition Change';
      case 'kp_threshold':
        return 'K-index Threshold';
      case 'velocity_spike':
        return 'Velocity Spike';
      case 'bz_event':
        return 'Bz Event';
      default:
        return 'Event';
    }
  };

  const latestEvent = events[0];

  return (
    <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border-primary/20">
      <CardContent className="p-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`flex-shrink-0 ${getEventColor(latestEvent.type)}`}>
            <i className={`${getEventIcon(latestEvent.type)} text-lg`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {getEventLabel(latestEvent.type)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {latestEvent.description}
              </span>
              {latestEvent.details?.currentValue && (
                <span className="text-xs font-mono text-foreground">
                  {latestEvent.details.currentValue}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(latestEvent.timestamp)}
              </span>
            </div>
            {latestEvent.type === 'cme' && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                Listen to the after-effects in the sun's voice
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

