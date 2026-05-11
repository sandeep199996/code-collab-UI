import { useState } from 'react'
import UserList from './components/UserList'
import Login from './components/Login'
import Register from './components/Register'
import Chat from './components/Chat'
import CodeWorkspace from './components/CodeWorkspace'
import VideoCall from './components/VideoCall'


import './App.css'

function App() {

  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('mentor_jwt'));
const [showRegister, setShowRegister] = useState(false);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  // NEW: Track the active private room
    const [activeRoomId, setActiveRoomId] = useState(null);
  const handleLogout = () => {
    localStorage.removeItem('mentor_jwt'); // Clear the JWT from localStorage
    setIsLoggedIn(false);
    setActiveRoomId(null); // Clear session on logout
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
        <UserList onSessionStart={(roomId) => setActiveRoomId(roomId)}
                                  onSessionEnd={() => setActiveRoomId(null)}/>
        <hr style={{ margin: '30px 0' }} />
        <VideoCall activeRoomId={activeRoomId}/>
        <hr style={{ margin: '30px 0' }} />
        <CodeWorkspace activeRoomId={activeRoomId}/>
        <hr style={{ margin: '30px 0' }} />
        <Chat activeRoomId={activeRoomId}/>
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
