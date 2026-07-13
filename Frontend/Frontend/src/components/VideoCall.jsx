import { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const VideoCall = ({ activeRoomId, onSessionEnd }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const stompClientRef = useRef(null);

    // NEW: We need to store the raw webcam stream so we can switch back to it after screen sharing
    const localStreamRef = useRef(null);

    const [inCall, setInCall] = useState(false);

    // NEW: UI Control States
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const token = localStorage.getItem('mentor_jwt');
    const userEmail = token ? JSON.parse(atob(token.split('.')[1])).sub : 'Anonymous';

    const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const handleLeaveSession = () => {
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
        if (peerConnectionRef.current) peerConnectionRef.current.close();
        setInCall(false);
        if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.publish({
                destination: '/app/presence.setStatus',
                body: JSON.stringify({ email: userEmail, status: 'ONLINE' })
            });
        }
        if (onSessionEnd) onSessionEnd();
    };
    useEffect(() => {
        if (!activeRoomId) {
            setInCall(false);
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            if (peerConnectionRef.current) peerConnectionRef.current.close();
            if (stompClientRef.current) stompClientRef.current.deactivate();

            // Reset UI states
            setIsAudioMuted(false);
            setIsVideoOff(false);
            setIsScreenSharing(false);
            return;
        }

        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                client.subscribe(`/topic/room/${activeRoomId}/commands`, (message) => {
                                    const payload = JSON.parse(message.body);
                                    if (payload.command === 'TERMINATE') {
                                        alert("⚠️ This session has been terminated by an Administrator.");
                                        handleLeaveSession();
                                    }
                                });
                client.subscribe(`/topic/session/${activeRoomId}/video`, async (message) => {
                    const signal = JSON.parse(message.body);
                    if (signal.sender === userEmail) return;
                    const payload = JSON.parse(signal.content);
                    try {
                        if (signal.type === 'VIDEO_OFFER') await handleReceiveOffer(payload);
                        else if (signal.type === 'VIDEO_ANSWER') await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload));
                        else if (signal.type === 'ICE_CANDIDATE') await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload));
                    } catch (error) { console.error("WEBRTC ERROR:", error); }
                });
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (client) client.deactivate();
            if (peerConnectionRef.current) peerConnectionRef.current.close();
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
        };
    }, [activeRoomId]);

    const setupMediaAndConnection = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream; // Save for later

        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection(rtcConfig);
        peerConnectionRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => { if(remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; };
        pc.onicecandidate = (event) => { if (event.candidate) sendSignal('ICE_CANDIDATE', event.candidate); };

        return pc;
    };

    const startCall = async () => {
        setInCall(true);
        const pc = await setupMediaAndConnection();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal('VIDEO_OFFER', offer);
    };

    const handleReceiveOffer = async (offer) => {
        setInCall(true);
        const pc = await setupMediaAndConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal('VIDEO_ANSWER', answer);
    };

    const sendSignal = (type, payload) => {
        if (stompClientRef.current && stompClientRef.current.connected && activeRoomId) {
            stompClientRef.current.publish({
                destination: `/app/video.sendPrivate/${activeRoomId}`,
                body: JSON.stringify({ sender: userEmail, content: JSON.stringify(payload), type: type })
            });
        }
    };

    // --- NEW: MEDIA CONTROLS ---

    const toggleAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled; // Flips between true/false
                setIsAudioMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled; // Sends a black screen when false
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                // 1. Ask the browser for the screen stream
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];

                // 2. Find the video pipeline currently sending data to the other user
                const sender = peerConnectionRef.current.getSenders().find(s => s.track.kind === 'video');

                // 3. Swap the webcam track for the screen track mid-flight
                if (sender) sender.replaceTrack(screenTrack);

                // 4. Update our own UI so we can see what we are sharing
                localVideoRef.current.srcObject = screenStream;
                setIsScreenSharing(true);

                // 5. Native Browser Fallback: If they click the built-in "Stop Sharing" button provided by Chrome/Edge
                screenTrack.onended = () => {
                    stopScreenShare();
                };
            } catch (error) {
                console.error("Screen share cancelled or failed:", error);
            }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        if (localStreamRef.current) {
            const webcamTrack = localStreamRef.current.getVideoTracks()[0];
            const sender = peerConnectionRef.current.getSenders().find(s => s.track.kind === 'video');

            // Swap back to the webcam track
            if (sender && webcamTrack) sender.replaceTrack(webcamTrack);

            // Revert our own UI
            localVideoRef.current.srcObject = localStreamRef.current;
            setIsScreenSharing(false);
        }
    };

    return (
        <div style={{ margin: '0 auto', padding: '20px', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#022D36', resize: 'both', overflow: 'hidden', minWidth: '300px', minHeight: '400px', maxWidth: '1000px', display: 'flex', flexDirection: 'column' }}>
            <h2 align='center' style={{ color: 'white', marginTop: 0 }}>Mentorship Video Call</h2>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', flex: 1, minHeight: '200px' }}>
                <div style={{ flex: 1, backgroundColor: 'black', borderRadius: '8px', overflow: 'hidden', height: '100%', position: 'relative' }}>
                    <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ width: '30%', minWidth: '120px', backgroundColor: 'black', borderRadius: '8px', overflow: 'hidden', height: '100%', position: 'relative' }}>
                    <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            </div>

            {!activeRoomId ? (
                <p style={{ color: 'gray', textAlign: 'center', fontStyle: 'italic' }}>Connect with a user to unlock video calls.</p>
            ) : !inCall ? (
                <div style={{ textAlign: 'center' }}>
                    <button onClick={startCall} style={{ padding: '10px 20px', backgroundColor: '#39FF14', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer', boxShadow: '0 0 10px rgba(57, 255, 20, 0.5)' }}>Start Secure Call</button>
                </div>
            ) : (
                // NEW: The Media Control Bar
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '8px' }}>
                    <button
                        onClick={toggleAudio}
                        style={{ padding: '10px 15px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isAudioMuted ? '#FF073A' : '#333', color: 'white', transition: 'all 0.2s' }}
                    >
                        {isAudioMuted ? '🔇 Unmute' : '🎤 Mute'}
                    </button>

                    <button
                        onClick={toggleVideo}
                        style={{ padding: '10px 15px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isVideoOff ? '#FF073A' : '#333', color: 'white', transition: 'all 0.2s' }}
                    >
                        {isVideoOff ? '📷 Turn Camera On' : '📸 Turn Camera Off'}
                    </button>

                    <button
                        onClick={toggleScreenShare}
                        style={{ padding: '10px 15px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isScreenSharing ? '#8F00FF' : '#39FF14', color: isScreenSharing ? 'white' : 'black', boxShadow: isScreenSharing ? '0 0 10px rgba(143,0,255,0.5)' : 'none', transition: 'all 0.2s' }}
                    >
                        {isScreenSharing ? '🛑 Stop Sharing' : '🖥️ Share Screen'}
                    </button>
                    <button
                                            onClick={handleLeaveSession}
                                            style={{ padding: '10px 15px', borderRadius: '5px', border: '1px solid #FF073A', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'transparent', color: '#FF073A', transition: 'all 0.2s', marginLeft: '10px' }}
                                        >
                                            🚪 Leave Session
                                        </button>
                </div>
            )}
        </div>
    );
};

export default VideoCall;