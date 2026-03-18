import { Search } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import Avatar from "./Avatar";
import ChatItem from "./ChatItem";
import { getMessagePreviewLabel, getMessageKind } from "../utils/messageType";

const getPreviewText = (friend) =>
  friend?.lastMessage ? getMessagePreviewLabel(friend.lastMessage) : "Start a conversation";

const getArchiveId = (conversation) => {
  if (!conversation) return "";
  if (conversation.type === "group") {
    return conversation.groupId || conversation._id || conversation.user?._id || "";
  }

  return conversation.user?._id || "";
};

function ChatListPanel({
  currentUser,
  friends,
  groups,
  requests,
  activeConversation,
  onlineUsers,
  unreadCounts,
  activeFilter,
  isArchiveView,
  archivedCount,
  archivedChatIds,
  onChangeFilter,
  onSelectConversation,
  onAcceptRequest,
  onOpenArchiveView,
  mobileListOpen,
  onToggleMobileList,
  onFocusSearch
}) {
  const [query, setQuery] = useState("");
  const searchInputRef = useRef(null);

  const directConversations = useMemo(
    () => friends.map((friend) => ({ ...friend, type: "direct" })),
    [friends]
  );

  const groupConversations = useMemo(() => groups.map((group) => ({ ...group, type: "group" })), [groups]);

  const visibleConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const allConversations = [...directConversations, ...groupConversations];
    const scopedConversations = isArchiveView
      ? allConversations.filter((conversation) => archivedChatIds.includes(getArchiveId(conversation)))
      : allConversations.filter((conversation) => !archivedChatIds.includes(getArchiveId(conversation)));

    let filteredConversations = scopedConversations;

    if (activeFilter === "unread") {
      filteredConversations = filteredConversations.filter(
        (conversation) => (unreadCounts[getArchiveId(conversation)] || 0) > 0
      );
    }

    if (activeFilter === "favorites") {
      filteredConversations = filteredConversations.filter(
        (conversation) =>
          (conversation.type === "group"
            ? conversation.members?.some((member) => onlineUsers.includes(member._id))
            : onlineUsers.includes(conversation.user._id)) ||
          ["image", "video", "audio"].includes(getMessageKind(conversation.lastMessage))
      );
    }

    const sortedConversations = filteredConversations.sort((left, right) => {
      const leftTime = new Date(left.lastMessage?.timestamp || left.updatedAt || 0).getTime();
      const rightTime = new Date(right.lastMessage?.timestamp || right.updatedAt || 0).getTime();
      return rightTime - leftTime;
    });

    if (!normalizedQuery) {
      return sortedConversations;
    }

    return sortedConversations.filter((conversation) => {
      const name = conversation.user?.name || "";
      const preview = getPreviewText(conversation) || "";
      const messageText = conversation.lastMessage?.messageText || "";
      const memberNames = conversation.type === "group"
        ? (conversation.members || []).map((member) => member.name).join(" ")
        : "";

      return `${name} ${preview} ${messageText} ${memberNames}`.toLowerCase().includes(normalizedQuery);
    });
  }, [activeFilter, archivedChatIds, directConversations, groupConversations, isArchiveView, onlineUsers, query, unreadCounts]);

  const handleSearch = (value) => {
    setQuery(value);
  };

  useEffect(() => {
    if (onFocusSearch) {
      onFocusSearch.current = () => searchInputRef.current?.focus();
    }
  }, [onFocusSearch]);

  return (
    <aside className={`chat-list-panel ${mobileListOpen ? "open" : ""}`}>
      <div className="chat-list-shell">
        <div className="chat-list-header">
          <div className="chat-list-title-block">
            <h2>Messages</h2>
          </div>
        </div>

        <div className="chat-list-header">
          <button
            type="button"
            className="chat-filter-chip"
            onClick={onOpenArchiveView}
          >
            {isArchiveView ? "Back to chats" : `Archived (${archivedCount})`}
          </button>
        </div>

        <label className="chat-search">
          <Search size={18} />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search conversations..."
          />
        </label>

        {!isArchiveView && (
          <div className="chat-filter-row">
            {[
              { key: "all", label: "All" },
              {
                key: "unread",
                label: "Unread",
                count: Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)
              },
              { key: "favorites", label: "Favorites" }
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`chat-filter-chip ${activeFilter === filter.key ? "active" : ""}`}
                onClick={() => onChangeFilter(filter.key)}
              >
                <span>{filter.label}</span>
                {filter.count ? <em>{filter.count}</em> : null}
              </button>
            ))}
          </div>
        )}

        {requests.length > 0 && !query.trim() && (
          <div className="request-strip-list">
            {requests.slice(0, 1).map((request) => (
              <div key={request._id} className="request-chip">
                <Avatar user={request.requester} className="tiny" />
                <div className="request-chip-copy">
                  <strong>{request.requester.name}</strong>
                  <p>Wants to connect</p>
                </div>
                <button type="button" className="mini-accent-button" onClick={() => onAcceptRequest(request._id)}>
                  Accept
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="chat-list-scroll">
          <div className="chat-list-section">
            <div className="chat-list-section-header">
              <strong>{isArchiveView ? "Archived" : "Conversations"}</strong>
              <span>{isArchiveView ? archivedCount : visibleConversations.length}</span>
            </div>

            {visibleConversations.length === 0 ? (
              <div className="empty-panel">
                <strong>No chats in this filter</strong>
                <p>Try another filter or search for friends.</p>
              </div>
            ) : (
              visibleConversations.map((conversation) => (
                <ChatItem
                  key={`${conversation.type}-${getArchiveId(conversation)}`}
                  title={conversation.user.name}
                  subtitle={getPreviewText(conversation)}
                  time={conversation.lastMessage?.timestamp}
                  badge={unreadCounts[getArchiveId(conversation)]}
                  avatarUser={conversation.user}
                  active={activeConversation?.type === conversation.type && getArchiveId(activeConversation) === getArchiveId(conversation)}
                  isOnline={conversation.type === "group"
                    ? conversation.members?.some((member) => onlineUsers.includes(member._id))
                    : onlineUsers.includes(conversation.user._id)}
                  isPinned={["image", "video", "audio"].includes(getMessageKind(conversation.lastMessage))}
                  onClick={() => onSelectConversation(conversation)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default memo(ChatListPanel);
