import { MoreVertical, Phone, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";

function ChatHeader({
  activeFriend,
  typingUser,
  isOnline,
  onlineCount,
  memberCount,
  messageCount,
  isMutedChat,
  isArchived,
  conversationType = "direct",
  onStartAudioCall,
  onStartVideoCall,
  disableCallActions,
  onToggleArchive,
  onClearChat,
  onDeleteChat,
  onToggleMuteNotifications,
  onBlockUser,
  onViewProfile
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!activeFriend) return null;

  const handleAction = (callback) => {
    callback?.();
    setMenuOpen(false);
  };

  const subtitle = typingUser ||
    (conversationType === "group"
      ? `${memberCount || 0} members, ${onlineCount || 0} online`
      : `2 members, ${isOnline ? "1 online" : "offline"}`);

  return (
    <header className="chat-room-header">
      <div className="chat-room-heading">
        <Avatar user={activeFriend.user} className="large" />
        <div className="chat-room-heading-copy">
          <h2>{activeFriend.user.name}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="chat-room-meta">
        <div className="chat-room-count">{messageCount} messages</div>
        <button
          type="button"
          className="panel-icon"
          onClick={onStartAudioCall}
          disabled={disableCallActions}
          aria-label="Toggle audio call"
        >
          <Phone size={18} />
        </button>
        <button
          type="button"
          className="panel-icon"
          onClick={onStartVideoCall}
          disabled={disableCallActions}
          aria-label="Toggle video call"
        >
          <Video size={18} />
        </button>

        <div className="chat-header-menu" ref={menuRef}>
          <button
            type="button"
            className="panel-icon"
            aria-label="More options"
            onClick={() => setMenuOpen((current) => !current)}
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <div className="chat-header-dropdown">
              <button type="button" onClick={() => handleAction(onClearChat)}>
                Clear chat
              </button>
              <button type="button" onClick={() => handleAction(onToggleArchive)}>
                {isArchived ? "Move to chats" : "Archive chat"}
              </button>
              {conversationType === "direct" && (
                <button type="button" onClick={() => handleAction(onDeleteChat)}>
                  Delete chat
                </button>
              )}
              <button type="button" onClick={() => handleAction(onToggleMuteNotifications)}>
                {isMutedChat ? "Unmute notifications" : "Mute notifications"}
              </button>
              {conversationType === "direct" && (
                <button type="button" onClick={() => handleAction(onBlockUser)}>
                  Block user
                </button>
              )}
              {conversationType === "direct" && (
                <button type="button" onClick={() => handleAction(onViewProfile)}>
                  View profile
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default ChatHeader;
