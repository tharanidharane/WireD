export const getMessageKind = (message = {}) => {
  if (!message) return "text";

  if (message.mediaType === "video" && message.messageText === "__voice__") {
    return "audio";
  }

  if (message.mediaType === "audio") return "audio";
  if (message.mediaType === "image") return "image";
  if (message.mediaType === "video") return "video";
  if (message.mediaType === "file") return "file";

  if (message.mediaUrl) return "file";
  return "text";
};

export const getMessagePreviewLabel = (message = {}) => {
  const kind = getMessageKind(message);

  if (kind === "audio") return "Voice message";
  if (kind === "image") return "Sent an image";
  if (kind === "video") return "Sent a video";
  if (kind === "file") return "Sent a file";

  return message.messageText || "New message";
};
