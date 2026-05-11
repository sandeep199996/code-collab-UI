import { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

// Accept the Room ID prop
const VideoCall = ({ activeRoomId }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const stompClientRef = useRef(null);

    const [inCall, setInCall] = useState(false);

    const token = localStorage.getItem('mentor_jwt');
    const userEmail = token ? JSON.parse(atob(token.split('.')[1])).sub : 'Anonymous';

    const rtcConfig = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    useEffect(() => {
        // Disconnect and turn off cameras if session ends
        if (!activeRoomId) {
            setInCall(false);
            if (localVideoRef.current && localVideoRef.current.srcObject) {
                localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            if (peerConnectionRef.current) peerConnectionRef.current.close();
            if (stompClientRef.current) stompClientRef.current.deactivate();
            return;
        }

        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                // Subscribe to the PRIVATE video signaling topic
                client.subscribe(`/topic/session/${activeRoomId}/video`, async (message) => {
                    const signal = JSON.parse(message.body);
                    if (signal.sender === userEmail) return;

                    const payload = JSON.parse(signal.content);

                    try {
                        if (signal.type === 'VIDEO_OFFER') await handleReceiveOffer(payload);
                        else if (signal.type === 'VIDEO_ANSWER') await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload));
                        else if (signal.type === 'ICE_CANDIDATE') await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload));
                    } catch (error) {
                        console.error("❌ WEBRTC ERROR:", error);
                    }
                });
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (client) client.deactivate();
            if (peerConnectionRef.current) peerConnectionRef.current.close();
        };
    }, [activeRoomId]);

    const setupMediaAndConnection = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if(localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection(rtcConfig);
        peerConnectionRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
            if(remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) sendSignal('ICE_CANDIDATE', event.candidate);
        };

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
            // Send exactly to the PRIVATE video endpoint
            stompClientRef.current.publish({
                destination: `/app/video.sendPrivate/${activeRoomId}`,
                body: JSON.stringify({
                    sender: userEmail,
                    content: JSON.stringify(payload),
                    type: type
                })
            });
        }
    };

    return (
        <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#022D36' }}>
            <h2 align='center' style={{ color: 'white' }}>Mentorship Video Call</h2>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                <div style={{ flex: 1, backgroundColor: 'black', borderRadius: '8px', overflow: 'hidden' }}>
                    <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
                </div>
                <div style={{ width: '200px', backgroundColor: 'black', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                    <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                </div>
            </div>

            {/* UI Lock Logic: Only show the start button if they are in a room */}
            {!activeRoomId ? (
                 <p style={{ color: 'gray', textAlign: 'center', fontStyle: 'italic' }}>Connect with a user to unlock video calls.</p>
            ) : !inCall ? (
                <div style={{ textAlign: 'center' }}>
                    <button onClick={startCall} style={{ padding: '10px 20px', backgroundColor: '#39FF14', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer', boxShadow: '0 0 10px rgba(57, 255, 20, 0.5)' }}>
                        Start Secure Call
                    </button>
                </div>
            ) : (
                <p style={{ color: '#39FF14', fontWeight: 'bold', textAlign: 'center' }}>Secure P2P Tunnel Established.</p>
            )}
        </div>
    );
};

export default VideoCall;