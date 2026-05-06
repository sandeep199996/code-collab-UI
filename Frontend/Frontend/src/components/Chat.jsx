import { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [connected, setConnected] = useState(false);

    // We use a ref to hold our STOMP client so it doesn't reconnect on every render
    const stompClientRef = useRef(null);

    // Let's quickly decode the email from our JWT backpack to use as our Chat Username
    const token = localStorage.getItem('mentor_jwt');
    const userEmail = token ? JSON.parse(atob(token.split('.')[1])).sub : 'Anonymous';

    useEffect(() => {
        // 1. Set up the connection to our Spring Boot /ws endpoint
        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                setConnected(true);

                // 2. Subscribe to the public topic to listen for messages
                client.subscribe('/topic/public', (message) => {
                    const receivedMessage = JSON.parse(message.body);
                    // Add the new message to our existing list of messages
                    setMessages((prevMessages) => [...prevMessages, receivedMessage]);
                });

                // 3. Announce that we joined!
                client.publish({
                    destination: '/app/chat.addUser',
                    body: JSON.stringify({ sender: userEmail, type: 'JOIN' })
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            }
        });

        client.activate();
        stompClientRef.current = client;

        // Cleanup function: disconnect when the component unmounts
        return () => {
            if (client) {
                client.deactivate();
            }
        };
    }, [userEmail]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (stompClientRef.current && messageInput.trim() !== '') {
            const chatMessage = {
                sender: userEmail,
                content: messageInput,
                type: 'CHAT'
            };

            // Push the message to the Spring Boot Controller
            stompClientRef.current.publish({
                destination: '/app/chat.sendMessage',
                body: JSON.stringify(chatMessage)
            });

            setMessageInput(''); // Clear the input box
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '20px auto', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px' }}>
            <h2 align= 'center'>Live Mentorship Lounge</h2>
            <div style={{ height: '300px', overflowY: 'scroll', border: '1px solid #eee', padding: '10px', marginBottom: '10px', backgroundColor: '#28231D' }}>
                {!connected && <p style={{ color: 'gray', fontStyle: 'italic' }}>Connecting to live server...</p>}

                {messages.map((msg, index) => (
                    <div key={index} style={{ marginBottom: '10px', textAlign: msg.sender === userEmail ? 'right' : 'left' }}>
                        {msg.type === 'JOIN' ? (
                            <span style={{ fontSize: '12px', color: 'gray', fontStyle: 'italic',color: 'GREEN' }}>{msg.sender} joined the room</span>
                        ) : msg.type === 'LEAVE' ? (
                            <span style={{ fontSize: '12px', color: 'gray', fontStyle: 'italic' , }}>{msg.sender} left the room</span>
                        ) : (
                            <div style={{ display: 'inline-block', backgroundColor: msg.sender === userEmail ? '#414A4C' : '#8A7F8D', padding: '8px 12px', borderRadius: '15px', border: '1px solid #ddd' }}>
                                <strong style={{ display: 'block', fontSize: '11px', color: '#FFFFFF' }}>{msg.sender}</strong>
                                <span>{msg.content}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: '20px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#3a3a3a', color: 'white' }}
                    disabled={!connected}
                />
                <button type="submit" disabled={!connected} style={{ borderRadius: '8px' }} >Send</button>
            </form>
        </div>
    );
};

export default Chat;