import { useEffect, useState } from "react";

function SettingsPanel({ theme, onToggleTheme, preferences, onSavePreferences, settingsMessage }) {
  const [showNotificationConfig, setShowNotificationConfig] = useState(false);
  const [draftPreferences, setDraftPreferences] = useState(preferences);

  useEffect(() => {
    setDraftPreferences(preferences);
  }, [preferences]);

  const handleToggleDraft = (key) => {
    setDraftPreferences((current) => ({
      ...current,
      [key]: !current[key]
    }));
  };

  const handleDiscard = () => {
    setDraftPreferences(preferences);
  };

  return (
    <section className="workspace-panel settings-panel-page">
      <div className="section-headline">
        <h1>Settings</h1>
        <p>Manage your account preferences and application configuration.</p>
      </div>

      <div className="settings-block">
        <h3>Application Preferences</h3>

        <div className="settings-row">
          <div>
            <strong>Interface Mode</strong>
            <p>Toggle between Light and Dark themes</p>
          </div>
          <button type="button" className={`toggle-switch ${theme === "dark" ? "active" : ""}`} onClick={onToggleTheme}>
            <span />
          </button>
        </div>

        <div className="settings-row">
          <div>
            <strong>Notifications</strong>
            <p>Manage push and email alerts</p>
          </div>
          <button type="button" className="text-action" onClick={() => setShowNotificationConfig((current) => !current)}>
            {showNotificationConfig ? "Hide" : "Configure"}
          </button>
        </div>

        {showNotificationConfig && (
          <div className="settings-config-card">
            <div className="settings-config-row">
              <div>
                <strong>Master notifications</strong>
                <p>Enable or mute all notification channels.</p>
              </div>
              <button
                type="button"
                className={`toggle-switch ${draftPreferences.notifications ? "active" : ""}`}
                onClick={() => handleToggleDraft("notifications")}
              >
                <span />
              </button>
            </div>

            <div className="settings-config-row">
              <div>
                <strong>Desktop alerts</strong>
                <p>Show notifications inside the app on new messages.</p>
              </div>
              <button
                type="button"
                className={`toggle-switch ${draftPreferences.desktopNotifications ? "active" : ""}`}
                onClick={() => handleToggleDraft("desktopNotifications")}
              >
                <span />
              </button>
            </div>

            <div className="settings-config-row">
              <div>
                <strong>Email updates</strong>
                <p>Send activity summaries to your email.</p>
              </div>
              <button
                type="button"
                className={`toggle-switch ${draftPreferences.emailNotifications ? "active" : ""}`}
                onClick={() => handleToggleDraft("emailNotifications")}
              >
                <span />
              </button>
            </div>

            <div className="settings-config-row">
              <div>
                <strong>Push alerts</strong>
                <p>Notify you immediately for important events.</p>
              </div>
              <button
                type="button"
                className={`toggle-switch ${draftPreferences.pushNotifications ? "active" : ""}`}
                onClick={() => handleToggleDraft("pushNotifications")}
              >
                <span />
              </button>
            </div>

            <div className="settings-config-row">
              <div>
                <strong>Message preview</strong>
                <p>Show a message snippet in notifications.</p>
              </div>
              <button
                type="button"
                className={`toggle-switch ${draftPreferences.messagePreview ? "active" : ""}`}
                onClick={() => handleToggleDraft("messagePreview")}
              >
                <span />
              </button>
            </div>
          </div>
        )}

        <div className="settings-row">
          <div>
            <strong>Sound</strong>
            <p>Play sounds for important events</p>
          </div>
          <button
            type="button"
            className={`toggle-switch ${draftPreferences.sounds ? "active" : ""}`}
            onClick={() => handleToggleDraft("sounds")}
          >
            <span />
          </button>
        </div>
      </div>

      {settingsMessage ? <p className="status-text">{settingsMessage}</p> : null}

      <div className="settings-footer-actions">
        <button type="button" className="ghost-link" onClick={handleDiscard}>Discard Changes</button>
        <button type="button" className="primary-action" onClick={() => onSavePreferences(draftPreferences)}>Save Preferences</button>
      </div>
    </section>
  );
}

export default SettingsPanel;
