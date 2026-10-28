import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Blackboard from './components/Blackboard';
import VideoOverlay from './components/VideoOverlay';
import { useWebRTC } from './hooks/useWebRTC';
import { useLanguage } from './context/LanguageContext';
import { BookOpen, Video, Users, Sparkles, CheckCircle2, Lock, Globe } from 'lucide-react';

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const [isInClass, setIsInClass] = useState(false);
  const [roomId, setRoomId] = useState(() => (
    new URLSearchParams(window.location.search).get('room')?.trim() || 'lop-hoc-1'
  ));
  const [userRole, setUserRole] = useState('teacher'); // 'teacher' | 'student' | 'spectator'
  const [userName, setUserName] = useState('');
  const [spectatorName, setSpectatorName] = useState('');
  const [needsSpectatorProfile, setNeedsSpectatorProfile] = useState(false);
  const [parentLabel, setParentLabel] = useState('father');
  const [roomInfoLoaded, setRoomInfoLoaded] = useState(
    () => Boolean(new URLSearchParams(window.location.search).get('room'))
  );
  const [isCheckingRoom, setIsCheckingRoom] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return params.get('role') === 'student' || (!local && !params.get('role'));
  });
  const [roomCheckError, setRoomCheckError] = useState(false);
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [socket, setSocket] = useState(null);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [spectators, setSpectators] = useState([]);
  const [initialElements, setInitialElements] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [kickedBy, setKickedBy] = useState('');

  // Detect environment
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  // Initial role and room detection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const roleParam = params.get('role');

    if (roomParam) setRoomId(roomParam.trim());

    if (roleParam === 'student' || (!isLocalhost && !roleParam)) {
      setUserRole('student');
      setUserName(t('defaultStudentName'));
    } else {
      setUserRole('teacher');
      setUserName(t('defaultTeacherName'));
    }

    // Fetch tunnel info and the default room when the link has no room parameter.
    fetch('/api/tunnel-info')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (data.tunnelUrl) setTunnelUrl(data.tunnelUrl);
          if (data.roomId && !roomParam) setRoomId(data.roomId);
        }
      })
      .catch((error) => {
        console.error('[Lobby] Could not load initial room information:', error);
      })
      .finally(() => setRoomInfoLoaded(true));
  }, [isLocalhost]);

  // Pre-check student links so a third participant sees the spectator lobby immediately.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    const isStudentLink = roleParam === 'student' || (!isLocalhost && !roleParam);
    if (!isStudentLink || !roomInfoLoaded) return undefined;

    let active = true;
    let completed = false;
    const checkSocketUrl = window.location.port === '3000'
      ? 'http://localhost:5000'
      : window.location.origin;
    const checkSocket = io(checkSocketUrl, { transports: ['websocket', 'polling'] });
    const finishCheck = (status, error) => {
      if (!active || completed) return;
      completed = true;
      if (error) {
        console.error('[Lobby] Could not check classroom participants:', error);
        setRoomCheckError(true);
      } else if (status?.hasTeacher && status?.hasStudent) {
        setUserRole('spectator');
        setNeedsSpectatorProfile(true);
      }
      setIsCheckingRoom(false);
      checkSocket.disconnect();
    };

    checkSocket.on('connect', () => {
      checkSocket.timeout(5000).emit(
        'check-room-status',
        { roomId },
        (error, status) => finishCheck(status, error)
      );
    });
    checkSocket.on('connect_error', (error) => finishCheck(null, error));

    return () => {
      active = false;
      checkSocket.disconnect();
    };
  }, [isLocalhost, roomId, roomInfoLoaded, language]);

  // Setup background socket to listen for room updates before entering class
  useEffect(() => {
    if (isInClass) return;

    const socketUrl = window.location.port === '3000' ? 'http://localhost:5000' : window.location.origin;
    const bgSocket = io(socketUrl, { transports: ['websocket', 'polling'] });

    bgSocket.on('room-id-updated', ({ roomId: newRoom }) => {
      // If student, auto sync teacher's room ID
      if (userRole === 'student' || !isLocalhost) {
        setRoomId(newRoom);
      }
    });

    bgSocket.on('tunnel-url-updated', ({ tunnelUrl: newTunnel, roomId: newRoom }) => {
      if (newTunnel) setTunnelUrl(newTunnel);
      if (newRoom && (userRole === 'student' || !isLocalhost)) setRoomId(newRoom);
    });

    return () => {
      bgSocket.disconnect();
    };
  }, [isInClass, userRole, isLocalhost]);

  // Handle teacher updating room ID
  const handleTeacherRoomChange = (newVal) => {
    setRoomId(newVal);
    // Broadcast to server
    fetch('/api/update-room-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: newVal })
    }).catch(() => {});
  };

  // WebRTC hook
  const {
    localStream,
    remoteStream,
    isMicOn,
    isCamOn,
    isScreenSharing,
    remoteScreenSharing,
    connectedPeer,
    observedStreams,
    initLocalStream,
    toggleMic,
    toggleCam,
    toggleScreenShare
  } = useWebRTC(socket, socket?.id, userName, userRole);

  useEffect(() => {
    if (socket && !socket.connected) {
      socket.connect();
    }
  }, [socket]);

  // Join Classroom
  const handleJoinClass = (spectatorDisplayName = '') => {
    if (isJoining) return;
    const displayName = typeof spectatorDisplayName === 'string' ? spectatorDisplayName : '';
    setIsJoining(true);
    setJoinError('');
    const socketUrl = window.location.port === '3000' ? 'http://localhost:5000' : window.location.origin;
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: false
    });
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      newSocket.emit('join-room', {
        roomId: roomId.trim() || 'lop-hoc-1',
        userName: displayName || userName,
        role: displayName ? 'spectator' : userRole
      });
    });

    newSocket.on('room-joined', async ({ selfRole }) => {
      if (!['teacher', 'student', 'spectator'].includes(selfRole)) {
        setJoinError(t('joinFailed'));
        setIsJoining(false);
        newSocket.disconnect();
        setSocket(null);
        return;
      }

      setUserRole(selfRole);
      if (selfRole === 'spectator') {
        if (displayName) {
          setUserName(displayName);
          newSocket.emit('update-user-name', displayName);
          newSocket.emit('room-ready');
        } else {
          setNeedsSpectatorProfile(true);
          setIsJoining(false);
        }
        return;
      }

      await initLocalStream();
      newSocket.emit('room-ready');
    });

    newSocket.on('room-ready', ({ elements, users = [] }) => {
      setInitialElements(Array.isArray(elements) ? elements : []);
      setSpectators(users.filter((user) => user.role === 'spectator'));
      setIsInClass(true);
      setIsJoining(false);
    });

    newSocket.on('user-joined', (user) => {
      if (user.role !== 'spectator') return;
      setSpectators((current) => (
        current.some((spectator) => spectator.id === user.id)
          ? current
          : [...current, user]
      ));
    });

    newSocket.on('user-left', ({ id }) => {
      setSpectators((current) => current.filter((spectator) => spectator.id !== id));
    });

    newSocket.on('user-updated', (user) => {
      if (user.role !== 'spectator') return;
      setSpectators((current) => current.map((spectator) => (
        spectator.id === user.id ? { ...spectator, name: user.name } : spectator
      )));
    });

    newSocket.on('user-role-updated', (user) => {
      setSpectators((current) => (
        user.role === 'spectator'
          ? current.some((spectator) => spectator.id === user.id)
            ? current.map((spectator) => (spectator.id === user.id ? user : spectator))
            : [...current, user]
          : current.filter((spectator) => spectator.id !== user.id)
      ));
    });

    newSocket.on('user-kicked', ({ action, teacherName }, acknowledge) => {
      if (action === 'spectator') {
        setUserRole('spectator');
        setNeedsSpectatorProfile(false);
      } else if (action === 'removed') {
        setKickedBy(teacherName || t('roleTeacherTag'));
        acknowledge?.();
        newSocket.disconnect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket.IO] Could not connect to classroom server:', error);
      setJoinError(t('joinFailed'));
      setIsJoining(false);
      newSocket.disconnect();
      setSocket(null);
    });

    newSocket.on('tunnel-url-updated', ({ tunnelUrl: newTunnel, roomId: newRoom }) => {
      if (newTunnel) setTunnelUrl(newTunnel);
      if (newRoom && userRole === 'student') setRoomId(newRoom);
    });

    newSocket.on('room-id-updated', ({ roomId: newRoom }) => {
      if (userRole === 'student') setRoomId(newRoom);
    });

    setSocket(newSocket);
  };

  const handleSpectatorContinue = () => {
    const normalizedName = spectatorName.trim();
    if (!normalizedName) {
      setJoinError(t('spectatorNameRequired'));
      return;
    }

    const roleName = t({
      father: 'parentRoleFather',
      mother: 'parentRoleMother',
      other: 'parentRoleOther'
    }[parentLabel] || 'parentRoleOther');
    const displayName = `${normalizedName} (${roleName})`;
    setUserName(displayName);

    if (socket?.connected) {
      socket.emit('update-user-name', displayName);
      socket.emit('room-ready');
      setNeedsSpectatorProfile(false);
      setIsJoining(true);
      return;
    }

    handleJoinClass(displayName);
  };

  const handleKickUser = (targetId) => {
    if (userRole !== 'teacher' || !socket?.connected || !targetId) return;
    if (window.confirm(t('confirmKickUser'))) {
      socket.emit('kick-user', { targetId });
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0c1410] text-slate-100 relative">
      {kickedBy ? (
        <div className="w-full h-full bg-black flex items-center justify-center p-6">
          <p className="text-center text-lg font-semibold text-white">{t('kickedByTeacher', { name: kickedBy })}</p>
        </div>
      ) : !isInClass && isCheckingRoom ? (
        <div className="w-full h-full flex items-center justify-center p-6">
          <p className="text-sm text-slate-300">{t('checkingRoom')}</p>
        </div>
      ) : !isInClass ? (
        // Lobby / Welcome Screen
        <div className="w-full h-full flex items-center justify-center p-6 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-950/40 via-[#0c1410] to-[#080d0a]" />

          <div className="relative z-10 w-full max-w-md glass-panel p-8 rounded-3xl border border-white/15 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-1 shadow-lg">
                <BookOpen size={28} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {t('appName')}
              </h1>
              <p className="text-xs text-slate-300 max-w-xs">
                {t('appSubtitle')}
              </p>
            </div>

            {/* Role Header Indicator */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-lg flex-shrink-0">
                {userRole === 'teacher' ? '👨‍🏫' : userRole === 'spectator' ? '👀' : '🧑‍🎓'}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  {userRole === 'teacher' ? t('roleTeacher') : userRole === 'spectator' ? t('roleSpectator') : t('roleStudent')}
                </span>
                <span className="text-[11px] text-slate-300">
                  {userRole === 'teacher' ? t('roleTeacherDesc') : userRole === 'spectator' ? t('spectatorNamePrompt') : t('roleStudentDesc')}
                </span>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe size={13} className="text-slate-400" />
                {t('langSelectLabel')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLanguage('vi')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer border ${
                    language === 'vi'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/40'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-base">🇻🇳</span>
                  <span>{t('langVi')}</span>
                  {language === 'vi' && <span className="text-emerald-300 text-xs">✓</span>}
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer border ${
                    language === 'en'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/40'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-base">🇬🇧</span>
                  <span>{t('langEn')}</span>
                  {language === 'en' && <span className="text-emerald-300 text-xs">✓</span>}
                </button>
              </div>
            </div>

            {needsSpectatorProfile ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="spectator-name" className="text-xs font-semibold text-slate-300">
                    {t('yourName')}
                  </label>
                  <input
                    id="spectator-name"
                    type="text"
                    value={spectatorName}
                    onChange={(e) => setSpectatorName(e.target.value)}
                    placeholder={t('namePlaceholder')}
                    maxLength={50}
                    style={{ backgroundColor: '#111a14', color: '#ffffff' }}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/15 text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="parent-label" className="text-xs font-semibold text-slate-300">
                    {t('parentRoleLabel')}
                  </label>
                  <select
                    id="parent-label"
                    value={parentLabel}
                    onChange={(e) => setParentLabel(e.target.value)}
                    style={{ backgroundColor: '#111a14', color: '#ffffff' }}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/15 text-sm focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="father">{t('parentRoleFather')}</option>
                    <option value="mother">{t('parentRoleMother')}</option>
                    <option value="other">{t('parentRoleOther')}</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t('yourName')}
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  style={{ backgroundColor: '#111a14', color: '#ffffff' }}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/15 text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            )}

            {!needsSpectatorProfile && <>
            {/* Room ID Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  {t('roomId')}
                </label>
                {userRole === 'student' && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <Lock size={11} />
                    {t('lockedAuto')}
                  </span>
                )}
              </div>

              {userRole === 'teacher' ? (
                // Teacher can freely change room ID and auto-sync to student
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => handleTeacherRoomChange(e.target.value)}
                  placeholder="lop-hoc-1"
                  style={{ backgroundColor: '#111a14', color: '#ffffff' }}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/15 text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              ) : (
                // Student cannot change room ID
                <div className="relative">
                  <input
                    type="text"
                    value={roomId}
                    readOnly
                    disabled
                    style={{ backgroundColor: '#0d1410', color: '#94a3b8' }}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 text-sm cursor-not-allowed pr-9"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={15} />
                  </div>
                </div>
              )}
              {userRole === 'student' && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1.5 pl-0.5 mt-0.5">
                  <Lock size={10} className="text-slate-500 flex-shrink-0" />
                  {t('roomIdStudentNote')}
                </span>
              )}
            </div>

            {/* Feature Badges */}
            <div className="grid grid-cols-3 gap-2 py-2 text-center text-[11px] text-slate-300 border-t border-b border-white/10">
              <div className="flex flex-col items-center gap-1">
                <Video size={15} className="text-emerald-400" />
                <span>{t('badgeWebcam')}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Sparkles size={15} className="text-yellow-400" />
                <span>{t('badgeRecord')}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <CheckCircle2 size={15} className="text-cyan-400" />
                <span>{t('badgeOverlay')}</span>
              </div>
            </div>
            </>}

            {/* Join Button */}
            <button
              onClick={() => (needsSpectatorProfile ? handleSpectatorContinue() : handleJoinClass())}
              disabled={isJoining}
              className="btn-primary w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-base transition-all duration-200"
            >
              <Users size={18} />
              <span>{isJoining ? t('joiningClass') : needsSpectatorProfile ? t('continueToClass') : t('joinButton')}</span>
            </button>
            {roomCheckError && <p role="alert" className="text-xs text-amber-300 text-center">{t('roomCheckFailed')}</p>}
            {joinError && <p role="alert" className="text-xs text-red-300 text-center">{joinError}</p>}
          </div>
        </div>
      ) : (
        // Active Classroom
        <div className="w-full h-full relative">
          <Blackboard
            socket={socket}
            userName={userName}
            userRole={userRole}
            readOnly={userRole === 'spectator'}
            initialElements={initialElements}
            roomId={roomId}
            localStream={localStream}
            remoteStream={remoteStream}
            remoteCursors={remoteCursors}
            setRemoteCursors={setRemoteCursors}
          />

          <VideoOverlay
            localStream={localStream}
            remoteStream={remoteStream}
            isMicOn={isMicOn}
            isCamOn={isCamOn}
            isScreenSharing={isScreenSharing}
            remoteScreenSharing={remoteScreenSharing}
            connectedPeer={connectedPeer}
            observedStreams={observedStreams}
            spectators={spectators}
            isSpectator={userRole === 'spectator'}
            onKickUser={handleKickUser}
            toggleMic={toggleMic}
            toggleCam={toggleCam}
            toggleScreenShare={toggleScreenShare}
            userName={userName}
            userRole={userRole}
            roomId={roomId}
            tunnelUrl={tunnelUrl}
            socket={socket}
          />
        </div>
      )}
    </div>
  );
}
