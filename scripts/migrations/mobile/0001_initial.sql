-- Heliosinger Mobile MVP schema (D1)

CREATE TABLE IF NOT EXISTS space_weather_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_at TEXT NOT NULL,
  source TEXT NOT NULL,
  condition TEXT NOT NULL,
  stale INTEGER NOT NULL DEFAULT 0,
  stale_seconds INTEGER NOT NULL DEFAULT 0,
  velocity REAL,
  density REAL,
  bz REAL,
  temperature REAL,
  kp REAL,
  flare_class TEXT,
  flare_short_wave REAL,
  flare_long_wave REAL,
  flare_r_scale TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_snapshots_snapshot_at ON space_weather_snapshots(snapshot_at DESC);

CREATE TABLE IF NOT EXISTS flare_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  event_at TEXT NOT NULL,
  flare_class TEXT NOT NULL,
  short_wave REAL NOT NULL,
  long_wave REAL NOT NULL,
  r_scale TEXT NOT NULL,
  impact_summary TEXT NOT NULL,
  source TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_flare_events_event_at ON flare_events(event_at DESC);
CREATE INDEX IF NOT EXISTS idx_flare_events_flare_class ON flare_events(flare_class);

CREATE TABLE IF NOT EXISTS device_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  install_id TEXT NOT NULL UNIQUE,
  push_token TEXT NOT NULL,
  timezone TEXT NOT NULL,
  platform TEXT NOT NULL,
  app_version TEXT,
  alerts_enabled INTEGER NOT NULL DEFAULT 1,
  kp_threshold REAL NOT NULL DEFAULT 5,
  bz_south_threshold REAL NOT NULL DEFAULT 8,
  flare_classes TEXT NOT NULL DEFAULT '["M","X"]',
  quiet_hours_enabled INTEGER NOT NULL DEFAULT 0,
  quiet_start_hour INTEGER NOT NULL DEFAULT 22,
  quiet_end_hour INTEGER NOT NULL DEFAULT 7,
  background_audio_enabled INTEGER NOT NULL DEFAULT 1,
  preferences_json TEXT NOT NULL,
  last_notification_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_device_subscriptions_push_token ON device_subscriptions(push_token);

CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  install_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (install_id) REFERENCES device_subscriptions(install_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_log_install_event ON notification_log(install_id, event_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at DESC);
