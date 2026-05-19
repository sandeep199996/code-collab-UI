import { useState } from 'react';
import UserList from './components/UserList';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import CodeWorkspace from './components/CodeWorkspace';
import VideoCall from './components/VideoCall';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

function App() {

  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('mentor_jwt'));
  const [showRegister, setShowRegister] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(null);

 // --- BULLETPROOF JWT DECODER ---
   const jwt = localStorage.getItem('mentor_jwt');
   let decodedToken = null;

   try {
       if (isLoggedIn && jwt) {
           // Decode the base64 payload
           decodedToken = JSON.parse(atob(jwt.split('.')[1]));
           console.log("SUCCESSFULLY PARSED JWT:", decodedToken);
       }
   } catch (error) {
       console.error("Failed to parse JWT. It might be corrupted:", error);
   }

   // Extract the data safely
   const userEmail = decodedToken ? decodedToken.sub : '';
   const userRole = decodedToken ? decodedToken.role : '';

   // Accept both 'ADMIN' (from MySQL) and 'ROLE_ADMIN' (from Spring Security)
   const isAdmin = userRole === 'ROLE_ADMIN' || userRole === 'ADMIN';

   const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';
   const [currentView, setCurrentView] = useState('DIRECTORY');
  //  State for the Profile Dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);


  const handleLogout = () => {
    localStorage.removeItem('mentor_jwt');
    setIsLoggedIn(false);
    setActiveRoomId(null);
    setShowProfileMenu(false);
  };

  return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0', padding: '0 20px' }}>
            <h1 style={{ fontFamily: 'Arial, sans-serif', color: '#7A4988', margin: 0 }}>Code-Collaboration Platform</h1>

            {isLoggedIn && (
              <div style={{ position: 'relative' }}>
                {/* Profile Circle */}
                <div
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#8F00FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '20px', color: 'white', border: '2px solid #40E0D0', boxShadow: '0 0 10px rgba(143,0,255,0.5)' }}
                >
                  {userInitial}
                </div>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '55px', backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '15px', width: '220px', zIndex: 1000, boxShadow: '0 4px 15px rgba(0,0,0,0.8)' }}>
                    <p style={{ margin: '0 0 5px 0', color: 'gray', fontSize: '12px' }}>Signed in as</p>
                    <p style={{ margin: '0 0 15px 0', wordBreak: 'break-all', color: '#40E0D0', fontWeight: 'bold' }}>{userEmail}</p>
                    <hr style={{ borderColor: '#333', margin: '10px 0' }} />

                    {/* Admin Navigation Buttons */}
                    {isAdmin && currentView !== 'ADMIN' && (
                        <button onClick={() => { setCurrentView('ADMIN'); setShowProfileMenu(false); }} style={{ width: '100%', padding: '8px', backgroundColor: '#333', border: 'none', color: '#40E0D0', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
                            ⚙️ Admin Panel
                        </button>
                    )}
                    {isAdmin && currentView === 'ADMIN' && (
                        <button onClick={() => { setCurrentView('DIRECTORY'); setShowProfileMenu(false); }} style={{ width: '100%', padding: '8px', backgroundColor: '#333', border: 'none', color: '#E0B0FF', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
                            ⬅ Back to App
                        </button>
                    )}

                    <button onClick={handleLogout} style={{ width: '100%', padding: '8px', backgroundColor: 'transparent', border: '1px solid #FF073A', color: '#FF073A', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

         {isLoggedIn ? (
              currentView === 'ADMIN' ? (
                  <AdminDashboard />
              ) : (
                  <>
                      {/* The Switchboard */}
                      <UserList onSessionStart={(roomId) => setActiveRoomId(roomId)} onSessionEnd={() => setActiveRoomId(null)} />
                      <hr style={{ margin: '30px 0', borderColor: '#333' }} />

                      {/* Locked-down components */}
                      <VideoCall activeRoomId={activeRoomId} />
                      <hr style={{ margin: '30px 0', borderColor: '#333' }} />
                      <CodeWorkspace activeRoomId={activeRoomId} />
                      <hr style={{ margin: '30px 0', borderColor: '#333' }} />
                      <Chat activeRoomId={activeRoomId} />
                  </>
              )
          ) : (
              showRegister ? (
                  <Register onSwitchToLogin={() => setShowRegister(false)} />
              ) : (
                  <div>
                      <Login onLoginSuccess={() => setIsLoggedIn(true)} />
                      <p style={{ textAlign: 'center', fontSize: '14px', marginTop: '15px' }}>
                          Don't have an account?{' '}
                          <span onClick={() => setShowRegister(true)} style={{ color: '#40E0D0', cursor: 'pointer', textDecoration: 'underline' }}>Register here</span>
                      </p>
                  </div>
              )
          )}
        </div>
    );
}

export default App;