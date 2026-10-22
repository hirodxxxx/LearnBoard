import { useState, useEffect, useRef, useCallback } from 'react';

const STUN_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.nextcloud.com:443' }
];

export function useWebRTC(socket, currentUserId, userName) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState({ isSharing: false, userName: '' });
  const [connectedPeer, setConnectedPeer] = useState(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const originalCamStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const connectedPeerRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const iceServersCacheRef = useRef(null);
  const statsIntervalRef = useRef(null);

  useEffect(() => {
    connectedPeerRef.current = connectedPeer;
  }, [connectedPeer]);

  useEffect(() => () => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
  }, []);

  const stablePopoutStreamRef = useRef(null);
  const stableVideoTrackIdRef = useRef(null);

  // Helper to create a fallback silent dummy video track (for users on single PC without 2nd webcam)
  const createDummyVideoTrack = (text = 'Camera đang tắt') => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 320, 240);
    const stream = canvas.captureStream(5);
    const track = stream.getVideoTracks()[0];
    return track;
  };

  // Expose global accessor for pop-out screen-viewer window
  useEffect(() => {
    window.getScreenStreamForPopout = () => {
      // 1. If THIS user is sharing screen, expose our local screen stream
      if (isScreenSharing && localStreamRef.current) {
        return {
          stream: localStreamRef.current,
          userName: `${userName} (Bạn)`,
          isLocal: true
        };
      }

      // 2. If remote peer is sharing, get the live video track and keep stream STABLE
      if (pcRef.current) {
        const videoReceivers = pcRef.current
          .getReceivers()
          .filter((r) => r.track && r.track.kind === 'video' && r.track.readyState === 'live');
        const liveAudioReceiver = pcRef.current
          .getReceivers()
          .find((r) => r.track && r.track.kind === 'audio' && r.track.readyState === 'live');

        if (videoReceivers.length > 0) {
          // If multiple video receivers, pick the one that is NOT muted or the latest one (screen share)
          const bestReceiver = videoReceivers.find((r) => !r.track.muted) || videoReceivers[videoReceivers.length - 1];
          const vTrack = bestReceiver.track;

          if (!stablePopoutStreamRef.current || stableVideoTrackIdRef.current !== vTrack.id) {
            stableVideoTrackIdRef.current = vTrack.id;
            const tracks = [vTrack];
            if (liveAudioReceiver && liveAudioReceiver.track) tracks.push(liveAudioReceiver.track);
            stablePopoutStreamRef.current = new MediaStream(tracks);
          }
          return {
            stream: stablePopoutStreamRef.current,
            userName: remoteScreenSharing?.userName || connectedPeerRef.current?.name || 'Đối tác',
            isLocal: false
          };
        }
      }

      // 3. Fallback to remoteStreamRef
      if (remoteStreamRef.current && remoteStreamRef.current.getVideoTracks().length > 0) {
        const liveTracks = remoteStreamRef.current.getVideoTracks().filter((t) => t.readyState === 'live');
        if (liveTracks.length > 0) {
          const vTrack = liveTracks.find((t) => !t.muted) || liveTracks[liveTracks.length - 1];
          return {
            stream: new MediaStream([vTrack]),
            userName: remoteScreenSharing?.userName || connectedPeerRef.current?.name || 'Đối tác',
            isLocal: false
          };
        }
      }
      return null;
    };
    return () => {
      delete window.getScreenStreamForPopout;
    };
  }, [isScreenSharing, remoteScreenSharing, userName]);

  // Initialize Local Media (Webcam + Mic)
  const initLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { max: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      localStreamRef.current = stream;
      originalCamStreamRef.current = stream;
      setLocalStream(stream);
      setIsCamOn(true);
      return stream;
    } catch (err) {
      console.warn('Không thể truy cập Camera (có thể mở 2 tab cùng máy hoặc không có webcam):', err.message);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Attach dummy video track so WebRTC ALWAYS negotiates a video transceiver for screen sharing
        const dummyTrack = createDummyVideoTrack(userName || 'Camera đang tắt');
        dummyTrack.enabled = false;
        audioStream.addTrack(dummyTrack);
        localStreamRef.current = audioStream;
        originalCamStreamRef.current = audioStream;
        setLocalStream(audioStream);
        setIsCamOn(false);
        return audioStream;
      } catch (audioErr) {
        console.warn('Không có quyền Micro, tạo luồng dự phòng:', audioErr.message);
        const dummyStream = new MediaStream();
        const dummyTrack = createDummyVideoTrack(userName || 'Camera đang tắt');
        dummyTrack.enabled = false;
        dummyStream.addTrack(dummyTrack);
        localStreamRef.current = dummyStream;
        originalCamStreamRef.current = dummyStream;
        setLocalStream(dummyStream);
        setIsCamOn(false);
        return dummyStream;
      }
    }
  }, [userName]);

  // Flush queued ICE candidates once remoteDescription is set
  const flushPendingCandidates = async (pc) => {
    while (pendingIceCandidatesRef.current.length > 0) {
      const candidate = pendingIceCandidatesRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[WebRTC] Error flushing candidate:', e);
      }
    }
  };

  const getIceServers = useCallback(async () => {
    const cachedConfig = iceServersCacheRef.current;
    if (cachedConfig && cachedConfig.expiresAt > Date.now() + 30000) {
      return cachedConfig.iceServers;
    }

    try {
      const response = await fetch('/api/ice-servers', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      if (!Array.isArray(result.iceServers) || !Number.isFinite(result.expiresAt)) {
        throw new Error('Invalid ICE server configuration from backend.');
      }

      iceServersCacheRef.current = result;
      return result.iceServers;
    } catch (error) {
      console.warn('[WebRTC] Could not load TURN credentials; continuing with STUN only:', error.message);
      return STUN_ICE_SERVERS;
    }
  }, []);

  // Create RTCPeerConnection
  const createPeerConnection = useCallback(async (targetId) => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    pcRef.current = null;
    pendingIceCandidatesRef.current = [];

    const iceServers = await getIceServers();

    const pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 10
    });
    pcRef.current = pc;

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming remote track
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind);
      const vTracks = pc.getReceivers().map((r) => r.track).filter((t) => t && t.kind === 'video');
      const aTracks = pc.getReceivers().map((r) => r.track).filter((t) => t && t.kind === 'audio');
      const allTracks = [...vTracks, ...aTracks];

      const incomingStream = allTracks.length > 0
        ? new MediaStream(allTracks)
        : (event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]));

      remoteStreamRef.current = incomingStream;
      setRemoteStream(incomingStream);

      event.track.onunmute = () => {
        console.log('[WebRTC] Remote track unmuted:', event.track.kind);
        const curV = pc.getReceivers().map((r) => r.track).filter((t) => t && t.kind === 'video');
        const curA = pc.getReceivers().map((r) => r.track).filter((t) => t && t.kind === 'audio');
        const fresh = new MediaStream([...curV, ...curA]);
        remoteStreamRef.current = fresh;
        setRemoteStream(fresh);
      };
    };

    // Send ICE candidates to peer via socket
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-signal', {
          targetId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected' && !statsIntervalRef.current) {
        const previousByteCounts = new Map();
        const logConnectionStats = async () => {
          try {
            const stats = await pc.getStats();
            let selectedPair = null;

            stats.forEach((report) => {
              if (report.type === 'transport' && report.selectedCandidatePairId) {
                selectedPair = stats.get(report.selectedCandidatePairId);
              }
            });

            if (!selectedPair) {
              stats.forEach((report) => {
                if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) {
                  selectedPair = report;
                }
              });
            }

            const localCandidate = selectedPair && stats.get(selectedPair.localCandidateId);
            const remoteCandidate = selectedPair && stats.get(selectedPair.remoteCandidateId);
            const media = [];

            stats.forEach((report) => {
              if (report.type !== 'inbound-rtp' && report.type !== 'outbound-rtp') return;
              if (report.isRemote || report.kind === 'application') return;

              const bytes = report.type === 'inbound-rtp' ? report.bytesReceived : report.bytesSent;
              const previous = previousByteCounts.get(report.id);
              let bitrateKbps = null;
              if (Number.isFinite(bytes) && previous && report.timestamp > previous.timestamp) {
                bitrateKbps = Math.round(
                  ((bytes - previous.bytes) * 8) / (report.timestamp - previous.timestamp)
                );
              }
              if (Number.isFinite(bytes)) {
                previousByteCounts.set(report.id, { bytes, timestamp: report.timestamp });
              }

              const item = {
                direction: report.type === 'inbound-rtp' ? 'in' : 'out',
                kind: report.kind || report.mediaType,
                bitrateKbps
              };
              if (report.type === 'inbound-rtp') {
                item.jitterMs = Number.isFinite(report.jitter) ? Math.round(report.jitter * 1000) : undefined;
                item.packetsLost = report.packetsLost;
                item.packetsReceived = report.packetsReceived;
                if (Number.isFinite(report.packetsLost) && Number.isFinite(report.packetsReceived)) {
                  const totalPackets = report.packetsLost + report.packetsReceived;
                  item.packetLossPercent = totalPackets > 0
                    ? Math.round((report.packetsLost / totalPackets) * 1000) / 10
                    : 0;
                }
                item.framesDropped = report.framesDropped;
              }
              media.push(item);
            });

            console.info('[WebRTC] Connection diagnostics:', {
              path: localCandidate && remoteCandidate
                ? `${localCandidate.candidateType} -> ${remoteCandidate.candidateType}`
                : 'candidate pair unavailable',
              rttMs: Number.isFinite(selectedPair?.currentRoundTripTime)
                ? Math.round(selectedPair.currentRoundTripTime * 1000)
                : null,
              media
            });
          } catch (error) {
            console.warn('[WebRTC] Could not collect connection diagnostics:', error.message);
          }
        };

        logConnectionStats();
        statsIntervalRef.current = setInterval(logConnectionStats, 10000);
      } else if (pc.connectionState !== 'connected' && statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }

      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        remoteStreamRef.current = null;
        setRemoteStream(null);
      }
    };

    return pc;
  }, [socket, getIceServers]);

  // Handle incoming signals and events from socket
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = async ({ id, name }) => {
      console.log('[WebRTC] New user joined room, initiating offer to:', name, id);
      setConnectedPeer({ id, name });
      const pc = await createPeerConnection(id);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-signal', {
          targetId: id,
          signal: { type: 'offer', sdp: offer }
        });
      } catch (err) {
        console.error('[WebRTC] Error creating offer:', err);
      }
    };

    const handleRoomJoined = ({ users }) => {
      if (users && Array.isArray(users) && users.length > 0) {
        const peer = users.find((u) => u.role === 'teacher') || users[0];
        if (peer) {
          console.log('[WebRTC] Found existing peer from room-joined:', peer.name, peer.id);
          setConnectedPeer({ id: peer.id, name: peer.name, role: peer.role });
        }
      }
    };

    const handleWebRTCSignal = async ({ senderId, senderName, senderRole, signal }) => {
      if (senderName) {
        setConnectedPeer({ id: senderId, name: senderName, role: senderRole });
      } else {
        setConnectedPeer((prev) => prev || { id: senderId, name: 'Người dạy' });
      }
      if (signal.type === 'offer') {
        let pc = pcRef.current;
        if (!pc || pc.connectionState === 'closed') {
          pc = await createPeerConnection(senderId);
        }

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await flushPendingCandidates(pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('webrtc-signal', {
            targetId: senderId,
            signal: { type: 'answer', sdp: answer }
          });
        } catch (err) {
          console.error('[WebRTC] Error handling offer:', err);
        }
      } else if (signal.type === 'answer') {
        if (pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            await flushPendingCandidates(pcRef.current);
          } catch (err) {
            console.error('[WebRTC] Error handling answer:', err);
          }
        }
      } else if (signal.type === 'candidate') {
        if (signal.candidate) {
          if (pcRef.current && pcRef.current.remoteDescription) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (err) {
              console.error('[WebRTC] Error adding ICE candidate:', err);
            }
          } else {
            pendingIceCandidatesRef.current.push(signal.candidate);
          }
        }
      }
    };

    const handleScreenShareStatus = ({ senderId, senderName, isSharing }) => {
      console.log('[WebRTC] Peer screen share status changed:', isSharing, senderName);
      setRemoteScreenSharing({ isSharing, userName: senderName });

      if (pcRef.current) {
        const videoReceivers = pcRef.current
          .getReceivers()
          .filter((r) => r.track && r.track.kind === 'video' && r.track.readyState === 'live');
        const audioReceivers = pcRef.current
          .getReceivers()
          .filter((r) => r.track && r.track.kind === 'audio' && r.track.readyState === 'live');

        if (videoReceivers.length > 0) {
          // If remote peer is sharing, select the unmuted track or the most recently added video track
          const activeTrack = (videoReceivers.find((r) => !r.track.muted) || videoReceivers[videoReceivers.length - 1]).track;
          const aTracks = audioReceivers.map((r) => r.track);
          const fresh = new MediaStream([activeTrack, ...aTracks]);
          remoteStreamRef.current = fresh;
          setRemoteStream(fresh);
        }
      }
    };

    const handleUserLeft = ({ id }) => {
      if (connectedPeerRef.current && connectedPeerRef.current.id === id) {
        setConnectedPeer(null);
        remoteStreamRef.current = null;
        setRemoteStream(null);
        setRemoteScreenSharing({ isSharing: false, userName: '' });
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
        }
      }
    };

    const handleClassEnded = () => {
      setRemoteScreenSharing({ isSharing: false, userName: '' });
      setIsScreenSharing(false);
      remoteStreamRef.current = null;
      setRemoteStream(null);
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    };

    socket.on('room-joined', handleRoomJoined);
    socket.on('user-joined', handleUserJoined);
    socket.on('webrtc-signal', handleWebRTCSignal);
    socket.on('screen-share-status', handleScreenShareStatus);
    socket.on('user-left', handleUserLeft);
    socket.on('class-ended', handleClassEnded);

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('user-joined', handleUserJoined);
      socket.off('webrtc-signal', handleWebRTCSignal);
      socket.off('screen-share-status', handleScreenShareStatus);
      socket.off('user-left', handleUserLeft);
      socket.off('class-ended', handleClassEnded);
    };
  }, [socket, createPeerConnection]);

  // Toggle Mic
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  // Toggle Camera
  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOn(videoTrack.enabled);
      }
    }
  };

  // Toggle Screen Sharing with complete WebRTC renegotiation
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            frameRate: { ideal: 15, max: 15 }
          },
          audio: false
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrack.contentHint = 'motion';
        screenTrack.enabled = true;

        // Replace outgoing video track in peer connection
        if (pcRef.current) {
          const senders = pcRef.current.getSenders();
          let videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (!videoSender) {
            videoSender = senders.find((s) => s.kind === 'video' || s.track === null);
          }

          if (videoSender) {
            await videoSender.replaceTrack(screenTrack);
            console.log('[WebRTC] Outgoing video track replaced with screenTrack');
            try {
              const params = videoSender.getParameters();
              if (params && params.encodings && params.encodings.length > 0) {
                params.encodings[0].maxBitrate = 1200000;
                await videoSender.setParameters(params);
              }
            } catch (e) {}
          } else {
            pcRef.current.addTrack(screenTrack, screenStream);
            try {
              const offer = await pcRef.current.createOffer();
              await pcRef.current.setLocalDescription(offer);
              if (connectedPeerRef.current && socket) {
                socket.emit('webrtc-signal', {
                  targetId: connectedPeerRef.current.id,
                  signal: { type: 'offer', sdp: offer }
                });
              }
            } catch (e) {
              console.warn('[WebRTC] Error renegotiating screen share:', e);
            }
          }
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        localStreamRef.current = screenStream;
        setLocalStream(screenStream);
        setIsScreenSharing(true);

        if (socket) {
          socket.emit('screen-share-status', { isSharing: true, userName });
        }

        console.log('[WebRTC] Screen sharing active');
      } catch (err) {
        console.warn('Screen share cancelled/denied:', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    if (originalCamStreamRef.current) {
      const camTrack = originalCamStreamRef.current.getVideoTracks()[0];
      if (pcRef.current && camTrack) {
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find((s) => (s.track && s.track.kind === 'video') || s.track === null);
        if (videoSender) {
          await videoSender.replaceTrack(camTrack);
        }
      }
      localStreamRef.current = originalCamStreamRef.current;
      setLocalStream(originalCamStreamRef.current);
    }
    setIsScreenSharing(false);

    if (socket) {
      socket.emit('screen-share-status', { isSharing: false, userName });
    }
  };

  return {
    localStream,
    remoteStream,
    isMicOn,
    isCamOn,
    isScreenSharing,
    remoteScreenSharing,
    connectedPeer,
    initLocalStream,
    toggleMic,
    toggleCam,
    toggleScreenShare
  };
}
