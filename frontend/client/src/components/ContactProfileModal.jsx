import { CalendarDays, Mail, UserRound, X } from "lucide-react";
import Avatar from "./Avatar";

function ContactProfileModal({ user, open, onClose, isBlocked, isMuted }) {
  if (!open || !user) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="contact-profile-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="close-ghost" onClick={onClose} aria-label="Close profile">
          <X size={18} />
        </button>

        <Avatar user={user} className="xxl" />
        <h3>{user.name || "Contact"}</h3>
        <p className="small-muted">Direct chat profile</p>

        <div className="contact-profile-stats">
          <div className="contact-profile-row">
            <Mail size={16} />
            <span>{user.email || "No email available"}</span>
          </div>
          <div className="contact-profile-row">
            <CalendarDays size={16} />
            <span>
              Joined {new Date(user.createdAt || Date.now()).toLocaleDateString()}
            </span>
          </div>
          <div className="contact-profile-row">
            <UserRound size={16} />
            <span>{isBlocked ? "Blocked locally" : isMuted ? "Notifications muted" : "Active contact"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactProfileModal;
