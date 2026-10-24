'use client';

import { API_BASE_URL } from '@/lib/api';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LoaderCircle,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
} from 'lucide-react';

type ParticipantRole = 'PATIENT' | 'DOCTOR';
type RoomParticipant = {
  userId: number;
  role: ParticipantRole;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
};

interface VideoRoomProps {
  consultationId: number;
  consultationStatus: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  role: ParticipantRole;
  token: string | null;
}

interface RoomMessage {
  type: string;
  code?: string;
  message?: string;
  role?: ParticipantRole;
  userId?: number;
  consultationStatus?: VideoRoomProps['consultationStatus'];
  participants?: RoomParticipant[];
  participant?: RoomParticipant;
  fromUserId?: number;
  signalType?: 'offer' | 'answer' | 'ice-candidate';
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

const STUN_URL = process.env.NEXT_PUBLIC_WEBRTC_STUN_URL || 'stun:stun.l.google.com:19302';

function getRoomSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const url = new URL('/ws/consultations', apiUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

export default function VideoRoom({ consultationId, consultationStatus, role, token }: VideoRoomProps) {
  const [connectionStatus, setConnectionStatus] = useState('Not joined');
  const [roomStatus, setRoomStatus] = useState(consultationStatus);
  const [joined, setJoined] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [remoteParticipant, setRemoteParticipant] = useState<RoomParticipant | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');

  const socketRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteUserIdRef = useRef<number | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const offerInProgressRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const sendRoomMessage = useCallback((message: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }, []);

  const disposeMedia = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    remoteUserIdRef.current = null;
    pendingCandidatesRef.current = [];
    offerInProgressRef.current = false;
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteParticipant(null);
    setJoined(false);
    setCameraEnabled(false);
    setMicrophoneEnabled(false);
  }, []);

