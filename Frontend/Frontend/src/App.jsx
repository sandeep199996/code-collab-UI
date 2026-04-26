import { useState } from 'react'
import UserList from './components/UserList'
import Login from './components/Login'
import Register from './components/Register'
import Chat from './components/Chat'
import CodeWorkspace from './components/CodeWorkspace'
import VideoCall from './components/VideoCall'


import './App.css'

function App() {
// We check the backpack immediately. If a token is there, they are logged in!
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('mentor_jwt'));
const [showRegister, setShowRegister] = useState(false);
  const handleLogout = () => {
    localStorage.removeItem('mentor_jwt'); // Empty the backpack
    setIsLoggedIn(false);
  };

  return (
      <div><h1 style={{ textAlign: 'center', margin: '20px 0', fontFamily: 'Arial, sans-serif' }}>Welcome to the Mentee-Mentor Directory</h1>
       {isLoggedIn ? (
               <>
                 <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                   <button onClick={handleLogout}>Log Out</button>
                 </div>
        <UserList />
        <hr style={{ margin: '30px 0' }} />
        <VideoCall />
        <hr style={{ margin: '30px 0' }} />
        <CodeWorkspace />
        <hr style={{ margin: '30px 0' }} />
        <Chat /> { /* to only show the chat if they are logged in, since we need their email for the username */ }
        </>
        ) : (
            showRegister ? (
                <Register onSwitchToLogin={() => setShowRegister(false)} />
            ) : (
                <div>
                    <Login onLoginSuccess={() => setIsLoggedIn(true)} />
                    <p style={{ textAlign: 'center', fontSize: '14px', marginTop: '15px' }}>
                        Don't have an account?{' '}
                        <span
                            onClick={() => setShowRegister(true)}
                            style={{ color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Register here
                        </span>
                    </p>
                </div>
            )
            )}
      </div>

  );
}

export default App
