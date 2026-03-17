import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import ChatHeader from "../components/ChatHeader";
import ChatListPanel from "../components/ChatListPanel";
import ContactProfileModal from "../components/ContactProfileModal";
import MessageInput from "../components/MessageInput";
import MessageList from "../components/MessageList";
import NavigationSidebar from "../components/NavigationSidebar";
import AudioCall from "../components/call/AudioCall";
import IncomingCallModal from "../components/call/IncomingCallModal";
import VideoCall from "../components/call/VideoCall";
import HomePanel from "../components/dashboard/HomePanel";
import ProfilePanel from "../components/dashboard/ProfilePanel";
import SettingsPanel from "../components/dashboard/SettingsPanel";
import { authApi, friendApi, getErrorMessage, groupApi, messageApi } from "../services/api";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp"
      ],
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};

const messageSections = new Set(["message", "archive", "calls"]);

const mapGroupConversation = (group) => ({
  ...group,
  type: "group",
  groupId: group._id,
  user: {
    _id: group._id,
    name: group.name,
    profilePicture: ""
  }
});

const getConversationId = (conversation) => conversation?.user?._id || "";
const getConversationKey = (conversation) => `${conversation?.type || "direct"}:${getConversationId(conversation)}`;

const getConversationMemberIds = (conversation, currentUserId) => {
  if (!conversation) return [];

  if (conversation.type === "group") {
    return (conversation.members || [])
      .map((member) => member._id)
      .filter((memberId) => memberId !== currentUserId);
  }

  return conversation.user?._id ? [conversation.user._id] : [];
};

const getConversationParticipants = (conversation, currentUserId) => {
  if (!conversation) return [];

  if (conversation.type === "group") {
    return (conversation.members || []).filter((member) => member._id !== currentUserId);
  }

  return conversation.user ? [conversation.user] : [];
};

