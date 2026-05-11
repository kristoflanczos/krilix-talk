import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Ban,
  Bell,
  BellOff,
  BellRing,
  CheckCheck,
  Download,
  FileText,
  ImagePlus,
  SearchX,
  Star,
  Trash2,
  Users,
  UserPlus,
  Crown,
  Forward,
  Mic,
  Moon,
  MonitorUp,
  Phone,
  PhoneOff,
  Settings2,
  StopCircle,
  Sun,
  Video,
  VideoOff,
  MicOff,
  Info,
  LogOut,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Reply,
  Search,
  SendHorizontal,
  ShieldCheck,
  Smile,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const reactions = ["❤️", "😂", "👍", "🔥", "👏"];
const composerEmojis = ["😀", "😂", "😍", "👍", "🔥", "❤️", "👏", "😎", "🤝", "🎉", "🙏", "👀"];
const stickerPresets = [
  { label: "Krilix", value: "🚀" },
  { label: "Pacsi", value: "🙌" },
  { label: "Oké", value: "👌" },
  { label: "Tűz", value: "🔥" },
  { label: "Szív", value: "💙" },
  { label: "Kávé", value: "☕" },
];
const gifPresets = [
  { label: "Party", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
  { label: "Nice", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif" },
  { label: "Wow", url: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif" },
  { label: "Done", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
];

const currentTime = (value = new Date()) =>
  value.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });

const formatDay = (value) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Ma";
  if (date.toDateString() === yesterday.toDateString()) return "Tegnap";

  return date.toLocaleDateString("hu-HU", {
    month: "short",
    day: "numeric",
  });
};

function Avatar({ label, src, status = "online", size = "md" }) {
  return (
    <span className={`avatarWrap ${size}`}>
      {src ? <img className="avatarImage" src={src} alt={label || "Avatar"} /> : <span className="avatar">{label}</span>}
      <i className={`presence ${status}`} />
    </span>
  );
}

function normalizeStatus(status) {
  if (status === "busy") return "busy";
  if (status === "away") return "away";
  if (status === "online") return "online";
  return "offline";
}

function presenceLabel(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "online") return "Elérhető";
  if (normalized === "away") return "Távol";
  if (normalized === "busy") return "Elfoglalt";
  return "Offline";
}

function chatStatusLabel(chat) {
  if (!chat) return "";
  if (chat.isGroup) return `${chat.members.length} tag`;

  const status = normalizeStatus(chat.liveStatus || chat.status);
  if (status !== "offline") return presenceLabel(status);

  return `Utoljára aktív: ${formatLastSeen(chat.lastSeenAt)}`;
}

function getAvatarUrl(path) {
  if (!path) return null;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

function getGroupAvatarUrl(path) {
  if (!path) return null;
  return supabase.storage.from("group-avatars").getPublicUrl(path).data.publicUrl;
}

function roleLabel(role) {
  if (role === "owner") return "Tulajdonos";
  if (role === "admin") return "Admin";
  return "Tag";
}

function formatLastSeen(value) {
  if (!value) return "Nincs adat";
  const date = new Date(value);
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) return "épp most";
  if (diffMinutes < 60) return `${diffMinutes} perce`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} órája`;

  return date.toLocaleDateString("hu-HU", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function highlightText(text, query) {
  if (!text || !query?.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.split(new RegExp(`(${escaped})`, "ig")).map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? <mark key={index}>{part}</mark> : part
  );
}
function firstUrl(text = "") {
  return text.match(/https?:\/\/[^\s]+/i)?.[0] || null;
}

function hostLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatDuration(seconds = 0) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
function AuthScreen({ onReady }) {
  const [mode, setMode] = useState("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function ensureProfile(user, explicitName = "") {
    const fallbackName = explicitName || user.email?.split("@")[0] || "Felhasználó";
    const avatar = fallbackName.trim()[0]?.toUpperCase() || "U";

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        display_name: fallbackName,
        avatar,
      },
      { onConflict: "id" }
    );

    if (error) throw error;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (mode === "signup") {
        if (!displayName.trim()) throw new Error("Adj meg egy nevet.");

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim(),
            },
          },
        });

        if (error) throw error;

        setMessage("Fiók létrehozva. Erősítsd meg az e-mail címedet, majd lépj be.");
      } else if (mode === "reset") {
        if (!email.trim()) throw new Error("Adj meg egy e-mail címet.");

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/?reset=1`,
        });

        if (error) throw error;

        setMessage("Elküldtük a jelszó-visszaállító levelet.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          await ensureProfile(data.user);
          onReady();
        }
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authGate cinematicGate">
      <div className="gateAurora gateAuroraOne" />
      <div className="gateAurora gateAuroraTwo" />
      <div className="gateGrid" />
      <section className="authCard">
        <span>KRILIX TALK</span>
        <h1>{mode === "signin" ? "Belépés" : mode === "signup" ? "Regisztráció" : "Jelszó-visszaállítás"}</h1>
        <p>Valódi, Supabase-es chat.</p>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Megjelenített név"
            />
          )}
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="E-mail"
          />
          {mode !== "reset" && (
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Jelszó"
            />
          )}
          <button disabled={busy}>
            {busy
              ? "Dolgozom..."
              : mode === "signin"
                ? "Belépés"
                : mode === "signup"
                  ? "Regisztráció"
                  : "Visszaállító e-mail küldése"}
          </button>
        </form>

        {message && <em>{message}</em>}

        <div className="authSwitches">
          <button className="switchAuth" onClick={() => setMode((value) => value === "signin" ? "signup" : "signin")}>
            {mode === "signup" ? "Van már fiókod? Belépés" : "Még nincs fiókod? Regisztráció"}
          </button>
          {mode !== "reset" ? (
            <button className="switchAuth" onClick={() => setMode("reset")}>
              Elfelejtett jelszó
            </button>
          ) : (
            <button className="switchAuth" onClick={() => setMode("signin")}>
              Vissza a belépéshez
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
function ModalShell({ children, close }) {
  return (
    <div className="modalBackdrop" onClick={close}>
      <section className="modalCard" onClick={(event) => event.stopPropagation()}>
        <button className="closeButton" onClick={close}><X size={18} /></button>
        {children}
      </section>
    </div>
  );
}

function NewDirectChatModal({ close, onCreate }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await onCreate(email.trim().toLowerCase());
      close();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell close={close}>
      <h2>Új beszélgetés</h2>
      <p>Annak az e-mail címét írd be, aki már regisztrált.</p>
      <form className="authInlineForm" onSubmit={submit}>
        <input
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="pelda@email.com"
        />
        <button disabled={busy}>{busy ? "..." : "Létrehozás"}</button>
      </form>
      {message && <em className="formMessage">{message}</em>}
    </ModalShell>
  );
}

function NewGroupModal({ close, onCreate }) {
  const [title, setTitle] = useState("");
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await onCreate({
        title: title.trim(),
        emails: emails
          .split(/[,\n;]/)
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean),
      });
      close();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell close={close}>
      <h2>Új csoport</h2>
      <p>Adj nevet a csoportnak, majd írd be a már regisztrált tagok e-mail címeit.</p>
      <form className="stackForm" onSubmit={submit}>
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Csoport neve"
        />
        <textarea
          value={emails}
          onChange={(event) => setEmails(event.target.value)}
          placeholder={"tag1@email.com, tag2@email.com"}
        />
        <button disabled={busy}>{busy ? "Létrehozás..." : "Csoport létrehozása"}</button>
      </form>
      {message && <em className="formMessage">{message}</em>}
    </ModalShell>
  );
}

