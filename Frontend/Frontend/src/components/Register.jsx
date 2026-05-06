import { useState } from 'react';
import axios from 'axios';

const Register = ({ onSwitchToLogin }) => {
    // Setting up our state memory for all the required fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('MENTEE'); // Defaulting to MENTEE
    const [error, setError] = useState('');

    const handleRegister = (e) => {
        e.preventDefault();

        // Firing the data to our secure backend endpoint
        axios.post('http://localhost:8080/api/users/register', {
            name: name,
            email: email,
            password: password,
            role: role
        })
        .then(response => {
            alert('Registration successful! You can now log in.');
            // Send the user back to the login screen so they can get their JWT
            onSwitchToLogin();
        })
        .catch(err => {
            console.error("Registration failed", err);
            // If our Spring Boot backend throws a specific error (like "Email exists"), show it!
            setError(err.response?.data?.message || "Registration failed. This email might already exist.");
        });
    };

    return (
        <div style={{ maxWidth: '300px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2 align='center'>Register</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                {/* A dropdown so the user can choose their path */}
                <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '5px' }}>
                    <option value="MENTEE">Mentee</option>
                    <option value="MENTOR">Mentor</option>
                </select>

                <button type="submit" style={{ marginTop: '10px' }}>Sign Up</button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '14px', marginTop: '15px' }}>
                Already have an account?{' '}
                <span
                    onClick={onSwitchToLogin}
                    style={{ color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
                >
                    Log in here
                </span>
            </p>
        </div>
    );
};

export default Register;