import { useState, useEffect } from 'react';
import axios from 'axios';

const SnippetLibrary = () => {
    const [snippets, setSnippets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const token = localStorage.getItem('mentor_jwt');

    const fetchSnippets = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:8080/api/snippets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSnippets(response.data);
            setError('');
        } catch (err) {
            setError("Failed to load your snippet library.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSnippets();
    }, [token]);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this snippet?")) return;

        try {
            await axios.delete(`http://localhost:8080/api/snippets/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Remove the deleted snippet from the UI instantly
            setSnippets(snippets.filter(s => s.id !== id));
        } catch (err) {
            alert("Failed to delete snippet.");
        }
    };

    if (loading) return <h3 style={{ color: '#40E0D0', textAlign: 'center' }}>Loading Vault...</h3>;

    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
                <h2 style={{ color: '#40E0D0', margin: 0 }}>💾 My Snippet Vault</h2>
                <button onClick={fetchSnippets} style={{ padding: '8px', backgroundColor: 'transparent', color: '#E0B0FF', border: '1px solid #E0B0FF', borderRadius: '4px', cursor: 'pointer' }}>
                    ↻ Refresh
                </button>
            </div>

            {error && <p style={{ color: '#FF073A' }}>{error}</p>}

            {snippets.length === 0 && !error ? (
                <p style={{ color: 'gray', textAlign: 'center', marginTop: '50px' }}>Your vault is empty. Save some code from the workspace!</p>
            ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                    {snippets.map(snippet => (
                        <div key={snippet.id} style={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h3 style={{ color: 'white', margin: 0 }}>{snippet.title}</h3>
                                <span style={{ backgroundColor: '#333', color: '#40E0D0', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {snippet.language}
                                </span>
                            </div>

                            <pre style={{ backgroundColor: '#000', padding: '15px', borderRadius: '4px', overflowX: 'auto', border: '1px solid #222', color: '#e6e6e6', fontSize: '14px' }}>
                                <code>{snippet.code}</code>
                            </pre>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                                <span style={{ color: 'gray', fontSize: '12px' }}>
                                    Saved: {new Date(snippet.createdAt).toLocaleDateString()}
                                </span>
                                <div>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(snippet.code); alert("Copied to clipboard!"); }}
                                        style={{ padding: '6px 12px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}
                                    >
                                        📋 Copy
                                    </button>
                                    <button
                                        onClick={() => handleDelete(snippet.id)}
                                        style={{ padding: '6px 12px', backgroundColor: 'transparent', color: '#FF073A', border: '1px solid #FF073A', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SnippetLibrary;