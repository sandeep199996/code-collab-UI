import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

// Accept the Room ID prop
const CodeWorkspace = ({ activeRoomId }) => {
    const defaultJavaCode = `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Mentor!");\n    }\n}`;

    const [code, setCode] = useState(defaultJavaCode);
    const stompClientRef = useRef(null);

    const token = localStorage.getItem('mentor_jwt');
    const userEmail = token ? JSON.parse(atob(token.split('.')[1])).sub : 'Anonymous';

    useEffect(() => {
        // Disconnect and clear if not in a room
        if (!activeRoomId) {
            setCode(defaultJavaCode); // Reset editor for the next session
            if (stompClientRef.current) stompClientRef.current.deactivate();
            return;
        }

        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                // Subscribe to the PRIVATE code topic
               client.subscribe(`/topic/session/${activeRoomId}/code`, (message) => {
                   const receivedMessage = JSON.parse(message.body);
                   if (receivedMessage.sender !== userEmail) {
                       setCode(receivedMessage.content);
                   }
               });
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => { if (client) client.deactivate(); };
    }, [activeRoomId]);

    const handleEditorChange = (value) => {
        setCode(value);

        if (stompClientRef.current && stompClientRef.current.connected && activeRoomId) {
            // Send exactly to the PRIVATE code endpoint
            stompClientRef.current.publish({
                destination: `/app/code.sendPrivate/${activeRoomId}`,
                body: JSON.stringify({
                    sender: userEmail,
                    content: value,
                    type: 'CODE'
                })
            });
        }
    };

    return (
        <div style={{ marginTop: '20px', border: '1px solid #ccc', borderRadius: '8px', padding: '20px', backgroundColor: '#1e1e1e', color: 'white' }}>
            <h2 style={{ marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Collaborative Workspace</span>
                {/* Visual Indicator of Lock Status */}
                <span style={{ fontSize: '14px', color: activeRoomId ? '#39FF14' : '#FF073A' }}>
                    {activeRoomId ? '🔒 Secure Sync Active' : '🔓 Offline Mode'}
                </span>
            </h2>

            <div style={{ borderRadius: '5px', overflow: 'hidden', border: '1px solid #555', opacity: activeRoomId ? 1 : 0.6 }}>
                <Editor
                    height="400px"
                    language="java"
                    theme="vs-dark"
                    value={code}
                    onChange={handleEditorChange}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 15,
                        wordWrap: 'on',
                        automaticLayout: true,
                        readOnly: !activeRoomId // Locks the keyboard if no session!
                    }}
                />
            </div>
        </div>
    );
};

export default CodeWorkspace;