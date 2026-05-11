import { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

// Accept the activeRoomId prop from App.jsx
const Chat = ({ activeRoomId }) => {
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [connected, setConnected] = useState(false);

    const stompClientRef = useRef(null);

    const token = localStorage.getItem('mentor_jwt');
    const userEmail = token ? JSON.parse(atob(token.split('.')[1])).sub : 'Anonymous';

    useEffect(() => {
        // If we are not in a private session, don't even connect the chat WebSocket
        if (!activeRoomId) {
            setMessages([]); // Clear chat history when disconnected
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

                // SUBSCRIBE TO THE PRIVATE ROOM INSTEAD OF /topic/public
                client.subscribe(`/topic/session/${activeRoomId}`, (message) => {
                    const receivedMessage = JSON.parse(message.body);
                    setMessages((prevMessages) => [...prevMessages, receivedMessage]);
                });
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => { if (client) client.deactivate(); };
    }, [activeRoomId]); // Re-run this effect whenever the activeRoomId changes

    const sendMessage = (e) => {
        e.preventDefault();
        if (stompClientRef.current && messageInput.trim() !== '') {
            // PUBLISH TO THE PRIVATE ROOM ENDPOINT
            stompClientRef.current.publish({
                destination: `/app/chat.sendPrivate/${activeRoomId}`,
                body: JSON.stringify({ sender: userEmail, content: messageInput, type: 'CHAT' })
            });
            setMessageInput('');
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '20px auto', border: '1px solid #ccc', borderRadius: '8px', padding: '20px', backgroundColor: '#1e1e1e' }}>
            <h2 align='center' style={{ color: 'white', margin: '0 0 20px 0' }}>Private Mentorship Lounge</h2>

            <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #555', padding: '15px', marginBottom: '15px', backgroundColor: '#28231D', borderRadius: '5px' }}>

                {/* Visual feedback if they aren't in a session */}
                {!activeRoomId ? (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'gray', fontStyle: 'italic' }}>
                        Join a session from the directory to start chatting.
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#40E0D0', fontStyle: 'italic' }}>
                        Secure connection established. Say hello!
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} style={{ marginBottom: '10px', textAlign: msg.sender === userEmail ? 'right' : 'left' }}>
                            <div style={{ display: 'inline-block', backgroundColor: msg.sender === userEmail ? '#414A4C' : '#8A7F8D', padding: '8px 12px', borderRadius: '15px', border: '1px solid #555' }}>
                                <strong style={{ display: 'block', fontSize: '11px', color: '#FFFFFF', marginBottom: '4px' }}>{msg.sender}</strong>
                                <span style={{ color: 'white' }}>{msg.content}</span>
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
                    style={{ flex: 1, padding: '15px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#3a3a3a', color: 'white' }}
                    disabled={!activeRoomId || !connected}
                />
                <button
                    type="submit"
                    disabled={!activeRoomId || !connected}
                    style={{ borderRadius: '8px', padding: '0 20px', backgroundColor: (!activeRoomId || !connected) ? '#555' : '#39FF14', color: 'black', fontWeight: 'bold', border: 'none', cursor: (!activeRoomId || !connected) ? 'not-allowed' : 'pointer' }}
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default Chat;