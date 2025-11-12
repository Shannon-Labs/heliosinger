import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

export function DataSourceAttribution() {
  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <i className="fas fa-database text-primary" />
          Data Sources
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Real-time Space Weather Data:</span>
            <ul className="list-disc list-inside ml-2 space-y-1 text-muted-foreground">
              <li>
                <a
                  href="https://www.swpc.noaa.gov/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  NOAA Space Weather Prediction Center
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.nesdis.noaa.gov/content/dscovr-deep-space-climate-observatory"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  DSCOVR L1 Lagrange Point Observatory
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Data updates adaptively based on space weather activity (10-120 seconds).
              All data is publicly available from NOAA's real-time monitoring systems.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

