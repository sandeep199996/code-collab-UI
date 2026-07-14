import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const DirectMessageUI = ({ currentUserEmail }) => {
    const [directory, setDirectory] = useState([]);
    const [activeChatUser, setActiveChatUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const stompClientRef = useRef(null);
    const messagesEndRef = useRef(null);
    const token = localStorage.getItem('mentor_jwt');
    const [unreadMap, setUnreadMap] = useState({});

   // 1. Fetch Directory AND Unread Map on Load
       useEffect(() => {
           const loadInboxData = async () => {
               try {
                   // Fetch Directory
                   const dirRes = await axios.get(`http://localhost:8080/api/users/directory?page=0&size=50`, {
                       headers: { 'Authorization': `Bearer ${token}` }
                   });
                   setDirectory(dirRes.data.content.filter(u => u.email !== currentUserEmail));

                   // Fetch Unread Map
                   const mapRes = await axios.get(`http://localhost:8080/api/messages/unread-map`, {
                       headers: { 'Authorization': `Bearer ${token}` }
                   });
                   setUnreadMap(mapRes.data);
               } catch (err) {
                   console.error("Failed to load inbox data.", err);
               }
           };
           loadInboxData();
       }, [token, currentUserEmail]);
    // 2. Establish the Background DM WebSocket
    useEffect(() => {
        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                // Listen to my personal inbox channel
                client.subscribe(`/topic/messages/${currentUserEmail}`, (msg) => {
                    const savedMessage = JSON.parse(msg.body);

                    // Only append to the screen if the message belongs to the currently open chat
                    setMessages(prev => {
                        const isCurrentChat =
                            (savedMessage.senderEmail === activeChatUser?.email) ||
                            (savedMessage.recipientEmail === activeChatUser?.email);

                        if (isCurrentChat) {
                            return [...prev, savedMessage];
                        }else {
                                                     // If it's NOT the current chat, increment their unread badge!
                                                     setUnreadMap(prevMap => ({
                                                         ...prevMap,
                                                         [savedMessage.senderEmail]: (prevMap[savedMessage.senderEmail] || 0) + 1
                                                     }));
                                                 }
                        return prev;
                    });
                });
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => { if (client) client.deactivate(); };
    }, [currentUserEmail, activeChatUser]);

    // 3. Load Chat History when clicking a user
    const openChat = async (user) => {
        setActiveChatUser(user);
        // Instantly clear their unread badge visually
                setUnreadMap(prev => ({ ...prev, [user.email]: 0 }));
        try {
            const res = await axios.get(`http://localhost:8080/api/messages/history/${user.email}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessages(res.data);
        } catch (err) {
            console.error("Failed to load history.");
        }
    };

    // 4. Send a Direct Message
    const sendMessage = (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !activeChatUser) return;

        if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.publish({
                destination: '/app/chat.sendDirect',
                body: JSON.stringify({
                    sender: currentUserEmail,
                    recipient: activeChatUser.email,
                    content: messageInput
                })
            });
            setMessageInput('');
        }
    };

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div style={{ display: 'flex', height: '70vh', backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', marginTop: '20px' }}>

            {/* LEFT PANEL: Directory */}
            <div style={{ width: '300px', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ padding: '20px', margin: 0, color: '#40E0D0', borderBottom: '1px solid #333' }}>Inbox</h3>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {directory.map(user => (
                        <div
                            key={user.id}
                            onClick={() => openChat(user)}
                            style={{
                                padding: '15px 20px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #222',
                                backgroundColor: activeChatUser?.email === user.email ? '#1a1a1a' : 'transparent',
                                borderLeft: activeChatUser?.email === user.email ? '4px solid #8F00FF' : '4px solid transparent',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                        ><div>
                            <h4 style={{ margin: 0, color: 'white' }}>{user.name || user.email.split('@')[0]}</h4>
                            <p style={{ margin: '5px 0 0 0', color: 'gray', fontSize: '12px' }}>{user.role}</p>
                        </div>
                       {/* THE NEW PER-USER NOTIFICATION BADGE */}
                                                   {unreadMap[user.email] > 0 && (
                                                       <div style={{ backgroundColor: '#FF073A', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                                                           {unreadMap[user.email]}
                                                       </div>
                                                   )}
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL: Chat Window */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#050100' }}>
                {activeChatUser ? (
                    <>
                        {/* Chat Header */}
                        <div style={{ padding: '20px', borderBottom: '1px solid #333', backgroundColor: '#0a0a0a' }}>
                            <h3 style={{ margin: 0, color: '#E0B0FF' }}>{activeChatUser.name || activeChatUser.email.split('@')[0]}</h3>
                        </div>

                        {/* Messages Area */}
                        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {messages.map((msg, index) => {
                                const isMine = msg.senderEmail === currentUserEmail;
                                return (
                                    <div key={index} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                        <div style={{
                                            padding: '10px 15px',
                                            borderRadius: '8px',
                                            backgroundColor: isMine ? '#8F00FF' : '#333',
                                            color: 'white',
                                            borderBottomRightRadius: isMine ? 0 : '8px',
                                            borderBottomLeftRadius: isMine ? '8px' : 0
                                        }}>
                                            {msg.content}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'gray', marginTop: '5px', textAlign: isMine ? 'right' : 'left' }}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={sendMessage} style={{ padding: '20px', borderTop: '1px solid #333', display: 'flex', gap: '10px', backgroundColor: '#0a0a0a' }}>
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                placeholder="Type a message..."
                                style={{ flex: 1, padding: '12px', backgroundColor: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }}
                            />
                            <button type="submit" style={{ padding: '12px 25px', backgroundColor: '#39FF14', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Send
                            </button>
                        </form>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'gray', fontStyle: 'italic' }}>
                        Select a user from the directory to start messaging.
                    </div>
                )}
            </div>
        </div>
    );
};

export default DirectMessageUI;