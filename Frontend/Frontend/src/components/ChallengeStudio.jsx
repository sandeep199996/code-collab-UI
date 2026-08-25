import { useState, useEffect } from 'react';
import axios from 'axios';

const ChallengeStudio = () => {
    const [myChallenges, setMyChallenges] = useState([]);


    const [title, setTitle] = useState('');
    const [difficulty, setDifficulty] = useState('EASY');
    const [description, setDescription] = useState('');
    const [starterCode, setStarterCode] = useState('function solution() {\n  // Write your code here\n}');
    const [testCases, setTestCases] = useState('[{"input": "", "expected": ""}]');

    const [isSaving, setIsSaving] = useState(false);
    const token = localStorage.getItem('mentor_jwt');


    const fetchMyChallenges = async () => {
        try {
            const res = await axios.get('http://localhost:8080/api/challenges', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setMyChallenges(res.data);
        } catch (err) {
            console.error("Failed to load challenges.", err);
        }
    };

    useEffect(() => {
        fetchMyChallenges();
    }, [token]);


    const handleCreateChallenge = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await axios.post('http://localhost:8080/api/challenges/create', {
                title, difficulty, description, starterCode, testCases
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            alert("Challenge created successfully and saved privately!");

            setTitle(''); setDescription('');
            fetchMyChallenges(); // Refresh the list
        } catch (err) {
            alert("Creation failed: " + (err.response?.data || err.message));
        } finally {
            setIsSaving(false);
        }
    };


    const handlePublish = async (challengeId) => {
        if (!window.confirm("Are you sure? This will make the challenge visible to all users on the platform.")) return;

        try {
            await axios.put(`http://localhost:8080/api/challenges/${challengeId}/publish`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert("Challenge Published!");
            fetchMyChallenges();
        } catch (err) {
            alert("Failed to publish: " + (err.response?.data || err.message));
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ color: '#E0B0FF', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Mentor Studio: Challenge Creator</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '20px' }}>


                <div style={{ backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                    <h3 style={{ color: '#39FF14', marginTop: 0 }}>Draft New Challenge</h3>

                    <form onSubmit={handleCreateChallenge} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input
                            type="text" placeholder="Challenge Title" value={title} onChange={(e) => setTitle(e.target.value)} required
                            style={{ padding: '10px', backgroundColor: 'black', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
                        />

                        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ padding: '10px', backgroundColor: 'black', color: 'white', border: '1px solid #444', borderRadius: '4px' }}>
                            <option value="EASY">EASY</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HARD">HARD</option>
                        </select>

                        <textarea
                            placeholder="Problem Description" value={description} onChange={(e) => setDescription(e.target.value)} required rows="4"
                            style={{ padding: '10px', backgroundColor: 'black', color: 'white', border: '1px solid #444', borderRadius: '4px', resize: 'vertical' }}
                        />

                        <div>
                            <label style={{ color: 'gray', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Starter Code Boilerplate</label>
                            <textarea
                                value={starterCode} onChange={(e) => setStarterCode(e.target.value)} required rows="5"
                                style={{ width: '100%', padding: '10px', backgroundColor: '#1e1e1e', color: '#40E0D0', border: '1px solid #444', borderRadius: '4px', fontFamily: 'monospace', resize: 'vertical' }}
                            />
                        </div>

                        <div>
                            <label style={{ color: 'gray', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Test Cases (JSON Format)</label>
                            <textarea
                                value={testCases} onChange={(e) => setTestCases(e.target.value)} required rows="3"
                                style={{ width: '100%', padding: '10px', backgroundColor: '#1e1e1e', color: '#FFD700', border: '1px solid #444', borderRadius: '4px', fontFamily: 'monospace', resize: 'vertical' }}
                            />
                        </div>

                        <button
                            type="submit" disabled={isSaving}
                            style={{ padding: '12px', backgroundColor: '#E0B0FF', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: isSaving ? 'wait' : 'pointer', marginTop: '10px' }}
                        >
                            {isSaving ? 'SAVING...' : 'SAVE TO PRIVATE VAULT'}
                        </button>
                    </form>
                </div>


                <div style={{ backgroundColor: '#050100', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                    <h3 style={{ color: '#40E0D0', marginTop: 0 }}>My Authored Challenges</h3>
                    <p style={{ color: 'gray', fontSize: '14px', marginBottom: '20px' }}>Challenges saved here are private by default. Publish them to share with the community.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '600px', overflowY: 'auto' }}>
                        {myChallenges.length === 0 ? (
                            <p style={{ color: '#555', fontStyle: 'italic', textAlign: 'center' }}>You haven't created any challenges yet.</p>
                        ) : (
                            myChallenges.map(c => (
                                <div key={c.id} style={{ backgroundColor: 'black', border: '1px solid #222', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0', color: 'white' }}>{c.title} <span style={{ fontSize: '12px', color: 'gray' }}>({c.difficulty})</span></h4>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                            backgroundColor: c.public ? '#39FF14' : '#FF073A',
                                            color: 'black'
                                        }}>
                                            {c.public ? 'GLOBAL / PUBLIC' : 'PRIVATE'}
                                        </span>
                                    </div>

                                    {!c.public && (
                                        <button
                                            onClick={() => handlePublish(c.id)}
                                            style={{ padding: '8px 15px', backgroundColor: 'transparent', color: '#40E0D0', border: '1px solid #40E0D0', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                        >
                                            PUBLISH
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ChallengeStudio;