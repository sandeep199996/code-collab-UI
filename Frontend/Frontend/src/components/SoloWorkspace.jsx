import { useState, useEffect } from 'react';
import axios from 'axios';

const SoloWorkspace = () => {
    const [challenges, setChallenges] = useState([]);
    const [selectedChallengeId, setSelectedChallengeId] = useState('');
    const [activePrompt, setActivePrompt] = useState(null);
    const [code, setCode] = useState('// Select a challenge from the question bank to begin.');
    const [output, setOutput] = useState('');
    const [language, setLanguage] = useState('javascript');

    const token = localStorage.getItem('mentor_jwt');

    // 1. Fetch available challenges for this user
    useEffect(() => {
        axios.get('http://localhost:8080/api/challenges', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => setChallenges(res.data))
        .catch(err => console.error("Failed to load challenges from the database."));
    }, [token]);

    // 2. Load the challenge into the local editor
    const handleLoadChallenge = () => {
        const challenge = challenges.find(c => c.id === parseInt(selectedChallengeId));
        if (!challenge) return;

        setActivePrompt(challenge);
        setCode(challenge.starterCode);
        setOutput(''); // Clear the terminal for the new problem
    };


  const handleRunCode = async () => {
          setOutput(`Executing ${language} code via Docker...`);

          try {

              const response = await axios.post('http://localhost:8080/api/compiler/run', {
                  language: language,
                  code: code
              }, {
                  headers: { 'Authorization': `Bearer ${token}` }
              });


              setOutput(response.data.output || response.data);
          } catch (err) {
              setOutput("Execution Error: " + (err.response?.data?.error || err.message));
          }
      };
    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
               {/* Editor Controls */}
                                   <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#111', padding: '10px', border: '1px solid #333', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', borderBottom: 'none' }}>
                                       <select
                                           value={language}
                                           onChange={(e) => setLanguage(e.target.value)}
                                           style={{ padding: '5px', backgroundColor: 'black', color: '#40E0D0', border: '1px solid #333', borderRadius: '4px' }}
                                       >
                                           <option value="javascript">JavaScript</option>
                                           <option value="java">Java</option>
                                           <option value="python">Python</option>
                                       </select>
                                   </div>
                <h2 style={{ color: '#39FF14', margin: 0 }}>Solo Practice Arena</h2>
            </div>

            {/* Top Control Bar */}
            <div style={{ backgroundColor: '#0a0a0a', padding: '20px', border: '1px solid #333', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                <select
                    value={selectedChallengeId}
                    onChange={(e) => setSelectedChallengeId(e.target.value)}
                    style={{ padding: '10px', backgroundColor: 'black', color: 'white', border: '1px solid #40E0D0', borderRadius: '4px', flex: 1, fontSize: '16px' }}
                >
                    <option value="">-- Select a Challenge --</option>
                    {challenges.map(c => (
                        <option key={c.id} value={c.id}>{c.title} ({c.difficulty})</option>
                    ))}
                </select>
                <button
                    onClick={handleLoadChallenge}
                    disabled={!selectedChallengeId}
                    style={{ padding: '10px 20px', backgroundColor: '#40E0D0', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: selectedChallengeId ? 'pointer' : 'not-allowed' }}
                >
                    LOAD CHALLENGE
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', height: '60vh' }}>

                {/* Left Panel: The Problem Description */}
                <div style={{ backgroundColor: '#050100', border: '1px solid #333', borderRadius: '8px', padding: '20px', overflowY: 'auto' }}>
                    {activePrompt ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ margin: 0, color: '#E0B0FF' }}>{activePrompt.title}</h3>
                                <span style={{ backgroundColor: activePrompt.difficulty === 'EASY' ? '#39FF14' : activePrompt.difficulty === 'MEDIUM' ? '#FFD700' : '#FF073A', color: 'black', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                                    {activePrompt.difficulty}
                                </span>
                            </div>
                            <p style={{ color: '#ccc', lineHeight: '1.6' }}>{activePrompt.description}</p>

                            <h4 style={{ color: 'gray', marginTop: '30px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>Expected Test Cases</h4>
                            <pre style={{ backgroundColor: 'black', padding: '10px', borderRadius: '4px', color: '#40E0D0', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                                {activePrompt.testCases}
                            </pre>
                        </>
                    ) : (
                        <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: 'gray', fontStyle: 'italic', textAlign: 'center' }}>
                            Load a challenge to view the prompt and test cases.
                        </div>
                    )}
                </div>

                {/* Right Panel: The Code Editor & Terminal */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                    {/* The Editor Area */}
                    <div style={{ flex: 1, backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', position: 'relative' }}>
                        {/* If you are using Monaco Editor, replace this textarea with the <Editor /> component */}
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            style={{ width: '100%', height: '100%', backgroundColor: 'transparent', color: '#d4d4d4', border: 'none', padding: '15px', fontFamily: 'monospace', fontSize: '14px', resize: 'none', outline: 'none' }}
                            spellCheck="false"
                        />
                        <button
                            onClick={handleRunCode}
                            style={{ position: 'absolute', bottom: '15px', right: '15px', padding: '8px 25px', backgroundColor: '#39FF14', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
                        >
                            ▶ RUN CODE
                        </button>
                    </div>

                    {/* The Output Terminal */}
                    <div style={{ height: '150px', backgroundColor: 'black', border: '1px solid #333', borderRadius: '8px', padding: '15px', overflowY: 'auto' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: 'gray', fontSize: '12px', textTransform: 'uppercase' }}>Console Output</h4>
                        <pre style={{ margin: 0, color: 'white', fontFamily: 'monospace', fontSize: '13px' }}>
                            {output || "Awaiting execution..."}
                        </pre>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SoloWorkspace;