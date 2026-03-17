import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Plus, SendHorizontal, Smile } from "lucide-react";

const EMOJI_OPTIONS = ["😀", "😂", "😍", "👍", "🔥", "🎉", "🙏", "💬", "😎", "❤️"];

const MessageInput = forwardRef(function MessageInput(
  { onSend, onTypingStart, onTypingStop, disabled },
  ref
) {
  const imageInputRef = useRef(null);
  const textInputRef = useRef(null);
  const recorderRef = useRef(null);
  const recorderStreamRef = useRef(null);
  const recorderChunksRef = useRef([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mediaType, setMediaType] = useState("text");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voiceMode, setVoiceMode] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  useEffect(() => {
    let timer;

    if (isRecording) {
      timer = setInterval(() => {
        setVoiceDuration((current) => current + 1);
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [isRecording]);

  useImperativeHandle(ref, () => ({
    openEmojiPicker: () => {
      if (disabled) return;
      setEmojiPickerOpen(true);
      textInputRef.current?.focus();
    },
    insertEmoji: (emoji) => {
      if (disabled) return;
      setText((current) => `${current}${emoji}`);
      setEmojiPickerOpen(false);
      textInputRef.current?.focus();
    }
  }));

  const stopRecorderTracks = () => {
    recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
    recorderStreamRef.current = null;
  };

  const resetComposer = () => {
    setText("");
    setFile(null);
    setPreview(null);
    setMediaType("text");
    setVoiceMode(false);
    setVoiceDuration(0);
    setIsRecording(false);
    setEmojiPickerOpen(false);
    recorderChunksRef.current = [];
    if (imageInputRef.current) imageInputRef.current.value = "";
    stopRecorderTracks();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text.trim() && !file) return;

    await onSend({
      text: voiceMode ? "__voice__" : text,
      file,
      mediaType
    });

    onTypingStop();
    resetComposer();
  };

  const handleTextChange = (event) => {
    const nextValue = event.target.value;
    setText(nextValue);

    if (nextValue.trim()) {
      onTypingStart();
    } else {
      onTypingStop();
    }
  };

  const handleSelectFile = (event, type) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setMediaType(type);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleSelectEmoji = (emoji) => {
    setText((current) => `${current}${emoji}`);
    setEmojiPickerOpen(false);
    onTypingStart();
    textInputRef.current?.focus();
  };

  const handleToggleRecording = async () => {
    if (disabled) return;

    if (isRecording && recorderRef.current) {
      recorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderStreamRef.current = stream;
      recorderChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recorderChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recorderChunksRef.current, { type: "audio/webm" });
        const voiceFile = new File([blob], `voice-note-${Date.now()}.webm`, {
          type: "audio/webm"
        });

        setFile(voiceFile);
        setMediaType("audio");
        setPreview(URL.createObjectURL(voiceFile));
        setVoiceMode(true);
        stopRecorderTracks();
      };

      setVoiceDuration(0);
      setVoiceMode(true);
      setIsRecording(true);
      recorder.start();
    } catch {
      setIsRecording(false);
      stopRecorderTracks();
    }
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      {preview && (
        <div className="media-preview">
          {voiceMode ? (
            <audio src={preview} controls className="voice-preview" />
          ) : mediaType === "image" ? (
            <img src={preview} alt="preview" />
          ) : (
            <video src={preview} controls />
          )}
          {voiceMode && <span className="voice-preview-label">Voice message preview</span>}
          <button type="button" onClick={resetComposer}>
            Remove
          </button>
        </div>
      )}

      <div className="composer-wrap">
        {emojiPickerOpen && (
          <div className="emoji-picker-popover">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="emoji-picker-item"
                onClick={() => handleSelectEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="composer">
          <button
            type="button"
            className="composer-tool"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled}
            aria-label="Add attachment"
          >
            <Plus size={18} />
          </button>

          <input
            ref={textInputRef}
            value={text}
            onChange={handleTextChange}
            onBlur={onTypingStop}
            className={voiceMode ? "voice-mode-input" : ""}
            placeholder="Type your message here..."
            aria-label="Message"
            disabled={disabled || voiceMode}
          />

          <div className="composer-actions">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpg,image/jpeg"
              hidden
              onChange={(event) => handleSelectFile(event, "image")}
            />

            <button
              type="button"
              onClick={() => setEmojiPickerOpen((current) => !current)}
              className="composer-tool"
              disabled={disabled}
              aria-label="Add emoji"
            >
              <Smile size={18} />
            </button>
            <button type="submit" className="composer-send" disabled={disabled} aria-label="Send message">
              <SendHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>

      {isRecording && (
        <div className="recording-indicator">
          <span className="recording-dot" />
          Recording voice message {voiceDuration}s
        </div>
      )}
    </form>
  );
});

export default MessageInput;
