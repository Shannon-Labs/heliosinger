import { Card } from '@/components/ui/card';

export function Footer() {
  return (
    <footer className="border-t-4 border-primary bg-black text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-5 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[length:22px_22px]" />
      <div className="container mx-auto px-4 py-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border-2 border-white/20 p-4 -skew-x-6 bg-black/70 shadow-[6px_6px_0px_rgba(0,0,0,0.6)]">
            <h4 className="font-black mb-3 uppercase tracking-widest text-primary skew-x-6">Mission</h4>
            <p className="text-sm text-white/70 skew-x-6">
              The sun sings space weather in real-time—hear every surge and calm.
            </p>
          </div>
          
          <div className="border-2 border-white/20 p-4 -skew-x-6 bg-black/70 shadow-[6px_6px_0px_rgba(0,0,0,0.6)]">
            <h4 className="font-black mb-3 uppercase tracking-widest text-primary skew-x-6">Data Sources</h4>
            <ul className="text-sm text-white/70 space-y-1 skew-x-6">
              <li>NOAA Space Weather Prediction Center</li>
              <li>DSCOVR L1 Lagrange Point Observatory</li>
              <li>Real-time solar wind plasma data</li>
            </ul>
          </div>
          
          <div className="border-2 border-white/20 p-4 -skew-x-6 bg-black/70 shadow-[6px_6px_0px_rgba(0,0,0,0.6)]">
            <h4 className="font-black mb-3 uppercase tracking-widest text-primary skew-x-6">Technology</h4>
            <ul className="text-sm text-white/70 space-y-1 skew-x-6">
              <li>Web Audio API with formant filters</li>
              <li>Real-time data processing</li>
              <li>Vowel synthesis & harmonic series</li>
              <li>Space weather sonification</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t-2 border-white/20 pt-8 mt-8 text-center text-sm text-white/60 space-y-2">
          <div>© 2025 Heliosinger — Shannon Labs, Inc.</div>
          <div className="flex items-center justify-center gap-4 pt-2">
            <a
              href="https://github.com/Shannon-Labs/heliosinger"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-primary transition-colors flex items-center gap-1"
              aria-label="GitHub repository"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span>GitHub</span>
            </a>
            <a
              href="https://x.com/huntermbown"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-primary transition-colors flex items-center gap-1"
              aria-label="X (Twitter) profile"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>X</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
