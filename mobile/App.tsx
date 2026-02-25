import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import type {
  DevicePreferencesRequest,
  FlareTimelineItem,
  LearningCard,
  SpaceWeatherNowResponse,
} from "@heliosinger/core";
import { TabButton } from "./src/components/TabButton";
import { SectionCard } from "./src/components/SectionCard";
import { StatePanel } from "./src/components/StatePanel";
import {
  fetchFlares,
  fetchLearningCards,
  fetchNow,
  registerDevice,
  unregisterDevice,
  updatePreferences,
} from "./src/lib/api";
import {
  clearPushToken,
  getInstallId,
  loadFlares,
  loadLearning,
  loadNow,
  loadPreferences,
  loadPushToken,
  saveFlares,
  saveLearning,
  saveNow,
  savePreferences,
  savePushToken,
} from "./src/lib/storage";
import { requestPushToken } from "./src/lib/notifications";
import {
  nowToAudioParams,
  pauseAudio,
  setAudioVolume,
  setBackgroundMode,
  startAudio,
  stopAudio,
  updateAudio,
} from "./src/lib/audio";
import {
  hapticError,
  hapticPrimaryAction,
  hapticTabSwitch,
  hapticToggle,
} from "./src/lib/haptics";
import { tokens } from "./src/theme/tokens";

type Tab = "listen" | "flares" | "learn" | "settings";

