import {
  CircleUserRound,
  MessageCircle,
  Phone,
  Settings,
  Users,
  LogOut,
  Plus,
  Moon,
  Bell,
  Rocket
} from "lucide-react";

const navItems = [
  { key: "message", label: "Chats", icon: MessageCircle },
  { key: "groups", label: "Groups", icon: Users },
  { key: "calls", label: "Calls", icon: Phone },
  { key: "profile", label: "Profile", icon: CircleUserRound },
  { key: "settings", label: "Settings", icon: Settings }
];

function NavigationSidebar({
  activeSection,
  onChangeSection,
  requestsCount,
  onLogout,
  currentUser,
  onPrimaryAction,
  onToggleNotifications,
  onToggleTheme,
  notificationsEnabled,
  theme
}) {
  return (
    <aside className="nav-sidebar">
      <div className="nav-topbar nav-topbar-logo-only">
        <div className="nav-logo" aria-label="Wired">
          <Rocket size={16} />
        </div>
      </div>

      <div className="nav-account-block">
        <div className="nav-account-avatar">{(currentUser?.name || "U").slice(0, 1).toUpperCase()}</div>
        <div className="nav-account-copy">
          <strong>{currentUser?.name || "User"}</strong>
          <span>{activeSection === "message" ? "Active now" : "Workspace Admin"}</span>
        </div>
      </div>

      <div className="nav-actions">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className={`nav-icon-button ${activeSection === key ? "active" : ""}`}
            onClick={() => onChangeSection(key)}
          >
            <Icon size={20} />
            {key === "groups" && requestsCount > 0 ? (
              <span className="nav-badge">{requestsCount}</span>
            ) : null}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {activeSection === "calls" ? (
        <button type="button" className="nav-primary-button" onClick={onPrimaryAction}>
          <Phone size={14} />
          New Call
        </button>
      ) : (
        <button type="button" className="nav-primary-button" onClick={onPrimaryAction}>
          <Plus size={14} />
          New Chat
        </button>
      )}

      <div className="nav-bottom-user">
        <div className="nav-bottom-avatar">{(currentUser?.name || "U").slice(0, 1).toUpperCase()}</div>
        <div>
          <strong>{currentUser?.name || "User"}</strong>
          <p>{currentUser?.email || "user@example.com"}</p>
        </div>
      </div>

      <div className="nav-header-icons">
        <button
          type="button"
          className={`nav-top-icon ${notificationsEnabled ? "active" : ""}`}
          aria-label={notificationsEnabled ? "Disable notifications" : "Enable notifications"}
          aria-pressed={notificationsEnabled}
          onClick={onToggleNotifications}
        >
          <Bell size={14} />
        </button>
        <button
          type="button"
          className={`nav-top-icon ${theme === "dark" ? "active" : ""}`}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          aria-pressed={theme === "dark"}
          onClick={onToggleTheme}
        >
          <Moon size={14} />
        </button>
      </div>

      <button
        type="button"
        className="nav-logout"
        onClick={onLogout}
      >
        <LogOut size={14} />
        Logout
      </button>
    </aside>
  );
}

export default NavigationSidebar;
