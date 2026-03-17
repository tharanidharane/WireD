function SettingsPanel({ theme, onToggleTheme, preferences, onTogglePreference }) {
  return (
    <section className="dashboard-panel">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Personalize your workspace</h1>
          <p className="dashboard-copy">
            Tune the experience while keeping your chat, call, and friend flows exactly the same.
          </p>
        </div>
      </div>

      <div className="settings-list">
        <div className="settings-item">
          <div>
            <strong>Theme Mode</strong>
            <p>{theme === "dark" ? "Black theme enabled" : "White theme enabled"}</p>
          </div>
          <button type="button" className="primary-action" onClick={onToggleTheme}>
            Toggle Theme
          </button>
        </div>

        <div className="settings-item">
          <div>
            <strong>Desktop Notifications</strong>
            <p>Show visual call and message alerts in the workspace.</p>
          </div>
          <button
            type="button"
            className={`toggle-chip ${preferences.notifications ? "active" : ""}`}
            onClick={() => onTogglePreference("notifications")}
          >
            {preferences.notifications ? "On" : "Off"}
          </button>
        </div>

        <div className="settings-item">
          <div>
            <strong>Typing Indicators</strong>
            <p>Let friends know when you are composing a message.</p>
          </div>
          <button
            type="button"
            className={`toggle-chip ${preferences.typingIndicators ? "active" : ""}`}
            onClick={() => onTogglePreference("typingIndicators")}
          >
            {preferences.typingIndicators ? "On" : "Off"}
          </button>
        </div>

        <div className="settings-item">
          <div>
            <strong>Sounds</strong>
            <p>Enable sound feedback for calls and message events.</p>
          </div>
          <button
            type="button"
            className={`toggle-chip ${preferences.sounds ? "active" : ""}`}
            onClick={() => onTogglePreference("sounds")}
          >
            {preferences.sounds ? "On" : "Off"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default SettingsPanel;
