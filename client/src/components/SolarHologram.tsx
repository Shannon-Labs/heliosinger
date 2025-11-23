import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ComprehensiveSpaceWeatherData } from "@shared/schema";
import type { HeliosingerData } from "@/lib/heliosinger-mapping";

interface SolarHologramProps {
  data?: ComprehensiveSpaceWeatherData;
  heliosingerData?: HeliosingerData | null;
  isPlaying: boolean;
  mode?: "app" | "stream";
}

interface ParticleSystem {
  geometry: THREE.BufferGeometry;
  angles: Float32Array;
  radii: Float32Array;
  speeds: Float32Array;
  points: THREE.Points;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalize = (value: number, min: number, max: number) =>
  clamp((value - min) / (max - min), 0, 1);

/**
 * SolarHologram renders a lightweight Three.js scene that maps live space-weather
 * inputs to a 3D sun, corona, and particle stream so users can *see* the same
 * signals they're hearing from Heliosinger.
 */
export function SolarHologram({ data, heliosingerData, isPlaying, mode = "app" }: SolarHologramProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number>();
  const particleRef = useRef<ParticleSystem | null>(null);
  const materialsRef = useRef<{
    sun?: THREE.ShaderMaterial;
    corona?: THREE.ShaderMaterial;
    ring?: THREE.MeshBasicMaterial;
    wind?: THREE.PointsMaterial;
  }>({});
  const uniformsRef = useRef<{
    uTime: { value: number };
    uActivity: { value: number };
    uBz: { value: number };
    uBrightness: { value: number };
    uHueShift: { value: number };
  } | null>(null);
  const dynamicsRef = useRef({
    rotationVelocity: 0.004,
    windSpeed: 0.006,
  });
  const timeRef = useRef({ circadian: 0, minutes: 0 });
  const nowRef = useRef(Date.now());
  const [timeBeat, setTimeBeat] = useState(0);

  const stats = useMemo(() => {
    const wind = data?.solar_wind;
    const kp = data?.k_index?.kp ?? 0;
    const condition = heliosingerData?.condition ?? "quiet";

    return {
      velocity: wind?.velocity ?? 350,
      density: wind?.density ?? 5,
      bz: wind?.bz ?? 0,
      temperature: wind?.temperature ?? 100000,
      kp,
      condition,
    };
  }, [data, heliosingerData?.condition]);

  const cinema = useMemo(() => {
    const { velocity, density, bz, kp } = stats;
    const phase =
      kp >= 6
        ? "Auroral Hall"
        : kp >= 5
          ? "Stormfront"
          : velocity > 650
            ? "Rising Wind"
            : kp <= 2
              ? "Quiet Dawn"
              : "Glow Midday";

    const palette =
      phase === "Auroral Hall"
        ? "indigo sky, emerald aurora, amber sparks"
        : phase === "Stormfront"
          ? "amber and scarlet flares over deep navy"
          : phase === "Rising Wind"
            ? "cyan plasma over charcoal blue"
            : phase === "Quiet Dawn"
              ? "pre-dawn teal with soft gold rim"
              : "sapphire with lime glints";

    const tempo =
      phase === "Auroral Hall"
        ? "urgent, fluttering light"
        : phase === "Stormfront"
          ? "accelerating, percussive flares"
          : phase === "Rising Wind"
            ? "flowing dolly and orbit"
            : "slow, breathing camera";

    const shots = [
      {
        title: "Macro corona orbit",
        tie: `Velocity ${velocity.toFixed(0)} km/s sets orbit pace`,
      },
      {
        title: "Aurora ceiling",
        tie: `Kp ${kp.toFixed(1)} drives ribbon turbulence`,
      },
      {
        title: "Magnetic lines",
        tie: `Density ${density.toFixed(1)} p/cm³ thickens ribbons`,
      },
      {
        title: "Horizon flare",
        tie: `Bz ${bz > 0 ? "+" : ""}${bz.toFixed(1)} nT tilts warmth`,
      },
    ].slice(0, 2 + (kp >= 5 ? 2 : 1)); // show 3-4 quick cues

    const directorLine = [
      phase,
      "—",
      palette,
      "|",
      `Tempo: ${tempo}`,
      "|",
      `Data: V${velocity.toFixed(0)}km/s · ρ${density.toFixed(1)}p/cc · Bz ${
        bz > 0 ? "+" : ""
      }${bz.toFixed(1)} nT · Kp ${kp.toFixed(1)}`,
    ].join(" ");

    return { phase, palette, tempo, shots, directorLine };
  }, [stats]);

  // Keep a gentle circadian timer running so the hologram drifts over the day
  useEffect(() => {
    const updateClock = () => {
      nowRef.current = Date.now();
      const date = new Date(nowRef.current);
      const minutes = date.getHours() * 60 + date.getMinutes();
      const circadian = Math.sin((minutes / 1440) * Math.PI * 2);
      timeRef.current = { circadian, minutes };
      setTimeBeat((b) => (b + 1) % 2880); // minimal state tick to refresh materials/uniforms
    };
    updateClock();
    const id = setInterval(updateClock, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Build the Three.js scene once
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050915");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.5); // Moved back to give breathing room

    // Lights
    const keyLight = new THREE.PointLight(0xffffff, 2.6, 50);
    keyLight.position.set(5, 3, 6);
    scene.add(keyLight);
    scene.add(new THREE.AmbientLight(0x123444, 0.6));

    // Shared uniforms for shaders
    const uniforms = {
      uTime: { value: 0 },
      uActivity: { value: 0.5 },
      uBz: { value: 0 },
      uBrightness: { value: 0.5 },
      uHueShift: { value: 0.55 },
      uCircadian: { value: 0.0 },
      uChordTension: { value: 0.0 },
      uPulseStrength: { value: 0.0 },
    };
    uniformsRef.current = uniforms;

    // Group for rotation
    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    // Sun shader
    const sunMaterial = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      vertexShader: `
        uniform float uTime;
        uniform float uActivity;
        uniform float uPulseStrength;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float pulse = sin(uTime * 10.0) * uPulseStrength * 0.05;
          float noise = sin(position.y * 6.0 + uTime * 2.5) * 0.05 * (uActivity + uPulseStrength);
          vec3 displaced = position + normal * (noise + pulse);
          vNormal = normalMatrix * normal;
          vPosition = displaced;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uActivity;
        uniform float uBz;
        uniform float uBrightness;
        uniform float uHueShift;
        uniform float uCircadian;
        uniform float uChordTension;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        // Halftone pattern function
        float halftone(vec2 uv, float scale) {
          vec2 nearest = 2.0 * fract(uv * scale) - 1.0;
          float dist = length(nearest);
          return 1.0 - step(0.7, dist); // Hard dots
        }

        void main() {
          // View direction is effectively z-axis in view space
          float NdotV = dot(normalize(vNormal), vec3(0.0, 0.0, 1.0));
          
          // Activity drives the "turbulence" and threshold for bands
          float noise = sin(vPosition.y * 10.0 + uTime * 4.0) * cos(vPosition.x * 10.0 - uTime * 2.0) * 0.5 + 0.5;
          float intensity = NdotV + (noise * 0.2 * uActivity);
          
          // Cel Shading Steps (Quantize intensity)
          // Dark base -> Mid -> Highlight
          
          // Colors (Atlus Style: High Contrast Red/Black/Yellow)
          // Modify palette based on Chord Tension (Major=0 -> Gold/Red, Minor=0.5 -> Red/Blue, Dim=1.0 -> Purple/Black)
          
          vec3 colShadow = vec3(0.1, 0.0, 0.05); // Almost black red
          vec3 colMid = vec3(0.85, 0.1, 0.1);    // Vibrant Persona Red
          vec3 colHigh = vec3(1.0, 0.95, 0.0);   // Bright Yellow
          
          // Shift towards "Tension" Palette (Purples/Cyans for dissonance)
          if (uChordTension > 0.1) {
             colShadow = mix(colShadow, vec3(0.1, 0.0, 0.2), uChordTension);
             colMid = mix(colMid, vec3(0.6, 0.0, 0.8), uChordTension); // Red -> Purple
             colHigh = mix(colHigh, vec3(0.8, 0.9, 1.0), uChordTension); // Yellow -> Cyan/White
          }
          
          // Adjust colors based on Bz (Magnetic field)
          if (uBz < -5.0) {
             colMid = mix(colMid, vec3(0.9, 0.0, 0.0), 0.5); // More pure red
          }

          // 3-Step Cel Shade
          vec3 finalColor;
          if (intensity > 0.75) {
            finalColor = colHigh;
          } else if (intensity > 0.4) {
            finalColor = colMid;
          } else {
            finalColor = colShadow;
            
            // Apply halftone to shadow
            float dot = halftone(gl_FragCoord.xy / 1000.0, 80.0); // Screen space dots
            finalColor = mix(vec3(0.0), colShadow, dot);
          }
          
          // Rim light (sharp)
          float rim = 1.0 - NdotV;
          if (rim > 0.85) {
             finalColor = vec3(1.0, 1.0, 1.0);
          }

          // Flare/Activity overlay (Pop art style)
          float popNoise = step(0.95, noise * uActivity);
          finalColor = mix(finalColor, vec3(1.0, 1.0, 0.8), popNoise);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(1.5, 96, 96), sunMaterial);
    materialsRef.current.sun = sunMaterial;
    group.add(sun);

    // Corona glow
    const coronaMaterial = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: `
        uniform float uTime;
        uniform float uActivity;
        varying vec3 vNormal;
        void main() {
          float inflate = 0.1 + 0.15 * uActivity;
          vec3 displaced = position + normal * inflate;
          vNormal = normalMatrix * normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uActivity;
        uniform float uBz;
        uniform float uCircadian;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(1.0 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 1.2);
          float glow = intensity * (0.6 + uActivity * 1.2); // Increased glow intensity
          
          vec3 baseCoronaColor = mix(
            vec3(1.0, 0.5, 0.0), // Orange
            vec3(1.0, 0.8, 0.0), // Bright yellow
            uActivity
          );

          // Blend with Bz for magnetic influence (more red for southward, slight blue for northward)
          vec3 bzColor = mix(baseCoronaColor, vec3(1.0, 0.2, 0.0), max(0.0, -uBz * 0.8)); // Redder for negative Bz
          bzColor = mix(bzColor, vec3(0.8, 0.9, 1.0), max(0.0, uBz * 0.5)); // Bluer for positive Bz

          // Blend with circadian for diurnal shift (e.g., more orange/red during "day", deeper reds during "night")
          vec3 finalColor = mix(bzColor, vec3(0.8, 0.3, 0.0), 1.0 - uCircadian); // Deeper red for lower circadian

          gl_FragColor = vec4(finalColor, glow);
        }
      `,
    });
    const corona = new THREE.Mesh(new THREE.SphereGeometry(1.8, 64, 64), coronaMaterial);
    materialsRef.current.corona = coronaMaterial;
    group.add(corona);

    // Ring to hint at harmonic structure
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x00ffe1),
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      wireframe: true,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.06, 32, 180), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    materialsRef.current.ring = ringMaterial;
    group.add(ring);

    // Particle wind
    const particleCount = 520;
    const positions = new Float32Array(particleCount * 3);
    const angles = new Float32Array(particleCount);
    const radii = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const radius = 2.0 + Math.random() * 1.4;
      radii[i] = radius;
      angles[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.002 + Math.random() * 0.008;
      positions[i * 3] = Math.cos(angles[i]) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.9;
      positions[i * 3 + 2] = Math.sin(angles[i]) * radius;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffa000, // Bright orange-yellow
      size: 0.035,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const wind = new THREE.Points(particleGeometry, particleMaterial);
    materialsRef.current.wind = particleMaterial;
    particleRef.current = {
      geometry: particleGeometry,
      angles,
      radii,
      speeds,
      points: wind,
    };
    group.add(wind);

    const updateParticles = () => {
      if (!particleRef.current) return;
      const { geometry, angles, radii, speeds } = particleRef.current;
      const arr = geometry.getAttribute("position").array as Float32Array;
      const windSpeed = dynamicsRef.current.windSpeed;
      for (let i = 0; i < angles.length; i++) {
        angles[i] += speeds[i] + windSpeed;
        const idx = i * 3;
        arr[idx] = Math.cos(angles[i]) * radii[i];
        arr[idx + 1] = Math.sin(angles[i] * 0.6) * 0.35;
        arr[idx + 2] = Math.sin(angles[i]) * radii[i];
      }
      geometry.getAttribute("position").needsUpdate = true;
    };

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current) return;
      uniforms.uTime.value += 0.008 + dynamicsRef.current.windSpeed * 0.6;
      updateParticles();
      
      // Auto-rotate the entire group if playing (cinematic effect)
      if (isPlaying && groupRef.current) {
        groupRef.current.rotation.y += 0.002; // Slow rotation
        groupRef.current.rotation.z = Math.sin(uniforms.uTime.value * 0.1) * 0.05; // Subtle tilt
      } else {
        // Fallback rotation if not playing or just base rotation
        scene.rotation.y += dynamicsRef.current.rotationVelocity;
      }
      
      ring.rotation.z += 0.0015;
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!rendererRef.current || !mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      particleGeometry.dispose();
      particleMaterial.dispose();
    };
  }, []);

  // Push live data into the shader + particle parameters
  useEffect(() => {
    if (!uniformsRef.current) return;

    const velocityFactor = normalize(stats.velocity, 250, 850);
    const kpFactor = normalize(stats.kp, 0, 9);
    const densityFactor = normalize(stats.density, 1, 30);
    const bzNormalized = Math.tanh((stats.bz || 0) / 10);
    const vowelBrightness = heliosingerData?.currentVowel?.brightness ?? 0.5;
    const circadianNormalized = 0.5 + timeRef.current.circadian * 0.5; // 0..1 drift over the day

    uniformsRef.current.uActivity.value = 0.35 + kpFactor * 0.9 + densityFactor * 0.35;
    uniformsRef.current.uBz.value = bzNormalized;
    uniformsRef.current.uBrightness.value = vowelBrightness;
    uniformsRef.current.uHueShift.value =
      0.0 + (heliosingerData ? normalize(heliosingerData.midiNote, 36, 84) * 0.1 : 0.05);
    uniformsRef.current.uCircadian.value = circadianNormalized;

    // Update dynamic visual parameters
    const isMinor = heliosingerData?.chordQuality?.name?.includes("Minor") ?? false;
    const isDissonant = heliosingerData?.chordQuality?.name?.includes("Dissonant") ?? false;
    const tension = isDissonant ? 1.0 : isMinor ? 0.6 : 0.0;
    
    uniformsRef.current.uChordTension.value = tension;
    
    // Pulse strength from tremolo or Kp
    const pulse = heliosingerData?.tremoloDepth ? heliosingerData.tremoloDepth * 2.0 : 0.0;
    uniformsRef.current.uPulseStrength.value = pulse + (kpFactor * 0.5);

    dynamicsRef.current.rotationVelocity =
      0.001 + velocityFactor * 0.011 + kpFactor * 0.002 + (circadianNormalized - 0.5) * 0.003;
    dynamicsRef.current.windSpeed =
      0.0015 + velocityFactor * 0.02 + kpFactor * 0.003 + (circadianNormalized - 0.5) * 0.002;

    if (materialsRef.current.wind) {
      materialsRef.current.wind.size = 0.03 + kpFactor * 0.08;
      materialsRef.current.wind.color.setHSL(0.55 + bzNormalized * 0.12, 1, 0.6);
    }

    if (materialsRef.current.ring) {
      const hue = 0.1 + velocityFactor * 0.1 + (circadianNormalized - 0.5) * 0.05; // Base hue in orange/yellow range
      if (stats.bz < -3) {
        materialsRef.current.ring.color.setHSL(0.05, 0.9, 0.7); // More red-orange for negative Bz
      } else {
        materialsRef.current.ring.color.setHSL(hue, 0.9, 0.65); // Warm yellow/orange otherwise
      }
      materialsRef.current.ring.opacity = 0.25 + densityFactor * 0.3 + (1 - circadianNormalized) * 0.1;
    }

    if (materialsRef.current.corona) {
      materialsRef.current.corona.needsUpdate = true;
    }
  }, [stats, heliosingerData, timeBeat]);

  const vowelName = heliosingerData?.currentVowel?.displayName ?? "—";
  // Use the new chord quality metadata for display
  const chordLabel = heliosingerData?.chordQuality?.name 
    ? `${heliosingerData.chordQuality.name} (${heliosingerData.chordQuality.symbol})`
    : heliosingerData?.chordVoicing?.map((tone) => tone.noteName).join(" · ");

  const mappingRows = [
    {
      label: "Pitch",
      value: `${heliosingerData?.baseNote ?? "C3"}`,
      helper: "Solar wind velocity lifts the base pitch",
      amount: normalize(stats.velocity, 250, 850) * 100,
    },
    {
      label: "Vowel Color",
      value: vowelName,
      helper: "Density + Bz bend the sung vowel formants",
      amount: (heliosingerData?.currentVowel?.openness ?? 0.5) * 100,
    },
    {
      label: "Pulse",
      value: `Kp ${stats.kp.toFixed(1)}`,
      helper: "Geomagnetic storms add tremolo + flares",
      amount: normalize(stats.kp, 0, 9) * 100,
    },
    {
      label: "Harmony",
      value: chordLabel ?? "Waiting for harmony",
      helper: "Chord voicing widens with magnetic turbulence",
      amount: Math.min(100, (heliosingerData?.chordVoicing?.length ?? 1) / 8 * 100),
    },
  ];

  if (mode === "stream") {
    return (
      <div className="relative w-full h-full min-h-[500px] bg-black overflow-hidden group font-sans selection:bg-primary selection:text-black">
        <div
          ref={mountRef}
          className="absolute inset-0 bg-black/90"
          aria-label="3D solar visualization"
        />
        
        {/* Cinematic Vignette & Grain */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,black_120%)] opacity-80" />
        
        {/* Top Left: Solar Telemetry (Persona Style) */}
        <div className="absolute top-8 left-8 flex flex-col gap-1 items-start z-10 pointer-events-none">
           <div className="bg-white text-black px-4 py-0.5 -skew-x-12 border-l-8 border-primary shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-1">
             <span className="block text-lg font-black uppercase tracking-tighter skew-x-12">
               Solar Telemetry
             </span>
           </div>
           <div className="flex flex-col gap-2">
             {[
               { label: "VEL", val: stats.velocity.toFixed(0), unit: "KM/S" },
               { label: "DEN", val: stats.density.toFixed(1), unit: "P/CM³" },
               { label: "KP", val: stats.kp.toFixed(1), unit: "", alert: stats.kp >= 5 }
             ].map((item) => (
               <div key={item.label} className={`
                 flex items-center gap-4 px-4 py-1
                 ${item.alert ? 'bg-destructive text-white' : 'bg-black/90 text-white border border-white/20'}
                 -skew-x-12 border-l-4 border-white shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
               `}>
                 <span className="text-[10px] font-black tracking-widest skew-x-12 text-primary w-6">{item.label}</span>
                 <span className="text-xl font-black skew-x-12 font-mono tracking-tighter">{item.val}</span>
                 {item.unit && <span className="text-[10px] font-bold skew-x-12 opacity-60">{item.unit}</span>}
               </div>
             ))}
           </div>
        </div>

        {/* Top Right: Audio Synthesis (Persona Style) */}
        <div className="absolute top-8 right-8 flex flex-col gap-1 items-end z-10 pointer-events-none">
            <div className="bg-primary text-white px-4 py-0.5 skew-x-12 border-r-8 border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-1">
             <span className="block text-lg font-black uppercase tracking-tighter -skew-x-12">
               Audio Synthesis
             </span>
           </div>
           <div className="flex flex-col gap-2 items-end">
              <div className="bg-black/90 text-white px-6 py-1 skew-x-12 border-r-4 border-primary flex items-baseline gap-4">
                <span className="text-[10px] font-black tracking-widest -skew-x-12 text-primary">PITCH</span>
                <span className="text-xl font-black -skew-x-12 font-mono">{heliosingerData?.baseNote ?? "--"}</span>
              </div>
              <div className="bg-white/90 text-black px-6 py-1 skew-x-12 border-r-4 border-black flex items-baseline gap-4">
                <span className="text-[10px] font-black tracking-widest -skew-x-12 text-black/70">CHORD</span>
                <span className="text-xl font-black -skew-x-12 font-mono">
                  {heliosingerData?.chordQuality?.symbol ?? "..."}
                </span>
              </div>
              <div className="bg-destructive/90 text-white px-6 py-1 skew-x-12 border-r-4 border-black flex items-baseline gap-4">
                <span className="text-[10px] font-black tracking-widest -skew-x-12 text-white/70">VOWEL</span>
                <span className="text-xl font-black -skew-x-12 font-mono uppercase">{vowelName}</span>
              </div>
           </div>
        </div>

        {/* Background Pattern (Halftone/Dots) */}
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[length:20px_20px] z-0" />

        {/* Stream Overlay: Active Effects (RPG Buffs) */}
        <div className="absolute top-32 right-6 flex flex-col gap-2 items-end z-10 pointer-events-none">
           {heliosingerData?.vibratoDepth && heliosingerData.vibratoDepth > 0 ? (
             <div className="bg-black/80 text-white px-3 py-0.5 skew-x-12 border-r-4 border-white flex items-center gap-2 animate-in slide-in-from-right-4 fade-in">
               <span className="text-[10px] font-black tracking-widest -skew-x-12 text-primary">VIBRATO</span>
               <span className="text-xs font-bold -skew-x-12 text-white/80">LVL {heliosingerData.vibratoDepth}</span>
             </div>
           ) : null}
           {heliosingerData?.tremoloDepth && heliosingerData.tremoloDepth > 0.1 ? (
             <div className="bg-black/80 text-white px-3 py-0.5 skew-x-12 border-r-4 border-destructive flex items-center gap-2 animate-in slide-in-from-right-4 fade-in delay-75">
               <span className="text-[10px] font-black tracking-widest -skew-x-12 text-destructive">TREMOLO</span>
               <span className="text-xs font-bold -skew-x-12 text-white/80">{(heliosingerData.tremoloRate).toFixed(1)}HZ</span>
             </div>
           ) : null}
           {heliosingerData?.reverbRoomSize && heliosingerData.reverbRoomSize > 0.4 ? (
             <div className="bg-black/80 text-white px-3 py-0.5 skew-x-12 border-r-4 border-white flex items-center gap-2 animate-in slide-in-from-right-4 fade-in delay-100">
               <span className="text-[10px] font-black tracking-widest -skew-x-12 text-white/70">REVERB</span>
               <span className="text-xs font-bold -skew-x-12 text-white/80">{(heliosingerData.reverbRoomSize * 100).toFixed(0)}%</span>
             </div>
           ) : null}
           {heliosingerData?.binauralMix && heliosingerData.binauralMix > 0.05 ? (
             <div className="bg-white/90 text-black px-3 py-0.5 skew-x-12 border-r-4 border-black flex items-center gap-2 animate-in slide-in-from-right-4 fade-in delay-150">
               <span className="text-[10px] font-black tracking-widest -skew-x-12 text-black/70">BINAURAL</span>
               <span className="text-xs font-bold -skew-x-12">ACTIVE</span>
             </div>
           ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black p-1 border-l-4 border-primary shadow-[8px_8px_0px_rgba(0,0,0,0.5)] relative overflow-hidden">
       {/* Background Pattern */}
       <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[length:20px_20px] z-0" />

       {/* Header Block */}
       <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 px-4 pt-4">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-primary text-black flex items-center justify-center -skew-x-12 border-2 border-white shadow-[4px_4px_0px_rgba(255,255,255,0.1)]">
             <i className="fas fa-meteor text-xl skew-x-12" />
           </div>
           <div className="flex flex-col">
             <h2 className="text-2xl font-black uppercase tracking-tighter leading-none text-white">
               Solar Hologram
             </h2>
             <span className="text-xs font-bold text-primary tracking-[0.2em] uppercase">
               Visual Interface // {isPlaying ? "ONLINE" : "STANDBY"}
             </span>
           </div>
         </div>
         <div className={`
           px-4 py-1 -skew-x-12 border-2 border-white/20
           ${isPlaying ? 'bg-destructive/20 text-destructive' : 'bg-white/10 text-white/50'}
         `}>
           <span className="block text-xs font-black tracking-widest skew-x-12 uppercase">
             {isPlaying ? "Live Feed Active" : "Visual Mode Only"}
           </span>
         </div>
       </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 relative z-10 px-4 pb-4">
        {/* 3D Viewport */}
        <div className="relative border-4 border-white/10 bg-black/50 h-[320px] sm:h-[420px] overflow-hidden group shadow-inner">
           <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary z-20" />
           <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary z-20" />
           
          <div
            ref={mountRef}
            className="w-full h-full"
            aria-label="3D solar visualization"
          />
          
          {/* Viewport HUD Overlays */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-1 pointer-events-none">
            <div className="flex gap-2">
               <span className="bg-black text-white text-[10px] px-2 py-0.5 border border-white/20">V: {stats.velocity.toFixed(0)}</span>
               <span className="bg-black text-white text-[10px] px-2 py-0.5 border border-white/20">D: {stats.density.toFixed(1)}</span>
            </div>
            <div className="bg-primary/90 text-black text-xs font-black px-2 py-0.5 inline-block -skew-x-12 origin-bottom-left">
              <span className="skew-x-12 block">PHASE // {cinema.phase.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Stats Column */}
        <div className="space-y-6">
          {/* Status Header */}
          <div className="border-l-4 border-primary pl-4 py-1">
            <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-1">System Mood</p>
            <div className="text-2xl font-black text-white uppercase leading-none tracking-tight">
               {heliosingerData?.solarMood ?? "CALIBRATING..."}
            </div>
          </div>

          {/* Custom Semantic Widgets (Replacing generic bars) */}
          <div className="space-y-4">
            
            {/* Audio Core Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Pitch Widget */}
              <div className="bg-white/5 border-l-4 border-white p-2 -skew-x-6">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 skew-x-6">SONIC BASE</p>
                <div className="flex items-baseline gap-2 skew-x-6">
                  <span className="text-2xl font-black text-white font-mono">{heliosingerData?.baseNote ?? "--"}</span>
                  <span className="text-[10px] text-white/50 font-mono">{(heliosingerData?.frequency ?? 0).toFixed(0)}HZ</span>
                </div>
              </div>
              
              {/* Vowel Widget */}
              <div className="bg-white/5 border-r-4 border-destructive p-2 -skew-x-6 text-right">
                <p className="text-[10px] font-black text-destructive uppercase tracking-widest mb-1 skew-x-6">FORMANT</p>
                <div className="skew-x-6">
                  <span className="text-2xl font-black text-white font-mono">"{vowelName}"</span>
                </div>
              </div>
            </div>

            {/* Harmony Widget */}
            <div className="bg-white text-black p-3 -skew-x-6 border-l-8 border-black shadow-[4px_4px_0px_rgba(255,255,255,0.2)]">
               <div className="skew-x-6">
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] font-black tracking-[0.2em] uppercase">CHORD STRUCTURE</span>
                   <span className="text-[10px] font-bold bg-black text-white px-1">{(heliosingerData?.chordVoicing?.length ?? 0)} TONES</span>
                 </div>
                 <div className="text-2xl font-black font-mono leading-none tracking-tight">
                   {heliosingerData?.chordQuality?.symbol ?? "..."}
                 </div>
                 <div className="text-xs font-bold font-mono opacity-70 uppercase truncate">
                   {heliosingerData?.chordQuality?.name ?? "Scanning..."}
                 </div>
               </div>
            </div>

            {/* Stress/Activity Widget (Bar makes sense here) */}
            <div className="group">
                <div className="flex items-end justify-between mb-1">
                  <span className="text-xs font-bold text-destructive uppercase tracking-wider">GEOMAGNETIC STRESS</span>
                  <span className="text-sm font-mono font-bold text-white">Kp {stats.kp.toFixed(1)}</span>
                </div>
                <div className="h-4 bg-white/10 w-full -skew-x-12 border border-white/10 overflow-hidden relative">
                   <div 
                     className="h-full bg-gradient-to-r from-primary via-white to-destructive origin-left transition-all duration-700" 
                     style={{ width: `${normalize(stats.kp, 0, 9) * 100}%` }} 
                   />
                   {/* Hazard stripes */}
                   <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,rgba(0,0,0,0.5)_4px,rgba(0,0,0,0.5)_8px)]" />
                </div>
                <p className="text-[10px] text-white/40 mt-1 font-mono uppercase tracking-tight">
                  Planetary K-Index Load
                </p>
            </div>

          </div>

          {/* Director Cues (Compact) */}
          <div className="bg-white/5 border border-white/10 p-4 -skew-x-6 relative">
             <div className="absolute top-0 right-0 bg-destructive text-white text-[10px] font-bold px-2 py-0.5">
                LIVE CUES
             </div>
             <div className="skew-x-6">
                <div className="text-xs text-primary font-bold uppercase tracking-widest mb-2">
                  {cinema.palette}
                </div>
                <div className="text-sm text-white/80 font-mono leading-tight uppercase">
                  {cinema.directorLine}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