function GroupSettingsModal({ chat, close, saveGroup }) {
  const [title, setTitle] = useState(chat.displayName);
  const [avatarFile, setAvatarFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await saveGroup({
        title: title.trim(),
        avatarFile,
      });
      close();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const previewUrl = avatarFile ? URL.createObjectURL(avatarFile) : chat.avatarUrl;

  return (
    <ModalShell close={close}>
      <h2>Csoport szerkesztése</h2>
      <form className="profileForm" onSubmit={submit}>
        <div className="profileAvatarEditor">
          <Avatar label={chat.avatar} src={previewUrl} status="online" size="lg" />
          <label>
            Csoportkép
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
            />
          </label>
        </div>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Csoport neve" />
        <button disabled={busy}>{busy ? "Mentés..." : "Mentés"}</button>
      </form>
      {message && <em className="formMessage">{message}</em>}
    </ModalShell>
  );
}

function ConfirmModal({ title, text, confirmLabel = "Törlés", onConfirm, onCancel }) {
  return (
    <ModalShell close={onCancel}>
      <div className="confirmModal">
        <h2>{title}</h2>
        <p>{text}</p>
        <footer>
          <button onClick={onCancel}>Mégse</button>
          <button className="dangerButton" onClick={onConfirm}>{confirmLabel}</button>
        </footer>
      </div>
    </ModalShell>
  );
}


function ForwardModal({ message, chats, activeChatId, close, forwardMessage }) {
  const eligibleChats = chats.filter((chat) => chat.id !== activeChatId);

  return (
    <ModalShell close={close}>
      <h2>Üzenet továbbítása</h2>
      <p>Válassz beszélgetést.</p>
      <div className="forwardList">
        {eligibleChats.length === 0 ? (
          <em className="formMessage">Nincs másik beszélgetésed.</em>
        ) : (
          eligibleChats.map((chat) => (
            <button key={chat.id} onClick={() => forwardMessage(message, chat.id)}>
              <Avatar label={chat.avatar} src={chat.avatarUrl} status={chat.isGroup ? "online" : chat.liveStatus || "offline"} size="sm" />
              <span>
                <strong>{chat.displayName}</strong>
                <em>{chat.isGroup ? "Csoport" : "Privát chat"}</em>
              </span>
            </button>
          ))
        )}
      </div>
    </ModalShell>
  );
}

function Lightbox({ media, activeId, close, setActiveId }) {
  const index = media.findIndex((item) => item.id === activeId);
  const current = media[index];

  if (!current) return null;

  const previous = media[(index - 1 + media.length) % media.length];
  const next = media[(index + 1) % media.length];

  return (
    <div className="lightboxBackdrop" onClick={close}>
      <button className="lightboxClose" onClick={close}><X size={22} /></button>
      {media.length > 1 && <button className="lightboxNav prev" onClick={(event) => {
        event.stopPropagation();
        setActiveId(previous.id);
      }}>‹</button>}
      <figure onClick={(event) => event.stopPropagation()}>
        <img src={current.signedUrl} alt={current.attachment_name || "Kép"} />
        <figcaption>{current.attachment_name || "Kép"}</figcaption>
      </figure>
      {media.length > 1 && <button className="lightboxNav next" onClick={(event) => {
        event.stopPropagation();
        setActiveId(next.id);
      }}>›</button>}
    </div>
  );
}


function IncomingCallModal({ call, caller, acceptCall, declineCall }) {
  return (
    <ModalShell close={declineCall}>
      <div className="incomingCallCard">
        <Avatar label={caller?.avatar || "?"} src={caller?.avatarUrl} status="online" size="lg" />
        <span>Bejövő {call.type === "video" ? "videóhívás" : "hanghívás"}</span>
        <h2>{caller?.display_name || "Ismeretlen felhasználó"}</h2>
        <footer>
          <button className="declineCallButton" onClick={declineCall}>
            <PhoneOff size={19} />
            Elutasítás
          </button>
          <button className="acceptCallButton" onClick={acceptCall}>
            <Phone size={19} />
            Fogadás
          </button>
        </footer>
      </div>
    </ModalShell>
  );
}

function CallOverlay({ call, peer, role, updateCallStatus, closeCall }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const peerConnectionRef = useRef(null);
  const signalChannelRef = useRef(null);
  const offerSentRef = useRef(false);
  const cameraTrackRef = useRef(null);
  const [connectionState, setConnectionState] = useState(call.status === "ringing" ? "csörög" : "kapcsolódás");
  const [signalReady, setSignalReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setupCall() {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: call.type === "video",
        });

        if (cancelled) {
          localStream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = localStream;
        cameraTrackRef.current = localStream.getVideoTracks()[0] || null;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }

        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        peerConnectionRef.current = peerConnection;

        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => {
            const exists = remoteStreamRef.current.getTracks().some((item) => item.id === track.id);
            if (!exists) remoteStreamRef.current.addTrack(track);
          });

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
          }
        };

        peerConnection.onicecandidate = async (event) => {
          if (event.candidate) {
            await signalChannelRef.current?.send({
              type: "broadcast",
              event: "ice-candidate",
              payload: {
                candidate: event.candidate.toJSON(),
              },
            });
          }
        };

        peerConnection.onconnectionstatechange = () => {
          const state = peerConnection.connectionState;
          if (state === "connected") setConnectionState("kapcsolatban");
          if (state === "connecting") setConnectionState("kapcsolódás");
          if (state === "disconnected") setConnectionState("megszakadt");
          if (state === "failed") setConnectionState("hiba");
          if (state === "closed") setConnectionState("lezárva");
        };

        const signalChannel = supabase
          .channel(`krilix-call:${call.id}`)
          .on("broadcast", { event: "offer" }, async ({ payload }) => {
            if (role !== "callee" || !payload?.sdp) return;
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            await signalChannel.send({
              type: "broadcast",
              event: "answer",
              payload: {
                sdp: peerConnection.localDescription,
              },
            });
          })
          .on("broadcast", { event: "answer" }, async ({ payload }) => {
            if (role !== "caller" || !payload?.sdp) return;
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          })
          .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
            if (!payload?.candidate) return;
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (error) {
              console.error("ICE candidate hiba", error);
            }
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              setSignalReady(true);
            }
          });

        signalChannelRef.current = signalChannel;
      } catch (error) {
        alert(error.message || "Nem sikerült elindítani a hívást.");
        closeCall();
      }
    }

    setupCall();

    return () => {
      cancelled = true;
      signalChannelRef.current && supabase.removeChannel(signalChannelRef.current);
      peerConnectionRef.current?.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [call.id, call.type, role]);

  useEffect(() => {
    async function createOffer() {
      if (
        role !== "caller" ||
        call.status !== "answered" ||
        offerSentRef.current ||
        !peerConnectionRef.current ||
        !signalChannelRef.current ||
        !signalReady
      ) {
        return;
      }

      offerSentRef.current = true;
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      await signalChannelRef.current.send({
        type: "broadcast",
        event: "offer",
        payload: {
          sdp: peerConnectionRef.current.localDescription,
        },
      });
    }

    createOffer();
  }, [call.status, role, signalReady]);

  function toggleMute() {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }

  function toggleCamera() {
    const next = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setCameraOff(next);
  }

  async function toggleScreenShare() {
    if (call.type !== "video") return;

    if (sharingScreen) {
      const sender = peerConnectionRef.current
        ?.getSenders()
        .find((item) => item.track?.kind === "video");

      if (sender && cameraTrackRef.current) {
        await sender.replaceTrack(cameraTrackRef.current);
      }

      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      setSharingScreen(false);
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      const sender = peerConnectionRef.current
        ?.getSenders()
        .find((item) => item.track?.kind === "video");

      if (sender) {
        await sender.replaceTrack(screenTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
      }

      screenTrack.onended = async () => {
        if (sender && cameraTrackRef.current) {
          await sender.replaceTrack(cameraTrackRef.current);
        }

        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        setSharingScreen(false);
      };

      setSharingScreen(true);
    } catch {
      setSharingScreen(false);
    }
  }

  async function hangUp() {
    const nextStatus = call.status === "ringing" && role === "caller" ? "cancelled" : "ended";
    await updateCallStatus(call.id, nextStatus);
    closeCall();
  }

  return (
    <div className="callOverlay">
      <div className="callBackdrop" />
      <section className={`callStage ${call.type}`}>
        <header>
          <div>
            <Avatar label={peer?.avatar || "?"} src={peer?.avatarUrl} status="online" />
            <span>
              <strong>{peer?.display_name || "Felhasználó"}</strong>
              <em>{call.type === "video" ? "Videóhívás" : "Hanghívás"} • {connectionState}</em>
            </span>
          </div>
        </header>

        <div className="callVideos">
          {call.type === "video" ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="remoteVideo" />
              <video ref={localVideoRef} autoPlay muted playsInline className="localVideo" />
            </>
          ) : (
            <div className="audioCallHero">
              <Avatar label={peer?.avatar || "?"} src={peer?.avatarUrl} status="online" size="lg" />
              <strong>{peer?.display_name || "Felhasználó"}</strong>
              <span>{connectionState}</span>
              <audio ref={remoteVideoRef} autoPlay />
            </div>
          )}
        </div>

        <footer>
          <button className={muted ? "active" : ""} onClick={toggleMute}>
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          {call.type === "video" && (
            <>
              <button className={cameraOff ? "active" : ""} onClick={toggleCamera}>
                {cameraOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
              <button className={sharingScreen ? "active" : ""} onClick={toggleScreenShare}>
                <MonitorUp size={20} />
              </button>
            </>
          )}
          <button className="hangUpButton" onClick={hangUp}>
            <PhoneOff size={21} />
          </button>
        </footer>
      </section>
    </div>
  );
}


function PasswordRecoveryModal({ close }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("A jelszó legalább 6 karakter legyen.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("A két jelszó nem egyezik.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Jelszó frissítve.");
      window.history.replaceState({}, document.title, window.location.pathname);
      window.setTimeout(close, 700);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell close={close}>
      <h2>Új jelszó</h2>
      <form className="stackForm" onSubmit={submit}>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Új jelszó"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Új jelszó újra"
        />
        <button disabled={busy}>{busy ? "Mentés..." : "Jelszó mentése"}</button>
      </form>
      {message && <em className="formMessage">{message}</em>}
    </ModalShell>
  );
}

function SettingsModal({
  me,
  close,
  theme,
  setTheme,
  notificationPermission,
  requestNotifications,
  pushState,
  enablePushNotifications,
  disablePushNotifications,
  blockedProfiles,
  unblockUser,
  desktopState,
  setDesktopState,
  updateState,
  setUpdateState,
  logoutCurrent,
  logoutOthers,
  logoutEverywhere,
}) {
  return (
    <ModalShell close={close}>
      <h2>Beállítások</h2>

      <section className="settingsSection">
        <h3>Megjelenés</h3>
        <div className="themeButtons">
          <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
            <Moon size={16} />
            Sötét
          </button>
          <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
            <Sun size={16} />
            Világos
          </button>
        </div>
      </section>

      <section className="settingsSection">
        <h3>Értesítések</h3>
        <div className="settingsButtons">
          <button onClick={requestNotifications}>
            <Bell size={16} />
            Böngészőértesítés: {notificationPermission === "granted" ? "be" : "engedélyezés"}
          </button>
          {pushState === "enabled" ? (
            <button onClick={disablePushNotifications}>
              <BellOff size={16} />
              Push kikapcsolása
            </button>
          ) : (
            <button onClick={enablePushNotifications}>
              <BellRing size={16} />
              Push bekapcsolása
            </button>
          )}
          {pushState === "missing-key" && <em className="formMessage">A VAPID public key még nincs beállítva.</em>}
        </div>
      </section>

      {window.krilixDesktop?.isDesktop && desktopState && (
        <section className="settingsSection">
          <h3>Desktop app</h3>
          <div className="settingsButtons">
            <button onClick={async () => {
              const next = await window.krilixDesktop.setState({ launchAtLogin: !desktopState.launchAtLogin });
              setDesktopState(next);
            }}>
              Induljon Windowszal: {desktopState.launchAtLogin ? "be" : "ki"}
            </button>
            <button onClick={async () => {
              const next = await window.krilixDesktop.setState({ closeToTray: !desktopState.closeToTray });
              setDesktopState(next);
            }}>
              Bezáráskor tálcára: {desktopState.closeToTray ? "be" : "ki"}
            </button>
            <button onClick={async () => {
              const next = await window.krilixDesktop.setState({ nativeNotifications: !desktopState.nativeNotifications });
              setDesktopState(next);
            }}>
              Natív értesítések: {desktopState.nativeNotifications ? "be" : "ki"}
            </button>
            <button onClick={async () => {
              const next = await window.krilixDesktop.setState({ checkUpdatesOnStart: !desktopState.checkUpdatesOnStart });
              setDesktopState(next);
            }}>
              Frissítéskeresés indításkor: {desktopState.checkUpdatesOnStart ? "be" : "ki"}
            </button>
            <button onClick={async () => {
              const next = await window.krilixDesktop.checkForUpdates();
              setUpdateState(next);
            }}>
              Frissítés keresése
            </button>
            {updateState?.available && !updateState?.downloaded && (
              <button onClick={async () => {
                const next = await window.krilixDesktop.downloadUpdate();
                setUpdateState(next);
              }}>
                Frissítés letöltése
              </button>
            )}
            {updateState?.downloaded && (
              <button onClick={() => window.krilixDesktop.quitAndInstall()}>
                Újraindítás és telepítés
              </button>
            )}
            <button onClick={() => window.krilixDesktop.restart()}>
              App újraindítása
            </button>
            <button className="dangerButton" onClick={() => window.krilixDesktop.quit()}>
              Kilépés teljesen
            </button>
          </div>
          <em className="formMessage">Verzió: {desktopState.version}</em>
          {updateState?.message && (
            <em className="formMessage">
              Frissítés: {updateState.message}
              {updateState.progress ? ` (${updateState.progress}%)` : ""}
            </em>
          )}
        </section>
      )}

      <section className="settingsSection">
        <h3>Fiók</h3>
        <div className="settingsButtons">
          <button onClick={logoutCurrent}>Kijelentkezés ezen az eszközön</button>
          <button onClick={logoutOthers}>Kijelentkezés minden más eszközről</button>
          <button className="dangerButton" onClick={logoutEverywhere}>Kijelentkezés minden eszközről</button>
        </div>
      </section>

      <section className="settingsSection">
        <h3>Letiltott felhasználók</h3>
        <div className="blockedList">
          {blockedProfiles.length === 0 ? (
            <p>Nincs letiltott felhasználó.</p>
          ) : (
            blockedProfiles.map((profile) => (
              <article key={profile.id}>
                <Avatar label={profile.avatar} src={profile.avatarUrl} status="offline" size="sm" />
                <span>{profile.display_name}</span>
                <button onClick={() => unblockUser(profile.id)}>Feloldás</button>
              </article>
            ))
          )}
        </div>
      </section>
    </ModalShell>
  );
}