function Chat() {
  const storedUser = useMemo(() => JSON.parse(localStorage.getItem("wired_user") || "{}"), []);
  const token = localStorage.getItem("wired_token");
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const incomingTypingTimeoutRef = useRef(null);
  const statusTimeoutRef = useRef(null);
  const activeConversationRef = useRef(null);
  const searchFocusRef = useRef(null);
  const messageInputRef = useRef(null);
  const mutedChatIdsRef = useRef([]);
  const blockedChatIdsRef = useRef([]);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const remoteStreamsRef = useRef(new Map());
  const remoteVideoElementsRef = useRef(new Map());
  const pendingCandidatesRef = useRef(new Map());
  const activeCallRef = useRef(null);

  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(storedUser);
  const [requests, setRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("wired_theme") || "light");
  const [friendActionMessage, setFriendActionMessage] = useState("");
  const [chatActionMessage, setChatActionMessage] = useState("");
  const [activeSection, setActiveSection] = useState("message");
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [callStatus, setCallStatus] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [preferences, setPreferences] = useState({
    notifications: true,
    typingIndicators: true,
    sounds: true
  });
  const [profileUploadMessage, setProfileUploadMessage] = useState("");
  const [profileUploadError, setProfileUploadError] = useState("");
  const [isUploadingProfilePicture, setIsUploadingProfilePicture] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [activeFilter, setActiveFilter] = useState("all");
  const [mutedChatIds, setMutedChatIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wired_muted_chats") || "[]");
    } catch {
      return [];
    }
  });
  const [blockedChatIds, setBlockedChatIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wired_blocked_chats") || "[]");
    } catch {
      return [];
    }
  });
  const [readMessageIds, setReadMessageIds] = useState({});
  const [contactProfileOpen, setContactProfileOpen] = useState(false);
  const [archivedChatIds, setArchivedChatIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wired_archived_chats") || "[]");
    } catch {
      return [];
    }
  });

  const showChatActionMessage = (message) => {
    clearTimeout(statusTimeoutRef.current);
    setChatActionMessage(message);
    statusTimeoutRef.current = setTimeout(() => setChatActionMessage(""), 3200);
  };

  const pushCallHistory = ({ callType, peerName, direction, status }) => {
    setCallHistory((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        callType,
        peerName,
        direction,
        status,
        timestamp: new Date().toISOString()
      },
      ...current
    ].slice(0, 20));
  };

  const upsertRemoteParticipant = (user) => {
    if (!user?._id) return;

    setRemoteParticipants((current) => {
      const existingIndex = current.findIndex((participant) => participant.user._id === user._id);

      if (existingIndex === -1) {
        return [...current, { user }];
      }

      const next = [...current];
      next[existingIndex] = { user };
      return next;
    });
  };

  const removeRemoteParticipant = (userId) => {
    setRemoteParticipants((current) => current.filter((participant) => participant.user._id !== userId));
  };

  const clearRemoteMedia = () => {
    remoteVideoElementsRef.current.forEach((node) => {
      if (node) {
        node.srcObject = null;
      }
    });
    remoteVideoElementsRef.current.clear();
    remoteStreamsRef.current.clear();
    pendingCandidatesRef.current.clear();
    setRemoteParticipants([]);
  };

  const closePeerConnection = (remoteUserId) => {
    const peer = peerConnectionsRef.current.get(remoteUserId);
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      peer.close();
      peerConnectionsRef.current.delete(remoteUserId);
    }

    const remoteElement = remoteVideoElementsRef.current.get(remoteUserId);
    if (remoteElement) {
      remoteElement.srcObject = null;
    }

    remoteStreamsRef.current.delete(remoteUserId);
    pendingCandidatesRef.current.delete(remoteUserId);
    removeRemoteParticipant(remoteUserId);
  };

  const cleanupCall = () => {
    peerConnectionsRef.current.forEach((_, remoteUserId) => {
      closePeerConnection(remoteUserId);
    });

    peerConnectionsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    localStreamRef.current = null;
    screenStreamRef.current = null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    clearRemoteMedia();
    activeCallRef.current = null;
    setActiveCall(null);
    setIncomingCall(null);
    setCallStatus("");
    setIsMuted(false);
    setIsCameraOff(false);
  };

  const bindRemoteVideo = (userId, node) => {
    if (!userId) return;

    if (!node) {
      remoteVideoElementsRef.current.delete(userId);
      return;
    }

    remoteVideoElementsRef.current.set(userId, node);

    const stream = remoteStreamsRef.current.get(userId);
    if (stream) {
      node.srcObject = stream;
    }
  };

  const assignLocalPreview = () => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = screenStreamRef.current || localStreamRef.current;
  };

  const attachLocalStream = async (callType) => {
    if (localStreamRef.current) {
      assignLocalPreview();
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video"
    });

    localStreamRef.current = stream;
    assignLocalPreview();
    return stream;
  };

  const getCallSocketPayload = () => ({
    callType: activeCallRef.current?.type || incomingCall?.callType || "audio",
    conversationType: activeCallRef.current?.conversationType || incomingCall?.conversationType || "direct",
    groupId:
      (activeCallRef.current?.conversationType === "group" && activeCallRef.current?.conversationId) ||
      incomingCall?.groupId ||
      null
  });

  const resolveUserById = (userId) => {
    if (!userId) return null;
    if (userId === currentUser._id) {
      return currentUser;
    }

    const directUser = friends.find((friend) => friend.user._id === userId)?.user;
    if (directUser) {
      return directUser;
    }

    for (const group of groups) {
      const matchedMember = (group.members || []).find((member) => member._id === userId);
      if (matchedMember) {
        return matchedMember;
      }
    }

    const incomingParticipant = incomingCall?.participants?.find((participant) => participant._id === userId);
    if (incomingParticipant) {
      return incomingParticipant;
    }

    const activeParticipant = activeCallRef.current?.participants?.find((participant) => participant._id === userId);
    return activeParticipant || null;
  };

  const flushPendingCandidates = async (remoteUserId) => {
    const peer = peerConnectionsRef.current.get(remoteUserId);
    if (!peer?.remoteDescription) return;

    const pending = pendingCandidatesRef.current.get(remoteUserId) || [];
    while (pending.length > 0) {
      const candidate = pending.shift();
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingCandidatesRef.current.set(remoteUserId, pending);
  };

  const createPeerConnection = (remoteUser) => {
    if (!remoteUser?._id) return null;

    const existingPeer = peerConnectionsRef.current.get(remoteUser._id);
    if (existingPeer) {
      return existingPeer;
    }

    const peer = new RTCPeerConnection(rtcConfig);
    const remoteStream = new MediaStream();

    remoteStreamsRef.current.set(remoteUser._id, remoteStream);
    upsertRemoteParticipant(remoteUser);

    const remoteElement = remoteVideoElementsRef.current.get(remoteUser._id);
    if (remoteElement) {
      remoteElement.srcObject = remoteStream;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current));
    }

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;

      socketRef.current?.emit("call:signal", {
        to: remoteUser._id,
        candidate: event.candidate,
        ...getCallSocketPayload()
      });
    };

    peer.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        const exists = remoteStream.getTracks().some((existingTrack) => existingTrack.id === track.id);
        if (!exists) {
          remoteStream.addTrack(track);
        }
      });

      const targetElement = remoteVideoElementsRef.current.get(remoteUser._id);
      if (targetElement) {
        targetElement.srcObject = remoteStream;
      }

      setCallStatus("Connected");
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setCallStatus("Connected");
      }

      if (["failed", "closed"].includes(peer.connectionState)) {
        closePeerConnection(remoteUser._id);
      }

      if (peer.connectionState === "disconnected") {
        closePeerConnection(remoteUser._id);
        if (peerConnectionsRef.current.size === 0 && activeCallRef.current?.conversationType === "direct") {
          cleanupCall();
        }
      }
    };

    peerConnectionsRef.current.set(remoteUser._id, peer);
    return peer;
  };

  const handleIncomingSignal = async ({ from, description, candidate }) => {
    const remoteUser = resolveUserById(from);
    if (!remoteUser) return;

    const peer = createPeerConnection(remoteUser);
    if (!peer) return;

    if (candidate) {
      if (!peer.remoteDescription) {
        const pending = pendingCandidatesRef.current.get(from) || [];
        pending.push(candidate);
        pendingCandidatesRef.current.set(from, pending);
        return;
      }

      await peer.addIceCandidate(new RTCIceCandidate(candidate));
      return;
    }

    if (!description) return;

    await peer.setRemoteDescription(new RTCSessionDescription(description));
    await flushPendingCandidates(from);

    if (description.type === "offer") {
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socketRef.current?.emit("call:signal", {
        to: from,
        description: answer,
        ...getCallSocketPayload()
      });
    }
  };

  const refreshConversations = async () => {
    const [friendsResponse, requestsResponse, groupsResponse] = await Promise.all([
      friendApi.list(),
      friendApi.requests(),
      groupApi.list()
    ]);

    const mappedGroups = groupsResponse.data.map(mapGroupConversation);

    setFriends(friendsResponse.data);
    setRequests(requestsResponse.data);
    setGroups(mappedGroups);

    if (socketRef.current) {
      socketRef.current.emit("join-groups", {
        groupIds: mappedGroups.map((group) => group.groupId)
      });
    }

    setActiveConversation((current) => {
      if (!current) return current;

      if (current.type === "group") {
        return mappedGroups.find((group) => group.groupId === current.groupId) || null;
      }

      return friendsResponse.data.find((friend) => friend.user._id === current.user._id) || null;
    });
  };

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("wired_theme", theme);
  }, [theme]);

  useEffect(() => {
    mutedChatIdsRef.current = mutedChatIds;
    localStorage.setItem("wired_muted_chats", JSON.stringify(mutedChatIds));
  }, [mutedChatIds]);

  useEffect(() => {
    blockedChatIdsRef.current = blockedChatIds;
    localStorage.setItem("wired_blocked_chats", JSON.stringify(blockedChatIds));
  }, [blockedChatIds]);

  useEffect(() => {
    localStorage.setItem("wired_archived_chats", JSON.stringify(archivedChatIds));
  }, [archivedChatIds]);

  useEffect(() => {
    if (!activeCall) return;
    assignLocalPreview();
  }, [activeCall]);

  useEffect(() => {
    refreshConversations();

    socketRef.current = io(socketUrl, {
      auth: { token }
    });

    socketRef.current.on("presence:update", (users) => {
      setOnlineUsers(users);
    });

    socketRef.current.on("typing:start", ({ from, fromName }) => {
      if (activeConversationRef.current?.type === "direct" && from === activeConversationRef.current.user._id) {
        setTypingUser(`${fromName} is typing...`);
        clearTimeout(incomingTypingTimeoutRef.current);
        incomingTypingTimeoutRef.current = setTimeout(() => {
          setTypingUser("");
        }, 2200);
      }
    });

    socketRef.current.on("typing:stop", ({ from }) => {
      if (activeConversationRef.current?.type === "direct" && from === activeConversationRef.current.user._id) {
        clearTimeout(incomingTypingTimeoutRef.current);
        setTypingUser("");
      }
    });

    socketRef.current.on("message:new", (message) => {
      if (message.conversationType === "group") {
        const selectedConversation = activeConversationRef.current;
        const isCurrentGroup = selectedConversation?.type === "group" && selectedConversation.groupId === message.groupId;

        if (isCurrentGroup) {
          setMessages((current) => [...current, { ...message, isOwn: message.senderId === currentUser._id }]);
        } else if (!mutedChatIdsRef.current.includes(message.groupId)) {
          setUnreadCounts((current) => ({
            ...current,
            [message.groupId]: (current[message.groupId] || 0) + 1
          }));
        }

        refreshConversations();
        return;
      }

      if (blockedChatIdsRef.current.includes(message.senderId)) {
        return;
      }

      const selectedConversation = activeConversationRef.current;
      const isFromActiveFriend = selectedConversation?.type === "direct" && selectedConversation.user._id === message.senderId;
      const isRelevant =
        selectedConversation?.type === "direct" &&
        ((message.senderId === selectedConversation.user._id && message.receiverId === currentUser._id) ||
          (message.receiverId === selectedConversation.user._id && message.senderId === currentUser._id));

      if (isRelevant) {
        setMessages((current) => [...current, { ...message, isOwn: message.senderId === currentUser._id }]);
        clearTimeout(incomingTypingTimeoutRef.current);
        setTypingUser("");
      }

      if (message.senderId !== currentUser._id && !isFromActiveFriend && !mutedChatIdsRef.current.includes(message.senderId)) {
        setUnreadCounts((current) => ({
          ...current,
          [message.senderId]: (current[message.senderId] || 0) + 1
        }));
      }

      refreshConversations();
    });

    socketRef.current.on("message:deleted", ({ messageId, groupId }) => {
      const currentConversation = activeConversationRef.current;
      const isRelevantGroup = !groupId || currentConversation?.groupId === groupId;
      if (isRelevantGroup) {
        setMessages((current) => current.filter((message) => message._id !== messageId));
      }
      refreshConversations();
    });

    socketRef.current.on("chat:cleared", ({ from, groupId }) => {
      const currentConversation = activeConversationRef.current;
      const isRelevant = groupId
        ? currentConversation?.type === "group" && currentConversation.groupId === groupId
        : currentConversation?.type === "direct" && currentConversation.user._id === from;

      if (isRelevant) {
        setMessages([]);
        showChatActionMessage(groupId ? "This group chat was cleared." : "This chat was cleared.");
      }

      refreshConversations();
    });

    socketRef.current.on("call:incoming", (payload) => {
      setIncomingCall({
        ...payload,
        participants: payload.participants || [payload.caller].filter(Boolean)
      });
      setCallStatus(`Incoming ${payload.callType} call`);
      pushCallHistory({
        callType: payload.callType,
        peerName: payload.conversationType === "group"
          ? payload.conversationName || "Group"
          : payload.caller?.name || "Unknown caller",
        direction: "incoming",
        status: "ringing"
      });
    });

    socketRef.current.on("call:participant-joined", async ({ participant }) => {
      if (!participant?._id || participant._id === currentUser._id) return;
      if (!activeCallRef.current || !localStreamRef.current) return;

      const peer = createPeerConnection(participant);
      if (!peer) return;

      upsertRemoteParticipant(participant);

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socketRef.current?.emit("call:signal", {
        to: participant._id,
        description: offer,
        ...getCallSocketPayload()
      });
    });

    socketRef.current.on("call:signal", async (payload) => {
      try {
        await handleIncomingSignal(payload);
      } catch {
        showChatActionMessage("Call connection failed.");
      }
    });

    socketRef.current.on("call:rejected", ({ from }) => {
      if (activeCallRef.current?.conversationType === "direct") {
        showChatActionMessage("Your call was rejected.");
        pushCallHistory({
          callType: activeCallRef.current.type,
          peerName: activeCallRef.current.conversationName,
          direction: "outgoing",
          status: "rejected"
        });
        cleanupCall();
        return;
      }

      closePeerConnection(from);
    });

    socketRef.current.on("call:ended", ({ from, conversationType }) => {
      if (conversationType === "group") {
        closePeerConnection(from);
        showChatActionMessage("A participant left the call.");
        return;
      }

      showChatActionMessage("Call ended.");
      cleanupCall();
    });

    return () => {
      socketRef.current?.disconnect();
      clearTimeout(typingTimeoutRef.current);
      clearTimeout(incomingTypingTimeoutRef.current);
      clearTimeout(statusTimeoutRef.current);
      cleanupCall();
    };
  }, [currentUser._id, token]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversation) return;

      const response = activeConversation.type === "group"
        ? await messageApi.getGroupMessages(activeConversation.groupId)
        : await messageApi.getMessages(activeConversation.user._id);

      setMessages(
        response.data.map((message) => ({
          ...message,
          isOwn: message.senderId === currentUser._id
        }))
      );
      setReadMessageIds({});
    };

    loadMessages();
    clearTimeout(incomingTypingTimeoutRef.current);
    setTypingUser("");
  }, [activeConversation, currentUser._id]);

  useEffect(() => {
    if (!activeConversation) return;

    setMobileListOpen(false);
    setUnreadCounts((current) => ({
      ...current,
      [getConversationId(activeConversation)]: 0
    }));
  }, [activeConversation]);

  useEffect(() => {
    if (!activeConversation) return;

    const relevantOnline = activeConversation.type === "group"
      ? activeConversation.members?.some((member) => member._id !== currentUser._id && onlineUsers.includes(member._id))
      : onlineUsers.includes(activeConversation.user._id);

    if (!relevantOnline) return;

    const timer = setTimeout(() => {
      setReadMessageIds((current) => {
        const next = { ...current };
        let changed = false;

        messages.forEach((message) => {
          if (message.isOwn && !message.pending && message._id && !next[message._id]) {
            next[message._id] = true;
            changed = true;
          }
        });

        return changed ? next : current;
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [activeConversation, currentUser._id, messages, onlineUsers]);

  const handleSearch = async (email) => {
    if (!email.trim()) {
      setSearchResults([]);
      setFriendActionMessage("");
      return;
    }

    const { data } = await friendApi.search(email);
    setSearchResults(data);
  };

  const handleCreateGroup = async ({ name, memberIds }) => {
    try {
      const { data } = await groupApi.create({ name, memberIds });
      const nextGroup = mapGroupConversation(data);
      setFriendActionMessage(`Created ${data.name}`);
      await refreshConversations();
      setActiveConversation(nextGroup);
      setActiveSection("message");
    } catch (error) {
      setFriendActionMessage(getErrorMessage(error, "Could not create group"));
    }
  };

  const handleSendFriendRequest = async (recipientId) => {
    try {
      const { data } = await friendApi.sendRequest(recipientId);
      setSearchResults((current) => current.filter((user) => user._id !== recipientId));
      setFriendActionMessage(data.message || "Friend request sent");
      await refreshConversations();
    } catch (error) {
      setFriendActionMessage(getErrorMessage(error, "Could not add friend"));
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await friendApi.acceptRequest(requestId);
      setFriendActionMessage("Friend request accepted");
      await refreshConversations();
    } catch (error) {
      setFriendActionMessage(getErrorMessage(error, "Could not accept friend request"));
    }
  };

  const handleSendMessage = async ({ text, file, mediaType }) => {
    if (!activeConversation) return;

    const formData = new FormData();
    formData.append("messageText", text);
    formData.append("mediaType", file ? mediaType : "text");

    if (file) {
      formData.append("media", file);
    }

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: optimisticId,
      senderId: currentUser._id,
      receiverId: activeConversation.type === "direct" ? activeConversation.user._id : null,
      groupId: activeConversation.type === "group" ? activeConversation.groupId : null,
      conversationType: activeConversation.type,
      messageText: text.trim(),
      mediaType: file ? mediaType : "text",
      mediaUrl: file ? URL.createObjectURL(file) : "",
      timestamp: new Date().toISOString(),
      isOwn: true,
      pending: true,
      sender: currentUser
    };

    setMessages((current) => [...current, optimisticMessage]);
    setTypingUser("");

    if (activeConversation.type === "direct") {
      socketRef.current?.emit("typing:stop", { to: activeConversation.user._id });
    }

    try {
      const { data } = activeConversation.type === "group"
        ? await messageApi.sendGroup(activeConversation.groupId, formData)
        : await messageApi.send(activeConversation.user._id, formData);

      const normalized = { ...data, isOwn: true, pending: false };

      setMessages((current) =>
        current.map((message) => (message._id === optimisticId ? normalized : message))
      );

      refreshConversations();
    } catch (error) {
      setMessages((current) => current.filter((message) => message._id !== optimisticId));
      showChatActionMessage(getErrorMessage(error, "Could not send message"));
    }
  };

  const handleTypingStart = () => {
    if (!activeConversation || activeConversation.type !== "direct") return;
    socketRef.current?.emit("typing:start", {
      to: activeConversation.user._id,
      fromName: currentUser.name
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing:stop", { to: activeConversation.user._id });
    }, 1400);
  };

  const handleTypingStop = () => {
    if (!activeConversation || activeConversation.type !== "direct") return;
    clearTimeout(typingTimeoutRef.current);
    socketRef.current?.emit("typing:stop", { to: activeConversation.user._id });
  };

  const handleLogout = () => {
    localStorage.removeItem("wired_token");
    localStorage.removeItem("wired_user");
    window.location.href = "/login";
  };

  const handleToggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const handleTogglePreference = (key) => {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key]
    }));
  };

  const handleProfilePictureChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setProfileUploadMessage("");
    setProfileUploadError("");
    setIsUploadingProfilePicture(true);

    try {
      const formData = new FormData();
      formData.append("profilePicture", file);

      const { data } = await authApi.uploadProfilePicture(formData);
      setCurrentUser(data.user);
      localStorage.setItem("wired_user", JSON.stringify(data.user));
      setProfileUploadMessage(data.message || "Profile picture updated");
    } catch (error) {
      setProfileUploadError(getErrorMessage(error, "Could not upload profile picture"));
    } finally {
      setIsUploadingProfilePicture(false);
    }
  };

  const handleDeleteSingleMessage = async (message) => {
    if (!window.confirm("Delete this message?")) return;

    try {
      await messageApi.deleteSingle(message._id);
      setMessages((current) => current.filter((item) => item._id !== message._id));
      refreshConversations();
      showChatActionMessage("Message deleted.");
    } catch (error) {
      showChatActionMessage(getErrorMessage(error, "Could not delete message"));
    }
  };

  const handleSelectConversation = (conversation) => {
    if (getConversationKey(activeConversation) === getConversationKey(conversation)) {
      setActiveConversation(null);
      setMessages([]);
      setTypingUser("");
      setContactProfileOpen(false);
      return;
    }

    setActiveConversation(conversation);
    setContactProfileOpen(false);
    setActiveSection((current) => (current === "archive" ? "archive" : "message"));
    setUnreadCounts((current) => ({
      ...current,
      [getConversationId(conversation)]: 0
    }));
  };

  const handleToggleArchive = () => {
    if (!activeConversation) return;

    const conversationId = getConversationId(activeConversation);
    const isArchived = archivedChatIds.includes(conversationId);

    setArchivedChatIds((current) =>
      isArchived ? current.filter((id) => id !== conversationId) : [...current, conversationId]
    );
    showChatActionMessage(isArchived ? "Chat moved back to active chats." : "Chat archived.");
    setActiveSection(isArchived ? "message" : "archive");
  };

  const handleClearChat = async () => {
    if (!activeConversation || !window.confirm("Clear this conversation?")) return;

    try {
      if (activeConversation.type === "group") {
        await messageApi.clearGroupConversation(activeConversation.groupId);
      } else {
        await messageApi.clearConversation(activeConversation.user._id);
      }

      setMessages([]);
      showChatActionMessage(activeConversation.type === "group" ? "Group chat cleared." : "Chat cleared.");
      refreshConversations();
    } catch (error) {
      showChatActionMessage(getErrorMessage(error, "Could not clear chat"));
    }
  };

  const handleDeleteChat = async () => {
    if (!activeConversation || activeConversation.type !== "direct") return;
    if (!activeConversation.friendshipId || !window.confirm("Delete this chat and remove this friend?")) {
      return;
    }

    try {
      await friendApi.delete(activeConversation.friendshipId);
      setMessages([]);
      setActiveConversation(null);
      setContactProfileOpen(false);
      showChatActionMessage("Chat deleted.");
      refreshConversations();
    } catch (error) {
      showChatActionMessage(getErrorMessage(error, "Could not delete chat"));
    }
  };

  const handleToggleMuteChat = () => {
    if (!activeConversation) return;

    const conversationId = getConversationId(activeConversation);
    const isMutedChat = mutedChatIds.includes(conversationId);
    setMutedChatIds((current) =>
      isMutedChat ? current.filter((id) => id !== conversationId) : [...current, conversationId]
    );
    showChatActionMessage(isMutedChat ? "Notifications enabled." : "Notifications muted.");
  };

  const handleBlockUser = () => {
    if (!activeConversation || activeConversation.type !== "direct") return;
    if (!window.confirm(`Block ${activeConversation.user.name}?`)) return;

    setBlockedChatIds((current) =>
      current.includes(activeConversation.user._id) ? current : [...current, activeConversation.user._id]
    );
    setMessages([]);
    setActiveConversation(null);
    setContactProfileOpen(false);
    showChatActionMessage("User blocked locally.");
  };

  const handleOpenEmojiPicker = () => {
    messageInputRef.current?.openEmojiPicker();
  };

  const startCall = async (callType) => {
    if (!activeConversation) return;

    try {
      setCallStatus(`Starting ${callType} call...`);
      await attachLocalStream(callType);

      const participantIds = getConversationMemberIds(activeConversation, currentUser._id);
      const participants = getConversationParticipants(activeConversation, currentUser._id);

      const nextCall = {
        type: callType,
        conversationType: activeConversation.type,
        conversationId: activeConversation.type === "group" ? activeConversation.groupId : activeConversation.user._id,
        conversationName: activeConversation.user.name,
        participantIds,
        participants
      };

      setActiveCall(nextCall);
      activeCallRef.current = nextCall;
      setCallStatus("Calling...");
      pushCallHistory({
        callType,
        peerName: activeConversation.user?.name || "Contact",
        direction: "outgoing",
        status: "started"
      });

      socketRef.current?.emit("call:ring", {
        toUserIds: participantIds,
        caller: {
          _id: currentUser._id,
          name: currentUser.name,
          email: currentUser.email,
          profilePicture: currentUser.profilePicture || ""
        },
        participants: [
          {
            _id: currentUser._id,
            name: currentUser.name,
            email: currentUser.email,
            profilePicture: currentUser.profilePicture || ""
          },
          ...participants
        ],
        callType,
        conversationType: activeConversation.type,
        groupId: activeConversation.type === "group" ? activeConversation.groupId : null,
        conversationName: activeConversation.user.name
      });
    } catch {
      setCallStatus("Could not start call");
      cleanupCall();
    }
  };

  const handleAudioCallAction = () => {
    if (incomingCall) return;
    if (activeCall) {
      handleEndCall();
      return;
    }

    startCall("audio");
  };

  const handleVideoCallAction = () => {
    if (incomingCall) return;
    if (activeCall) {
      handleEndCall();
      return;
    }

    startCall("video");
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    try {
      await attachLocalStream(incomingCall.callType);

      const participants = (incomingCall.participants || []).filter((participant) => participant._id !== currentUser._id);
      const nextCall = {
        type: incomingCall.callType,
        conversationType: incomingCall.conversationType,
        conversationId: incomingCall.groupId || incomingCall.caller?._id,
        conversationName: incomingCall.conversationName || incomingCall.caller?.name || "Contact",
        participantIds: participants.map((participant) => participant._id),
        participants
      };

      setActiveCall(nextCall);
      activeCallRef.current = nextCall;
      setIncomingCall(null);
      setCallStatus("Connecting...");
      pushCallHistory({
        callType: incomingCall.callType,
        peerName: nextCall.conversationName,
        direction: "incoming",
        status: "accepted"
      });

      socketRef.current?.emit("call:participant-joined", {
        toUserIds: participants.map((participant) => participant._id),
        participant: {
          _id: currentUser._id,
          name: currentUser.name,
          email: currentUser.email,
          profilePicture: currentUser.profilePicture || ""
        },
        callType: incomingCall.callType,
        conversationType: incomingCall.conversationType,
        groupId: incomingCall.groupId || null
      });
    } catch {
      cleanupCall();
    }
  };

  const handleRejectCall = () => {
    if (!incomingCall) return;

    pushCallHistory({
      callType: incomingCall.callType,
      peerName: incomingCall.conversationType === "group"
        ? incomingCall.conversationName || "Group"
        : incomingCall.caller?.name || "Unknown caller",
      direction: "incoming",
      status: "rejected"
    });

    socketRef.current?.emit("call:rejected", {
      toUserIds: (incomingCall.participants || []).map((participant) => participant._id).filter((userId) => userId !== currentUser._id),
      conversationType: incomingCall.conversationType,
      groupId: incomingCall.groupId || null
    });

    setIncomingCall(null);
    setCallStatus("");
  };

  const handleEndCall = () => {
    if (activeCall) {
      pushCallHistory({
        callType: activeCall.type,
        peerName: activeCall.conversationName || "Contact",
        direction: "outgoing",
        status: "ended"
      });

      socketRef.current?.emit("call:ended", {
        toUserIds: activeCall.participantIds,
        conversationType: activeCall.conversationType,
        groupId: activeCall.conversationType === "group" ? activeCall.conversationId : null
      });
    }

    cleanupCall();
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  };

  const handleToggleCamera = () => {
    const nextCameraOff = !isCameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    setIsCameraOff(nextCameraOff);
  };

  const handleShareScreen = async () => {
    if (!localStreamRef.current || activeCall?.type !== "video") return;

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = displayStream;
      const [screenTrack] = displayStream.getVideoTracks();

      peerConnectionsRef.current.forEach((peer) => {
        const sender = peer.getSenders().find((item) => item.track?.kind === "video");
        sender?.replaceTrack(screenTrack);
      });

      assignLocalPreview();

      screenTrack.onended = async () => {
        const [cameraTrack] = localStreamRef.current?.getVideoTracks() || [];
        peerConnectionsRef.current.forEach((peer) => {
          const sender = peer.getSenders().find((item) => item.track?.kind === "video");
          if (cameraTrack) {
            sender?.replaceTrack(cameraTrack);
          }
        });

        screenStreamRef.current?.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
        assignLocalPreview();
      };
    } catch {
      setCallStatus("Screen sharing was cancelled");
    }
  };

  const handleChangeSection = (section) => {
    setActiveSection(section);
    if (messageSections.has(section)) {
      setMobileListOpen(true);
    }
  };

  const isOnline = activeConversation?.type === "direct"
    ? onlineUsers.includes(activeConversation.user._id)
    : Boolean(activeConversation?.members?.some((member) => member._id !== currentUser._id && onlineUsers.includes(member._id)));

  const onlineCount = activeConversation?.type === "group"
    ? (activeConversation.members || []).filter((member) => member._id !== currentUser._id && onlineUsers.includes(member._id)).length
    : isOnline ? 1 : 0;

  const memberCount = activeConversation?.type === "group"
    ? activeConversation.members?.length || 0
    : activeConversation ? 2 : 0;

  const isArchived = activeConversation ? archivedChatIds.includes(getConversationId(activeConversation)) : false;
  const isMutedChat = activeConversation ? mutedChatIds.includes(getConversationId(activeConversation)) : false;

  const renderWorkspace = () => {
    if (activeSection === "calls") {
      return (
        <div className="workspace-single-view">
          <HomePanel
            user={currentUser}
            friends={friends.filter((friend) => onlineUsers.includes(friend.user._id))}
            requests={requests}
            onlineUsers={onlineUsers}
            callHistory={callHistory}
            onOpenMessages={() => setActiveSection("message")}
          />
        </div>
      );
    }

    if (activeSection === "home" || activeSection === "news") {
      return (
        <div className="workspace-single-view">
          <HomePanel
            user={currentUser}
            friends={friends}
            requests={requests}
            onlineUsers={onlineUsers}
            callHistory={callHistory}
            onOpenMessages={() => setActiveSection("message")}
          />
        </div>
      );
    }

    if (activeSection === "profile") {
      return (
        <div className="workspace-single-view">
          <ProfilePanel
            user={currentUser}
            friendsCount={friends.length + groups.length}
            onlineUsersCount={onlineUsers.length}
            uploadMessage={profileUploadMessage}
            uploadError={profileUploadError}
            isUploading={isUploadingProfilePicture}
            onProfilePictureChange={handleProfilePictureChange}
          />
        </div>
      );
    }

    if (activeSection === "settings") {
      return (
        <div className="workspace-single-view">
          <SettingsPanel
            theme={theme}
            onToggleTheme={handleToggleTheme}
            preferences={preferences}
            onTogglePreference={handleTogglePreference}
          />
        </div>
      );
    }

    return (
      <div className="workspace-layout">
        <ChatListPanel
          currentUser={currentUser}
          friends={friends.filter((friend) => !blockedChatIds.includes(friend.user._id))}
          groups={groups}
          requests={requests}
          searchResults={searchResults}
          activeConversation={activeConversation}
          onlineUsers={onlineUsers}
          unreadCounts={unreadCounts}
          activeFilter={activeFilter}
          isArchiveView={activeSection === "archive"}
          archivedCount={archivedChatIds.length}
          archivedChatIds={archivedChatIds}
          onChangeFilter={setActiveFilter}
          onSelectConversation={handleSelectConversation}
          onSearch={handleSearch}
          onSendFriendRequest={handleSendFriendRequest}
          onAcceptRequest={handleAcceptRequest}
          onCreateGroup={handleCreateGroup}
          friendActionMessage={friendActionMessage}
          mobileListOpen={mobileListOpen}
          onToggleMobileList={() => setMobileListOpen((current) => !current)}
          onFocusSearch={searchFocusRef}
          onOpenArchiveView={() => setActiveSection("archive")}
        />

        <main className="chat-room-shell">
          <div className="chat-room-card">
            <ChatHeader
              activeFriend={activeConversation}
              typingUser={typingUser}
              isOnline={isOnline}
              onlineCount={onlineCount}
              memberCount={memberCount}
              messageCount={messages.length}
              isMutedChat={isMutedChat}
              isArchived={isArchived}
              conversationType={activeConversation?.type || "direct"}
              onStartAudioCall={handleAudioCallAction}
              onStartVideoCall={handleVideoCallAction}
              disableCallActions={!activeConversation || !!incomingCall}
              onToggleArchive={handleToggleArchive}
              onClearChat={handleClearChat}
              onDeleteChat={handleDeleteChat}
              onToggleMuteNotifications={handleToggleMuteChat}
              onBlockUser={handleBlockUser}
              onViewProfile={() => setContactProfileOpen(true)}
            />

            {chatActionMessage ? <div className="chat-banner">{chatActionMessage}</div> : null}

            <MessageList
              activeFriend={activeConversation}
              currentUser={currentUser}
              messages={messages}
              onDeleteMessage={handleDeleteSingleMessage}
              onOpenEmojiPicker={handleOpenEmojiPicker}
              readMessageIds={readMessageIds}
            />

            <MessageInput
              ref={messageInputRef}
              onSend={handleSendMessage}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
              disabled={!activeConversation || (activeConversation.type === "direct" && blockedChatIds.includes(activeConversation.user._id))}
            />
          </div>
        </main>
      </div>
    );
  };

  return (
    <div className="chat-app-shell">
      <div className="chat-surface">
        <NavigationSidebar
          activeSection={activeSection}
          onChangeSection={handleChangeSection}
          requestsCount={requests.length}
          onLogout={handleLogout}
        />

        {renderWorkspace()}
      </div>

      <IncomingCallModal call={incomingCall} onAccept={handleAcceptCall} onReject={handleRejectCall} />

      <ContactProfileModal
        user={activeConversation?.type === "direct" ? activeConversation.user : null}
        open={contactProfileOpen && activeConversation?.type === "direct"}
        onClose={() => setContactProfileOpen(false)}
        isBlocked={Boolean(activeConversation?.type === "direct" && blockedChatIds.includes(activeConversation.user._id))}
        isMuted={Boolean(activeConversation && mutedChatIds.includes(getConversationId(activeConversation)))}
      />

      {activeCall?.type === "video" && (
        <VideoCall
          localVideoRef={localVideoRef}
          remoteParticipants={remoteParticipants}
          bindRemoteVideo={bindRemoteVideo}
          callStatus={callStatus}
          remoteName={activeCall.conversationName || "Contact"}
          currentUserName={currentUser.name || "You"}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onEndCall={handleEndCall}
          onShareScreen={handleShareScreen}
        />
      )}

      {activeCall?.type === "audio" && (
        <AudioCall
          localVideoRef={localVideoRef}
          remoteParticipants={remoteParticipants}
          bindRemoteVideo={bindRemoteVideo}
          callStatus={callStatus}
          remoteName={activeCall.conversationName || "Contact"}
          currentUserName={currentUser.name || "You"}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onEndCall={handleEndCall}
        />
      )}
    </div>
  );
}

export default Chat;
