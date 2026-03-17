import { memo, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

function MessageList({
  activeFriend,
  currentUser,
  messages,
  onDeleteMessage,
  onOpenEmojiPicker,
  readMessageIds
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!activeFriend) {
    return (
      <div className="chat-empty-state">
        <div className="chat-empty-card">
          <p className="panel-kicker">Realtime workspace</p>
          <h2>Select a conversation</h2>
          <p>Open a chat from the left panel to start messaging, sharing media, or launching a call.</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="chat-message-stream">
        <div className="empty-panel large">
          <strong>No messages yet</strong>
          <p>Say hello and start the conversation with {activeFriend.user.name}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-message-stream">
      {messages.map((message) => (
        <MessageBubble
          key={message._id || `${message.timestamp}-${message.senderId}`}
          message={message}
          isOwn={message.isOwn}
          currentUser={currentUser}
          activeFriend={activeFriend.user}
          onDeleteMessage={onDeleteMessage}
          onOpenEmojiPicker={onOpenEmojiPicker}
          isRead={Boolean(readMessageIds?.[message._id])}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

export default memo(MessageList);
