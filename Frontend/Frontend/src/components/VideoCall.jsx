import { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const VideoCall = () => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const stompClientRef = useRef(null);

    const [inCall, setInCall] = useState(false);

    const token = localStorage.getItem('mentor_jwt');
    const userEmail = token ? JSON.parse(atob(token.split('.')[1])).sub : 'Anonymous';

    // Standard Google STUN servers to help browsers find each other's IP addresses
    const rtcConfig = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    useEffect(() => {
        // 1. Connect to our Spring Boot WebSocket for Signaling
        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                client.subscribe('/topic/video', async (message) => {
                    const signal = JSON.parse(message.body);

                    // Ignore our own signals
                    if (signal.sender === userEmail) return;
console.log("📥 RECEIVED SIGNAL:", signal.type);
                    const payload = JSON.parse(signal.content);
try {
                    // 2. Handle Incoming Signals
                    if (signal.type === 'VIDEO_OFFER') {
                        console.log("📞 Processing Offer from peer...");
                        await handleReceiveOffer(payload);
                    } else if (signal.type === 'VIDEO_ANSWER') {
                        console.log("✅ Processing Answer from peer...");
                        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload));
                    } else if (signal.type === 'ICE_CANDIDATE') {
                        console.log("❄️ Processing ICE (Network) Candidate...");
                        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload));
                    }} catch (error) {
                        console.error("❌ WEBRTC ERROR:", error);}
                });
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (client) client.deactivate();
            if (peerConnectionRef.current) peerConnectionRef.current.close();
        };
    }, []);

    // --- WebRTC Logic ---

    const setupMediaAndConnection = async () => {
        // Grab the webcam and microphone
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideoRef.current.srcObject = stream;

        // Create the Peer Connection
        const pc = new RTCPeerConnection(rtcConfig);
        peerConnectionRef.current = pc;

        // Feed our webcam tracks into the connection
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // When the other person's video arrives, put it in the remote `<video>` tag
        pc.ontrack = (event) => {
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        // When we find our own network routing info, send it to the other person via Spring Boot
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal('ICE_CANDIDATE', event.candidate);
            }
        };

        return pc;
    };

    const startCall = async () => {
        setInCall(true);
        const pc = await setupMediaAndConnection();

        // Create an offer and send it to the room
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal('VIDEO_OFFER', offer);
    };

    const handleReceiveOffer = async (offer) => {
        setInCall(true);
        const pc = await setupMediaAndConnection();

        // Accept the offer and create an answer
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendSignal('VIDEO_ANSWER', answer);
    };

    const sendSignal = (type, payload) => {
        console.log("📤 Sending Signal:", type);
        if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.publish({
                destination: '/app/video.signal',
                body: JSON.stringify({
                    sender: userEmail,
                    content: JSON.stringify(payload),
                    type: type
                })
            });
        }
    };

    return (
        <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f0f4f8' }}>
            <h2>Mentorship Video Call</h2>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                <div style={{ flex: 1, backgroundColor: 'black', borderRadius: '8px', overflow: 'hidden' }}>
                    {/* The other person's video (Large) */}
                    <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
                </div>
                <div style={{ width: '200px', backgroundColor: 'black', borderRadius: '8px', overflow: 'hidden' }}>
                    {/* Your video (Small) */}
                    <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                </div>
            </div>

            {!inCall ? (
                <button onClick={startCall} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Start Video Call
                </button>
            ) : (
                <p style={{ color: 'green', fontWeight: 'bold' }}>Call Connected / Waiting for Peer...</p>
            )}
        </div>
    );
};

export default VideoCall;