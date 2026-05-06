import { useState } from 'react'
import UserList from './components/UserList'
import Login from './components/Login'
import Register from './components/Register'
import Chat from './components/Chat'
import CodeWorkspace from './components/CodeWorkspace'
import VideoCall from './components/VideoCall'


import './App.css'

function App() {
// To check the backpack immediately. If a token is there, they are logged in!
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('mentor_jwt'));
const [showRegister, setShowRegister] = useState(false);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const handleLogout = () => {
    localStorage.removeItem('mentor_jwt'); // Empty the backpack
    setIsLoggedIn(false);
  };

  return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0' }}>
          <h1 style={{ textAlign: 'center', fontFamily: 'Arial, sans-serif', color: '#7A4988', margin: 0, flex: 1 }}>Welcome to the Code-Collaboration Platform</h1>
          {isLoggedIn && <button
            onClick={handleLogout}
            style={{
              marginRight: '30px',
              color: 'red',
              backgroundColor: isLogoutHovered ? 'white' : 'transparent',
              border: '1px solid red',
              padding: '5px 10px',
              cursor: 'pointer'
            }}
            onMouseEnter={() => setIsLogoutHovered(true)}
            onMouseLeave={() => setIsLogoutHovered(false)}
          >
            Log Out
          </button>}
        </div>
       {isLoggedIn ? (
               <>
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
