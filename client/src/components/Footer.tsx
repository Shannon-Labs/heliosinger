import { Card } from '@/components/ui/card';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="font-semibold mb-4">Heliosinger</h4>
            <p className="text-sm text-muted-foreground">
              The sun sings space weather in real-time.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Data Sources</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>NOAA Space Weather Prediction Center</li>
              <li>DSCOVR L1 Lagrange Point Observatory</li>
              <li>Real-time solar wind plasma data</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Technology</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Web Audio API with formant filters</li>
              <li>Real-time data processing</li>
              <li>Vowel synthesis & harmonic series</li>
              <li>Space weather sonification</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border pt-8 mt-8">
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <div>© 2025 Heliosinger - The Sun Sings Space Weather</div>
            <div>
              Product of{' '}
              <span className="font-medium text-foreground">Shannon Labs, Inc.</span>
              {' '}designed by{' '}
              <a
                href="mailto:hunter@shannonlabs.dev"
                className="text-primary hover:underline font-medium"
              >
                Hunter Bown
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

