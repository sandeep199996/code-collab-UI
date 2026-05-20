import { useState } from 'react';
import axios from 'axios';

const ProfileSettings = ({ userEmail, onAccountDeleted }) => {
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');

    const token = localStorage.getItem('mentor_jwt');

    const handleDelete = async () => {
        if (confirmText !== 'DELETE') {
            setError("You must type exactly 'DELETE' to confirm.");
            return;
        }

        setIsDeleting(true);
        setError('');

        try {
            // Call the secure backend endpoint we just built
            await axios.delete('http://localhost:8080/api/users/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // If successful, trigger the wipe protocol in App.jsx
            onAccountDeleted();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to contact the server.");
            setIsDeleting(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '40px auto', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#E0B0FF', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Account Settings</h2>

            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#1a0505', border: '1px solid #FF073A', borderRadius: '8px' }}>
                <h3 style={{ color: '#FF073A', marginTop: 0 }}>Danger Zone: Delete Account</h3>
                <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5' }}>
                    Warning: This action is permanent and cannot be undone. This will permanently erase <strong>{userEmail}</strong> and all associated data, including chat histories and code snippets.
                </p>

                <div style={{ marginTop: '20px' }}>
                    <label style={{ display: 'block', color: 'gray', fontSize: '12px', marginBottom: '5px' }}>
                        Please type <strong>DELETE</strong> to confirm:
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="DELETE"
                        style={{ width: '100%', padding: '10px', backgroundColor: 'black', border: '1px solid #555', color: 'white', borderRadius: '4px', marginBottom: '10px' }}
                    />
                </div>

                {error && <p style={{ color: '#FF073A', fontSize: '14px', fontWeight: 'bold' }}>{error}</p>}

                <button
                    onClick={handleDelete}
                    disabled={isDeleting || confirmText !== 'DELETE'}
                    style={{
                        width: '100%', padding: '10px',
                        backgroundColor: confirmText === 'DELETE' ? '#FF073A' : '#333',
                        color: 'white', border: 'none', borderRadius: '4px',
                        cursor: confirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                        fontWeight: 'bold'
                    }}
                >
                    {isDeleting ? 'ERASING DATA...' : 'PERMANENTLY DELETE MY ACCOUNT'}
                </button>
            </div>
        </div>
    );
};

export default ProfileSettings;