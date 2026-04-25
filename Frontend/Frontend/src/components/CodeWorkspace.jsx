import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const CodeWorkspace = () => {
    const defaultJavaCode = `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Mentor!");\n    }\n}`;

    const [code, setCode] = useState(defaultJavaCode);
    const stompClientRef = useRef(null);

    // Grab our email so we know who is typing
    const token = localStorage.getItem('mentor_jwt');
    const userEmail = token ? JSON.parse(atob(token.split('.')[1])).sub : 'Anonymous';

    useEffect(() => {
        // 1. Connect to the WebSocket
        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {

                // 2. Subscribe to the dedicated CODE room
               client.subscribe('/topic/code', (message) => {
                                   const receivedMessage = JSON.parse(message.body);

                                   // --- NEW DEBUG LOGS ---
                                   console.log("RECEIVED CODE UPDATE: ", receivedMessage);
                                   console.log("My Email: ", userEmail, " | Sender Email: ", receivedMessage.sender);
                                   // ----------------------

                                   if (receivedMessage.sender !== userEmail) {
                                       console.log("Emails don't match. Updating editor!");
                                       setCode(receivedMessage.content);
                                   } else {
                                       console.log("Ignored my own keystroke.");
                                   }
                               });
            },
                onStompError: (frame) => {
                   console.error('SERVER REJECTED MESSAGE: ' + frame.headers['message']);
                                   console.error('Details: ' + frame.body);
                               }
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (client) {
                client.deactivate();
            }
        };
    }, [userEmail]);

   const handleEditorChange = (value) => {
           // 1. Update our own screen instantly
           setCode(value);

           // 2. Log that we are trying to send
           console.log("User typed something. Attempting to broadcast...");

           // 3. Removed the strict .connected check that was likely failing silently
           if (stompClientRef.current) {
               console.log("Broadcasting to /app/code.sendChange");

               stompClientRef.current.publish({
                   destination: '/app/code.sendChange',
                   body: JSON.stringify({
                       sender: userEmail,
                       content: value,
                       type: 'CODE'
                   })
               });
           } else {
               console.log("WARNING: STOMP client is not ready yet!");
           }
       };
    return (
        <div style={{ marginTop: '20px', border: '1px solid #ccc', borderRadius: '8px', padding: '20px', backgroundColor: '#1e1e1e', color: 'white' }}>
            <h2 style={{ marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                Collaborative Java Workspace
            </h2>

            <div style={{ borderRadius: '5px', overflow: 'hidden', border: '1px solid #555' }}>
                <Editor
                    height="400px"
                    language="java"
                    theme="vs-dark"
                    value={code} // Ties the editor strictly to our React state
                    onChange={handleEditorChange} // Fires every single time you hit a key
                    options={{
                        minimap: { enabled: false },
                        fontSize: 15,
                        wordWrap: 'on',
                        automaticLayout: true,
                    }}
                />
            </div>
        </div>
    );
};

export default CodeWorkspace;