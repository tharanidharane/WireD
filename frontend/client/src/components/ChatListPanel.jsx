import { Menu, MessageSquarePlus, Search, SlidersHorizontal, UserPlus } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import Avatar from "./Avatar";
import ChatItem from "./ChatItem";
import { getMessagePreviewLabel, getMessageKind } from "../utils/messageType";

const getPreviewText = (friend) =>
  friend?.lastMessage ? getMessagePreviewLabel(friend.lastMessage) : "Start a conversation";

function ChatListPanel({
  currentUser,
  friends,
  requests,
  searchResults,
  activeFriend,
  onlineUsers,
  unreadCounts,
  activeFilter,
  isArchiveView,
  archivedCount,
  archivedChatIds,
  onChangeFilter,
  onSelectFriend,
  onSearch,
  onSendFriendRequest,
  onAcceptRequest,
  friendActionMessage,
  mobileListOpen,
  onToggleMobileList,
  onFocusSearch,
  onOpenArchiveView
}) {
  const [query, setQuery] = useState("");
  const [showNewChatPanel, setShowNewChatPanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const searchInputRef = useRef(null);

  const previewRequests = useMemo(() => requests.slice(0, 3), [requests]);
  const visibleFriends = useMemo(() => {
    const scopedFriends = isArchiveView
      ? friends.filter((friend) => archivedChatIds.includes(friend.user._id))
      : friends.filter((friend) => !archivedChatIds.includes(friend.user._id));

    if (activeFilter === "unread") {
      return scopedFriends.filter((friend) => (unreadCounts[friend.user._id] || 0) > 0);
    }

    if (activeFilter === "favorites") {
      return scopedFriends.filter(
        (friend) =>
          onlineUsers.includes(friend.user._id) ||
          ["image", "video", "audio"].includes(getMessageKind(friend.lastMessage))
      );
    }

    return scopedFriends;
  }, [activeFilter, archivedChatIds, friends, isArchiveView, onlineUsers, unreadCounts]);

  const handleSearch = (value) => {
    setQuery(value);
    onSearch(value);
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
            <h2>{isArchiveView ? "Archived" : "Chats"}</h2>
          </div>
          <div className="chat-list-actions">
            <button
              type="button"
              className="panel-icon"
              aria-label="New chat"
              onClick={() => {
                setShowNewChatPanel((current) => !current);
                setShowFilterPanel(false);
              }}
            >
              <MessageSquarePlus size={18} />
            </button>
            <button
              type="button"
              className="panel-icon"
              aria-label="Chat menu"
              onClick={() => {
                setShowFilterPanel((current) => !current);
                setShowNewChatPanel(false);
              }}
            >
              <SlidersHorizontal size={18} />
            </button>
            <button type="button" className="panel-icon only-mobile" onClick={onToggleMobileList}>
              <Menu size={18} />
            </button>
          </div>
        </div>

        {showNewChatPanel && (
          <div className="chat-list-popover">
            <strong>Start a new chat</strong>
            <p>Search by email to find someone and send a friend request.</p>
            <button
              type="button"
              className="mini-accent-button"
              onClick={() => {
                setShowNewChatPanel(false);
                onFocusSearch?.current?.();
              }}
            >
              Focus search
            </button>
          </div>
        )}

        {showFilterPanel && (
          <div className="chat-list-popover">
            <strong>Chat tools</strong>
            <p>Quickly switch filters or jump to archived conversations.</p>
            <div className="chat-list-popover-actions">
              <button type="button" className="chat-filter-chip active" onClick={() => onChangeFilter("all")}>
                All chats
              </button>
              <button type="button" className="chat-filter-chip" onClick={() => onChangeFilter("unread")}>
                Unread
              </button>
              <button type="button" className="chat-filter-chip" onClick={() => onChangeFilter("favorites")}>
                Favorites
              </button>
              <button type="button" className="chat-filter-chip" onClick={onOpenArchiveView}>
                Archive
              </button>
            </div>
          </div>
        )}

        <label className="chat-search">
          <Search size={18} />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search users by email"
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

        {friendActionMessage ? <p className="panel-status">{friendActionMessage}</p> : null}

        {query.trim() ? (
          <div className="chat-list-scroll search-mode">
            {searchResults.length === 0 ? (
              <div className="empty-panel">
                <strong>No matching users</strong>
                <p>Try another email address.</p>
              </div>
            ) : (
              searchResults.map((result) => (
                <div key={result._id} className="search-result-card">
                  <div className="search-result-main">
                    <Avatar user={result} className="chat-list-avatar" />
                    <div className="search-result-copy">
                      <strong>{result.name}</strong>
                      <p>{result.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mini-accent-button"
                    onClick={() => onSendFriendRequest(result._id)}
                  >
                    <UserPlus size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            {requests.length > 0 && (
              <div className="request-strip">
                <div className="request-strip-header">
                  <strong>Friend requests</strong>
                  <span>{requests.length}</span>
                </div>
                <div className="request-strip-list">
                  {previewRequests.map((request) => (
                    <div key={request._id} className="request-chip">
                      <Avatar user={request.requester} className="tiny" />
                      <div className="request-chip-copy">
                        <strong>{request.requester.name}</strong>
                        <p>Wants to connect</p>
                      </div>
                      <button
                        type="button"
                        className="mini-accent-button"
                        onClick={() => onAcceptRequest(request._id)}
                      >
                        Accept
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="chat-list-scroll">
              <div className="chat-list-section">
                <div className="chat-list-section-header">
                  <strong>{isArchiveView ? "Archived chats" : "Recent chats"}</strong>
                  <span>{isArchiveView ? archivedCount : visibleFriends.length}</span>
                </div>

                {visibleFriends.length === 0 ? (
                  <div className="empty-panel">
                    <strong>No chats in this filter</strong>
                    <p>Try another filter or search for friends.</p>
                  </div>
                ) : (
                  visibleFriends.map((friend) => (
                    <ChatItem
                      key={friend.user._id}
                      title={friend.user.name}
                      subtitle={getPreviewText(friend)}
                      time={friend.lastMessage?.timestamp}
                      badge={unreadCounts[friend.user._id]}
                      avatarUser={friend.user}
                      active={activeFriend?.user._id === friend.user._id}
                      isOnline={onlineUsers.includes(friend.user._id)}
                      isPinned={["image", "video", "audio"].includes(getMessageKind(friend.lastMessage))}
                      onClick={() => onSelectFriend(friend)}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        )}

        <div className="chat-list-footer">
          <Avatar user={currentUser} className="tiny" />
          <div>
            <strong>{currentUser.name || "Guest"}</strong>
            <p>{currentUser.email || "wired user"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default memo(ChatListPanel);
