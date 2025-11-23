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
    camera.position.set(0, 0, 6);

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
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float noise = sin(position.y * 6.0 + uTime * 2.5) * 0.05 * uActivity;
          vec3 displaced = position + normal * noise;
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
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        // Simple hue rotation (optimized for warmer base)
        vec3 hueShift(vec3 color, float shift) {
          float C = 1.0 - abs(mod(shift / 60.0, 2.0) - 1.0);
          float X = C * (1.0 - abs(mod(shift / 60.0, 2.0) - 1.0));
          vec3 K = vec3(0.0);
          if (shift >= 0.0 && shift < 60.0) K = vec3(C, X, 0.0);
          else if (shift >= 60.0 && shift < 120.0) K = vec3(X, C, 0.0);
          else if (shift >= 120.0 && shift < 180.0) K = vec3(0.0, C, X);
          else if (shift >= 180.0 && shift < 240.0) K = vec3(0.0, X, C);
          else if (shift >= 240.0 && shift < 300.0) K = vec3(X, 0.0, C);
          else if (shift >= 300.0 && shift < 360.0) K = vec3(C, 0.0, X);

          float m = 0.5; // Simplistic lightness
          return (color + m);
        }
        
        void main() {
          float fresnel = pow(1.0 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 2.0);
          float flare = sin(vPosition.y * 8.0 + uTime * 3.5) * 0.5 + 0.5;
          float activity = mix(0.45, 1.3, uActivity); // Slightly increased base activity
          
          vec3 baseColor = mix(
            vec3(0.9, 0.3, 0.05), // Deep fiery red-orange
            vec3(1.0, 0.6 + uBrightness * 0.2, 0.1), // Bright yellow-orange
            activity
          );
          
          // Apply hue shift based on overall system state and circadian rhythm
          // This hueShift is simplified for direct color manipulation now
          // For actual hue shift, need to convert RGB to HSL/HSV, shift H, then back to RGB
          // For now, let's just adjust based on a fixed warm range
          vec3 finalBase = baseColor;
          finalBase.r = clamp(finalBase.r + uHueShift * 0.5 - 0.2 + uCircadian * 0.1, 0.0, 1.0);
          finalBase.g = clamp(finalBase.g + uHueShift * 0.3 - 0.1 + uCircadian * 0.05, 0.0, 1.0);
          finalBase.b = clamp(finalBase.b + uHueShift * 0.1 - 0.05 + uCircadian * 0.02, 0.0, 1.0);


          vec3 color = finalBase + fresnel * 0.7 + flare * 0.45 * activity; // Increased fresnel and flare

          // Bz pushes warmer when southward, cooler when northward
          color.r += max(0.0, -uBz) * 0.6; // Stronger red push
          color.b += max(0.0, uBz) * 0.5; // Stronger blue push
          
          gl_FragColor = vec4(color, 1.0);
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
      0.0 + (heliosingerData ? normalize(heliosingerData.midiNote, 36, 84) * 0.1 : 0.05); // Smaller hue shifts on an already warm base
    uniformsRef.current.uCircadian.value = circadianNormalized;

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
  const chordLabel = heliosingerData?.chordVoicing
    ?.map((tone) => tone.noteName)
    .join(" · ");

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
        
        {/* Stream Overlay: Top Left - Stats (Persona Style) */}
        <div className="absolute top-8 left-8 flex flex-col gap-4 z-10 pointer-events-none">
           {/* Header */}
           <div className="bg-white text-black px-6 py-2 -skew-x-12 origin-top-left border-l-8 border-primary shadow-[4px_4px_0px_rgba(0,0,0,1)]">
             <span className="block text-2xl font-black uppercase tracking-tighter skew-x-12">
               Solar Operations
             </span>
           </div>

           {/* Stat Block */}
           <div className="flex flex-col gap-2 items-start pl-2">
             {[
               { label: "VELOCITY", val: stats.velocity.toFixed(0), unit: "KM/S" },
               { label: "DENSITY", val: stats.density.toFixed(1), unit: "P/CM³" },
               { label: "KP INDEX", val: stats.kp.toFixed(1), unit: "", alert: stats.kp >= 5 }
             ].map((item) => (
               <div key={item.label} className={`
                 flex items-center gap-4 px-6 py-1
                 ${item.alert ? 'bg-destructive text-white' : 'bg-black/80 text-white border border-white/20'}
                 -skew-x-12 border-l-4 border-white shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
                 transition-all duration-300 hover:translate-x-2
               `}>
                 <span className="text-xs font-black tracking-widest skew-x-12 w-16 text-primary">{item.label}</span>
                 <span className="text-xl font-black skew-x-12 font-mono tracking-tighter">{item.val}</span>
                 <span className="text-xs font-bold skew-x-12 opacity-60">{item.unit}</span>
               </div>
             ))}
           </div>
        </div>

        {/* Stream Overlay: Bottom Right - Director Cues (Persona Style) */}
        <div className="absolute bottom-24 right-8 z-10 pointer-events-none max-w-md text-right flex flex-col items-end gap-2">
           <div className="bg-black text-white px-4 py-1 skew-x-12 border-r-4 border-primary">
             <span className="block text-xs font-bold uppercase tracking-widest -skew-x-12">
               Current Phase // {vowelName}
             </span>
           </div>
           
           <div className="bg-white/95 text-black p-6 skew-x-12 shadow-[8px_8px_0px_rgba(0,0,0,0.8)] border-2 border-black relative max-w-sm">
              {/* Decor elements */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-destructive border-2 border-black" />
              <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-primary border-2 border-black" />
              
              <div className="-skew-x-12">
                <h3 className="text-3xl font-black uppercase leading-none mb-2 tracking-tighter text-black">
                  {cinema.phase}
                </h3>
                <p className="text-sm font-bold font-mono leading-tight uppercase opacity-80">
                  {cinema.directorLine}
                </p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-primary/30 shadow-2xl">
      <CardHeader className="flex flex-col gap-2">
        <CardTitle className="flex items-center gap-3 text-lg md:text-xl font-display">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
            <i className="fas fa-meteor" />
          </span>
          Solar Hologram — Hear & See the Sun
          <Badge variant={isPlaying ? "default" : "secondary"} className="ml-auto">
            {isPlaying ? "Live Audio + Visual" : "Visual Only"}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A 3D solar body driven by live space-weather: velocity spins the surface, Bz tilts the
          color, Kp ignites the corona, and density thickens the solar-wind stream you hear.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-center">
        <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-b from-slate-900/80 via-slate-900/50 to-black/60 overflow-hidden shadow-lg">
          <div
            ref={mountRef}
            className="w-full h-[320px] sm:h-[420px] bg-slate-950/70 backdrop-blur-sm"
            aria-label="3D solar visualization"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute left-4 right-4 bottom-4 flex flex-wrap items-center gap-3 text-xs">
            <Badge variant="outline" className="bg-background/60 backdrop-blur px-3">
              {stats.velocity.toFixed(0)} km/s · {stats.density.toFixed(1)} p/cm³
            </Badge>
            <Badge variant="outline" className="bg-background/60 backdrop-blur px-3">
              Bz {stats.bz > 0 ? "+" : ""}
              {stats.bz.toFixed(1)} nT
            </Badge>
            <Badge
              variant={stats.kp >= 5 ? "destructive" : stats.kp >= 3 ? "secondary" : "default"}
              className="bg-background/60 backdrop-blur px-3"
            >
              Kp {stats.kp.toFixed(1)}
            </Badge>
            <Badge variant="outline" className="bg-background/60 backdrop-blur px-3">
              Vowel "{vowelName}"
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-inner">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Sonification Map</p>
                <p className="text-sm text-muted-foreground">
                  How today&apos;s data sculpts both the sound and the hologram.
                </p>
              </div>
              <Badge variant="secondary" className="border-primary/40">
                {heliosingerData?.solarMood ?? "Calibrating..."}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            {mappingRows.map((row) => (
              <div
                key={row.label}
                className="rounded-lg border border-border/50 bg-background/60 p-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{row.label}</div>
                  <div className="text-sm text-primary font-mono">{row.value}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{row.helper}</p>
                <div className="mt-2">
                  <Progress value={row.amount} className="h-2" />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Director cues (live)</div>
              <Badge variant="secondary" className="text-[11px]">Scene: {cinema.phase}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="bg-background/60">Palette: {cinema.palette}</Badge>
              <Badge variant="outline" className="bg-background/60">Tempo: {cinema.tempo}</Badge>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              {cinema.directorLine}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {cinema.shots.map((shot) => (
                <Badge key={shot.title} variant="outline" className="bg-background/70">
                  {shot.title} · {shot.tie}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
