import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const UserList = ({ onSessionStart, onSessionEnd }) => {
    // Directory & Pagination State
    const [users, setUsers] = useState([]);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [searchInput, setSearchInput] = useState('');

    // Session State
    const [userStatuses, setUserStatuses] = useState({});
    const [incomingInvite, setIncomingInvite] = useState(null);
    const [connectedUser, setConnectedUser] = useState(null);

    const stompClientRef = useRef(null);

    const token = localStorage.getItem('mentor_jwt');
    const currentUserEmail = token ? JSON.parse(atob(token.split('.')[1])).sub : '';

    // --- 1. THE DATABASE EFFECT (Runs when page changes or search is triggered) ---
    const fetchDirectory = () => {
        // Hitting the new Spring Boot Pageable endpoint
        axios.get(`http://localhost:8080/api/users/directory?page=${page}&size=6&search=${searchInput}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => {
            // Spring Boot puts the array inside the 'content' object
            const otherUsers = response.data.content.filter(u => u.email !== currentUserEmail);
            setUsers(otherUsers);
            setTotalPages(response.data.totalPages);
        })
        .catch(err => {
            console.error('Error fetching directory:', err);
            setError('Failed to fetch directory. Check backend logs.');
        });
    };

    // Fetch data when the page number changes
    useEffect(() => {
        fetchDirectory();
    }, [page, token]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(0); // Reset to first page when searching
        fetchDirectory();
    };


    // --- 2. THE WEBSOCKET EFFECT (Runs exactly once on mount) ---
    useEffect(() => {
        if (!token) return;

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
                        setConnectedUser(payload.sender);
                        changeMyStatus('BUSY');
                        const roomId = [currentUserEmail, payload.sender].sort().join('-room-');
                        onSessionStart(roomId);
                    }
                    else if (payload.type === 'DISCONNECT') {
                        setConnectedUser(null);
                        changeMyStatus('ONLINE');
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


    // --- Session Handlers ---
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
            stompClientRef.current.publish({
                destination: '/app/session.accept',
                body: JSON.stringify({ sender: currentUserEmail, target: incomingInvite, type: 'ACCEPT' })
            });
        }
        setConnectedUser(incomingInvite);
        changeMyStatus('BUSY');
        const roomId = [currentUserEmail, incomingInvite].sort().join('-room-');
        onSessionStart(roomId);
        setIncomingInvite(null);
    };

    const handleDeclineInvite = () => setIncomingInvite(null);

    const handleDisconnect = (targetEmail) => {
        if (stompClientRef.current) {
            stompClientRef.current.publish({
                destination: '/app/session.accept',
                body: JSON.stringify({ sender: currentUserEmail, target: targetEmail, type: 'DISCONNECT' })
            });
        }
        setConnectedUser(null);
        changeMyStatus('ONLINE');
        onSessionEnd();
    };

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
            <h2 style={{ color: '#8F00FF', textAlign: 'center', marginBottom: '10px' }}>Mentorship Directory</h2>
            {error && <p style={{ color: '#FF073A', textAlign: 'center' }}>{error}</p>}

            {/* --- NEW: THE CONTROL BAR --- */}
            <div style={{ maxWidth: '1000px', margin: '0 auto 30px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0a0a0a', padding: '15px 20px', borderRadius: '8px', border: '1px solid #333' }}>

                {/* Search Form */}
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Search name, email, or role..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        style={{ padding: '10px', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#1e1e1e', color: 'white', width: '250px' }}
                    />
                    <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#40E0D0', color: 'black', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Search
                    </button>
                </form>

                {/* Pagination Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 0}
                        style={{ padding: '8px 15px', backgroundColor: page === 0 ? '#333' : 'transparent', color: page === 0 ? '#666' : '#40E0D0', border: `1px solid ${page === 0 ? '#333' : '#40E0D0'}`, borderRadius: '4px', cursor: page === 0 ? 'not-allowed' : 'pointer' }}
                    >
                        ← Prev
                    </button>
                    <span style={{ color: 'white', fontSize: '14px' }}>Page {page + 1} of {Math.max(1, totalPages)}</span>
                    <button
                        onClick={() => setPage(page + 1)}
                        disabled={page >= totalPages - 1}
                        style={{ padding: '8px 15px', backgroundColor: page >= totalPages - 1 ? '#333' : 'transparent', color: page >= totalPages - 1 ? '#666' : '#40E0D0', border: `1px solid ${page >= totalPages - 1 ? '#333' : '#40E0D0'}`, borderRadius: '4px', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
                    >
                        Next →
                    </button>
                </div>
            </div>

            {/* --- USER GRID --- */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                {users.length === 0 ? (
                    <p style={{ color: 'gray', fontStyle: 'italic' }}>No users found.</p>
                ) : (
                    users.map(user => {
                        const isConnectedToMe = connectedUser === user.email;
                        const isBusy = userStatuses[user.email] === 'BUSY';
                        const isOffline = userStatuses[user.email] === 'OFFLINE' || !userStatuses[user.email];

                        return (
                            <div key={user.id} style={{
                                border: isConnectedToMe ? '2px solid #39FF14' : '1px solid #333',
                                borderRadius: '8px', padding: '20px', width: '300px',
                                backgroundColor: '#0a0a0a', color: '#40E0D0', position: 'relative',
                                boxShadow: isConnectedToMe ? '0 0 15px rgba(57, 255, 20, 0.2)' : '0 4px 6px rgba(0,0,0,0.5)'
                            }}>
                                <div style={{
                                    position: 'absolute', top: '20px', right: '20px', width: '12px', height: '12px',
                                    borderRadius: '50%', backgroundColor: getLedColor(userStatuses[user.email]),
                                    boxShadow: `0 0 8px ${getLedColor(userStatuses[user.email])}`,
                                    transition: 'all 0.3s ease'
                                }} title={userStatuses[user.email] || 'OFFLINE'} />

                                <h3 style={{ marginTop: 0, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '20px' }}>{user.name}</h3>
                                <p style={{ margin: '8px 0', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong style={{ color: '#8F00FF' }}>Email:</strong> {user.email}</p>
                                <p style={{ margin: '8px 0', fontSize: '14px' }}><strong style={{ color: '#8F00FF' }}>Role:</strong> {user.role}</p>

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
                    })
                )}
            </div>

            {/* Modal Overlay */}
            {incomingInvite && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: '#050100', border: '2px solid #8F00FF', borderRadius: '12px', padding: '30px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 0 30px rgba(143, 0, 255, 0.3)' }}>
                        <div style={{ fontSize: '40px', marginBottom: '15px' }}>👋</div>
                        <h3 style={{ color: 'white', fontSize: '24px', margin: '0 0 10px 0' }}>Incoming Request!</h3>
                        <p style={{ color: '#40E0D0', marginBottom: '25px' }}><strong style={{ color: 'white' }}>{incomingInvite}</strong> wants to start a private session.</p>
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