  const leaveCall = useCallback((statusMessage = 'Not joined') => {
    const socket = socketRef.current;
    if (socket) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'LEAVE' }));
      }
      socket.onclose = null;
      socket.onmessage = null;
      socket.close();
      socketRef.current = null;
    }
    disposeMedia();
    setConnectionStatus(statusMessage);
    setError('');
  }, [disposeMedia]);

  const createPeerConnection = useCallback((targetUserId: number): RTCPeerConnection => {
    if (peerRef.current && remoteUserIdRef.current === targetUserId) return peerRef.current;
    peerRef.current?.close();

    const peer = new RTCPeerConnection({ iceServers: [{ urls: STUN_URL }] });
    peerRef.current = peer;
    remoteUserIdRef.current = targetUserId;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];

    const stream = localStreamRef.current;
    stream?.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
      let incoming = event.streams[0];
      if (!incoming) {
        incoming = remoteStreamRef.current || new MediaStream();
        incoming.addTrack(event.track);
      }
      remoteStreamRef.current = incoming;
      setRemoteStream(incoming);
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendRoomMessage({
          type: 'SIGNAL',
          targetUserId,
          signalType: 'ice-candidate',
          payload: event.candidate.toJSON(),
        });
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') setConnectionStatus('Connected');
      else if (peer.connectionState === 'connecting') setConnectionStatus('Connecting to the other participant…');
      else if (peer.connectionState === 'failed') setConnectionStatus('Connection failed');
      else if (peer.connectionState === 'disconnected') setConnectionStatus('Connection interrupted');
    };

    return peer;
  }, [sendRoomMessage]);

  const flushPendingCandidates = useCallback(async (peer: RTCPeerConnection) => {
    const candidates = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of candidates) {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const makeDoctorOffer = useCallback(async (patientUserId: number) => {
    if (role !== 'DOCTOR' || offerInProgressRef.current) return;
    offerInProgressRef.current = true;
    try {
      const peer = createPeerConnection(patientUserId);
      if (peer.signalingState !== 'stable') return;
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      sendRoomMessage({
        type: 'SIGNAL',
        targetUserId: patientUserId,
        signalType: 'offer',
        payload: peer.localDescription,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the WebRTC call.');
    } finally {
      offerInProgressRef.current = false;
    }
  }, [createPeerConnection, role, sendRoomMessage]);

  const handleSignal = useCallback(async (message: RoomMessage) => {
    if (!message.fromUserId || !message.signalType || !message.payload) return;
    const peer = createPeerConnection(message.fromUserId);

    try {
      if (message.signalType === 'offer') {
        await peer.setRemoteDescription(new RTCSessionDescription(message.payload as RTCSessionDescriptionInit));
        await flushPendingCandidates(peer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendRoomMessage({
          type: 'SIGNAL',
          targetUserId: message.fromUserId,
          signalType: 'answer',
          payload: peer.localDescription,
        });
      } else if (message.signalType === 'answer') {
        await peer.setRemoteDescription(new RTCSessionDescription(message.payload as RTCSessionDescriptionInit));
        await flushPendingCandidates(peer);
      } else {
        const candidate = message.payload as RTCIceCandidateInit;
        if (peer.remoteDescription) await peer.addIceCandidate(new RTCIceCandidate(candidate));
        else pendingCandidatesRef.current.push(candidate);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'WebRTC signaling failed.');
    }
  }, [createPeerConnection, flushPendingCandidates, sendRoomMessage]);

  const handleRoomMessage = useCallback(async (message: RoomMessage, socket: WebSocket) => {
    switch (message.type) {
      case 'AUTHENTICATED':
        socket.send(JSON.stringify({ type: 'JOIN', consultationId }));
        setConnectionStatus('Joining secure consultation room…');
        return;
      case 'JOINED': {
        setJoined(true);
        setRoomStatus(message.consultationStatus || consultationStatus);
        const peer = message.participants?.[0] || null;
        setRemoteParticipant(peer);
        setConnectionStatus(peer ? 'Connecting to the other participant…' : 'Waiting for the other participant…');
        sendRoomMessage({ type: 'MEDIA_STATE', cameraEnabled: true, microphoneEnabled: true });
        if (role === 'DOCTOR' && peer?.role === 'PATIENT') await makeDoctorOffer(peer.userId);
        return;
      }
      case 'PARTICIPANT_JOINED': {
        const peer = message.participant || null;
        if (message.consultationStatus) setRoomStatus(message.consultationStatus);
        if (peer) {
          setRemoteParticipant(peer);
          setConnectionStatus('Connecting to the other participant…');
          if (role === 'DOCTOR' && peer.role === 'PATIENT') await makeDoctorOffer(peer.userId);
        }
        return;
      }
      case 'PARTICIPANT_LEFT':
        if (!remoteUserIdRef.current || remoteUserIdRef.current === message.userId) {
          peerRef.current?.close();
          peerRef.current = null;
          remoteStreamRef.current = null;
          remoteUserIdRef.current = null;
          pendingCandidatesRef.current = [];
          setRemoteStream(null);
          setRemoteParticipant(null);
          setConnectionStatus('The other participant left the room.');
        }
        return;
      case 'MEDIA_STATE':
        if (message.participant) setRemoteParticipant(message.participant);
        return;
      case 'SIGNAL':
        await handleSignal(message);
        return;
      case 'ROOM_STATE':
        if (message.consultationStatus) {
          setRoomStatus(message.consultationStatus);
          if (message.consultationStatus === 'COMPLETED' || message.consultationStatus === 'CANCELLED') {
            leaveCall('Consultation ended');
          }
        }
        return;
      case 'ERROR':
        setError(message.message || 'The consultation room rejected a request.');
        if (['AUTHENTICATION_REQUIRED', 'INVALID_TOKEN', 'ROOM_ROLE_REQUIRED', 'ROOM_ACCESS_DENIED', 'ROOM_NOT_FOUND', 'ROOM_CLOSED', 'INVALID_ROOM', 'ALREADY_JOINED'].includes(message.code || '')) {
          setConnectionStatus('Not joined');
        }
        return;
      default:
        return;
    }
  }, [consultationId, consultationStatus, handleSignal, leaveCall, makeDoctorOffer, role, sendRoomMessage]);

  const joinCall = useCallback(async () => {
    setError('');
    if (!token) {
      setError('Your sign-in session has expired. Sign in again to join the consultation.');
      return;
    }
    if (consultationStatus === 'COMPLETED' || consultationStatus === 'CANCELLED') {
      setError('This consultation is no longer open for video.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera and microphone access requires a supported browser on HTTPS or localhost.');
      return;
    }

    setConnectionStatus('Requesting camera and microphone…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCameraEnabled(true);
      setMicrophoneEnabled(true);

      const socket = new WebSocket(getRoomSocketUrl());
      socketRef.current = socket;
      setConnectionStatus('Connecting to secure consultation room…');
      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'AUTHENTICATE', token }));
      };
      socket.onmessage = (event) => {
        try {
          const roomMessage = JSON.parse(String(event.data)) as RoomMessage;
          void handleRoomMessage(roomMessage, socket);
        } catch {
          setError('Received an invalid message from the consultation service.');
        }
      };
      socket.onerror = () => {
        setError('Could not connect to the consultation signaling service.');
      };
      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
          disposeMedia();
          setConnectionStatus('Disconnected');
        }
      };
    } catch (cause) {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
      setConnectionStatus('Not joined');
      setError(cause instanceof Error
        ? `${cause.message}. Allow camera and microphone access to join.`
        : 'Camera or microphone access was denied.');
    }
  }, [consultationStatus, disposeMedia, handleRoomMessage, token]);

  const toggleCamera = useCallback(() => {
    const next = !cameraEnabled;
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next; });
    setCameraEnabled(next);
    sendRoomMessage({ type: 'MEDIA_STATE', cameraEnabled: next, microphoneEnabled });
  }, [cameraEnabled, microphoneEnabled, sendRoomMessage]);

  const toggleMicrophone = useCallback(() => {
    const next = !microphoneEnabled;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = next; });
    setMicrophoneEnabled(next);
    sendRoomMessage({ type: 'MEDIA_STATE', cameraEnabled, microphoneEnabled: next });
  }, [cameraEnabled, microphoneEnabled, sendRoomMessage]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (joined) sendRoomMessage({ type: 'SYNC_STATE' });
  }, [consultationStatus, joined, sendRoomMessage]);

  useEffect(() => () => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'LEAVE' }));
    socket?.close();
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const terminal = consultationStatus === 'COMPLETED' || consultationStatus === 'CANCELLED';
  const activeRoom = !terminal && roomStatus !== 'COMPLETED' && roomStatus !== 'CANCELLED';
  const displayedRoomStatus = joined ? roomStatus : consultationStatus;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Secure video consultation">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Video consultation</h2>
          <p className="mt-1 text-xs text-slate-500">Audio and video connect directly between the patient and assigned doctor.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700" role="status">
          {joined ? <Wifi className="h-3.5 w-3.5 text-emerald-600" /> : <WifiOff className="h-3.5 w-3.5 text-slate-500" />}
          {connectionStatus}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" aria-label="Other participant video" />
          {(!remoteStream || remoteParticipant?.cameraEnabled === false) && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/75">
              {remoteParticipant ? `${remoteParticipant.role === 'DOCTOR' ? 'Doctor' : 'Patient'} camera is off` : 'Waiting for the other participant'}
            </div>
          )}
          {remoteParticipant && !remoteParticipant.microphoneEnabled && (
            <span className="absolute bottom-2 right-2 rounded bg-slate-950/70 p-1.5 text-white" title="Other participant microphone is off">
              <MicOff className="h-4 w-4" />
            </span>
          )}
        </div>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900">
          <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" aria-label="Your video preview" />
          {!localStream || !cameraEnabled ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/75">
              {localStream ? 'Your camera is off' : 'Your camera preview appears here'}
            </div>
          ) : null}
          <span className="absolute bottom-2 left-2 rounded bg-slate-950/70 px-2 py-1 text-xs text-white">
            You{!microphoneEnabled ? ' · Microphone off' : ''}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-500">Consultation status: <strong className="text-slate-700">{displayedRoomStatus.replace('_', ' ')}</strong></span>
        <div className="flex flex-wrap items-center gap-2">
          {!joined ? (
            <button
              type="button"
              onClick={joinCall}
              disabled={!activeRoom || connectionStatus.startsWith('Requesting') || connectionStatus.startsWith('Connecting') || connectionStatus.startsWith('Joining')}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {connectionStatus.startsWith('Requesting') || connectionStatus.startsWith('Connecting') || connectionStatus.startsWith('Joining')
                ? <LoaderCircle className="h-4 w-4 animate-spin" />
                : <Video className="h-4 w-4" />}
              Join video visit
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleMicrophone}
                aria-pressed={microphoneEnabled}
                aria-label={microphoneEnabled ? 'Mute microphone' : 'Turn microphone on'}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {microphoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {microphoneEnabled ? 'Mute' : 'Unmute'}
              </button>
              <button
                type="button"
                onClick={toggleCamera}
                aria-pressed={cameraEnabled}
                aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                {cameraEnabled ? 'Camera off' : 'Camera on'}
              </button>
              <button
                type="button"
                onClick={() => leaveCall()}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                <PhoneOff className="h-4 w-4" />
                Leave
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    </section>
  );
}