const DEFAULT_PREFERENCES = (installId: string): DevicePreferencesRequest => ({
  installId,
  alertsEnabled: true,
  thresholds: {
    kp: 5,
    bzSouth: 8,
    flareClasses: ["M", "X"],
  },
  quietHours: {
    enabled: false,
    startHour: 22,
    endHour: 7,
  },
  backgroundAudioEnabled: true,
  updatedAt: new Date().toISOString(),
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function shiftHour(hour: number, delta: number): number {
  return (hour + delta + 24) % 24;
}

function formatSyncTimestamp(input: string | null): string {
  if (!input) return "Never";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function resolveTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function AnimatedSection({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: tokens.motion.normal,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: tokens.motion.normal,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function Badge({ label, tone = "muted" }: { label: string; tone?: "muted" | "alert" | "good" }) {
  return (
    <View
      style={[
        styles.badge,
        tone === "alert" ? styles.badgeAlert : null,
        tone === "good" ? styles.badgeGood : null,
      ]}
    >
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("listen");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [now, setNow] = useState<SpaceWeatherNowResponse | null>(null);
  const [flares, setFlares] = useState<FlareTimelineItem[]>([]);
  const [learning, setLearning] = useState<LearningCard[]>([]);

  const [installId, setInstallId] = useState<string>("");
  const [pushToken, setPushToken] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<DevicePreferencesRequest | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<string | null>(null);
  const [nextRetryAt, setNextRetryAt] = useState<number | null>(null);
  const [clockTick, setClockTick] = useState(0);
  const [registrationState, setRegistrationState] = useState<"idle" | "syncing" | "removed">("idle");

  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptsRef = useRef(0);
  const lastRegistrationSignatureRef = useRef<string | null>(null);
  const registrationInFlightRef = useRef(false);

  const platform = Platform.OS === "android" || Platform.OS === "ios" ? Platform.OS : null;

  const clearRetrySchedule = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setNextRetryAt(null);
  }, []);

  const scheduleRetry = useCallback(
    (refresh: () => Promise<void>) => {
      if (retryTimeoutRef.current) return;
      const delayMs = Math.min(300000, 5000 * 2 ** retryAttemptsRef.current);
      retryAttemptsRef.current += 1;
      setNextRetryAt(Date.now() + delayMs);
      retryTimeoutRef.current = setTimeout(() => {
        retryTimeoutRef.current = null;
        refresh().catch(() => undefined);
      }, delayMs);
    },
    []
  );

  const timezone = resolveTimezone();

  const refreshData = useCallback(async () => {
    setSyncing(true);

    try {
      const [latestNow, latestFlares, latestLearning] = await Promise.all([
        fetchNow(),
        fetchFlares(50),
        fetchLearningCards(),
      ]);

      setNow(latestNow);
      setFlares(latestFlares);
      setLearning(latestLearning);
      setError(null);
      setLastSuccessfulSyncAt(latestNow.lastUpdatedAt ?? new Date().toISOString());
      retryAttemptsRef.current = 0;
      clearRetrySchedule();

      await Promise.all([saveNow(latestNow), saveFlares(latestFlares), saveLearning(latestLearning)]);
    } catch {
      const [cachedNow, cachedFlares, cachedLearning] = await Promise.all([
        loadNow(),
        loadFlares(),
        loadLearning(),
      ]);

      if (cachedNow) {
        setNow({ ...cachedNow, source: "cached", stale: true });
        setError("Using cached space-weather data while reconnecting.");
        if (!lastSuccessfulSyncAt) {
          setLastSuccessfulSyncAt(cachedNow.lastUpdatedAt);
        }
      } else {
        setError("Unable to load space-weather data right now.");
      }
      setFlares(cachedFlares);
      setLearning(cachedLearning);
      scheduleRetry(refreshData);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [clearRetrySchedule, lastSuccessfulSyncAt, scheduleRetry]);

  const retryNow = useCallback(() => {
    hapticPrimaryAction().catch(() => undefined);
    clearRetrySchedule();
    refreshData().catch(() => undefined);
  }, [clearRetrySchedule, refreshData]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const id = await getInstallId();
      if (!active) return;
      setInstallId(id);

      const [cachedPrefs, cachedToken, cachedNow, cachedFlares, cachedLearning] = await Promise.all([
        loadPreferences(),
        loadPushToken(),
        loadNow(),
        loadFlares(),
        loadLearning(),
      ]);
      if (!active) return;

      if (cachedPrefs) {
        setPreferences(cachedPrefs);
      } else {
        const defaults = DEFAULT_PREFERENCES(id);
        setPreferences(defaults);
        await savePreferences(defaults);
      }

      if (cachedToken) {
        setPushToken(cachedToken);
      }

      if (cachedNow || cachedFlares.length > 0 || cachedLearning.length > 0) {
        if (cachedNow) {
          setNow({ ...cachedNow, source: "cached", stale: true });
          setLastSuccessfulSyncAt(cachedNow.lastUpdatedAt);
        }
        if (cachedFlares.length > 0) {
          setFlares(cachedFlares);
        }
        if (cachedLearning.length > 0) {
          setLearning(cachedLearning);
        }
        setLoading(false);
      }

      await refreshData();

      if (platform) {
        const token = await requestPushToken();
        if (!active || !token) return;

        setPushToken(token);
        await savePushToken(token);
      }
    };

    bootstrap().catch(() => undefined);

    const interval = setInterval(() => {
      refreshData().catch(() => undefined);
    }, 60000);

    const clock = setInterval(() => {
      setClockTick((value) => value + 1);
    }, 1000);

    return () => {
      active = false;
      clearInterval(interval);
      clearInterval(clock);
      clearRetrySchedule();
    };
  }, [clearRetrySchedule, platform, refreshData]);

  useEffect(() => {
    return () => {
      stopAudio().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    setAudioVolume(volume).catch(() => undefined);
  }, [volume, isPlaying]);

  useEffect(() => {
    if (!isPlaying || !now) return;
    updateAudio(nowToAudioParams(now, volume)).catch(() => undefined);
  }, [isPlaying, now, volume]);

  const latestFlare = flares[0] ?? null;

  const statusTone = useMemo(() => {
    if (!now) return "muted" as const;
    if (now.condition === "super_extreme" || now.condition === "extreme") return "alert" as const;
    if (now.condition === "quiet") return "good" as const;
    return "muted" as const;
  }, [now]);

  const persistPreferences = useCallback(
    async (next: DevicePreferencesRequest) => {
      setPreferences(next);
      await savePreferences(next);

      try {
        await updatePreferences(next);
      } catch {
        // Keep device-local fallback if network call fails.
      }

      if (isPlaying) {
        await setBackgroundMode(next.backgroundAudioEnabled);
      }
    },
    [isPlaying]
  );

  const togglePlayback = useCallback(async () => {
    if (!now) return;

    await hapticPrimaryAction();

    if (isPlaying) {
      await pauseAudio();
      setIsPlaying(false);
      return;
    }

    await startAudio(nowToAudioParams(now, volume));
    await setBackgroundMode(preferences?.backgroundAudioEnabled ?? true);
    setIsPlaying(true);
  }, [isPlaying, now, preferences?.backgroundAudioEnabled, volume]);

  const updatePreference = useCallback(
    (mutate: (current: DevicePreferencesRequest) => DevicePreferencesRequest) => {
      if (!preferences) return;
      hapticToggle().catch(() => undefined);
      const next = mutate(preferences);
      persistPreferences({ ...next, updatedAt: new Date().toISOString() }).catch(() => undefined);
    },
    [persistPreferences, preferences]
  );

  const switchTab = useCallback(
    (tab: Tab) => {
      if (tab === activeTab) return;
      hapticTabSwitch().catch(() => undefined);
      setActiveTab(tab);
    },
    [activeTab]
  );

  useEffect(() => {
    if (!installId || !pushToken || !preferences || !platform) return;
    if (registrationInFlightRef.current) return;

    const signature = JSON.stringify({
      installId,
      pushToken,
      timezone,
      platform,
      preferences,
    });

    if (lastRegistrationSignatureRef.current === signature) {
      return;
    }

    let active = true;

    const syncRegistration = async () => {
      try {
        registrationInFlightRef.current = true;
        setRegistrationState("syncing");
        await registerDevice({
          installId,
          pushToken,
          timezone,
          platform,
          preferences,
        });
        if (!active) return;
        lastRegistrationSignatureRef.current = signature;
        setRegistrationState("idle");
      } catch {
        if (active) {
          setRegistrationState("idle");
        }
      } finally {
        registrationInFlightRef.current = false;
      }
    };

    syncRegistration().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [installId, platform, preferences, pushToken, timezone]);

  const unregisterCurrentDevice = useCallback(async () => {
    if (!installId) return;
    await hapticToggle();
    setSyncing(true);

    try {
      await unregisterDevice(installId);
    } catch {
      // Best-effort cleanup.
    } finally {
      setPushToken(null);
      await clearPushToken();
      lastRegistrationSignatureRef.current = null;
      setRegistrationState("removed");
      setSyncing(false);
      setError("Device registration removed. Alerts stay paused until push is enabled again.");
    }
  }, [installId]);

  const registerCurrentDevice = useCallback(async () => {
    if (!platform) {
      await hapticError();
      setError("Push registration is only available on iOS and Android.");
      return;
    }

    await hapticPrimaryAction();
    setSyncing(true);
    try {
      const token = await requestPushToken();
      if (!token) {
        await hapticError();
        setError("Push permissions are not granted.");
        return;
      }
      setPushToken(token);
      await savePushToken(token);
      setError(null);
      setRegistrationState("idle");
    } finally {
      setSyncing(false);
    }
  }, [platform]);

  const staleAgeSeconds = now?.lastUpdatedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(now.lastUpdatedAt).getTime()) / 1000))
    : null;
  const retryCountdownSeconds =
    nextRetryAt === null ? null : Math.max(0, Math.ceil((nextRetryAt - Date.now()) / 1000));
  void clockTick;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ExpoStatusBar style="light" />
        <View style={styles.stateWrap}>
          <StatePanel
            kind="loading"
            title="Warming up the stream"
            message="Preparing your latest heliospheric snapshot and ambient engine presets."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ExpoStatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>Heliosinger Mobile</Text>
        <Text style={styles.subtitle}>Live solar weather transformed into intentional ambient listening.</Text>
        <View style={styles.headerBadges}>
          <Badge label={now?.condition ?? "unknown"} tone={statusTone} />
          <Badge label={syncing ? "syncing" : now?.source ?? "offline"} />
        </View>
      </View>

      {(error || now?.stale) && (
        <View style={styles.warningBanner}>
          <View style={styles.warningBody}>
            <Text style={styles.warningText}>
              {error ?? `Data is stale (${staleAgeSeconds ?? now?.staleSeconds ?? 0}s old).`}
            </Text>
            {retryCountdownSeconds !== null && retryCountdownSeconds > 0 ? (
              <Text style={styles.warningSubtext}>Auto-retry in {retryCountdownSeconds}s</Text>
            ) : null}
          </View>
          <Pressable style={styles.warningRetryButton} onPress={retryNow}>
            <Text style={styles.warningRetryText}>Refresh now</Text>
          </Pressable>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === "listen" && (
          <>
            <AnimatedSection delay={0}>
              <SectionCard title="Ambient Playback">
                <Text style={styles.keyText}>Session: {isPlaying ? "Playing" : "Paused"}</Text>
                <Pressable style={styles.primaryButton} onPress={() => togglePlayback().catch(() => undefined)}>
                  <Text style={styles.primaryButtonText}>{isPlaying ? "Pause Ambient" : "Start Ambient"}</Text>
                </Pressable>
                <View style={styles.rowBetween}>
                  <Text style={styles.mutedText}>Output level {Math.round(volume * 100)}%</Text>
                  <View style={styles.inlineControls}>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() => {
                        hapticToggle().catch(() => undefined);
                        setVolume((v) => clamp(v - 0.05, 0, 1));
                      }}
                    >
                      <Text style={styles.stepButtonText}>-</Text>
                    </Pressable>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() => {
                        hapticToggle().catch(() => undefined);
                        setVolume((v) => clamp(v + 0.05, 0, 1));
                      }}
                    >
                      <Text style={styles.stepButtonText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </SectionCard>
            </AnimatedSection>

            <AnimatedSection delay={80}>
              <SectionCard title="Latest Conditions">
                <Text style={styles.keyText}>Velocity: {now?.solarWind?.velocity?.toFixed(0) ?? "--"} km/s</Text>
                <Text style={styles.keyText}>Density: {now?.solarWind?.density?.toFixed(1) ?? "--"} p/cm3</Text>
                <Text style={styles.keyText}>Bz: {now?.solarWind?.bz?.toFixed(1) ?? "--"} nT</Text>
                <Text style={styles.keyText}>Kp: {now?.geomagnetic?.kp?.toFixed(1) ?? "--"}</Text>
                <Text style={styles.smallMutedText}>Latest data point: {now?.lastUpdatedAt ?? "unknown"}</Text>
                <Text style={styles.smallMutedText}>Last successful sync: {formatSyncTimestamp(lastSuccessfulSyncAt)}</Text>
                <Text style={styles.smallMutedText}>Stale age: {staleAgeSeconds ?? 0}s</Text>
              </SectionCard>
            </AnimatedSection>

            <AnimatedSection delay={160}>
              <SectionCard title="Binaural Guidance">
                <Text style={styles.mutedText}>Use headphones for a stable stereo field and cleaner beat perception.</Text>
                <Text style={styles.smallMutedText}>Harmonic density adapts continuously to current heliophysical conditions.</Text>
              </SectionCard>
            </AnimatedSection>
          </>
        )}

        {activeTab === "flares" && (
          <>
            <AnimatedSection delay={0}>
              <SectionCard title="Latest Flare">
                {latestFlare ? (
                  <>
                    <View style={styles.rowBetween}>
                      <Text style={styles.keyText}>{latestFlare.flareClass}-class flare</Text>
                      <Badge label={latestFlare.rScale} tone={latestFlare.rScale >= "R3" ? "alert" : "muted"} />
                    </View>
                    <Text style={styles.mutedText}>{latestFlare.impactSummary}</Text>
                    <Text style={styles.smallMutedText}>{latestFlare.timestamp}</Text>
                  </>
                ) : (
                  <StatePanel
                    kind="empty"
                    compact
                    title="No flare events yet"
                    message="Once NOAA reports fresh X-ray flare activity, this panel updates automatically."
                  />
                )}
              </SectionCard>
            </AnimatedSection>

            <AnimatedSection delay={90}>
              <SectionCard title="Timeline">
                {flares.slice(0, 12).map((flare) => (
                  <View key={flare.id} style={styles.timelineRow}>
                    <Text style={styles.timelineClass}>{flare.flareClass}</Text>
                    <View style={styles.timelineBody}>
                      <Text style={styles.timelineImpact}>{flare.impactSummary}</Text>
                      <Text style={styles.smallMutedText}>{flare.timestamp}</Text>
                    </View>
                  </View>
                ))}
                {flares.length === 0 && (
                  <StatePanel
                    kind="empty"
                    compact
                    title="Timeline unavailable"
                    message="Cached flare history is currently empty on this device."
                  />
                )}
              </SectionCard>
            </AnimatedSection>
          </>
        )}

        {activeTab === "learn" && (
          <AnimatedSection delay={0}>
            <SectionCard title="Current Learning Cards">
              {learning.map((card) => (
                <View key={card.id} style={styles.learnCard}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.learnTitle}>{card.title}</Text>
                    <Badge label={card.track} />
                  </View>
                  <Text style={styles.mutedText}>{card.body}</Text>
                  <Text style={styles.smallMutedText}>Data context: {card.dataConnection}</Text>
                  <Text style={styles.smallMutedText}>Audio mapping: {card.audioConnection}</Text>
                </View>
              ))}
              {learning.length === 0 && (
                <StatePanel
                  kind="empty"
                  compact
                  title="No cards right now"
                  message="Learning cards will appear once a fresh conditions payload is available."
                />
              )}
            </SectionCard>
          </AnimatedSection>
        )}

        {activeTab === "settings" && preferences && (
          <>
            <AnimatedSection delay={0}>
              <SectionCard title="Alert Profile">
                <View style={styles.rowBetween}>
                  <Text style={styles.keyText}>Solar alert notifications</Text>
                  <Pressable
                    style={styles.toggleButton}
                    onPress={() =>
                      updatePreference((current) => ({
                        ...current,
                        alertsEnabled: !current.alertsEnabled,
                      }))
                    }
                  >
                    <Text style={styles.toggleText}>{preferences.alertsEnabled ? "ON" : "OFF"}</Text>
                  </Pressable>
                </View>

                <View style={styles.rowBetween}>
                  <Text style={styles.mutedText}>Kp trigger: {preferences.thresholds.kp.toFixed(1)}</Text>
                  <View style={styles.inlineControls}>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() =>
                        updatePreference((current) => ({
                          ...current,
                          thresholds: {
                            ...current.thresholds,
                            kp: clamp(current.thresholds.kp - 1, 1, 9),
                          },
                        }))
                      }
                    >
                      <Text style={styles.stepButtonText}>-</Text>
                    </Pressable>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() =>
                        updatePreference((current) => ({
                          ...current,
                          thresholds: {
                            ...current.thresholds,
                            kp: clamp(current.thresholds.kp + 1, 1, 9),
                          },
                        }))
                      }
                    >
                      <Text style={styles.stepButtonText}>+</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.rowBetween}>
                  <Text style={styles.mutedText}>Southward Bz trigger: {preferences.thresholds.bzSouth.toFixed(1)} nT</Text>
                  <View style={styles.inlineControls}>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() =>
                        updatePreference((current) => ({
                          ...current,
                          thresholds: {
                            ...current.thresholds,
                            bzSouth: clamp(current.thresholds.bzSouth - 1, 2, 20),
                          },
                        }))
                      }
                    >
                      <Text style={styles.stepButtonText}>-</Text>
                    </Pressable>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() =>
                        updatePreference((current) => ({
                          ...current,
                          thresholds: {
                            ...current.thresholds,
                            bzSouth: clamp(current.thresholds.bzSouth + 1, 2, 20),
                          },
                        }))
                      }
                    >
                      <Text style={styles.stepButtonText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </SectionCard>
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <SectionCard title="Quiet Hours & Playback">
                <View style={styles.rowBetween}>
                  <Text style={styles.keyText}>Quiet hours (local time)</Text>
                  <Pressable
                    style={styles.toggleButton}
                    onPress={() =>
                      updatePreference((current) => ({
                        ...current,
                        quietHours: {
                          ...current.quietHours,
                          enabled: !current.quietHours.enabled,
                        },
                      }))
                    }
                  >
                    <Text style={styles.toggleText}>{preferences.quietHours.enabled ? "ON" : "OFF"}</Text>
                  </Pressable>
                </View>
                <Text style={styles.smallMutedText}>
                  Delivery window: {formatHour(preferences.quietHours.startHour)} - {formatHour(preferences.quietHours.endHour)}
                </Text>

                <View style={styles.rowBetween}>
                  <Text style={styles.mutedText}>Quiet start: {formatHour(preferences.quietHours.startHour)}</Text>
                  <View style={styles.inlineControls}>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() =>
                        updatePreference((current) => ({
                          ...current,
                          quietHours: {
                            ...current.quietHours,
                            startHour: shiftHour(current.quietHours.startHour, -1),
                          },
                        }))
                      }
                    >
                      <Text style={styles.stepButtonText}>-</Text>
                    </Pressable>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() =>
                        updatePreference((current) => ({
                          ...current,
                          quietHours: {
                            ...current.quietHours,
                            startHour: shiftHour(current.quietHours.startHour, 1),
                          },
                        }))
                      }
                    >
                      <Text style={styles.stepButtonText}>+</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.rowBetween}>
                  <Text style={styles.mutedText}>Quiet end: {formatHour(preferences.quietHours.endHour)}</Text>
                  <View style={styles.inlineControls}>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() =>
                        updatePreference((current) => ({
                          ...current,
                          quietHours: {
                            ...current.quietHours,
                            endHour: shiftHour(current.quietHours.endHour, -1),
                          },
                        }))
                      }
                    >
                      <Text style={styles.stepButtonText}>-</Text>
                    </Pressable>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() =>
                        updatePreference((current) => ({
                          ...current,
                          quietHours: {
                            ...current.quietHours,
                            endHour: shiftHour(current.quietHours.endHour, 1),
                          },
                        }))
                      }
                    >
                      <Text style={styles.stepButtonText}>+</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.rowBetween}>
                  <Text style={styles.keyText}>Background playback</Text>
                  <Pressable
                    style={styles.toggleButton}
                    onPress={() =>
                      updatePreference((current) => ({
                        ...current,
                        backgroundAudioEnabled: !current.backgroundAudioEnabled,
                      }))
                    }
                  >
                    <Text style={styles.toggleText}>{preferences.backgroundAudioEnabled ? "ON" : "OFF"}</Text>
                  </Pressable>
                </View>

                <Text style={styles.smallMutedText}>Timezone: {timezone}</Text>
                <Text style={styles.smallMutedText}>Install ID: {installId || "pending"}</Text>
                <Text style={styles.smallMutedText}>Push token: {pushToken ? "registered" : "not granted"}</Text>
                <Text style={styles.smallMutedText}>Registration state: {registrationState}</Text>
                {!pushToken && platform ? (
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => {
                      registerCurrentDevice().catch(() => undefined);
                    }}
                  >
                    <Text style={styles.primaryButtonText}>Enable Push Registration</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.primaryButton, styles.destructiveButton]}
                  onPress={() => {
                    unregisterCurrentDevice().catch(() => undefined);
                  }}
                >
                  <Text style={[styles.primaryButtonText, styles.destructiveButtonText]}>
                    Remove Device Registration
                  </Text>
                </Pressable>
              </SectionCard>
            </AnimatedSection>
          </>
        )}
      </ScrollView>

      <View style={styles.tabBar}>
        <TabButton label="Listen" active={activeTab === "listen"} onPress={() => switchTab("listen")} />
        <TabButton label="Flares" active={activeTab === "flares"} onPress={() => switchTab("flares")} />
        <TabButton label="Learn" active={activeTab === "learn"} onPress={() => switchTab("learn")} />
        <TabButton label="Settings" active={activeTab === "settings"} onPress={() => switchTab("settings")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  stateWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.md,
  },
  header: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    gap: 6,
  },
  title: {
    color: tokens.colors.textPrimary,
    ...tokens.typography.display,
    textTransform: "uppercase",
  },
  subtitle: {
    color: tokens.colors.textSecondary,
    ...tokens.typography.body,
  },
  headerBadges: {
    flexDirection: "row",
    gap: tokens.spacing.xs,
    marginTop: 2,
  },
  badge: {
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeAlert: {
    borderColor: tokens.colors.danger,
    backgroundColor: "#3b1220",
  },
  badgeGood: {
    borderColor: tokens.colors.good,
    backgroundColor: "#102a1b",
  },
  badgeText: {
    color: tokens.colors.textSecondary,
    ...tokens.typography.compact,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.sm,
    backgroundColor: "#3c1d0d",
    borderBottomWidth: 1,
    borderBottomColor: "#9a3412",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
  },
  warningBody: {
    flex: 1,
    gap: 2,
  },
  warningText: {
    color: "#fed7aa",
    ...tokens.typography.body,
  },
  warningSubtext: {
    color: "#fdba74",
    ...tokens.typography.compact,
  },
  warningRetryButton: {
    borderWidth: 1,
    borderColor: "#fdba74",
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 6,
  },
  warningRetryText: {
    color: "#ffedd5",
    ...tokens.typography.compact,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.lg,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.xs,
  },
  keyText: {
    color: tokens.colors.textPrimary,
    ...tokens.typography.heading,
  },
  mutedText: {
    color: tokens.colors.textSecondary,
    ...tokens.typography.body,
  },
  smallMutedText: {
    color: tokens.colors.textMuted,
    ...tokens.typography.compact,
  },
  primaryButton: {
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.spacing.sm,
    alignItems: "center",
    marginTop: tokens.spacing.xs,
  },
  primaryButtonText: {
    color: "#052927",
    ...tokens.typography.heading,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inlineControls: {
    flexDirection: "row",
    gap: 6,
  },
  stepButton: {
    backgroundColor: tokens.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.sm,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonText: {
    color: tokens.colors.textPrimary,
    fontWeight: "800",
    fontSize: 16,
  },
  timelineRow: {
    flexDirection: "row",
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  timelineClass: {
    color: tokens.colors.accent,
    width: 26,
    ...tokens.typography.heading,
  },
  timelineBody: {
    flex: 1,
    gap: 4,
  },
  timelineImpact: {
    color: tokens.colors.textPrimary,
    ...tokens.typography.body,
  },
  learnCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.sm,
    gap: 6,
    backgroundColor: tokens.colors.surfaceElevated,
  },
  learnTitle: {
    color: tokens.colors.textPrimary,
    ...tokens.typography.heading,
    flex: 1,
    paddingRight: tokens.spacing.xs,
  },
  toggleButton: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surfaceElevated,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  toggleText: {
    color: tokens.colors.textPrimary,
    ...tokens.typography.compact,
    fontWeight: "800",
    letterSpacing: 1,
  },
  destructiveButton: {
    backgroundColor: "#4c1024",
    borderWidth: 1,
    borderColor: tokens.colors.danger,
  },
  destructiveButtonText: {
    color: "#fecdd3",
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
});
