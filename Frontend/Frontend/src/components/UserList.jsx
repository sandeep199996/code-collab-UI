import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const UserList = ({onSessionStart, onSessionEnd }) => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState(null);
    const [userStatuses, setUserStatuses] = useState({});
    const [incomingInvite, setIncomingInvite] = useState(null);

    // NEW: State to track who we are actively in a session with
    const [connectedUser, setConnectedUser] = useState(null);

    const stompClientRef = useRef(null);

    const token = localStorage.getItem('mentor_jwt');
    const currentUserEmail = token ? JSON.parse(atob(token.split('.')[1])).sub : '';

    useEffect(() => {
        axios.get('http://localhost:8080/api/users/all', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => {
            const otherUsers = response.data.filter(u => u.email !== currentUserEmail);
            setUsers(otherUsers);
        })
        .catch(err => setError('Failed to fetch directory. check the backend.'));

        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                client.subscribe('/topic/presence', (message) => {
                    setUserStatuses(JSON.parse(message.body));
                });

                client.subscribe(`/topic/invites/${currentUserEmail}`, (message) => {
                    const payload = JSON.parse(message.body);

                    if (payload.type === 'INVITE') {
                        setIncomingInvite(payload.sender);
                    }
                    else if (payload.type === 'ACCEPT') {
                        // User B accepted our invite!
                        alert(`${payload.sender} joined the session!`);
                        setConnectedUser(payload.sender);
                        changeMyStatus('BUSY'); // Turn my LED yellow

                        // NEW: Generate Room ID and tell App.jsx
                                                const roomId = [currentUserEmail, payload.sender].sort().join('-room-');
                                                onSessionStart(roomId);
                    }
                    else if (payload.type === 'DISCONNECT') {
                        alert(`${payload.sender} ended the session.`);
                        setConnectedUser(null);
                        changeMyStatus('ONLINE'); // Turn my LED green

                        // NEW: Tell App.jsx the session ended
                                                onSessionEnd();
                    }
                });

                client.publish({ destination: '/app/presence.announce', body: currentUserEmail });
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => { if (client) client.deactivate(); };
    }, [currentUserEmail, token]);

    // --- Backend Communication Helpers ---

    const changeMyStatus = (newStatus) => {
        if (stompClientRef.current) {
            stompClientRef.current.publish({
                destination: '/app/presence.setStatus',
                body: JSON.stringify({ email: currentUserEmail, status: newStatus })
            });
        }
    };

    const handleInvite = (targetEmail) => {
        if (stompClientRef.current) {
            stompClientRef.current.publish({
                destination: '/app/session.invite',
                body: JSON.stringify({ sender: currentUserEmail, target: targetEmail, type: 'INVITE' })
            });
        }
    };

    const handleAcceptInvite = () => {
        if (stompClientRef.current) {
            // Tell User A that we accepted
            stompClientRef.current.publish({
                destination: '/app/session.accept',
                body: JSON.stringify({ sender: currentUserEmail, target: incomingInvite, type: 'ACCEPT' })
            });
        }
        setConnectedUser(incomingInvite);

        changeMyStatus('BUSY'); // Turn my LED yellow
            // NEW: Generate Room ID and tell App.jsx
            const roomId = [currentUserEmail, incomingInvite].sort().join('-room-');
            onSessionStart(roomId);

        setIncomingInvite(null);
    };

    const handleDeclineInvite = () => {
        setIncomingInvite(null);
    };

    const handleDisconnect = (targetEmail) => {
        if (stompClientRef.current) {
            // Tell the other person we are disconnecting
            stompClientRef.current.publish({
                destination: '/app/session.accept', // Reusing the switchboard route for the disconnect signal
                body: JSON.stringify({ sender: currentUserEmail, target: targetEmail, type: 'DISCONNECT' })
            });
        }
        setConnectedUser(null);
        changeMyStatus('ONLINE'); // Turn my LED green
        onSessionEnd(); // Tell App.jsx the session ended
    };

    // --- UI Helpers ---

    const getLedColor = (status) => {
        switch(status) {
            case 'ONLINE': return '#39FF14';
            case 'BUSY': return '#FFEA00';
            case 'OFFLINE': return '#FF073A';
            default: return '#FF073A';
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', position: 'relative' }}>
            <h2 style={{ color: '#8F00FF', textAlign: 'center', marginBottom: '30px' }}>Mentee & Mentor Directory</h2>
            {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                {users.map(user => {
                    // Logic to figure out which button to show
                    const isConnectedToMe = connectedUser === user.email;
                    const isBusy = userStatuses[user.email] === 'BUSY';
                    const isOffline = userStatuses[user.email] === 'OFFLINE' || !userStatuses[user.email];

                    return (
                        <div key={user.id} style={{
                            border: isConnectedToMe ? '2px solid #39FF14' : '1px solid #333',
                            borderRadius: '8px', padding: '20px', width: '320px',
                            backgroundColor: '#0a0a0a', color: '#40E0D0', position: 'relative',
                            boxShadow: isConnectedToMe ? '0 0 15px rgba(57, 255, 20, 0.2)' : '0 4px 6px rgba(0,0,0,0.5)'
                        }}>
                            <div style={{
                                position: 'absolute', top: '20px', right: '20px', width: '12px', height: '12px',
                                borderRadius: '50%', backgroundColor: getLedColor(userStatuses[user.email]),
                                boxShadow: `0 0 8px ${getLedColor(userStatuses[user.email])}`,
                                transition: 'all 0.3s ease'
                            }} title={userStatuses[user.email] || 'OFFLINE'} />

                            <h3 style={{ marginTop: 0, color: 'white' }}>{user.name}</h3>
                            <p style={{ margin: '8px 0' }}><strong style={{ color: '#8F00FF' }}>Email:</strong> {user.email}</p>
                            <p style={{ margin: '8px 0' }}><strong style={{ color: '#8F00FF' }}>Role:</strong> {user.role}</p>

                            {/* DYNAMIC BUTTON LOGIC */}
                            {isConnectedToMe ? (
                                <button onClick={() => handleDisconnect(user.email)} style={{
                                    width: '100%', marginTop: '15px', padding: '10px', backgroundColor: 'transparent',
                                    color: '#FF073A', border: '1px solid #FF073A', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer'
                                }}>
                                    Disconnect
                                </button>
                            ) : (
                                <button onClick={() => handleInvite(user.email)} disabled={isBusy || isOffline || connectedUser !== null} style={{
                                    width: '100%', marginTop: '15px', padding: '10px',
                                    backgroundColor: (isBusy || isOffline || connectedUser !== null) ? '#333' : 'transparent',
                                    color: (isBusy || isOffline || connectedUser !== null) ? '#666' : '#39FF14',
                                    border: `1px solid ${(isBusy || isOffline || connectedUser !== null) ? '#333' : '#39FF14'}`,
                                    borderRadius: '4px', fontWeight: 'bold',
                                    cursor: (isBusy || isOffline || connectedUser !== null) ? 'not-allowed' : 'pointer'
                                }}>
                                    {isBusy ? 'In a Session' : 'Connect'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal remains unchanged here... */}
            {incomingInvite && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#050100', border: '2px solid #8F00FF', borderRadius: '12px',
                        padding: '30px', maxWidth: '400px', width: '100%', textAlign: 'center',
                        boxShadow: '0 0 30px rgba(143, 0, 255, 0.3)'
                    }}>
                        <div style={{ fontSize: '40px', marginBottom: '15px' }}>👋</div>
                        <h3 style={{ color: 'white', fontSize: '24px', margin: '0 0 10px 0' }}>Incoming Request!</h3>
                        <p style={{ color: '#40E0D0', marginBottom: '25px' }}>
                            <strong style={{ color: 'white' }}>{incomingInvite}</strong> wants to start a private session.
                        </p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button onClick={handleDeclineInvite} style={{ padding: '10px 20px', border: '1px solid #FF073A', backgroundColor: 'transparent', color: '#FF073A', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Decline</button>
                            <button onClick={handleAcceptInvite} style={{ padding: '10px 20px', border: 'none', backgroundColor: '#39FF14', color: 'black', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 15px rgba(57, 255, 20, 0.5)' }}>Accept & Join</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserList;