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
import { authApi, friendApi, getErrorMessage, messageApi } from "../services/api";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

const messageSections = new Set(["message", "archive", "calls"]);

function Chat() {
  const storedUser = useMemo(() => JSON.parse(localStorage.getItem("wired_user") || "{}"), []);
  const token = localStorage.getItem("wired_token");
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const incomingTypingTimeoutRef = useRef(null);
  const statusTimeoutRef = useRef(null);
  const activeFriendRef = useRef(null);
  const searchFocusRef = useRef(null);
  const messageInputRef = useRef(null);
  const mutedChatIdsRef = useRef([]);
  const blockedChatIdsRef = useRef([]);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [friends, setFriends] = useState([]);
  const [currentUser, setCurrentUser] = useState(storedUser);
  const [requests, setRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("wired_theme") || "light");
  const [friendActionMessage, setFriendActionMessage] = useState("");
  const [chatActionMessage, setChatActionMessage] = useState("");
  const [activeSection, setActiveSection] = useState("message");
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
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

  const cleanupCall = () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    localStreamRef.current = null;
    screenStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setActiveCall(null);
    setIncomingCall(null);
    setCallStatus("");
    setIsMuted(false);
    setIsCameraOff(false);
  };

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

  const createPeerConnection = (targetUserId) => {
    const peer = new RTCPeerConnection(rtcConfig);
    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("ice-candidate", {
          to: targetUserId,
          candidate: event.candidate
        });
      }
    };

    peer.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      setCallStatus("Connected");
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setCallStatus("Connected");
      }

      if (["disconnected", "failed", "closed"].includes(peer.connectionState)) {
        cleanupCall();
      }
    };

    peerConnectionRef.current = peer;
    return peer;
  };

  const attachLocalStream = async (callType) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video"
    });

    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  };

  const flushPendingCandidates = async () => {
    if (!peerConnectionRef.current) return;

    while (pendingCandidatesRef.current.length > 0) {
      const candidate = pendingCandidatesRef.current.shift();
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  useEffect(() => {
    activeFriendRef.current = activeFriend;
  }, [activeFriend]);

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

  const hydrateSidebar = async () => {
    const [friendsResponse, requestsResponse] = await Promise.all([
      friendApi.list(),
      friendApi.requests()
    ]);

    setFriends(friendsResponse.data);
    setRequests(requestsResponse.data);
  };

  useEffect(() => {
    hydrateSidebar();

    socketRef.current = io(socketUrl, {
      auth: { token }
    });

    socketRef.current.on("presence:update", (users) => {
      setOnlineUsers(users);
    });

    socketRef.current.on("typing:start", ({ from, fromName }) => {
      if (from === activeFriendRef.current?.user._id) {
        setTypingUser(`${fromName} is typing...`);
        clearTimeout(incomingTypingTimeoutRef.current);
        incomingTypingTimeoutRef.current = setTimeout(() => {
          setTypingUser("");
        }, 2200);
      }
    });

    socketRef.current.on("typing:stop", ({ from }) => {
      if (from === activeFriendRef.current?.user._id) {
        clearTimeout(incomingTypingTimeoutRef.current);
        setTypingUser("");
      }
    });

    socketRef.current.on("message:new", (message) => {
      if (blockedChatIdsRef.current.includes(message.senderId)) {
        return;
      }

      const selectedFriend = activeFriendRef.current;
      const isFromActiveFriend = selectedFriend?.user._id === message.senderId;
      const isRelevant =
        selectedFriend &&
        ((message.senderId === selectedFriend.user._id && message.receiverId === currentUser._id) ||
          (message.receiverId === selectedFriend.user._id && message.senderId === currentUser._id));

      if (isRelevant) {
        setMessages((current) => [
          ...current,
          { ...message, isOwn: message.senderId === currentUser._id }
        ]);
        if (message.senderId === selectedFriend?.user._id) {
          clearTimeout(incomingTypingTimeoutRef.current);
          setTypingUser("");
        }
      }

      if (
        message.senderId !== currentUser._id &&
        !isFromActiveFriend &&
        !mutedChatIdsRef.current.includes(message.senderId)
      ) {
        setUnreadCounts((current) => ({
          ...current,
          [message.senderId]: (current[message.senderId] || 0) + 1
        }));
      }

      hydrateSidebar();
    });

    socketRef.current.on("message:deleted", ({ messageId }) => {
      setMessages((current) => current.filter((message) => message._id !== messageId));
      hydrateSidebar();
    });

    socketRef.current.on("chat:cleared", ({ from }) => {
      if (from === activeFriendRef.current?.user._id) {
        setMessages([]);
        showChatActionMessage("This chat was cleared.");
      }
      hydrateSidebar();
    });

    socketRef.current.on("call:incoming", ({ from, caller, offer, callType }) => {
      setIncomingCall({ from, caller, offer, callType });
      setCallStatus(`Incoming ${callType} call`);
      pushCallHistory({
        callType,
        peerName: caller?.name || "Unknown caller",
        direction: "incoming",
        status: "ringing"
      });
    });

    socketRef.current.on("call:answered", async ({ answer }) => {
      if (!peerConnectionRef.current) return;
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      await flushPendingCandidates();
      setCallStatus("Connected");
    });

    socketRef.current.on("call:rejected", () => {
      showChatActionMessage("Your call was rejected.");
      pushCallHistory({
        callType: activeCall?.type || "audio",
        peerName: activeCall?.withUser?.name || "Contact",
        direction: "outgoing",
        status: "rejected"
      });
      cleanupCall();
    });

    socketRef.current.on("call:ended", () => {
      showChatActionMessage("Call ended.");
      pushCallHistory({
        callType: activeCall?.type || "audio",
        peerName: activeCall?.withUser?.name || "Contact",
        direction: "outgoing",
        status: "ended"
      });
      cleanupCall();
    });

    socketRef.current.on("call:ice-candidate", async ({ candidate }) => {
      if (!peerConnectionRef.current?.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }

      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
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
      if (!activeFriend) return;
      const { data } = await messageApi.getMessages(activeFriend.user._id);
      setMessages(
        data.map((message) => ({
          ...message,
          isOwn: message.senderId === currentUser._id
        }))
      );
      setReadMessageIds({});
    };

    loadMessages();
    clearTimeout(incomingTypingTimeoutRef.current);
    setTypingUser("");
  }, [activeFriend, currentUser._id]);

  useEffect(() => {
    if (activeFriend) {
      setMobileListOpen(false);
      setUnreadCounts((current) => ({
        ...current,
        [activeFriend.user._id]: 0
      }));
    }
  }, [activeFriend]);

  useEffect(() => {
    if (!activeFriend || !onlineUsers.includes(activeFriend.user._id)) return;

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
  }, [activeFriend, messages, onlineUsers]);

  const handleSearch = async (email) => {
    if (!email.trim()) {
      setSearchResults([]);
      setFriendActionMessage("");
      return;
    }

    const { data } = await friendApi.search(email);
    setSearchResults(data);
  };

  const handleSendFriendRequest = async (recipientId) => {
    try {
      const { data } = await friendApi.sendRequest(recipientId);
      setSearchResults((current) => current.filter((user) => user._id !== recipientId));
      setFriendActionMessage(data.message || "Friend request sent");
      await hydrateSidebar();
    } catch (error) {
      setFriendActionMessage(getErrorMessage(error, "Could not add friend"));
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await friendApi.acceptRequest(requestId);
      setFriendActionMessage("Friend request accepted");
      await hydrateSidebar();
    } catch (error) {
      setFriendActionMessage(getErrorMessage(error, "Could not accept friend request"));
    }
  };

  const handleSendMessage = async ({ text, file, mediaType }) => {
    if (!activeFriend) return;

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
      receiverId: activeFriend.user._id,
      messageText: text.trim(),
      mediaType: file ? mediaType : "text",
      mediaUrl: file ? URL.createObjectURL(file) : "",
      timestamp: new Date().toISOString(),
      isOwn: true,
      pending: true
    };

    setMessages((current) => [...current, optimisticMessage]);
    setTypingUser("");
    socketRef.current?.emit("typing:stop", { to: activeFriend.user._id });

    try {
      const { data } = await messageApi.send(activeFriend.user._id, formData);
      const normalized = { ...data, isOwn: true, pending: false };

      setMessages((current) =>
        current.map((message) => (message._id === optimisticId ? normalized : message))
      );

      hydrateSidebar();
    } catch (error) {
      setMessages((current) => current.filter((message) => message._id !== optimisticId));
    }
  };

  const handleTypingStart = () => {
    if (!activeFriend) return;
    socketRef.current?.emit("typing:start", {
      to: activeFriend.user._id,
      fromName: currentUser.name
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing:stop", { to: activeFriend.user._id });
    }, 1400);
  };

  const handleTypingStop = () => {
    if (!activeFriend) return;
    clearTimeout(typingTimeoutRef.current);
    socketRef.current?.emit("typing:stop", { to: activeFriend.user._id });
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
      hydrateSidebar();
      showChatActionMessage("Message deleted.");
    } catch (error) {
      showChatActionMessage(getErrorMessage(error, "Could not delete message"));
    }
  };

  const handleSelectFriend = (friend) => {
    if (activeFriend?.user._id === friend.user._id) {
      setActiveFriend(null);
      setMessages([]);
      setTypingUser("");
      setContactProfileOpen(false);
      return;
    }

    setActiveFriend(friend);
    setContactProfileOpen(false);
    setActiveSection((current) => (current === "archive" ? "archive" : "message"));
    setUnreadCounts((current) => ({
      ...current,
      [friend.user._id]: 0
    }));
  };

  const handleToggleArchive = () => {
    if (!activeFriend) return;

    const friendId = activeFriend.user._id;
    const isArchived = archivedChatIds.includes(friendId);

    setArchivedChatIds((current) =>
      isArchived ? current.filter((id) => id !== friendId) : [...current, friendId]
    );
    showChatActionMessage(isArchived ? "Chat moved back to active chats." : "Chat archived.");

    setActiveSection(isArchived ? "message" : "archive");
  };

  const startCall = async (callType) => {
    if (!activeFriend) return;

    try {
      setCallStatus(`Starting ${callType} call...`);
      const stream = await attachLocalStream(callType);
      const peer = createPeerConnection(activeFriend.user._id);

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      setActiveCall({
        type: callType,
        withUser: activeFriend.user
      });
      setCallStatus("Calling...");
      pushCallHistory({
        callType,
        peerName: activeFriend.user?.name || "Contact",
        direction: "outgoing",
        status: "started"
      });

      socketRef.current?.emit("call-user", {
        to: activeFriend.user._id,
        caller: {
          _id: currentUser._id,
          name: currentUser.name,
          email: currentUser.email
        },
        offer,
        callType
      });
    } catch (error) {
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
      const stream = await attachLocalStream(incomingCall.callType);
      const peer = createPeerConnection(incomingCall.from);

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      await flushPendingCandidates();

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socketRef.current?.emit("answer-call", {
        to: incomingCall.from,
        answer,
        callType: incomingCall.callType
      });

      setActiveCall({
        type: incomingCall.callType,
        withUser: incomingCall.caller
      });
      setIncomingCall(null);
      setCallStatus("Connecting...");
      pushCallHistory({
        callType: incomingCall.callType,
        peerName: incomingCall.caller?.name || "Unknown caller",
        direction: "incoming",
        status: "accepted"
      });
    } catch (error) {
      cleanupCall();
    }
  };

  const handleRejectCall = () => {
    if (!incomingCall) return;
    pushCallHistory({
      callType: incomingCall.callType,
      peerName: incomingCall.caller?.name || "Unknown caller",
      direction: "incoming",
      status: "rejected"
    });
    socketRef.current?.emit("reject-call", { to: incomingCall.from });
    setIncomingCall(null);
    setCallStatus("");
  };

  const handleEndCall = () => {
    if (activeCall) {
      pushCallHistory({
        callType: activeCall.type,
        peerName: activeCall.withUser?.name || "Contact",
        direction: "outgoing",
        status: "ended"
      });
    }
    const targetId = activeCall?.withUser?._id || incomingCall?.from;
    if (targetId) {
      socketRef.current?.emit("end-call", { to: targetId });
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
    if (!peerConnectionRef.current || !localStreamRef.current || activeCall?.type !== "video") return;

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = displayStream;
      const [screenTrack] = displayStream.getVideoTracks();
      const sender = peerConnectionRef.current
        .getSenders()
        .find((item) => item.track?.kind === "video");

      if (!screenTrack || !sender) return;

      await sender.replaceTrack(screenTrack);

      if (localVideoRef.current) {
        const previewStream = new MediaStream([
          screenTrack,
          ...localStreamRef.current.getAudioTracks()
        ]);
        localVideoRef.current.srcObject = previewStream;
      }

      screenTrack.onended = async () => {
        const [cameraTrack] = localStreamRef.current?.getVideoTracks() || [];
        if (!cameraTrack || !peerConnectionRef.current) return;

        const cameraSender = peerConnectionRef.current
          .getSenders()
          .find((item) => item.track?.kind === "video");

        await cameraSender?.replaceTrack(cameraTrack);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        screenStreamRef.current?.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      };
    } catch (error) {
      setCallStatus("Screen sharing was cancelled");
    }
  };

  const handleChangeSection = (section) => {
    setActiveSection(section);
    if (messageSections.has(section)) {
      setMobileListOpen(true);
    }
  };

  const handleClearChat = async () => {
    if (!activeFriend || !window.confirm("Clear this conversation?")) return;

    try {
      await messageApi.clearConversation(activeFriend.user._id);
      setMessages([]);
      showChatActionMessage("Chat cleared.");
      hydrateSidebar();
    } catch (error) {
      showChatActionMessage(getErrorMessage(error, "Could not clear chat"));
    }
  };

  const handleDeleteChat = async () => {
    if (!activeFriend?.friendshipId || !window.confirm("Delete this chat and remove this friend?")) return;

    try {
      await friendApi.delete(activeFriend.friendshipId);
      setMessages([]);
      setActiveFriend(null);
      setContactProfileOpen(false);
      showChatActionMessage("Chat deleted.");
      hydrateSidebar();
    } catch (error) {
      showChatActionMessage(getErrorMessage(error, "Could not delete chat"));
    }
  };

  const handleToggleMuteChat = () => {
    if (!activeFriend) return;

    const friendId = activeFriend.user._id;
    const isMuted = mutedChatIds.includes(friendId);
    setMutedChatIds((current) =>
      isMuted ? current.filter((id) => id !== friendId) : [...current, friendId]
    );
    showChatActionMessage(isMuted ? "Notifications enabled." : "Notifications muted.");
  };

  const handleBlockUser = () => {
    if (!activeFriend || !window.confirm(`Block ${activeFriend.user.name}?`)) return;

    setBlockedChatIds((current) =>
      current.includes(activeFriend.user._id) ? current : [...current, activeFriend.user._id]
    );
    setMessages([]);
    setActiveFriend(null);
    setContactProfileOpen(false);
    showChatActionMessage("User blocked locally.");
  };

  const handleOpenEmojiPicker = () => {
    messageInputRef.current?.openEmojiPicker();
  };

  const isOnline = activeFriend ? onlineUsers.includes(activeFriend.user._id) : false;
  const isArchived = activeFriend ? archivedChatIds.includes(activeFriend.user._id) : false;
  const isMutedChat = activeFriend ? mutedChatIds.includes(activeFriend.user._id) : false;

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
            friendsCount={friends.length}
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
          requests={requests}
          searchResults={searchResults}
          activeFriend={activeFriend}
          onlineUsers={onlineUsers}
          unreadCounts={unreadCounts}
          activeFilter={activeFilter}
          isArchiveView={activeSection === "archive"}
          archivedCount={archivedChatIds.length}
          archivedChatIds={archivedChatIds}
          onChangeFilter={setActiveFilter}
          onSelectFriend={handleSelectFriend}
          onSearch={handleSearch}
          onSendFriendRequest={handleSendFriendRequest}
          onAcceptRequest={handleAcceptRequest}
          friendActionMessage={friendActionMessage}
          mobileListOpen={mobileListOpen}
          onToggleMobileList={() => setMobileListOpen((current) => !current)}
          onFocusSearch={searchFocusRef}
          onOpenArchiveView={() => setActiveSection("archive")}
        />

        <main className="chat-room-shell">
          <div className="chat-room-card">
            <ChatHeader
              activeFriend={activeFriend}
              typingUser={typingUser}
              isOnline={isOnline}
              messageCount={messages.length}
              isMutedChat={isMutedChat}
              isArchived={isArchived}
              onStartAudioCall={handleAudioCallAction}
              onStartVideoCall={handleVideoCallAction}
              disableCallActions={!activeFriend || !!incomingCall}
              onToggleArchive={handleToggleArchive}
              onClearChat={handleClearChat}
              onDeleteChat={handleDeleteChat}
              onToggleMuteNotifications={handleToggleMuteChat}
              onBlockUser={handleBlockUser}
              onViewProfile={() => setContactProfileOpen(true)}
            />

            {chatActionMessage ? <div className="chat-banner">{chatActionMessage}</div> : null}

            <MessageList
              activeFriend={activeFriend}
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
              disabled={!activeFriend || blockedChatIds.includes(activeFriend?.user._id)}
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

      <IncomingCallModal
        call={incomingCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      <ContactProfileModal
        user={activeFriend?.user}
        open={contactProfileOpen}
        onClose={() => setContactProfileOpen(false)}
        isBlocked={Boolean(activeFriend && blockedChatIds.includes(activeFriend.user._id))}
        isMuted={Boolean(activeFriend && mutedChatIds.includes(activeFriend.user._id))}
      />

      {activeCall?.type === "video" && (
        <VideoCall
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          callStatus={callStatus}
          remoteName={activeCall.withUser?.name || "Contact"}
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
          remoteVideoRef={remoteVideoRef}
          callStatus={callStatus}
          remoteName={activeCall.withUser?.name || "Contact"}
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