function ProfileModal({ me, close, saveProfile }) {
  const [displayName, setDisplayName] = useState(me.display_name);
  const [avatar, setAvatar] = useState(me.avatar);
  const [avatarFile, setAvatarFile] = useState(null);
  const [status, setStatus] = useState(me.status || "online");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await saveProfile({
        display_name: displayName.trim(),
        avatar: avatar.trim().slice(0, 2).toUpperCase() || "U",
        avatarFile,
        status,
      });
      close();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const previewUrl = avatarFile ? URL.createObjectURL(avatarFile) : me.avatarUrl;

  return (
    <ModalShell close={close}>
      <h2>Profil szerkesztése</h2>
      <form className="profileForm" onSubmit={submit}>
        <div className="profileAvatarEditor">
          <Avatar label={avatar || "U"} src={previewUrl} status={status} size="lg" />
          <label>
            Profilkép
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
            />
          </label>
        </div>
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Név" />
        <input value={avatar} onChange={(event) => setAvatar(event.target.value)} placeholder="Avatar betű, ha nincs kép" />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="online">Elérhető</option>
          <option value="away">Távol</option>
          <option value="busy">Elfoglalt</option>
        </select>
        <button disabled={busy}>{busy ? "Mentés..." : "Mentés"}</button>
      </form>
      {message && <em className="formMessage">{message}</em>}
    </ModalShell>
  );
}
function Sidebar({
  me,
  chats,
  activeChatId,
  openChat,
  openNewChat,
  openGroup,
  openProfile,
  openSettings,
  logout,
  notificationPermission,
  requestNotifications,
  canInstall,
  installApp,
  searchTerm,
  setSearchTerm,
  chatFilter,
  setChatFilter,
}) {
  return (
    <aside className="sidebar">
      <div className="profileBar">
        <div className="profileTop">
          <button className="profileIdentity" onClick={openProfile}>
            <Avatar label={me.avatar} src={me.avatarUrl} status={me.status} size="sm" />
            <span>
              <strong>{me.display_name}</strong>
              <em>{presenceLabel(me.status)}</em>
            </span>
          </button>
          <button className="roundButton" onClick={openSettings}><Settings2 size={18} /></button>
          <button className="roundButton" onClick={logout}><LogOut size={18} /></button>
        </div>

        <div className="pwaTools">
          <button onClick={requestNotifications}>
            {notificationPermission === "granted" ? <BellRing size={15} /> : <Bell size={15} />}
            {notificationPermission === "granted" ? "Értesítések be" : "Értesítések"}
          </button>

          {canInstall && (
            <button onClick={installApp}>
              <Download size={15} />
              Telepítés
            </button>
          )}
        </div>
      </div>

      <div className="sidebarHeading">
        <div>
          <h1>Üzenetek</h1>
          <p>Supabase Live</p>
        </div>
        <nav>
          <button onClick={openGroup} title="Új csoport"><Users size={18} /></button>
          <button onClick={openNewChat} title="Új beszélgetés"><Plus size={18} /></button>
        </nav>
      </div>

      <label className="liveSearchField">
        <Search size={17} />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Beszélgetés keresése..."
        />
      </label>

      <div className="liveFilterTabs">
        <button className={chatFilter === "all" ? "active" : ""} onClick={() => setChatFilter("all")}>Összes</button>
        <button className={chatFilter === "favorite" ? "active" : ""} onClick={() => setChatFilter("favorite")}>Kedvenc</button>
        <button className={chatFilter === "archived" ? "active" : ""} onClick={() => setChatFilter("archived")}>Archív</button>
      </div>

      <div className="chatList">
        {chats.length === 0 ? (
          <p className="emptyHint">Nincs találat.</p>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              className={`chatItem ${chat.id === activeChatId ? "active" : ""}`}
              onClick={() => openChat(chat.id)}
            >
              <Avatar
                label={chat.avatar}
                src={chat.avatarUrl}
                status={chat.liveStatus || chat.status || "offline"}
              />
              <span>
                <strong>
                  {chat.favorite && <Star size={12} />}
                  {chat.displayName}
                </strong>
                <em>{chatStatusLabel(chat)} • {chat.lastMessage || "Nincs üzenet"}</em>
              </span>
              <small>{chat.lastCreatedAt ? currentTime(new Date(chat.lastCreatedAt)) : ""}</small>
              {chat.muted && <BellOff size={13} />}
              {chat.unreadCount > 0 && <b>{chat.unreadCount}</b>}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
function MessageBubble({
  message,
  mine,
  myReaction,
  groupedReactions,
  seenByOther,
  setReplyTarget,
  toggleReaction,
  togglePin,
  beginEdit,
  deleteMessage,
  openForward,
  openLightbox,
  searchTerm,
}) {
  const reply = message.reply_message;
  const deleted = Boolean(message.deleted_at);
  const metadata = message.metadata || {};
  const preview = metadata.link_preview;

  return (
    <div className={`bubbleWrap ${mine ? "mine" : "theirs"}`}>
      <article className={`bubble liveBubble ${message.pinned ? "pinned" : ""} ${deleted ? "deleted" : ""}`}>
        {!mine && <small>{message.sender?.display_name || "Felhasználó"}</small>}

        {message.forwarded_from && !deleted && (
          <div className="forwardedMark">
            <Forward size={13} />
            Továbbított üzenet
          </div>
        )}

        {reply && (
          <div className="replyPreview">
            <strong>{reply.sender?.display_name || "Felhasználó"}</strong>
            <span>{reply.deleted_at ? "Törölt üzenet" : reply.body || reply.attachment_name || "Melléklet"}</span>
          </div>
        )}

        {deleted ? (
          <p className="deletedMessage">Ezt az üzenetet törölték.</p>
        ) : (
          <>
            {message.message_type === "image" && message.signedUrl && (
              <button className="liveImage" onClick={() => openLightbox(message.id)}>
                <img src={message.signedUrl} alt={message.attachment_name || "Kép"} />
              </button>
            )}

            {message.message_type === "file" && message.signedUrl && (
              <a className="liveFile" href={message.signedUrl} target="_blank" rel="noreferrer">
                <FileText size={18} />
                <span>
                  <strong>{message.attachment_name}</strong>
                  <em>{message.attachment_size ? `${Math.round(message.attachment_size / 1024)} KB` : "Fájl"}</em>
                </span>
              </a>
            )}

            {message.message_type === "audio" && message.signedUrl && (
              <div className="audioMessage">
                <audio controls src={message.signedUrl} preload="metadata" />
                <span>{formatDuration(metadata.duration || 0)}</span>
              </div>
            )}

            {message.message_type === "gif" && metadata.gif_url && (
              <img className="gifMessage" src={metadata.gif_url} alt={metadata.gif_label || "GIF"} />
            )}

            {message.message_type === "sticker" && metadata.sticker && (
              <div className="stickerMessage" title={metadata.sticker_label || "Matrica"}>
                {metadata.sticker}
              </div>
            )}

            {message.body && <p>{highlightText(message.body, searchTerm)}</p>}

            {preview?.url && (
              <a className="linkPreview" href={preview.url} target="_blank" rel="noreferrer">
                {preview.image && <img src={preview.image} alt="" />}
                <span>
                  <strong>{preview.title || hostLabel(preview.url)}</strong>
                  {preview.description && <em>{preview.description}</em>}
                  <small>{preview.host || hostLabel(preview.url)}</small>
                </span>
              </a>
            )}

            {message.edited_at && <em className="editedMark">szerkesztve</em>}
          </>
        )}

        {!deleted && (
          <div className="bubbleActions liveActions">
            <button onClick={() => setReplyTarget({ message })}><Reply size={15} /></button>
            <button onClick={() => openForward(message)}><Forward size={15} /></button>
            <button onClick={() => togglePin(message)}><Pin size={15} /></button>
            {mine && message.message_type === "text" && <button onClick={() => beginEdit(message)}><Pencil size={15} /></button>}
            {mine && <button onClick={() => deleteMessage(message)}><Trash2 size={15} /></button>}
            <span className="reactionDock">
              {reactions.map((reaction) => (
                <button
                  key={reaction}
                  className={myReaction === reaction ? "active" : ""}
                  onClick={() => toggleReaction(message, reaction)}
                >
                  {reaction}
                </button>
              ))}
            </span>
          </div>
        )}

        {!deleted && groupedReactions.length > 0 && (
          <div className="liveReactionBadges">
            {groupedReactions.map((item) => (
              <span key={item.reaction}>{item.reaction} {item.count}</span>
            ))}
          </div>
        )}

        <footer>
          <time>{currentTime(new Date(message.created_at))}</time>
          {mine && !deleted && <CheckCheck size={14} />}
          {mine && seenByOther && !deleted && <strong>Látta</strong>}
        </footer>
      </article>
    </div>
  );
}
function ChatWindow({
  activeChat,
  messages,
  me,
  messageText,
  setMessageText,
  selectedFile,
  setSelectedFile,
  replyTarget,
  setReplyTarget,
  sendMessage,
  sendSpecialMessage,
  sendVoiceMessage,
  toggleReaction,
  togglePin,
  beginEdit,
  saveEdit,
  cancelEdit,
  deleteMessage,
  openForward,
  openLightbox,
  endRef,
  typingNames,
  toggleInfo,
  messageSearchTerm,
  setMessageSearchTerm,
  messageSearchOpen,
  setMessageSearchOpen,
  mobileOpen,
  closeMobile,
  blockedByMe,
  startCall,
}) {
  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingStartRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => {
    if (!recording) return;

    const timer = window.setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - recordingStartRef.current) / 1000));
    }, 250);

    return () => window.clearInterval(timer);
  }, [recording]);

  const filteredMessages = messages.filter((message) => {
    if (!messageSearchTerm.trim()) return true;
    const q = messageSearchTerm.toLowerCase();
    return (
      message.body?.toLowerCase().includes(q) ||
      message.attachment_name?.toLowerCase().includes(q)
    );
  });

  async function startRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        alert("Ez a böngésző nem támogatja a hangrögzítést.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recordingStartRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const duration = Math.max(1, Math.round((Date.now() - recordingStartRef.current) / 1000));
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const extension = blob.type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `hang-${Date.now()}.${extension}`, {
          type: blob.type || "audio/webm",
        });

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        setRecordingSeconds(0);
        await sendVoiceMessage(file, duration);
      };

      recorder.start();
      setRecording(true);
    } catch (error) {
      alert(error.message || "Nem sikerült elindítani a mikrofont.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  }

  if (!activeChat) {
    return (
      <main className="chatWindow emptyLiveChat">
        <section>
          <ShieldCheck size={28} />
          <h2>Válassz beszélgetést</h2>
          <p>Vagy hozz létre egy újat a bal oldalon.</p>
        </section>
      </main>
    );
  }

  return (
    <main
      className={`chatWindow ${mobileOpen ? "open" : ""} ${messageSearchOpen ? "searchOpen" : ""} ${isDragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      {isDragging && <div className="dropOverlay">Dobd ide a fájlt</div>}

      <header className="chatHeader">
        <div>
          <button className="mobileBack" onClick={closeMobile}><ArrowLeft size={20} /></button>
          <Avatar label={activeChat.avatar} src={activeChat.avatarUrl} status={activeChat.isGroup ? "online" : activeChat.liveStatus || "offline"} />
          <span>
            <strong>{activeChat.displayName}</strong>
            <em>
              {chatStatusLabel(activeChat)}
            </em>
          </span>
        </div>
        <div>
          <span className="krilixCore">
            <i />
            <strong>KRILIX CORE</strong>
            <em><ShieldCheck size={12} /> Live</em>
          </span>
          <nav>
            {!activeChat.isGroup && !blockedByMe && (
              <>
                <button onClick={() => startCall("audio")} title="Hanghívás"><Phone size={18} /></button>
                <button onClick={() => startCall("video")} title="Videóhívás"><Video size={18} /></button>
              </>
            )}
            <button onClick={() => setMessageSearchOpen((value) => !value)}><Search size={18} /></button>
            <button onClick={toggleInfo}><Info size={18} /></button>
          </nav>
        </div>
      </header>

      {messageSearchOpen && (
        <div className="messageSearchBar">
          <Search size={17} />
          <input
            autoFocus
            value={messageSearchTerm}
            onChange={(event) => setMessageSearchTerm(event.target.value)}
            placeholder="Keresés ebben a beszélgetésben..."
          />
          {messageSearchTerm && <button onClick={() => setMessageSearchTerm("")}><X size={16} /></button>}
        </div>
      )}

      <section className="messages">
        {filteredMessages.length === 0 ? (
          <div className="emptyMessageSearch">
            <SearchX size={22} />
            <span>Nincs találat.</span>
          </div>
        ) : (
          filteredMessages.map((message, index) => {
            const previous = filteredMessages[index - 1];
            const showDay = !previous || formatDay(previous.created_at) !== formatDay(message.created_at);
            const mine = message.sender_id === me.id;
            const myReaction = message.reactions.find((reaction) => reaction.user_id === me.id)?.reaction || null;
            const groupedReactions = Object.values(
              message.reactions.reduce((acc, reaction) => {
                acc[reaction.reaction] ||= { reaction: reaction.reaction, count: 0 };
                acc[reaction.reaction].count += 1;
                return acc;
              }, {})
            );
            const seenByOther =
              mine &&
              activeChat.otherReadAt &&
              new Date(activeChat.otherReadAt) >= new Date(message.created_at);

            return (
              <div key={message.id}>
                {showDay && <div className="dateDivider">{formatDay(message.created_at)}</div>}
                <MessageBubble
                  message={message}
                  mine={mine}
                  myReaction={myReaction}
                  groupedReactions={groupedReactions}
                  seenByOther={seenByOther}
                  setReplyTarget={setReplyTarget}
                  toggleReaction={toggleReaction}
                  togglePin={togglePin}
                  beginEdit={beginEdit}
                  deleteMessage={deleteMessage}
                  openForward={openForward}
                  openLightbox={openLightbox}
                  searchTerm={messageSearchTerm}
                />
              </div>
            );
          })
        )}

        {typingNames.length > 0 && (
          <div className="typingRow">
            <span>{typingNames.join(", ")} gépel</span>
            <i />
            <i />
            <i />
          </div>
        )}

        <div ref={endRef} />
      </section>

      <div className="composerArea">
        {blockedByMe && (
          <div className="blockedComposer">
            <Ban size={16} />
            Ezt a felhasználót letiltottad. Üzenetküldés tiltva.
          </div>
        )}
        {replyTarget?.message && (
          <div className="replyComposer">
            <span>
              <strong>Válasz erre: {replyTarget.message.sender?.display_name || "Te"}</strong>
              <em>{replyTarget.message.body || replyTarget.message.attachment_name || "Melléklet"}</em>
            </span>
            <button onClick={() => setReplyTarget(null)}><X size={16} /></button>
          </div>
        )}

        {replyTarget?.editingId && (
          <div className="replyComposer">
            <span>
              <strong>Üzenet szerkesztése</strong>
              <em>Enter = mentés</em>
            </span>
            <button onClick={cancelEdit}><X size={16} /></button>
          </div>
        )}

        {selectedFile && (
          <div className="filePreview liveFilePreview">
            {selectedFile.type.startsWith("image/") ? <img src={URL.createObjectURL(selectedFile)} alt="Előnézet" /> : <span><FileText size={18} /></span>}
            <strong>{selectedFile.name}</strong>
            <button onClick={() => setSelectedFile(null)}><X size={16} /></button>
          </div>
        )}

        {recording && (
          <div className="recordingBar">
            <span />
            Hangrögzítés {formatDuration(recordingSeconds)}
            <button onClick={stopRecording}>Küldés</button>
          </div>
        )}

        {!blockedByMe && <footer className="composer liveComposer">
          <input
            ref={fileRef}
            hidden
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setSelectedFile(file);
            }}
          />

          <button onClick={() => fileRef.current?.click()}><ImagePlus size={19} /></button>

          <div className="composerExtras">
            <button onClick={() => setPickerOpen((value) => value === "emoji" ? null : "emoji")}><Smile size={19} /></button>
            {pickerOpen === "emoji" && (
              <div className="composerPicker emojiPicker">
                {composerEmojis.map((emoji) => (
                  <button key={emoji} onClick={() => {
                    setMessageText(messageText + emoji);
                    setPickerOpen(null);
                  }}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            {pickerOpen === "gif" && (
              <div className="composerPicker mediaPicker">
                {gifPresets.map((gif) => (
                  <button key={gif.label} onClick={() => {
                    sendSpecialMessage("gif", { gif_url: gif.url, gif_label: gif.label });
                    setPickerOpen(null);
                  }}>
                    <img src={gif.url} alt={gif.label} />
                    <span>{gif.label}</span>
                  </button>
                ))}
              </div>
            )}
            {pickerOpen === "sticker" && (
              <div className="composerPicker stickerPicker">
                {stickerPresets.map((sticker) => (
                  <button key={sticker.label} onClick={() => {
                    sendSpecialMessage("sticker", { sticker: sticker.value, sticker_label: sticker.label });
                    setPickerOpen(null);
                  }}>
                    {sticker.value}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="textTool" onClick={() => setPickerOpen((value) => value === "gif" ? null : "gif")}>GIF</button>
          <button className="textTool" onClick={() => setPickerOpen((value) => value === "sticker" ? null : "sticker")}>Matrica</button>

          <div className="composerInput">
            <input
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  replyTarget?.editingId ? saveEdit() : sendMessage();
                }
              }}
              placeholder={replyTarget?.editingId ? "Szerkesztés..." : "Írj egy üzenetet..."}
            />
          </div>

          <button onClick={recording ? stopRecording : startRecording}>
            {recording ? <StopCircle size={19} /> : <Mic size={19} />}
          </button>

          <button className="send" onClick={replyTarget?.editingId ? saveEdit : sendMessage}>
            <SendHorizontal size={19} />
          </button>
        </footer>}
      </div>
    </main>
  );
}
function InfoPanel({
  activeChat,
  messages,
  closePanel,
  toggleFavorite,
  toggleArchive,
  toggleMute,
  deleteConversation,
  openGroupSettings,
  addGroupMember,
  removeGroupMember,
  setGroupMemberRole,
  onlineUserIds,
  blockedByMe,
  toggleBlockUser,
}) {
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupMessage, setGroupMessage] = useState("");
  const pinned = messages.filter((message) => message.pinned && !message.deleted_at);
  const media = messages.filter((message) => message.message_type === "image" && !message.deleted_at);
  const files = messages.filter((message) => message.message_type === "file" && !message.deleted_at);
  const canManageGroup = activeChat?.isGroup && ["owner", "admin"].includes(activeChat.myRole);
  const isOwner = activeChat?.myRole === "owner";

  async function submitMember(event) {
    event.preventDefault();
    if (!newMemberEmail.trim()) return;
    setGroupBusy(true);
    setGroupMessage("");

    try {
      await addGroupMember(newMemberEmail);
      setNewMemberEmail("");
    } catch (error) {
      setGroupMessage(error.message);
    } finally {
      setGroupBusy(false);
    }
  }

  return (
    <aside className="infoPanel">
      <button className="infoCloseButton" onClick={closePanel}>
        <X size={18} />
      </button>
      {activeChat ? (
        <>
          <div>
            <Avatar label={activeChat.avatar} src={activeChat.avatarUrl} status={activeChat.isGroup ? "online" : activeChat.liveStatus || "offline"} size="lg" />
            <h2>{activeChat.displayName}</h2>
            <span>
              {activeChat.isGroup
                ? `${activeChat.members.length} tag • ${roleLabel(activeChat.myRole)}`
                : chatStatusLabel(activeChat)}
            </span>
          </div>

          <section>
            <h3>Gyors műveletek</h3>
            <nav className="conversationActions">
              {activeChat.isGroup && canManageGroup && (
                <button onClick={openGroupSettings}>
                  <Pencil size={16} />
                  Csoport szerkesztése
                </button>
              )}
              <button onClick={toggleFavorite}>
                <Star size={16} />
                {activeChat.favorite ? "Kedvenc" : "Kedvencekhez"}
              </button>
              <button onClick={toggleArchive}>
                <Archive size={16} />
                {activeChat.archived ? "Visszaállítás" : "Archiválás"}
              </button>
              <button onClick={toggleMute}>
                {activeChat.muted ? <BellOff size={16} /> : <Bell size={16} />}
                {activeChat.muted ? "Némítva" : "Némítás"}
              </button>
              {!activeChat.isGroup && (
                <button className={blockedByMe ? "dangerInline" : ""} onClick={toggleBlockUser}>
                  <Ban size={16} />
                  {blockedByMe ? "Tiltás feloldása" : "Felhasználó tiltása"}
                </button>
              )}
              <button className="dangerInline" onClick={deleteConversation}>
                <Trash2 size={16} />
                Törlés nálam
              </button>
            </nav>
          </section>

          {activeChat.isGroup && (
            <section>
              <h3>Tagok</h3>

              {canManageGroup && (
                <form className="memberAddForm" onSubmit={submitMember}>
                  <input
                    value={newMemberEmail}
                    onChange={(event) => setNewMemberEmail(event.target.value)}
                    placeholder="újtag@email.com"
                  />
                  <button disabled={groupBusy}><UserPlus size={16} /></button>
                </form>
              )}

              {groupMessage && <em className="formMessage">{groupMessage}</em>}

              <div className="memberList">
                {activeChat.members.map((member) => (
                  <article key={member.user_id}>
                    <Avatar
                      label={member.profile.avatar}
                      src={member.profile.avatarUrl}
                      status={onlineUserIds.has(member.user_id) ? "online" : "offline"}
                      size="sm"
                    />
                    <span>
                      <strong>{member.profile.display_name}</strong>
                      <em>{roleLabel(member.role)}</em>
                    </span>
                    {member.role === "owner" && <Crown size={16} />}
                    {isOwner && member.role !== "owner" && (
                      <button
                        onClick={() => setGroupMemberRole(member.user_id, member.role === "admin" ? "member" : "admin")}
                      >
                        {member.role === "admin" ? "Taggá" : "Adminná"}
                      </button>
                    )}
                    {canManageGroup && member.role !== "owner" && (
                      <button className="dangerSmall" onClick={() => removeGroupMember(member.user_id)}>
                        <X size={14} />
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3>Statisztika</h3>
            <div className="stats">
              <span><strong>{messages.length}</strong> üzenet</span>
              <span><strong>{media.length}</strong> kép</span>
              <span><strong>{files.length}</strong> fájl</span>
            </div>
          </section>
          <section>
            <h3>Közös média</h3>
            <div className="mediaGrid">
              {media.length === 0 ? <p>Nincs kép.</p> : media.map((message) => (
                <a key={message.id} href={message.signedUrl} target="_blank" rel="noreferrer">
                  <img src={message.signedUrl} alt={message.attachment_name || "Kép"} />
                </a>
              ))}
            </div>
          </section>
          <section>
            <h3>Közös fájlok</h3>
            <div className="sharedFiles">
              {files.length === 0 ? <p>Nincs fájl.</p> : files.map((message) => (
                <a key={message.id} href={message.signedUrl} target="_blank" rel="noreferrer">
                  <FileText size={16} />
                  {message.attachment_name}
                </a>
              ))}
            </div>
          </section>
          <section>
            <h3>Kitűzött üzenetek</h3>
            <div className="sharedFiles">
              {pinned.length === 0 ? <p>Nincs kitűzött üzenet.</p> : pinned.map((message) => (
                <span key={message.id}>{message.body || message.attachment_name || "Melléklet"}</span>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section>
          <h3>Nincs kiválasztott chat</h3>
        </section>
      )}
    </aside>
  );
}
export default function App() {
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [forwardTarget, setForwardTarget] = useState(null);
  const [lightboxId, setLightboxId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [theme, setThemeState] = useState(() => localStorage.getItem("krilix-theme") || "dark");
  const [blockedUserIds, setBlockedUserIds] = useState(new Set());
  const [blockedProfiles, setBlockedProfiles] = useState([]);
  const [pushState, setPushState] = useState("unknown");
  const [desktopState, setDesktopState] = useState(null);
  const [updateState, setUpdateState] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [incomingCaller, setIncomingCaller] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callRole, setCallRole] = useState(null);
  const [callPeer, setCallPeer] = useState(null);
  const [infoOpen, setInfoOpen] = useState(() => window.innerWidth > 1100);
  const [searchTerm, setSearchTerm] = useState("");
  const [chatFilter, setChatFilter] = useState("all");
  const [messageSearchTerm, setMessageSearchTerm] = useState("");
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [onlinePresence, setOnlinePresence] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const endRef = useRef(null);
  const typingChannelRef = useRef(null);
  const typingStopTimerRef = useRef(null);
  const chatsRef = useRef([]);
  const onlinePresenceRef = useRef({});

  const activeChat = chats.find((chat) => chat.id === activeChatId) || null;
  const blockedByMe = Boolean(activeChat?.otherUserId && blockedUserIds.has(activeChat.otherUserId));
  const activeMedia = messages.filter((message) => message.message_type === "image" && message.signedUrl && !message.deleted_at);
  const visibleChats = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return chats.filter((chat) => {
      const matchesSearch =
        !q ||
        chat.displayName.toLowerCase().includes(q) ||
        chat.lastMessage?.toLowerCase().includes(q);
      const matchesFilter =
        chatFilter === "archived"
          ? chat.archived
          : chatFilter === "favorite"
            ? chat.favorite && !chat.archived
            : !chat.archived;

      return matchesSearch && matchesFilter;
    });
  }, [chats, searchTerm, chatFilter]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    localStorage.setItem("krilix-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!window.krilixDesktop?.isDesktop) return;

    window.krilixDesktop.getState().then((state) => {
      setDesktopState(state);
      setUpdateState(state.updateState || null);
    }).catch(() => {});

    const unsubscribe = window.krilixDesktop.onUpdateState?.((state) => {
      setUpdateState(state);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredInstallPrompt(event);
    }

    function handleAppInstalled() {
      setDeferredInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (event === "PASSWORD_RECOVERY" || new URLSearchParams(window.location.search).get("reset") === "1") {
        setPasswordRecoveryOpen(true);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setMe(null);
      setChats([]);
      setMessages([]);
      return;
    }

    async function loadProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,display_name,avatar,avatar_path,status,last_seen_at")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      setMe({
        ...data,
        avatarUrl: getAvatarUrl(data.avatar_path),
      });
    }

    loadProfile();
  }, [session]);

  useEffect(() => {
    if (!me) return;
    refreshPushState();
  }, [me]);

  useEffect(() => {
    if (!me) return;

    async function loadBlocks() {
      const { data: blocks } = await supabase
        .from("user_blocks")
        .select("blocked_id")
        .eq("blocker_id", me.id);

      const ids = (blocks || []).map((row) => row.blocked_id);
      setBlockedUserIds(new Set(ids));

      if (!ids.length) {
        setBlockedProfiles([]);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,display_name,avatar,avatar_path")
        .in("id", ids);

      setBlockedProfiles(
        (profiles || []).map((profile) => ({
          ...profile,
          avatarUrl: getAvatarUrl(profile.avatar_path),
        }))
      );
    }

    loadBlocks();

    const channel = supabase
      .channel("krilix-blocks")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_blocks" }, loadBlocks)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me]);

  useEffect(() => {
    if (!me) return;

    async function updateLastSeen() {
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", me.id);
    }

    updateLastSeen();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") updateLastSeen();
    }, 60000);

    function handleVisibility() {
      if (document.visibilityState === "hidden") updateLastSeen();
    }

    window.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("visibilitychange", handleVisibility);
      updateLastSeen();
    };
  }, [me]);

  useEffect(() => {
    if (!me) return;

    async function fetchProfile(userId) {
      const { data } = await supabase
        .from("profiles")
        .select("id,display_name,avatar,avatar_path,status")
        .eq("id", userId)
        .maybeSingle();

      return data
        ? {
            ...data,
            avatarUrl: getAvatarUrl(data.avatar_path),
          }
        : null;
    }

    async function handleCallInsert(call) {
      if (call.callee_id !== me.id || call.status !== "ringing") return;
      const caller = await fetchProfile(call.caller_id);
      setIncomingCaller(caller);
      setIncomingCall(call);
    }

    async function handleCallUpdate(call) {
      if (incomingCall?.id === call.id && call.status !== "ringing") {
        setIncomingCall(null);
        setIncomingCaller(null);
      }

      if (activeCall?.id === call.id) {
        setActiveCall(call);

        if (["declined", "cancelled", "ended", "missed"].includes(call.status)) {
          window.setTimeout(() => {
            setActiveCall(null);
            setCallRole(null);
            setCallPeer(null);
          }, 500);
        }
      }
    }

    const channel = supabase
      .channel(`krilix-calls:${me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls" }, ({ new: call }) => handleCallInsert(call))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calls" }, ({ new: call }) => handleCallUpdate(call))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, incomingCall?.id, activeCall?.id]);

  useEffect(() => {
    if (!me) return;

    const presenceChannel = supabase.channel("krilix-online-users", {
      config: {
        presence: {
          key: me.id,
        },
      },
    });

    function syncPresence() {
      const state = presenceChannel.presenceState();
      const presenceMap = Object.fromEntries(
        Object.entries(state).map(([userId, entries]) => {
          const latest = entries?.[entries.length - 1] || {};
          return [
            userId,
            {
              user_id: userId,
              display_name: latest.display_name,
              status: latest.status || "online",
              online_at: latest.online_at,
            },
          ];
        })
      );

      onlinePresenceRef.current = presenceMap;
      setOnlinePresence(presenceMap);
      setOnlineUserIds(new Set(Object.keys(presenceMap)));
    }

    presenceChannel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            user_id: me.id,
            display_name: me.display_name,
            status: me.status || "online",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [me?.id, me?.display_name, me?.status]);

  useEffect(() => {
    if (!me) return;
    loadConversations();
  }, [onlinePresence]);

  useEffect(() => {
    if (!me) return;

    loadConversations();

    const channel = supabase
      .channel("krilix-phase2-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadConversations)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_members" }, loadConversations)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, loadConversations)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, async (payload) => {
        await loadConversations();

        if (payload.eventType === "INSERT") {
          maybeNotifyIncomingMessage(payload.new);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_reads" }, loadConversations)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_user_settings" }, loadConversations)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, onlineUserIds]);

  useEffect(() => {
    if (!activeChatId || !me) return;

    const channel = supabase.channel(`krilix-typing-${activeChatId}`, {
      config: {
        broadcast: {
          self: false,
        },
      },
    });

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload?.user_id || payload.user_id === me.id) return;

        setTypingUsers((items) => ({
          ...items,
          [payload.user_id]: payload.is_typing
            ? {
                display_name: payload.display_name || "Valaki",
                expires_at: Date.now() + 1800,
              }
            : null,
        }));
      })
      .subscribe();

    typingChannelRef.current = channel;

    const interval = window.setInterval(() => {
      setTypingUsers((items) =>
        Object.fromEntries(
          Object.entries(items).filter(([, value]) => value && value.expires_at > Date.now())
        )
      );
    }, 700);

    return () => {
      window.clearInterval(interval);
      typingChannelRef.current = null;
      setTypingUsers({});
      supabase.removeChannel(channel);
    };
  }, [activeChatId, me]);

  useEffect(() => {
    if (!activeChatId || !me) {
      setMessages([]);
      return;
    }

    loadMessages(activeChatId);
    markRead(activeChatId);

    const channel = supabase
      .channel(`krilix-phase2-chat-${activeChatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${activeChatId}` },
        async () => {
          await loadMessages(activeChatId);
          await markRead(activeChatId);
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => loadMessages(activeChatId))
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_reads" }, () => loadConversations())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatId, me]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function hydrateSignedUrls(items) {
    return Promise.all(
      items.map(async (message) => {
        if (!message.attachment_path) return message;

        const { data } = await supabase.storage
          .from("chat-files")
          .createSignedUrl(message.attachment_path, 60 * 60);

        return {
          ...message,
          signedUrl: data?.signedUrl || null,
        };
      })
    );
  }

  async function loadConversations() {
    if (!me) return;

    const [{ data, error }, { data: settingsRows }] = await Promise.all([
      supabase
        .from("conversations")
        .select(`
          id,
          title,
          is_group,
          avatar_path,
          created_at,
          conversation_members (
            user_id,
            role,
            profile:profiles (
              id,
              display_name,
              avatar,
              avatar_path,
              status,
              last_seen_at
            )
          )
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("conversation_user_settings")
        .select("conversation_id,favorite,archived,muted,deleted_at")
        .eq("user_id", me.id),
    ]);

    if (error) {
      console.error(error);
      return;
    }

    const settingsMap = Object.fromEntries((settingsRows || []).map((row) => [row.conversation_id, row]));

    const shaped = await Promise.all(
      data.map(async (conversation) => {
        const members = conversation.conversation_members
          .map((member) => ({
            user_id: member.user_id,
            role: member.role || "member",
            profile: member.profile
              ? {
                  ...member.profile,
                  avatarUrl: getAvatarUrl(member.profile.avatar_path),
                }
              : null,
          }))
          .filter((member) => member.profile);
        const otherMember = members.find((member) => member.user_id !== me.id)?.profile;
        const myMembership = members.find((member) => member.user_id === me.id);
        const { data: latestMessages } = await supabase
          .from("messages")
          .select("body,created_at,message_type,attachment_name,deleted_at,metadata")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const { data: myRead } = await supabase
          .from("conversation_reads")
          .select("last_read_at")
          .eq("conversation_id", conversation.id)
          .eq("user_id", me.id)
          .maybeSingle();

        const { data: otherRead } = await supabase
          .from("conversation_reads")
          .select("last_read_at")
          .eq("conversation_id", conversation.id)
          .neq("user_id", me.id)
          .limit(1)
          .maybeSingle();

        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conversation.id)
          .neq("sender_id", me.id)
          .gt("created_at", myRead?.last_read_at || "1970-01-01T00:00:00Z");

        const latest = latestMessages?.[0];
        const setting = settingsMap[conversation.id] || {};
        const otherUserId = otherMember?.id || null;
        const livePresence = otherUserId ? onlinePresenceRef.current[otherUserId] : null;
        const isOtherOnline = Boolean(livePresence);
        const lastCreatedAt = latest?.created_at || conversation.created_at;
        const wasDeletedForMe = Boolean(setting.deleted_at);
        const hasNewerMessageAfterDelete =
          wasDeletedForMe && latest?.created_at && new Date(latest.created_at) > new Date(setting.deleted_at);

        return {
          id: conversation.id,
          displayName: conversation.is_group ? conversation.title : otherMember?.display_name || "Beszélgetés",
          avatar: conversation.is_group ? (conversation.title?.[0] || "C").toUpperCase() : otherMember?.avatar || "U",
          avatarUrl: conversation.is_group ? getGroupAvatarUrl(conversation.avatar_path) : otherMember?.avatarUrl || null,
          status: normalizeStatus(livePresence?.status || otherMember?.status || "offline"),
          isGroup: conversation.is_group,
          members,
          myRole: myMembership?.role || "member",
          liveStatus: conversation.is_group
            ? "online"
            : isOtherOnline
              ? normalizeStatus(livePresence?.status || otherMember?.status || "online")
              : "offline",
          otherUserId,
          lastSeenAt: otherMember?.last_seen_at || null,
          lastMessage:
            latest?.deleted_at
              ? "Törölt üzenet"
              : latest?.body ||
                (latest?.message_type === "image"
                  ? "Kép"
                  : latest?.message_type === "audio"
                    ? "Hangüzenet"
                    : latest?.message_type === "gif"
                      ? "GIF"
                      : latest?.message_type === "sticker"
                        ? "Matrica"
                        : latest?.attachment_name || ""),
          lastCreatedAt,
          unreadCount: count || 0,
          otherReadAt: otherRead?.last_read_at || null,
          favorite: Boolean(setting.favorite),
          archived: Boolean(setting.archived),
          muted: Boolean(setting.muted),
          deletedAt: setting.deleted_at || null,
          hiddenForMe: wasDeletedForMe && !hasNewerMessageAfterDelete,
          meId: me.id,
        };
      })
    );

    const visible = shaped.filter((chat) => !chat.hiddenForMe);
    visible.sort((a, b) => new Date(b.lastCreatedAt) - new Date(a.lastCreatedAt));
    setChats(visible);

    if (!activeChatId && visible[0]) {
      setActiveChatId(visible[0].id);
    }

    if (activeChatId && !visible.some((chat) => chat.id === activeChatId)) {
      setActiveChatId(visible[0]?.id || null);
    }
  }
  async function loadMessages(conversationId) {
    const { data: baseMessages, error } = await supabase
      .from("messages")
      .select(`
        id,
        conversation_id,
        sender_id,
        body,
        created_at,
        message_type,
        attachment_path,
        attachment_name,
        attachment_type,
        attachment_size,
        reply_to,
        edited_at,
        pinned,
        deleted_at,
        metadata,
        forwarded_from
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Üzenetbetöltési hiba:", error);
      return;
    }

    if (!baseMessages?.length) {
      setMessages([]);
      return;
    }

    const senderIds = [...new Set(baseMessages.map((message) => message.sender_id))];
    const messageIds = baseMessages.map((message) => message.id);
    const replyIds = [...new Set(baseMessages.map((message) => message.reply_to).filter(Boolean))];

    const [{ data: senders }, { data: reactions }, { data: replyMessages }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,display_name,avatar,avatar_path")
        .in("id", senderIds),
      supabase
        .from("message_reactions")
        .select("message_id,user_id,reaction")
        .in("message_id", messageIds),
      replyIds.length
        ? supabase
            .from("messages")
            .select("id,body,attachment_name,sender_id,deleted_at")
            .in("id", replyIds)
        : Promise.resolve({ data: [] }),
    ]);

    const replySenderIds = [...new Set((replyMessages || []).map((message) => message.sender_id))];
    const { data: replySenders } = replySenderIds.length
      ? await supabase
          .from("profiles")
          .select("id,display_name")
          .in("id", replySenderIds)
      : { data: [] };

    const senderMap = Object.fromEntries((senders || []).map((sender) => [sender.id, sender]));
    const replySenderMap = Object.fromEntries((replySenders || []).map((sender) => [sender.id, sender]));
    const replyMap = Object.fromEntries(
      (replyMessages || []).map((message) => [
        message.id,
        {
          ...message,
          sender: replySenderMap[message.sender_id] || null,
        },
      ])
    );

    const reactionMap = (reactions || []).reduce((acc, reaction) => {
      acc[reaction.message_id] ||= [];
      acc[reaction.message_id].push(reaction);
      return acc;
    }, {});

    const merged = baseMessages.map((message) => ({
      ...message,
      sender: senderMap[message.sender_id]
        ? {
            ...senderMap[message.sender_id],
            avatarUrl: getAvatarUrl(senderMap[message.sender_id].avatar_path),
          }
        : null,
      reactions: reactionMap[message.id] || [],
      reply_message: message.reply_to ? replyMap[message.reply_to] || null : null,
    }));

    setMessages(await hydrateSignedUrls(merged));
  }

  async function markRead(conversationId) {
    if (!me) return;

    await supabase
      .from("conversation_reads")
      .upsert(
        {
          conversation_id: conversationId,
          user_id: me.id,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "conversation_id,user_id" }
      );
  }

  async function startCall(type) {
    if (!activeChat || activeChat.isGroup || !activeChat.otherUserId || blockedByMe) return;

    const { data, error } = await supabase
      .from("calls")
      .insert({
        conversation_id: activeChat.id,
        caller_id: me.id,
        callee_id: activeChat.otherUserId,
        type,
      })
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    const peer = activeChat.members.find((member) => member.user_id === activeChat.otherUserId)?.profile || null;
    setCallPeer(peer);
    setCallRole("caller");
    setActiveCall(data);
  }

  async function updateCallStatus(callId, status) {
    const payload = {
      status,
      ...(status === "answered" ? { answered_at: new Date().toISOString() } : {}),
      ...(["declined", "cancelled", "ended", "missed"].includes(status)
        ? { ended_at: new Date().toISOString() }
        : {}),
    };

    const { error } = await supabase
      .from("calls")
      .update(payload)
      .eq("id", callId);

    if (error) alert(error.message);
  }

  async function acceptCall() {
    if (!incomingCall) return;

    setCallPeer(incomingCaller);
    setCallRole("callee");
    setActiveCall({ ...incomingCall, status: "answered", answered_at: new Date().toISOString() });
    setIncomingCall(null);
    setIncomingCaller(null);
    await updateCallStatus(incomingCall.id, "answered");
  }

  async function declineCall() {
    if (!incomingCall) return;
    await updateCallStatus(incomingCall.id, "declined");
    setIncomingCall(null);
    setIncomingCaller(null);
  }

  function closeCall() {
    setActiveCall(null);
    setCallRole(null);
    setCallPeer(null);
  }


  async function createDirectConversation(targetEmail) {
    if (!targetEmail) throw new Error("Adj meg egy e-mail címet.");
    if (targetEmail === me.email) throw new Error("Saját magaddal most még nem nyitunk chatet.");

    const { data: targetProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,display_name,avatar,status")
      .eq("email", targetEmail)
      .single();

    if (profileError || !targetProfile) {
      throw new Error("Nincs ilyen regisztrált felhasználó.");
    }

    if (blockedUserIds.has(targetProfile.id)) {
      throw new Error("Ezt a felhasználót letiltottad.");
    }

    const { data: membershipRows } = await supabase
      .from("conversation_members")
      .select("conversation_id,user_id")
      .in("user_id", [me.id, targetProfile.id]);

    const grouped = membershipRows?.reduce((acc, row) => {
      acc[row.conversation_id] ||= [];
      acc[row.conversation_id].push(row.user_id);
      return acc;
    }, {}) || {};

    const existingConversationId = Object.entries(grouped).find(([, users]) =>
      users.includes(me.id) && users.includes(targetProfile.id)
    )?.[0];

    if (existingConversationId) {
      setActiveChatId(existingConversationId);
      return;
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        title: null,
        is_group: false,
        created_by: me.id,
      })
      .select("id")
      .single();

    if (conversationError) throw conversationError;

    const { error: memberError } = await supabase.from("conversation_members").insert([
      { conversation_id: conversation.id, user_id: me.id },
      { conversation_id: conversation.id, user_id: targetProfile.id },
    ]);

    if (memberError) throw memberError;

    await loadConversations();
    setActiveChatId(conversation.id);
  }

  async function createGroup({ title, emails }) {
    if (!title) throw new Error("Adj nevet a csoportnak.");

    const { data, error } = await supabase.rpc("create_group", {
      group_title: title,
      member_emails: emails,
    });

    if (error) throw error;

    await loadConversations();
    setActiveChatId(data);
  }

  async function addGroupMember(email) {
    if (!activeChat?.isGroup) return;

    const { error } = await supabase.rpc("add_group_member", {
      target_conversation: activeChat.id,
      target_email: email.trim().toLowerCase(),
    });

    if (error) throw error;

    await loadConversations();
  }

  async function removeGroupMember(userId) {
    if (!activeChat?.isGroup) return;

    const member = activeChat.members.find((item) => item.user_id === userId);
    setConfirmState({
      title: "Tag eltávolítása",
      text: `Biztosan eltávolítod ${member?.profile?.display_name || "ezt a tagot"} felhasználót?`,
      confirmLabel: "Eltávolítás",
      action: async () => {
        const { error } = await supabase.rpc("remove_group_member", {
          target_conversation: activeChat.id,
          target_user: userId,
        });

        if (error) throw error;
        await loadConversations();
      },
    });
  }

  async function setGroupMemberRole(userId, nextRole) {
    const { error } = await supabase.rpc("set_group_member_role", {
      target_conversation: activeChat.id,
      target_user: userId,
      new_role: nextRole,
    });

    if (error) {
      alert(error.message);
      return;
    }

    await loadConversations();
  }

  async function saveGroup({ title, avatarFile }) {
    if (!activeChat?.isGroup) return;

    let avatarPath = null;

    if (avatarFile) {
      if (!avatarFile.type.startsWith("image/")) {
        throw new Error("Csak képfájl tölthető fel csoportképnek.");
      }

      if (avatarFile.size > 5 * 1024 * 1024) {
        throw new Error("A csoportkép maximum 5 MB lehet.");
      }

      const safeName = avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      avatarPath = `${activeChat.id}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("group-avatars")
        .upload(avatarPath, avatarFile, {
          contentType: avatarFile.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;
    }

    const { error } = await supabase.rpc("update_group_details", {
      target_conversation: activeChat.id,
      new_title: title,
      new_avatar_path: avatarPath,
    });

    if (error) throw error;

    await loadConversations();
  }

  async function uploadAttachment(file) {
    if (!activeChat || !me) return null;
    if (file.size > 10 * 1024 * 1024) throw new Error("Maximum 10 MB-os fájl küldhető.");

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${activeChat.id}/${me.id}/${crypto.randomUUID()}-${safeName}`;

    const { error } = await supabase.storage
      .from("chat-files")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;

    return {
      path,
      name: file.name,
      type: file.type,
      size: file.size,
      messageType: file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("audio/")
          ? "audio"
          : "file",
    };
  }

  async function refreshPushState() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }

    if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      setPushState("missing-key");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setPushState(subscription ? "enabled" : "disabled");
  }

  async function enablePushNotifications() {
    if (!me) return;

    if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      setPushState("missing-key");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    });

    const json = subscription.toJSON();

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: me.id,
        endpoint: subscription.endpoint,
        subscription: json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      alert(error.message);
      return;
    }

    setPushState("enabled");
  }

  async function disablePushNotifications() {
    if (!("serviceWorker" in navigator)) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);

      await subscription.unsubscribe();
    }

    setPushState("disabled");
  }

  async function sendPushForMessage(conversationId, messageId) {
    try {
      await supabase.functions.invoke("send-push", {
        body: {
          conversation_id: conversationId,
          message_id: messageId,
        },
      });
    } catch {
      // A chat működik push nélkül is.
    }
  }

  async function toggleBlockUser() {
    if (!activeChat?.otherUserId) return;

    if (blockedByMe) {
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", me.id)
        .eq("blocked_id", activeChat.otherUserId);

      if (error) alert(error.message);
      return;
    }

    const { error } = await supabase.from("user_blocks").insert({
      blocker_id: me.id,
      blocked_id: activeChat.otherUserId,
    });

    if (error) alert(error.message);
  }

  async function unblockUser(userId) {
    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", me.id)
      .eq("blocked_id", userId);

    if (error) alert(error.message);
  }


  async function requestNotifications() {
    if (typeof Notification === "undefined") {
      alert("Ez a böngésző nem támogatja az értesítéseket.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  async function installApp() {
    if (!deferredInstallPrompt) return;

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    setDeferredInstallPrompt(null);
  }

  async function maybeNotifyIncomingMessage(message) {
    if (!message || message.sender_id === me?.id) return;
    if (document.visibilityState === "visible") return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const chat = chatsRef.current.find((item) => item.id === message.conversation_id);
    if (chat?.muted) return;
    const title = chat?.displayName || "Új Krilix üzenet";
    const body =
      message.body ||
      (message.message_type === "image"
        ? "Képet küldött."
        : message.message_type === "audio"
          ? "Hangüzenetet küldött."
          : message.message_type === "gif"
            ? "GIF-et küldött."
            : message.message_type === "sticker"
              ? "Matricát küldött."
              : message.attachment_name || "Új melléklet érkezett.");

    if (window.krilixDesktop?.isDesktop) {
      const handled = await window.krilixDesktop.notify({
        title,
        body,
      });

      if (handled) return;
    }

    const options = {
      body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: `krilix-${message.conversation_id}`,
    };

    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(title, options);
      return;
    }

    new Notification(title, options);
  }

  function notifyTyping(isTyping) {
    if (!typingChannelRef.current || !me) return;

    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        user_id: me.id,
        display_name: me.display_name,
        is_typing: isTyping,
      },
    });
  }

  function handleMessageTextChange(value) {
    setMessageText(value);

    if (!activeChatId || !me) return;

    notifyTyping(Boolean(value.trim()));

    window.clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = window.setTimeout(() => {
      notifyTyping(false);
    }, 1200);
  }

  async function buildLinkPreview(body) {
    const url = firstUrl(body);
    if (!url) return null;

    try {
      const { data, error } = await supabase.functions.invoke("link-preview", {
        body: { url },
      });

      if (!error && data?.url) return data;
    } catch {
      // fallback lent
    }

    return {
      url,
      title: hostLabel(url),
      host: hostLabel(url),
    };
  }


  async function sendMessage() {
    const body = messageText.trim();
    if ((!body && !selectedFile) || !activeChat) return;

    try {
      const attachment = selectedFile ? await uploadAttachment(selectedFile) : null;
      const linkPreview = body ? await buildLinkPreview(body) : null;

      const { data: insertedMessage, error } = await supabase.from("messages").insert({
        conversation_id: activeChat.id,
        sender_id: me.id,
        body,
        message_type: attachment?.messageType || "text",
        attachment_path: attachment?.path || null,
        attachment_name: attachment?.name || null,
        attachment_type: attachment?.type || null,
        attachment_size: attachment?.size || null,
        metadata: linkPreview ? { link_preview: linkPreview } : {},
        reply_to: replyTarget?.message?.id || null,
      }).select("id").single();

      if (error) throw error;
      sendPushForMessage(activeChat.id, insertedMessage.id);

      setMessageText("");
      setSelectedFile(null);
      setReplyTarget(null);
      notifyTyping(false);
      await markRead(activeChat.id);
    } catch (error) {
      alert(error.message);
    }
  }

  async function sendSpecialMessage(messageType, metadata) {
    if (!activeChat) return;

    const { data: insertedMessage, error } = await supabase.from("messages").insert({
      conversation_id: activeChat.id,
      sender_id: me.id,
      body: "",
      message_type: messageType,
      metadata,
      reply_to: replyTarget?.message?.id || null,
    }).select("id").single();

    if (error) {
      alert(error.message);
      return;
    }

    sendPushForMessage(activeChat.id, insertedMessage.id);
    setReplyTarget(null);
    await markRead(activeChat.id);
  }

  async function sendVoiceMessage(file, duration) {
    if (!activeChat) return;

    try {
      const attachment = await uploadAttachment(file);
      const { data: insertedMessage, error } = await supabase.from("messages").insert({
        conversation_id: activeChat.id,
        sender_id: me.id,
        body: "",
        message_type: "audio",
        attachment_path: attachment.path,
        attachment_name: attachment.name,
        attachment_type: attachment.type,
        attachment_size: attachment.size,
        metadata: { duration },
        reply_to: replyTarget?.message?.id || null,
      }).select("id").single();

      if (error) throw error;

      sendPushForMessage(activeChat.id, insertedMessage.id);
      setReplyTarget(null);
      await markRead(activeChat.id);
    } catch (error) {
      alert(error.message);
    }
  }

  async function forwardMessage(message, targetConversationId) {
    const { data: insertedMessage, error } = await supabase.from("messages").insert({
      conversation_id: targetConversationId,
      sender_id: me.id,
      body: message.body || "",
      message_type: message.message_type,
      attachment_path: message.attachment_path || null,
      attachment_name: message.attachment_name || null,
      attachment_type: message.attachment_type || null,
      attachment_size: message.attachment_size || null,
      metadata: message.metadata || {},
      forwarded_from: message.id,
    }).select("id").single();

    if (error) {
      alert(error.message);
      return;
    }

    setForwardTarget(null);
  }


  async function toggleReaction(message, reaction) {
    const existing = message.reactions.find((item) => item.user_id === me.id);

    if (existing?.reaction === reaction) {
      await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", message.id)
        .eq("user_id", me.id);
    } else {
      await supabase
        .from("message_reactions")
        .upsert(
          {
            message_id: message.id,
            user_id: me.id,
            reaction,
          },
          { onConflict: "message_id,user_id" }
        );
    }

    await loadMessages(activeChat.id);
  }

  async function togglePin(message) {
    const { error } = await supabase
      .from("messages")
      .update({ pinned: !message.pinned })
      .eq("id", message.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadMessages(activeChat.id);
  }

  function beginEdit(message) {
    setReplyTarget({ editingId: message.id });
    setMessageText(message.body);
  }

  async function saveEdit() {
    if (!replyTarget?.editingId) return;
    const body = messageText.trim();
    if (!body) return;

    const { error } = await supabase
      .from("messages")
      .update({
        body,
        edited_at: new Date().toISOString(),
      })
      .eq("id", replyTarget.editingId)
      .eq("sender_id", me.id);

    if (error) {
      alert(error.message);
      return;
    }

    setReplyTarget(null);
    setMessageText("");
    notifyTyping(false);
    await loadMessages(activeChat.id);
  }

  function cancelEdit() {
    setReplyTarget(null);
    setMessageText("");
    notifyTyping(false);
  }

  async function updateConversationSetting(patch) {
    if (!activeChat || !me) return;

    const payload = {
      conversation_id: activeChat.id,
      user_id: me.id,
      favorite: activeChat.favorite || false,
      archived: activeChat.archived || false,
      muted: activeChat.muted || false,
      deleted_at: activeChat.deletedAt || null,
      ...patch,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("conversation_user_settings")
      .upsert(payload, { onConflict: "conversation_id,user_id" });

    if (error) {
      alert(error.message);
      return;
    }

    await loadConversations();
  }

  async function deleteConversationForMe() {
    if (!activeChat) return;

    setConfirmState({
      title: "Beszélgetés törlése",
      text: "Törlöd ezt a beszélgetést a saját listádból?",
      confirmLabel: "Törlés",
      action: async () => {
        await updateConversationSetting({ deleted_at: new Date().toISOString() });
      },
    });
  }

  async function deleteMessage(message) {
    if (!message || message.sender_id !== me.id || message.deleted_at) return;

    setConfirmState({
      title: "Üzenet törlése",
      text: "Biztosan törlöd ezt az üzenetet?",
      confirmLabel: "Törlés",
      action: async () => {
        const { error } = await supabase
          .from("messages")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", message.id)
          .eq("sender_id", me.id);

        if (error) throw error;

        await loadMessages(activeChat.id);
        await loadConversations();
      },
    });
  }


  async function saveProfile(payload) {
    let avatarPath = me.avatar_path || null;

    if (payload.avatarFile) {
      if (!payload.avatarFile.type.startsWith("image/")) {
        throw new Error("Csak képfájl tölthető fel profilképnek.");
      }

      if (payload.avatarFile.size > 5 * 1024 * 1024) {
        throw new Error("A profilkép maximum 5 MB lehet.");
      }

      const safeName = payload.avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      avatarPath = `${me.id}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(avatarPath, payload.avatarFile, {
          contentType: payload.avatarFile.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;
    }

    const updatePayload = {
      display_name: payload.display_name,
      avatar: payload.avatar,
      avatar_path: avatarPath,
      status: payload.status,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", me.id);

    if (error) throw error;

    setMe((value) => ({
      ...value,
      ...updatePayload,
      avatarUrl: getAvatarUrl(avatarPath),
    }));

    await loadConversations();
  }
  async function runConfirmAction() {
    if (!confirmState?.action) return;

    try {
      await confirmState.action();
      setConfirmState(null);
    } catch (error) {
      alert(error.message);
    }
  }


  async function logout() {
    await supabase.auth.signOut({ scope: "local" });
  }

  async function logoutOthers() {
    await supabase.auth.signOut({ scope: "others" });
  }

  async function logoutEverywhere() {
    await supabase.auth.signOut({ scope: "global" });
  }

  if (loading) {
    return <div className="loadingScreen">Krilix indul...</div>;
  }

  if (!session) {
    return <AuthScreen onReady={() => {}} />;
  }

  if (!me) {
    return <div className="loadingScreen">Profil betöltése...</div>;
  }

  return (
    <div className={`app ${theme} ${infoOpen ? "infoOpen" : ""}`}>
      <Sidebar
        me={me}
        chats={visibleChats}
        activeChatId={activeChatId}
        openChat={(id) => {
          setActiveChatId(id);
          setMobileChatOpen(true);
          markRead(id);
        }}
        openNewChat={() => setNewChatOpen(true)}
        openGroup={() => setNewGroupOpen(true)}
        openProfile={() => setProfileOpen(true)}
        openSettings={() => setSettingsOpen(true)}
        logout={logout}
        notificationPermission={notificationPermission}
        requestNotifications={requestNotifications}
        canInstall={Boolean(deferredInstallPrompt)}
        installApp={installApp}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        chatFilter={chatFilter}
        setChatFilter={setChatFilter}
      />
      <ChatWindow
        activeChat={activeChat}
        messages={messages}
        me={me}
        messageText={messageText}
        setMessageText={handleMessageTextChange}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        replyTarget={replyTarget}
        setReplyTarget={setReplyTarget}
        sendMessage={sendMessage}
        sendSpecialMessage={sendSpecialMessage}
        sendVoiceMessage={sendVoiceMessage}
        toggleReaction={toggleReaction}
        togglePin={togglePin}
        beginEdit={beginEdit}
        saveEdit={saveEdit}
        cancelEdit={cancelEdit}
        deleteMessage={deleteMessage}
        openForward={setForwardTarget}
        openLightbox={setLightboxId}
        endRef={endRef}
        typingNames={Object.values(typingUsers).filter(Boolean).map((item) => item.display_name)}
        toggleInfo={() => setInfoOpen((value) => !value)}
        messageSearchTerm={messageSearchTerm}
        setMessageSearchTerm={setMessageSearchTerm}
        messageSearchOpen={messageSearchOpen}
        setMessageSearchOpen={setMessageSearchOpen}
        mobileOpen={mobileChatOpen}
        closeMobile={() => setMobileChatOpen(false)}
        blockedByMe={blockedByMe}
        startCall={startCall}
      />
      {infoOpen && (
        <InfoPanel
          activeChat={activeChat}
          messages={messages}
          closePanel={() => setInfoOpen(false)}
          toggleFavorite={() => updateConversationSetting({ favorite: !activeChat.favorite })}
          toggleArchive={() => updateConversationSetting({ archived: !activeChat.archived })}
          toggleMute={() => updateConversationSetting({ muted: !activeChat.muted })}
          deleteConversation={deleteConversationForMe}
          openGroupSettings={() => setGroupSettingsOpen(true)}
          addGroupMember={addGroupMember}
          removeGroupMember={removeGroupMember}
          setGroupMemberRole={setGroupMemberRole}
          onlineUserIds={onlineUserIds}
          blockedByMe={blockedByMe}
          toggleBlockUser={toggleBlockUser}
        />
      )}

      {newChatOpen && (
        <NewDirectChatModal
          close={() => setNewChatOpen(false)}
          onCreate={createDirectConversation}
        />
      )}

      {newGroupOpen && (
        <NewGroupModal
          close={() => setNewGroupOpen(false)}
          onCreate={createGroup}
        />
      )}

      {groupSettingsOpen && activeChat?.isGroup && (
        <GroupSettingsModal
          chat={activeChat}
          close={() => setGroupSettingsOpen(false)}
          saveGroup={saveGroup}
        />
      )}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          text={confirmState.text}
          confirmLabel={confirmState.confirmLabel}
          onCancel={() => setConfirmState(null)}
          onConfirm={runConfirmAction}
        />
      )}

      {forwardTarget && (
        <ForwardModal
          message={forwardTarget}
          chats={chats}
          activeChatId={activeChatId}
          close={() => setForwardTarget(null)}
          forwardMessage={forwardMessage}
        />
      )}

      {lightboxId && (
        <Lightbox
          media={activeMedia}
          activeId={lightboxId}
          close={() => setLightboxId(null)}
          setActiveId={setLightboxId}
        />
      )}

      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          caller={incomingCaller}
          acceptCall={acceptCall}
          declineCall={declineCall}
        />
      )}

      {activeCall && callRole && (
        <CallOverlay
          call={activeCall}
          peer={callPeer}
          role={callRole}
          updateCallStatus={updateCallStatus}
          closeCall={closeCall}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          me={me}
          close={() => setSettingsOpen(false)}
          theme={theme}
          setTheme={setThemeState}
          notificationPermission={notificationPermission}
          requestNotifications={requestNotifications}
          pushState={pushState}
          enablePushNotifications={enablePushNotifications}
          disablePushNotifications={disablePushNotifications}
          blockedProfiles={blockedProfiles}
          unblockUser={unblockUser}
          desktopState={desktopState}
          setDesktopState={setDesktopState}
          updateState={updateState}
          setUpdateState={setUpdateState}
          logoutCurrent={logout}
          logoutOthers={logoutOthers}
          logoutEverywhere={logoutEverywhere}
        />
      )}

      {passwordRecoveryOpen && (
        <PasswordRecoveryModal close={() => setPasswordRecoveryOpen(false)} />
      )}

      {profileOpen && (
        <ProfileModal
          me={me}
          close={() => setProfileOpen(false)}
          saveProfile={saveProfile}
        />
      )}
    </div>
  );
}
