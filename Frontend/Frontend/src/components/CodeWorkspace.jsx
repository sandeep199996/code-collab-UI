import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import axios from 'axios';

const CodeWorkspace = ({ activeRoomId }) => {
    // We now have different starter templates based on the language!
    const templates = {
        java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Java Mentor!");\n    }\n}`,
        python: `def greet():\n    print("Hello, Python Mentor!")\n\ngreet()`,
        javascript: `console.log("Hello, JavaScript Mentor!");`
    };

    const [language, setLanguage] = useState('java');
    const [code, setCode] = useState(templates.java);
    const [output, setOutput] = useState('');
    const [isCompiling, setIsCompiling] = useState(false);

    const stompClientRef = useRef(null);
    const token = localStorage.getItem('mentor_jwt');
    const userEmail = token ? JSON.parse(atob(token.split('.')[1])).sub : 'Anonymous';

    useEffect(() => {
        if (!activeRoomId) {
            setCode(templates[language]);
            setOutput('');
            if (stompClientRef.current) stompClientRef.current.deactivate();
            return;
        }

        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
               client.subscribe(`/topic/session/${activeRoomId}/code`, (message) => {
                   const receivedMessage = JSON.parse(message.body);
                   if (receivedMessage.sender !== userEmail) {
                       setCode(receivedMessage.content);
                       // Update the language if the other person changed it!
                       if (receivedMessage.language) setLanguage(receivedMessage.language);
                   }
               });
            }
        });

        client.activate();
        stompClientRef.current = client;
        return () => { if (client) client.deactivate(); };
    }, [activeRoomId, userEmail]);

   const handleEditorChange = (value) => {
       setCode(value);
       broadcastChange(value, language);
   };

   const handleLanguageChange = (e) => {
       const newLang = e.target.value;
       setLanguage(newLang);
       setCode(templates[newLang]); // Load the new template
       broadcastChange(templates[newLang], newLang);
   };

   const broadcastChange = (newCode, newLang) => {
       if (stompClientRef.current && stompClientRef.current.connected && activeRoomId) {
           stompClientRef.current.publish({
               destination: `/app/code.sendPrivate/${activeRoomId}`,
               body: JSON.stringify({ sender: userEmail, content: newCode, language: newLang, type: 'CODE' })
           });
       }
   };

   const runCode = async () => {
       setIsCompiling(true);
       setOutput(`Compiling ${language} code via secure backend proxy...\n`);

       try {
           const response = await axios.post("http://localhost:8080/api/compiler/run", {
               code: code,
               language: language
           });
           setOutput(response.data.output || "Program finished with no output.");
       } catch (err) {
           setOutput("Compilation Error: " + err.message);
       }
       setIsCompiling(false);
   };

    return (
        <div style={{ marginTop: '20px', border: '1px solid #333', borderRadius: '8px', padding: '20px', backgroundColor: '#050100', color: 'white' }}>
            <h2 style={{ marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#8F00FF' }}>Collaborative IDE</span>

                <div style={{ display: 'flex', gap: '15px' }}>
                    {/* NEW: Multi-Language Dropdown */}
                    <select
                        value={language}
                        onChange={handleLanguageChange}
                        disabled={!activeRoomId}
                        style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#1e1e1e', color: 'white', border: '1px solid #555', cursor: !activeRoomId ? 'not-allowed' : 'pointer' }}
                    >
                        <option value="java">Java</option>
                        <option value="python">Python 3</option>
                        <option value="javascript">Node.js</option>
                    </select>

                    <button
                        onClick={runCode}
                        disabled={!activeRoomId || isCompiling}
                        style={{ padding: '8px 20px', backgroundColor: (!activeRoomId || isCompiling) ? '#333' : '#39FF14', color: (!activeRoomId || isCompiling) ? '#666' : 'black', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: (!activeRoomId || isCompiling) ? 'not-allowed' : 'pointer' }}
                    >
                        {isCompiling ? 'Running...' : '▶ Run Code'}
                    </button>
                </div>
            </h2>

            <div style={{ borderRadius: '5px', overflow: 'hidden', border: '1px solid #333', opacity: activeRoomId ? 1 : 0.5, marginBottom: '15px' }}>
                <Editor
                    height="350px"
                    language={language} // Tells Monaco how to color the syntax!
                    theme="vs-dark"
                    value={code}
                    onChange={handleEditorChange}
                    options={{ minimap: { enabled: false }, fontSize: 15, wordWrap: 'on', automaticLayout: true, readOnly: !activeRoomId }}
                />
            </div>

            <div style={{ backgroundColor: '#1e1e1e', borderRadius: '5px', border: '1px solid #333', padding: '15px', fontFamily: 'monospace', minHeight: '100px', color: '#40E0D0', whiteSpace: 'pre-wrap' }}>
                <div style={{ color: 'gray', marginBottom: '8px', fontSize: '12px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>Console Output:</div>
                {output || <span style={{ color: '#555' }}>Waiting for execution...</span>}
            </div>
        </div>
    );
};

export default CodeWorkspace;