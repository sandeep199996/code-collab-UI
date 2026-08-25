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
    };const [snippetTitle, setSnippetTitle] = useState('');
      const [isSaving, setIsSaving] = useState(false);
// --- INTERVIEW ARENA STATE ---
    const [challenges, setChallenges] = useState([]);
    const [selectedChallengeId, setSelectedChallengeId] = useState('');
    const [activePrompt, setActivePrompt] = useState(null);
    const [language, setLanguage] = useState('java');
    const [code, setCode] = useState(templates.java);
    const [output, setOutput] = useState('');
    const [isCompiling, setIsCompiling] = useState(false);

    const stompClientRef = useRef(null);
    const token = localStorage.getItem('mentor_jwt');
    const userEmail = token ? JSON.parse(atob(token.split('.')[1])).sub : 'Anonymous';
// To Fetch available coding challenges on load
    useEffect(() => {
        axios.get('http://localhost:8080/api/challenges', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('mentor_jwt')}` }
        })
        .then(res => setChallenges(res.data))
        .catch(err => console.error("Failed to load challenges from mainframe.", err));
    }, []);
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
const handleSaveSnippet = async () => {
    if (!snippetTitle.trim() || !code.trim()) {
        alert("Please provide a title and ensure the editor is not empty.");
        return;
    }

    setIsSaving(true);
    const token = localStorage.getItem('mentor_jwt');

    try {
        await axios.post('http://localhost:8080/api/snippets', {
            title: snippetTitle,
            language: language, // Assuming you have a 'language' state for the editor
            code: code          // Assuming your editor code is stored in a 'code' state
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        alert("Snippet saved successfully!");
        setSnippetTitle(''); // Clear the title after saving
    } catch (err) {
        alert("Failed to save snippet.");
    } finally {
        setIsSaving(false);
    }
};
const handlePushChallenge = () => {
        const challenge = challenges.find(c => c.id === parseInt(selectedChallengeId));
        if (!challenge) return;

        // 1. Show the description on  screen
        setActivePrompt(challenge);

        // 2. Update the local Monaco Editor (replace 'setCode' with state is named)
        setCode(challenge.starterCode);

        // 3. Blast the starter code to everyone else in the room
        if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.publish({
                destination: `/app/code.sendPrivate/${activeRoomId}`,
                body: JSON.stringify({
                    sender: currentUserEmail,
                    content: challenge.starterCode
                })
            });

            // Optional: Broadcast the prompt description via the chat channel so the Mentee can read it!
            stompClientRef.current.publish({
                destination: `/app/chat.sendPrivate/${activeRoomId}`,
                body: JSON.stringify({
                    sender: 'SYSTEM',
                    content: `🎯 CHALLENGE LOADED: ${challenge.title}\n${challenge.description}`
                })
            });
        }
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
<div style={{ display: 'flex', gap: '10px', marginBottom: '10px', backgroundColor: '#111', padding: '10px', borderRadius: '4px' }}>
    <input
        type="text"
        placeholder="Name your snippet..."
        value={snippetTitle}
        onChange={(e) => setSnippetTitle(e.target.value)}
        style={{ flex: 1, padding: '8px', backgroundColor: 'black', color: 'white', border: '1px solid #333', borderRadius: '4px' }}
    />
    <button
        onClick={handleSaveSnippet}
        disabled={isSaving}
        style={{ padding: '8px 15px', backgroundColor: '#40E0D0', color: 'black', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSaving ? 'wait' : 'pointer' }}
    >
        {isSaving ? 'Saving...' : '💾 Save to Vault'}
    </button>
</div>
            <div style={{ borderRadius: '5px', overflow: 'hidden', border: '1px solid #333', opacity: activeRoomId ? 1 : 0.5, marginBottom: '15px' }}>
                            <div style={{ backgroundColor: '#0a0a0a', padding: '15px', borderBottom: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                                {/* Mentor Controls */}
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <span style={{ color: '#E0B0FF', fontWeight: 'bold' }}>Mock Interview:</span>
                                    <select
                                        value={selectedChallengeId}
                                        onChange={(e) => setSelectedChallengeId(e.target.value)}
                                        style={{ padding: '8px', backgroundColor: 'black', color: 'white', border: '1px solid #40E0D0', borderRadius: '4px', flex: 1 }}
                                    >
                                        <option value="">-- Select a Technical Challenge --</option>
                                        {challenges.map(c => (
                                            <option key={c.id} value={c.id}>{c.title} ({c.difficulty})</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handlePushChallenge}
                                        disabled={!selectedChallengeId}
                                        style={{ padding: '8px 15px', backgroundColor: '#39FF14', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: selectedChallengeId ? 'pointer' : 'not-allowed' }}
                                    >
                                        ⚡ PUSH CHALLENGE
                                    </button>
                                </div>

                                {/* Active Prompt Display */}
                                {activePrompt && (
                                    <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#111', borderLeft: '4px solid #39FF14', color: '#ccc', fontSize: '14px', fontFamily: 'monospace' }}>
                                        <h4 style={{ margin: '0 0 10px 0', color: 'white' }}>{activePrompt.title}</h4>
                                        {activePrompt.description}
                                    </div>
                                )}
                            </div>
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