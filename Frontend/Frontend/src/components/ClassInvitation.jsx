import { useEffect, useState } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

const ClassInvitation = ({ userEmail, onAccept }) => {
    const [invitation, setInvitation] = useState(null);

    useEffect(() => {
        if (!userEmail) return;

        const socket = new SockJS('http://localhost:8080/ws');
        const stompClient = Stomp.over(socket);
        stompClient.debug = () => {}; // Mute STOMP console logs

        stompClient.connect({}, () => {
            // Subscribe to the EXACT private channel we built in Spring Boot
            stompClient.subscribe(`/topic/users/${userEmail}/invites`, (message) => {
                const payload = JSON.parse(message.body);
                if (payload.type === 'CLASSROOM_INVITE') {
                    setInvitation(payload);
                    // Play a notification sound!
                    new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
                }
            });
        });
const handleAccept = () => {
    // To Tell React they are in a room
    onAccept(invitation.roomId);

    // To Tell the Server they are busy
    if (stompClient && stompClient.connected) {
        stompClient.send("/app/presence.setStatus", {}, JSON.stringify({
            email: userEmail,
            status: 'BUSY'
        }));
    }

    setInvitation(null);
};
        return () => {
            if (stompClient) stompClient.disconnect();
        };
    }, [userEmail]);

    if (!invitation) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
            <div style={{ backgroundColor: '#111', padding: '30px', borderRadius: '12px', border: '2px solid #E0B0FF', textAlign: 'center', maxWidth: '400px' }}>
                <h2 style={{ color: '#E0B0FF', marginTop: 0 }}>Incoming Class Session!</h2>
                <h3 style={{ color: 'white' }}>{invitation.topic}</h3>
                <p style={{ color: 'gray' }}>Host: {invitation.mentor}</p>
                <p style={{ color: '#40E0D0' }}>Total Participants: {invitation.participants}</p>

                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                    <button
                        onClick={() => setInvitation(null)}
                        style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', color: 'gray', border: '1px solid gray', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Decline
                    </button>
                    <button
                        onClick={() => {
                            onAccept(invitation.roomId);
                            setInvitation(null);
                        }}
                        style={{ flex: 2, padding: '10px', backgroundColor: '#E0B0FF', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Join Class
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClassInvitation;