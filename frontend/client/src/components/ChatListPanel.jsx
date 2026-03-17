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
  groups,
  requests,
  searchResults,
  activeConversation,
  onlineUsers,
  unreadCounts,
  activeFilter,
  isArchiveView,
  archivedCount,
  archivedChatIds,
  onChangeFilter,
  onSelectConversation,
  onSearch,
  onSendFriendRequest,
  onAcceptRequest,
  onCreateGroup,
  friendActionMessage,
  mobileListOpen,
  onToggleMobileList,
  onFocusSearch,
  onOpenArchiveView
}) {
  const [query, setQuery] = useState("");
  const [showNewChatPanel, setShowNewChatPanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const searchInputRef = useRef(null);

  const previewRequests = useMemo(() => requests.slice(0, 3), [requests]);
  const directConversations = useMemo(
    () => friends.map((friend) => ({ ...friend, type: "direct" })),
    [friends]
  );

  const groupConversations = useMemo(() => groups.map((group) => ({ ...group, type: "group" })), [groups]);

  const visibleConversations = useMemo(() => {
    const allConversations = [...directConversations, ...groupConversations];
    const scopedConversations = isArchiveView
      ? allConversations.filter((conversation) => archivedChatIds.includes(conversation.user._id))
      : allConversations.filter((conversation) => !archivedChatIds.includes(conversation.user._id));

    if (activeFilter === "unread") {
      return scopedConversations.filter(
        (conversation) => (unreadCounts[conversation.user._id] || 0) > 0
      );
    }

    if (activeFilter === "favorites") {
      return scopedConversations.filter(
        (conversation) =>
          (conversation.type === "group"
            ? conversation.members?.some((member) => onlineUsers.includes(member._id))
            : onlineUsers.includes(conversation.user._id)) ||
          ["image", "video", "audio"].includes(getMessageKind(conversation.lastMessage))
      );
    }

    return scopedConversations.sort((left, right) => {
      const leftTime = new Date(left.lastMessage?.timestamp || left.updatedAt || 0).getTime();
      const rightTime = new Date(right.lastMessage?.timestamp || right.updatedAt || 0).getTime();
      return rightTime - leftTime;
    });
  }, [activeFilter, archivedChatIds, directConversations, groupConversations, isArchiveView, onlineUsers, unreadCounts]);

  const handleSearch = (value) => {
    setQuery(value);
    onSearch(value);
  };

  useEffect(() => {
    if (onFocusSearch) {
      onFocusSearch.current = () => searchInputRef.current?.focus();
    }
  }, [onFocusSearch]);

  const handleToggleMember = (memberId) => {
    setSelectedMemberIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMemberIds.length === 0) {
      return;
    }

    await onCreateGroup({
      name: groupName.trim(),
      memberIds: selectedMemberIds
    });

    setGroupName("");
    setSelectedMemberIds([]);
    setShowNewChatPanel(false);
  };

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
            <div className="group-create-panel">
              <strong>Create group</strong>
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Group name"
              />
              <div className="group-create-member-list">
                {friends.length === 0 ? (
                  <p className="small-muted">Add friends first to create a group.</p>
                ) : (
                  friends.map((friend) => (
                    <label key={friend.user._id} className="group-create-member-row">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(friend.user._id)}
                        onChange={() => handleToggleMember(friend.user._id)}
                      />
                      <Avatar user={friend.user} className="tiny" />
                      <span>{friend.user.name}</span>
                    </label>
                  ))
                )}
              </div>
              <button
                type="button"
                className="mini-accent-button"
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedMemberIds.length === 0}
              >
                Create group
              </button>
            </div>
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
                      key={`${conversation.type}-${conversation.user._id}`}
                      title={conversation.user.name}
                      subtitle={getPreviewText(conversation)}
                      time={conversation.lastMessage?.timestamp}
                      badge={unreadCounts[conversation.user._id]}
                      avatarUser={conversation.user}
                      active={activeConversation?.type === conversation.type && activeConversation?.user._id === conversation.user._id}
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
