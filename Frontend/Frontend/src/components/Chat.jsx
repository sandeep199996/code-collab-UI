import { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const Chat = ({ activeRoomId }) => {
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [connected, setConnected] = useState(false);

    const stompClientRef = useRef(null);

    const token = localStorage.getItem('mentor_jwt');
    const userEmail = token ? JSON.parse(atob(token.split('.')[1])).sub : 'Anonymous';

    useEffect(() => {
        if (!activeRoomId) {
            setMessages([]);
            setConnected(false);
            if (stompClientRef.current) stompClientRef.current.deactivate();
            return;
        }

        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                setConnected(true);

                client.subscribe(`/topic/session/${activeRoomId}`, (message) => {
                    const receivedMessage = JSON.parse(message.body);

                    // NEW: Automatically attach a timestamp to the message when it arrives
                    receivedMessage.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    setMessages((prevMessages) => [...prevMessages, receivedMessage]);
                });
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => { if (client) client.deactivate(); };
    }, [activeRoomId]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (stompClientRef.current && messageInput.trim() !== '') {
            stompClientRef.current.publish({
                destination: `/app/chat.sendPrivate/${activeRoomId}`,
                body: JSON.stringify({ sender: userEmail, content: messageInput, type: 'CHAT' })
            });
            setMessageInput('');
        }
    };

    // NEW: Function to clear the local chat state
    const handleClearChat = () => {
        if (window.confirm("Are you sure you want to clear your local chat history?")) {
            setMessages([]);
        }
    };

    return (
        <div style={{ margin: '0 auto', border: '1px solid #333', borderRadius: '8px', padding: '20px', backgroundColor: '#050100' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '15px' }}>
                <h2 style={{ color: '#8F00FF', margin: 0 }}>Private Mentorship Lounge</h2>

                {/* NEW: Clear Chat Button */}
                <button
                    onClick={handleClearChat}
                    disabled={!activeRoomId || messages.length === 0}
                    style={{
                        padding: '5px 15px', backgroundColor: 'transparent', color: (!activeRoomId || messages.length === 0) ? '#555' : '#FF073A',
                        border: `1px solid ${(!activeRoomId || messages.length === 0) ? '#555' : '#FF073A'}`, borderRadius: '4px',
                        cursor: (!activeRoomId || messages.length === 0) ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 'bold'
                    }}
                >
                    Clear History
                </button>
            </div>

            <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #333', padding: '15px', marginBottom: '15px', backgroundColor: '#0a0a0a', borderRadius: '5px' }}>
                {!activeRoomId ? (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'gray', fontStyle: 'italic' }}>
                        Join a session from the directory to start chatting.
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#40E0D0', fontStyle: 'italic' }}>
                        Secure encrypted connection established. Say hello!
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} style={{ marginBottom: '15px', textAlign: msg.sender === userEmail ? 'right' : 'left' }}>
                            <div style={{
                                display: 'inline-block',
                                backgroundColor: msg.sender === userEmail ? '#1e1e1e' : '#1e1e1e',
                                padding: '10px 15px',
                                borderRadius: msg.sender === userEmail ? '15px 15px 0 15px' : '15px 15px 15px 0',
                                border: '1px solid #333',
                                maxWidth: '75%',
                                textAlign: 'left' // Keep text inside the bubble left-aligned
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px', gap: '15px' }}>
                                    <strong style={{ fontSize: '11px', color: msg.sender === userEmail ? '#E0B0FF' : '#40E0D0' }}>
                                        {msg.sender === userEmail ? 'You' : msg.sender}
                                    </strong>
                                    {/* NEW: Display the Timestamp */}
                                    <span style={{ fontSize: '10px', color: '#ADADC9' }}>{msg.timestamp}</span>
                                </div>
                                <span style={{ color: 'white', wordBreak: 'break-word' }}>{msg.content}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={activeRoomId ? "Type a private message..." : "Waiting for session..."}
                    style={{ flex: 1, padding: '15px', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#1e1e1e', color: 'white' }}
                    disabled={!activeRoomId || !connected}
                />
                <button
                    type="submit"
                    disabled={!activeRoomId || !connected}
                    style={{ borderRadius: '4px', padding: '0 25px', backgroundColor: (!activeRoomId || !connected) ? '#333' : '#39FF14', color: (!activeRoomId || !connected) ? '#666' : 'black', fontWeight: 'bold', border: 'none', cursor: (!activeRoomId || !connected) ? 'not-allowed' : 'pointer' }}
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default Chat;