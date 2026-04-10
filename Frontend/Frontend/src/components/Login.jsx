import { useState } from 'react';
import axios from 'axios';

const Login = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e) => {
        e.preventDefault(); // Prevents the page from refreshing when you submit the form

        axios.post('http://localhost:8080/api/users/login', {
            email: email,
            password: password
        })
        .then(response => {
            // 1. The response.data IS our long JWT string! Let's put it in the backpack.
            const token = response.data;
            localStorage.setItem('mentor_jwt', token);

            // 2. Tell the parent app we succeeded
            onLoginSuccess();
        })
        .catch(err => {
            console.error("Login failed", err);
            setError("Invalid email or password");
        });
    };

    return (
        <div style={{ maxWidth: '300px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Login</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                <button type="submit">Log In</button>
            </form>
        </div>
    );
};

export default Login;