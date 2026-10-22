import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  ScreenShare,
  Minimize2,
  Maximize2,
  Share2,
  MessageCircle,
  X,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLanguage } from '../context/LanguageContext';

// Web Audio API Synthesizer for instant zero-latency praise sound effects
const playPraiseSound = (type) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (type === 'perfect') {
      // 10 Điểm: Triumphant Mario-style star victory chime (G4 -> C5 -> E5 -> G5 -> C6)
      const notes = [
        { f: 392.00, t: 0.00, d: 0.11, v: 0.22 },
        { f: 523.25, t: 0.09, d: 0.11, v: 0.24 },
        { f: 659.25, t: 0.18, d: 0.11, v: 0.26 },
        { f: 783.99, t: 0.27, d: 0.13, v: 0.28 },
        { f: 1046.50, t: 0.38, d: 0.45, v: 0.32 }
      ];
      notes.forEach(({ f, t, d, v }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, ctx.currentTime + t);
        gain.gain.setValueAtTime(0, ctx.currentTime + t);
        gain.gain.linearRampToValueAtTime(v, ctx.currentTime + t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + d);
      });
    } else if (type === 'applause') {
      // Giỏi lắm: Upbeat praise fanfare (C5 -> E5 -> G5 -> C6)
      const notes = [
        { f: 523.25, t: 0.00, d: 0.10, v: 0.22 },
        { f: 659.25, t: 0.09, d: 0.10, v: 0.24 },
        { f: 783.99, t: 0.18, d: 0.12, v: 0.26 },
        { f: 1046.50, t: 0.28, d: 0.35, v: 0.28 }
      ];
      notes.forEach(({ f, t, d, v }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime + t);
        gain.gain.setValueAtTime(0, ctx.currentTime + t);
        gain.gain.linearRampToValueAtTime(v, ctx.currentTime + t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + d);
      });
    } else if (type === 'heart') {
      // Cố lên: Warm, gentle harp-like chord (F4 -> A4 -> C5 -> F5)
      const notes = [
        { f: 349.23, t: 0.00, d: 0.32, v: 0.18 },
        { f: 440.00, t: 0.08, d: 0.32, v: 0.20 },
        { f: 523.25, t: 0.16, d: 0.36, v: 0.22 },
        { f: 698.46, t: 0.24, d: 0.45, v: 0.24 }
      ];
      notes.forEach(({ f, t, d, v }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime + t);
        gain.gain.setValueAtTime(0, ctx.currentTime + t);
        gain.gain.linearRampToValueAtTime(v, ctx.currentTime + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + d);
      });
    }
  } catch (err) {
    console.warn('Audio playback not supported or blocked:', err);
  }
};

// Custom Emoji-shaped Confetti for distinct praises
const firePraiseConfetti = (type) => {
  try {
    const makeShape = (text, scalar = 2) => {
      if (typeof confetti.shapeFromText === 'function') {
        try {
          return confetti.shapeFromText({ text, scalar });
        } catch {
          return 'circle';
        }
      }
      return 'circle';
    };

    if (type === 'perfect') {
      const star = makeShape('⭐', 2.3);
      const score100 = makeShape('💯', 2.3);
      const trophy = makeShape('🏆', 2.1);
      confetti({
        particleCount: 55,
        spread: 90,
        origin: { y: 0.5 },
        shapes: [star, score100, trophy],
        scalar: 1.5,
        ticks: 250,
        colors: ['#fbbf24', '#f59e0b', '#ef4444', '#10b981']
      });
    } else if (type === 'applause') {
      const clap = makeShape('👏', 2.2);
      const party = makeShape('🎉', 2.2);
      const sparkle = makeShape('✨', 2.0);
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.55 },
        shapes: [clap, party, sparkle],
        scalar: 1.4,
        ticks: 220,
        colors: ['#10b981', '#34d399', '#3b82f6', '#f59e0b']
      });
    } else if (type === 'heart') {
      const heart = makeShape('❤️', 2.2);
      const sparkHeart = makeShape('💖', 2.2);
      const cherry = makeShape('🌸', 2.0);
      confetti({
        particleCount: 45,
        spread: 75,
        origin: { y: 0.55 },
        shapes: [heart, sparkHeart, cherry],
        scalar: 1.4,
        ticks: 220,
        colors: ['#f43f5e', '#ec4899', '#fb7185', '#fda4af']
      });
    }
  } catch (err) {
    console.warn('Confetti error:', err);
    confetti({ particleCount: 50, spread: 60 });
  }
};

