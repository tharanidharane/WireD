import {
  CircleUserRound,
  MessageCircle,
  Phone,
  Settings,
  FolderClosed,
  LogOut,
  Newspaper
} from "lucide-react";

const navItems = [
  { key: "message", label: "Chats", icon: MessageCircle },
  { key: "calls", label: "Calls", icon: Phone },
  { key: "archive", label: "Archive", icon: FolderClosed },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "profile", label: "Profile", icon: CircleUserRound }
];

function NavigationSidebar({ activeSection, onChangeSection, requestsCount, onLogout }) {
  return (
    <aside className="nav-sidebar">
      <div className="nav-logo" aria-label="Wired">
        <span className="nav-logo-mark" />
      </div>

      <div className="nav-actions">
        {navItems.map(({ key, label, icon: Icon }, index) => (
          <button
            key={label}
            type="button"
            className={`nav-icon-button ${activeSection === key ? "active" : ""}`}
            onClick={() => onChangeSection(key)}
            aria-label={label}
            title={label}
          >
            <Icon size={20} />
            {index < 2 && requestsCount > 0 ? (
              <span className="nav-badge">{requestsCount}</span>
            ) : null}
            <span className="nav-icon-label">{label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="nav-icon-button nav-logout"
        onClick={onLogout}
        aria-label="Logout"
        title="Logout"
      >
        <LogOut size={20} />
        <span className="nav-icon-label">Log out</span>
      </button>
      <div className="nav-rail-icon">
        <Newspaper size={18} />
      </div>
    </aside>
  );
}

export default NavigationSidebar;
