import { Phone, Trash2, Video, XCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import Avatar from "./Avatar";
import MessageBubble from "./MessageBubble";

function ChatWindow({
  activeFriend,
  messages,
  typingUser,
  onlineUsers,
  onStartAudioCall,
  onStartVideoCall,
  disableCallActions,
  onClearChat,
  onDeleteChat,
  chatStatusMessage,
  onDeleteMessage
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  if (!activeFriend) {
    return (
      <div className="chat-placeholder">
        <div className="placeholder-card">
          <div className="placeholder-orb" />
          <p className="eyebrow">Realtime Conversations</p>
          <h2>Start a conversation</h2>
          <p>Pick a friend from the sidebar to send text, image, or video messages.</p>
          <div className="placeholder-features">
            <span>Instant delivery</span>
            <span>Images and videos</span>
            <span>Friend-based chats</span>
          </div>
        </div>
      </div>
    );
  }

  const isOnline = onlineUsers.includes(activeFriend.user._id);

  return (
    <section className="chat-window">
      <header className="chat-header">
        <Avatar user={activeFriend.user} className="large" />
        <div className="chat-person">
          <h3>{activeFriend.user.name}</h3>
          <p>{typingUser ? typingUser : isOnline ? "Online now" : "Offline"}</p>
        </div>
        <div className="chat-call-actions">
          <button
            type="button"
            className="icon-button subtle"
            onClick={onStartAudioCall}
            disabled={disableCallActions}
            aria-label="Start audio call"
          >
            <Phone size={18} />
          </button>
          <button
            type="button"
            className="icon-button subtle"
            onClick={onStartVideoCall}
            disabled={disableCallActions}
            aria-label="Start video call"
          >
            <Video size={18} />
          </button>
          <button
            type="button"
            className="header-action"
            onClick={onClearChat}
            aria-label="Clear chat"
          >
            <XCircle size={16} />
            Clear Chat
          </button>
          <button
            type="button"
            className="header-action danger"
            onClick={onDeleteChat}
            aria-label="Delete chat"
          >
            <Trash2 size={16} />
            Delete Chat
          </button>
        </div>
        <div className="chat-header-badge">{messages.length} messages</div>
      </header>

      {chatStatusMessage && <div className="chat-status-banner">{chatStatusMessage}</div>}

      <div className="message-list">
        {messages.length === 0 ? (
          <div className="empty-chat-card">
            <p className="empty-state">No messages yet. Say hello and break the ice.</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message._id || `${message.timestamp}-${message.senderId}`}
              message={message}
              isOwn={message.isOwn}
              onDeleteMessage={onDeleteMessage}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}

export default ChatWindow;