export default function VideoOverlay({
  localStream,
  remoteStream,
  isMicOn,
  isCamOn,
  isScreenSharing,
  remoteScreenSharing,
  connectedPeer,
  toggleMic,
  toggleCam,
  toggleScreenShare,
  userName,
  userRole,
  roomId,
  tunnelUrl,
  socket
}) {
  const { t } = useLanguage();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const screenPopupRef = useRef(null);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestChatToast, setLatestChatToast] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');

  // Floating Praise Badge state
  const [activePraise, setActivePraise] = useState(null);
  const praiseTimerRef = useRef(null);

  // Trigger sound, confetti and prominent animated badge
  const triggerPraise = useCallback((type, senderName) => {
    // 1. Play cute Web Audio chime
    playPraiseSound(type);

    // 2. Fire custom emoji confetti
    firePraiseConfetti(type);

    // 3. Store badge config (title/subText resolved at render time via t())
    let icon = '👏';
    let badgeClass = 'praise-badge-applause';
    if (type === 'perfect') { icon = '⭐'; badgeClass = 'praise-badge-perfect'; }
    else if (type === 'heart') { icon = '❤️'; badgeClass = 'praise-badge-heart'; }

    setActivePraise({ type, senderName: senderName || null, icon, badgeClass });

    if (praiseTimerRef.current) clearTimeout(praiseTimerRef.current);
    praiseTimerRef.current = setTimeout(() => setActivePraise(null), 3500);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (praiseTimerRef.current) {
        clearTimeout(praiseTimerRef.current);
      }
    };
  }, []);

  // Bind local webcam stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCamOn, isCollapsed]);

  // Bind remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteScreenSharing?.isSharing, isCollapsed]);

  useEffect(() => {
    const audioElement = remoteAudioRef.current;
    if (!audioElement) return;

    audioElement.srcObject = remoteStream;
    if (remoteStream) {
      audioElement.play().catch((error) => {
        console.warn('[WebRTC] Remote audio playback was blocked:', error.message);
      });
    }
  }, [remoteStream]);

  // Open separate dedicated browser window using clean /screen-viewer.html
  const openScreenShareWindow = useCallback(() => {
    const width = Math.min(1366, window.screen.availWidth - 80);
    const height = Math.min(840, window.screen.availHeight - 80);
    const left = (window.screen.availWidth - width) / 2;
    const top = (window.screen.availHeight - height) / 2;

    if (screenPopupRef.current && !screenPopupRef.current.closed) {
      screenPopupRef.current.focus();
      return;
    }

    const popup = window.open(
      '/screen-viewer.html',
      'LearnBoardScreenShare',
      `width=${width},height=${height},left=${left},top=${top},popup=yes,menubar=no,toolbar=no,location=no,status=no`
    );

    if (popup) {
      popup.focus();
      screenPopupRef.current = popup;
    }
  }, []);

  // Auto-close popup window if peer stops screen sharing
  useEffect(() => {
    if (!remoteScreenSharing?.isSharing) {
      if (screenPopupRef.current && !screenPopupRef.current.closed) {
        screenPopupRef.current.close();
        screenPopupRef.current = null;
      }
    }
  }, [remoteScreenSharing?.isSharing]);

  // Clean up popup when teacher ends class
  useEffect(() => {
    if (!socket) return;
    const handleClassEnded = () => {
      if (screenPopupRef.current && !screenPopupRef.current.closed) {
        screenPopupRef.current.close();
        screenPopupRef.current = null;
      }
    };
    socket.on('class-ended', handleClassEnded);
    return () => socket.off('class-ended', handleClassEnded);
  }, [socket]);

  // Clean up popup on unmount
  useEffect(() => {
    return () => {
      if (screenPopupRef.current && !screenPopupRef.current.closed) {
        screenPopupRef.current.close();
      }
    };
  }, []);

  // Socket reaction and chat
  useEffect(() => {
    if (!socket) return;

    socket.on('receive-reaction', ({ type, senderName }) => {
      triggerPraise(type, senderName);
    });

    socket.on('receive-chat', (msg) => {
      setChatMessages((prev) => [...prev, msg]);

      if (!showChat) {
        setUnreadCount((count) => count + 1);
        setLatestChatToast(msg);
        setTimeout(() => {
          setLatestChatToast(null);
        }, 4000);
      }
    });

    return () => {
      socket.off('receive-reaction');
      socket.off('receive-chat');
    };
  }, [socket, showChat, triggerPraise]);

  // Handle open chat
  const handleOpenChat = () => {
    setShowChat(!showChat);
    if (!showChat) {
      setUnreadCount(0);
      setLatestChatToast(null);
    }
  };

  // Send quick praise reaction
  const handleReaction = (type, label) => {
    if (socket && socket.connected) {
      socket.emit('send-reaction', { type, label });
    } else {
      triggerPraise(type, userName || 'Bạn');
    }
  };

  // Copy shareable link for student
  const handleCopyInviteLink = () => {
    let finalUrl = '';
    if (tunnelUrl) {
      const cleanUrl = tunnelUrl.endsWith('/') ? tunnelUrl.slice(0, -1) : tunnelUrl;
      finalUrl = `${cleanUrl}?role=student&room=${roomId}`;
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomId);
      url.searchParams.set('role', 'student');
      finalUrl = url.toString();
    }

    navigator.clipboard.writeText(finalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Send Chat Message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    if (socket) {
      socket.emit('send-chat', inputMsg.trim());
    }
    setInputMsg('');
  };

  return (
    <>
      {/* Prominent Floating Animated Praise Badge */}
      {activePraise && (
        <div className="praise-badge-container animate-bounce-in">
          <div className={`praise-badge ${activePraise.badgeClass}`}>
            <div className="praise-badge-icon">
              {activePraise.icon}
            </div>
            <div className="praise-badge-body">
              <div className="praise-badge-tag">
                {t('praisedByTag', { name: activePraise.senderName || t('roleTeacherTag') })}
              </div>
              <div className="praise-badge-title">
                {activePraise.type === 'perfect' ? t('praise10Title') : activePraise.type === 'heart' ? t('praiseHeartTitle') : t('praiseClapTitle')}
              </div>
              <div className="praise-badge-subtext">
                {activePraise.type === 'perfect' ? t('praise10Sub') : activePraise.type === 'heart' ? t('praiseHeartSub') : t('praiseClapSub')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen Sharing Notification & Quick Re-open Window Banner */}
      {((remoteScreenSharing?.isSharing && connectedPeer) || isScreenSharing) && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 glass-panel px-4 py-2 rounded-2xl border border-emerald-400/40 shadow-2xl animate-fade-in">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold text-white">
            {isScreenSharing
              ? t('sharingLocalBanner')
              : t('sharingRemoteBanner', { name: remoteScreenSharing?.userName || connectedPeer?.name || t('roleTeacherTag') })}
          </span>
          <button
            onClick={openScreenShareWindow}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg cursor-pointer"
            title={t('openPopoutTitle')}
          >
            <ExternalLink size={13} />
            {t('openPopoutBtn')}
          </button>
        </div>
      )}

      {/* Floating Video Dock (Top Right) */}
      <div
        className={`absolute top-4 right-6 z-40 transition-all duration-300 flex flex-col items-end gap-2 ${
          isCollapsed ? 'w-auto' : 'w-72'
        }`}
      >
        <audio ref={remoteAudioRef} autoPlay hidden />

        {/* Header Bar */}
        <div className="glass-panel w-full px-3 py-2 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-200 truncate">
              {connectedPeer
                ? t('callingPeer', { name: connectedPeer.name })
                : (userRole === 'teacher' ? t('waitingStudent') : t('connecting'))}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleCopyInviteLink}
              className={`p-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                copiedLink
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-emerald-700/80 hover:bg-emerald-600 text-white'
              }`}
              title={t('shareLinkTitle')}
            >
              <Share2 size={13} />
              {copiedLink ? t('copiedLink') : t('shareLinkBtn')}
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              title={isCollapsed ? t('expandCamera') : t('collapseCamera')}
            >
              {isCollapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
          </div>
        </div>

        {/* Video Feeds Container */}
        <div
          className="w-full flex flex-col gap-2 animate-fade-in"
          style={{ display: isCollapsed ? 'none' : 'flex' }}
        >
            {/* Remote Peer Video */}
            <div className="video-card w-full h-44 relative bg-slate-900 flex items-center justify-center overflow-hidden">
              {remoteScreenSharing?.isSharing ? (
                <div className="flex flex-col items-center justify-center text-slate-300 text-xs gap-2 p-3 text-center w-full h-full bg-slate-900">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <ScreenShare size={20} />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-emerald-300 text-[12px]">
                      {remoteScreenSharing.userName || connectedPeer?.name || t('roleTeacherTag')}
                    </span>
                    <span className="text-[10px] text-slate-400">{t('isSharingScreen')}</span>
                  </div>
                  <button
                    onClick={openScreenShareWindow}
                    className="px-3 py-1.5 text-[11px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition shadow-md flex items-center gap-1 cursor-pointer"
                    title="Mở màn hình chia sẻ ở cửa sổ riêng biệt"
                  >
                    <ExternalLink size={12} />
                    <span>{t('openPopoutCardBtn')}</span>
                  </button>
                  {/* Keep video element mounted and active in background so track is decoded continuously */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0.01, pointerEvents: 'none' }}
                  />
                </div>
              ) : remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 p-4 text-center">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                    🧑‍🎓
                  </div>
                  <span>{userRole === 'teacher' ? t('waitingStudentCard') : t('connectingRoomCard')}</span>
                  {userRole === 'teacher' && (
                    <button
                      onClick={handleCopyInviteLink}
                      className="mt-1 px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition shadow-md"
                    >
                      {copiedLink ? t('copiedLinkZalo') : t('copyLinkZalo')}
                    </button>
                  )}
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[11px] text-slate-200">
                {connectedPeer ? connectedPeer.name : (userRole === 'teacher' ? t('roleStudentTag') : t('roleTeacherTag'))}
              </div>
            </div>

            {/* Local Video (Self Preview) */}
            <div className="video-card w-full h-32 relative bg-slate-900 flex items-center justify-center overflow-hidden">
              {localStream && isCamOn ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center text-slate-400 text-xs">
                  {t('camOff')}
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[11px] text-slate-200 flex items-center gap-1">
                <span>{userName} ({userRole === 'teacher' ? t('roleTeacherTag') : t('roleStudentTag')})</span>
                {!isMicOn && <MicOff size={11} className="text-red-400" />}
              </div>
            </div>

            {/* Media Controls Bar */}
            <div className="glass-panel w-full px-3 py-2 rounded-xl flex items-center justify-around shadow-md">
              <button
                onClick={toggleMic}
                className={`p-2 rounded-lg transition ${
                  isMicOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/80 text-white hover:bg-red-600'
                }`}
                title={isMicOn ? t('muteMic') : t('unmuteMic')}
              >
                {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
              </button>

              <button
                onClick={toggleCam}
                className={`p-2 rounded-lg transition ${
                  isCamOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/80 text-white hover:bg-red-600'
                }`}
                title={isCamOn ? t('turnOffCam') : t('turnOnCam')}
              >
                {isCamOn ? <VideoIcon size={16} /> : <VideoOff size={16} />}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`p-2 rounded-lg transition ${
                  isScreenSharing ? 'bg-emerald-500 text-white font-bold' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isScreenSharing ? t('stopShareScreen') : t('shareScreen')}
              >
                <ScreenShare size={16} />
              </button>

              {/* Chat Button with Unread Badge */}
              <button
                onClick={handleOpenChat}
                className={`p-2 rounded-lg transition relative ${
                  showChat ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={t('notesAndChat')}
              >
                <MessageCircle size={16} />
                {unreadCount > 0 && !showChat && (
                  <span className="chat-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
            </div>

            {/* Praise & Encouragement Quick Buttons */}
            <div className="glass-panel w-full px-2 py-1.5 rounded-xl flex items-center justify-around">
              <button
                onClick={() => handleReaction('applause', 'Vỗ tay')}
                className="btn-reaction px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 font-medium"
                title="Khen ngợi: Rất tốt!"
              >
                {t('praiseClap')}
              </button>
              <button
                onClick={() => handleReaction('perfect', 'Điểm 10')}
                className="btn-reaction px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 font-medium text-yellow-300"
                title="Đạt điểm 10!"
              >
                {t('praise10')}
              </button>
              <button
                onClick={() => handleReaction('heart', 'Thả tim')}
                className="btn-reaction px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 font-medium text-rose-300"
                title="Động viên"
              >
                {t('praiseHeart')}
              </button>
            </div>
        </div>
      </div>

      {/* Floating Chat Message Toast */}
      {latestChatToast && !showChat && (
        <div
          onClick={handleOpenChat}
          className="fixed top-20 right-80 z-50 glass-panel px-4 py-2.5 rounded-2xl border border-emerald-400/40 shadow-2xl flex items-center gap-2 cursor-pointer animate-fade-in hover:scale-105 transition"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <div className="text-xs">
            <span className="font-bold text-emerald-400">{latestChatToast.senderName}: </span>
            <span className="text-white">{latestChatToast.text}</span>
          </div>
        </div>
      )}

      {/* Quick Chat Drawer */}
      {showChat && (
        <div className="absolute top-20 right-80 z-40 w-80 h-80 glass-panel rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-fade-in border border-white/20">
          <div className="px-3.5 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MessageCircle size={15} className="text-emerald-400" />
              <span className="text-xs font-bold text-white">{t('chatTitle')}</span>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2">
            {chatMessages.length === 0 ? (
              <span className="text-xs text-slate-400 text-center my-auto">
                {t('noMessages')}
              </span>
            ) : (
              chatMessages.map((m, idx) => (
                <div key={idx} className="text-xs p-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold text-emerald-400">{m.senderName}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-slate-100">{m.text}</span>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-2 border-t border-white/10 flex gap-1.5">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder={t('chatPlaceholder')}
              style={{ backgroundColor: '#111a14', color: '#ffffff' }}
              className="flex-1 px-3 py-1.5 rounded-xl border border-white/15 text-xs focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold transition"
            >
              {t('sendBtn')}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
