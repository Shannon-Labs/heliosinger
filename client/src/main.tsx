import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const cfBeaconToken = import.meta.env.VITE_CF_BEACON_TOKEN;
if (import.meta.env.PROD && cfBeaconToken) {
  const existing = document.querySelector("script[data-cf-beacon]");
  if (!existing) {
    const script = document.createElement("script");
    script.defer = true;
    script.src = "https://static.cloudflareinsights.com/beacon.min.js";
    script.setAttribute("data-cf-beacon", JSON.stringify({ token: cfBeaconToken }));
    document.head.appendChild(script);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
