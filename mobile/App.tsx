import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  getInstallId,
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
        setError("Using cached space-weather data");
        if (!lastSuccessfulSyncAt) {
          setLastSuccessfulSyncAt(cachedNow.lastUpdatedAt);
        }
      } else {
        setError("Unable to load space-weather data");
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

    bootstrap();

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
      const next = mutate(preferences);
      persistPreferences({ ...next, updatedAt: new Date().toISOString() }).catch(() => undefined);
    },
    [persistPreferences, preferences]
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
      setError("Device registration removed. Alerts are disabled until you re-enable push permissions.");
    }
  }, [installId]);

  const registerCurrentDevice = useCallback(async () => {
    if (!platform) {
      setError("Push registration is only available on iOS and Android.");
      return;
    }

    setSyncing(true);
    try {
      const token = await requestPushToken();
      if (!token) {
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
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#22d3ee" />
        <Text style={styles.loadingText}>Loading Heliosinger...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ExpoStatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>Heliosinger Mobile</Text>
        <View style={styles.headerBadges}>
          <Badge label={now?.condition ?? "unknown"} tone={statusTone} />
          <Badge label={syncing ? "syncing" : now?.source ?? "offline"} />
        </View>
      </View>

      {(error || now?.stale) && (
        <View style={styles.warningBanner}>
          <View style={styles.warningRow}>
            <View style={styles.warningBody}>
              <Text style={styles.warningText}>
                {error ?? `Data is stale (${staleAgeSeconds ?? now?.staleSeconds ?? 0}s old)`}
              </Text>
              {retryCountdownSeconds !== null && retryCountdownSeconds > 0 ? (
                <Text style={styles.warningSubtext}>Auto retry in {retryCountdownSeconds}s</Text>
              ) : null}
            </View>
            <Pressable style={styles.warningRetryButton} onPress={retryNow}>
              <Text style={styles.warningRetryText}>Retry now</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === "listen" && (
          <>
            <SectionCard title="Ambient Playback">
              <Text style={styles.keyText}>Status: {isPlaying ? "Playing" : "Paused"}</Text>
              <Pressable style={styles.primaryButton} onPress={togglePlayback}>
                <Text style={styles.primaryButtonText}>{isPlaying ? "Pause Ambient" : "Start Ambient"}</Text>
              </Pressable>
              <View style={styles.rowBetween}>
                <Text style={styles.mutedText}>Volume {Math.round(volume * 100)}%</Text>
                <View style={styles.inlineControls}>
                  <Pressable style={styles.stepButton} onPress={() => setVolume((v) => clamp(v - 0.05, 0, 1))}>
                    <Text style={styles.stepButtonText}>-</Text>
                  </Pressable>
                  <Pressable style={styles.stepButton} onPress={() => setVolume((v) => clamp(v + 0.05, 0, 1))}>
                    <Text style={styles.stepButtonText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </SectionCard>

            <SectionCard title="Latest Conditions">
              <Text style={styles.keyText}>Velocity: {now?.solarWind?.velocity?.toFixed(0) ?? "--"} km/s</Text>
              <Text style={styles.keyText}>Density: {now?.solarWind?.density?.toFixed(1) ?? "--"} p/cm3</Text>
              <Text style={styles.keyText}>Bz: {now?.solarWind?.bz?.toFixed(1) ?? "--"} nT</Text>
              <Text style={styles.keyText}>Kp: {now?.geomagnetic?.kp?.toFixed(1) ?? "--"}</Text>
              <Text style={styles.smallMutedText}>
                Last weather update: {now?.lastUpdatedAt ?? "unknown"}
              </Text>
              <Text style={styles.smallMutedText}>
                Last successful sync: {formatSyncTimestamp(lastSuccessfulSyncAt)}
              </Text>
              <Text style={styles.smallMutedText}>Stale age: {staleAgeSeconds ?? 0}s</Text>
            </SectionCard>

            <SectionCard title="Binaural Tip">
              <Text style={styles.mutedText}>Use headphones for true binaural perception.</Text>
              <Text style={styles.smallMutedText}>The beat offset adapts to live space-weather intensity.</Text>
            </SectionCard>
          </>
        )}

        {activeTab === "flares" && (
          <>
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
                <Text style={styles.mutedText}>No flare data available yet.</Text>
              )}
            </SectionCard>

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
              {flares.length === 0 && <Text style={styles.mutedText}>Timeline unavailable offline.</Text>}
            </SectionCard>
          </>
        )}

        {activeTab === "learn" && (
          <SectionCard title="Current Learning Cards">
            {learning.map((card) => (
              <View key={card.id} style={styles.learnCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.learnTitle}>{card.title}</Text>
                  <Badge label={card.track} />
                </View>
                <Text style={styles.mutedText}>{card.body}</Text>
                <Text style={styles.smallMutedText}>Data: {card.dataConnection}</Text>
                <Text style={styles.smallMutedText}>Audio: {card.audioConnection}</Text>
              </View>
            ))}
            {learning.length === 0 && <Text style={styles.mutedText}>Learning cards unavailable offline.</Text>}
          </SectionCard>
        )}

        {activeTab === "settings" && preferences && (
          <>
            <SectionCard title="Alerts">
              <View style={styles.rowBetween}>
                <Text style={styles.keyText}>Alerts Enabled</Text>
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
                <Text style={styles.mutedText}>Kp Threshold: {preferences.thresholds.kp.toFixed(1)}</Text>
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
                <Text style={styles.mutedText}>Southward Bz Threshold: {preferences.thresholds.bzSouth.toFixed(1)} nT</Text>
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

            <SectionCard title="Quiet Hours & Background Audio">
              <View style={styles.rowBetween}>
                <Text style={styles.keyText}>Quiet Hours</Text>
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
                Window: {formatHour(preferences.quietHours.startHour)} - {formatHour(preferences.quietHours.endHour)}
              </Text>

              <View style={styles.rowBetween}>
                <Text style={styles.mutedText}>Quiet Start: {formatHour(preferences.quietHours.startHour)}</Text>
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
                <Text style={styles.mutedText}>Quiet End: {formatHour(preferences.quietHours.endHour)}</Text>
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
                <Text style={styles.keyText}>Background Audio</Text>
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
              <Text style={styles.smallMutedText}>
                Push token: {pushToken ? "registered" : "not granted"}
              </Text>
              <Text style={styles.smallMutedText}>Registration status: {registrationState}</Text>
              {!pushToken && platform ? (
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => {
                    registerCurrentDevice().catch(() => undefined);
                  }}
                >
                  <Text style={styles.primaryButtonText}>Register Device for Alerts</Text>
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
          </>
        )}
      </ScrollView>

      <View style={styles.tabBar}>
        <TabButton label="Listen" active={activeTab === "listen"} onPress={() => setActiveTab("listen")} />
        <TabButton label="Flares" active={activeTab === "flares"} onPress={() => setActiveTab("flares")} />
        <TabButton label="Learn" active={activeTab === "learn"} onPress={() => setActiveTab("learn")} />
        <TabButton label="Settings" active={activeTab === "settings"} onPress={() => setActiveTab("settings")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 10,
    fontWeight: "700",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    backgroundColor: "#050505",
  },
  title: {
    color: "#ecfeff",
    fontSize: 22,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerBadges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeAlert: {
    borderColor: "#ef4444",
    backgroundColor: "#3f1015",
  },
  badgeGood: {
    borderColor: "#22c55e",
    backgroundColor: "#0f2916",
  },
  badgeText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  warningBanner: {
    backgroundColor: "#3f1015",
    borderBottomWidth: 1,
    borderBottomColor: "#7f1d1d",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  warningBody: {
    flex: 1,
    gap: 3,
  },
  warningText: {
    color: "#fecaca",
    fontSize: 12,
    fontWeight: "600",
  },
  warningSubtext: {
    color: "#fca5a5",
    fontSize: 11,
  },
  warningRetryButton: {
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  warningRetryText: {
    color: "#ffe4e6",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  keyText: {
    color: "#f9fafb",
    fontSize: 14,
    fontWeight: "700",
  },
  mutedText: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 18,
  },
  smallMutedText: {
    color: "#94a3b8",
    fontSize: 11,
  },
  primaryButton: {
    backgroundColor: "#22d3ee",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#00111a",
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inlineControls: {
    flexDirection: "row",
    gap: 6,
  },
  stepButton: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonText: {
    color: "#ecfeff",
    fontWeight: "800",
    fontSize: 16,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  timelineClass: {
    color: "#22d3ee",
    width: 24,
    fontWeight: "900",
    fontSize: 14,
  },
  timelineBody: {
    flex: 1,
    gap: 4,
  },
  timelineImpact: {
    color: "#e5e7eb",
    fontSize: 12,
  },
  learnCard: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  learnTitle: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
    paddingRight: 8,
  },
  toggleButton: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    backgroundColor: "#0f172a",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  toggleText: {
    color: "#ecfeff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  destructiveButton: {
    backgroundColor: "#450a0a",
    borderWidth: 1,
    borderColor: "#7f1d1d",
  },
  destructiveButtonText: {
    color: "#fecaca",
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#111827",
  },
});
