-- Notification dedupe hardening

-- Keep only the newest row per (install_id, event_id) so the unique index can be applied safely.
DELETE FROM notification_log
WHERE id NOT IN (
  SELECT MAX(id)
  FROM notification_log
  GROUP BY install_id, event_id
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_log_install_event_unique
  ON notification_log(install_id, event_id);

CREATE INDEX IF NOT EXISTS idx_notification_log_status_reason
  ON notification_log(status, reason, created_at DESC);
