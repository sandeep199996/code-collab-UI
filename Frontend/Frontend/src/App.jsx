import { useState, useEffect } from 'react';
import axios from 'axios';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import UserList from './components/UserList';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import CodeWorkspace from './components/CodeWorkspace';
import VideoCall from './components/VideoCall';
import AdminDashboard from './components/AdminDashboard';
import './App.css';
import ProfileSettings from './components/ProfileSettings';
import SnippetLibrary from './components/SnippetLibrary';
import ClassInvitation from './components/ClassInvitation';
import DirectMessageUI from './components/DirectMessageUI';
import SoloWorkspace from './components/SoloWorkspace';
import ChallengeStudio from './components/ChallengeStudio';
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
  const [unreadCount, setUnreadCount] = useState(0);
useEffect(() => {
       if (isLoggedIn && userEmail) {
           axios.get('http://localhost:8080/api/messages/unread', {
               headers: { 'Authorization': `Bearer ${localStorage.getItem('mentor_jwt')}` }
           })
           .then(res => setUnreadCount(res.data))
           .catch(err => console.error("Failed to fetch unread count"));
       }
   }, [isLoggedIn, userEmail, currentView]);

   // Global background STOMP listener
   useEffect(() => {
       if (!isLoggedIn || !userEmail) return;

       const socket = new SockJS('http://localhost:8080/ws');
       const client = new Client({
           webSocketFactory: () => socket,
           onConnect: () => {
               client.subscribe(`/topic/messages/${userEmail}`, (msg) => {
                   if (currentView !== 'INBOX') {
                       setUnreadCount(prev => prev + 1);
                       new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
                   }
               });
           }
       });

       client.activate();
       return () => { if (client) client.deactivate(); };
   }, [isLoggedIn, userEmail, currentView]);

  const handleLogout = () => {
    localStorage.removeItem('mentor_jwt');
    setIsLoggedIn(false);
    setActiveRoomId(null);
    setShowProfileMenu(false);
  };
  const handleAccountDeleted = () => {

        localStorage.removeItem('mentor_jwt');

        setIsLoggedIn(false);
        setShowProfileMenu(false);
        setCurrentView('DIRECTORY');
        alert("Your account and all associated data have been permanently deleted.");
    };
  useEffect(() => {
      if (isLoggedIn && userEmail) {
          axios.get('http://localhost:8080/api/messages/unread', {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('mentor_jwt')}` }
          })
          .then(res => setUnreadCount(res.data))
          .catch(err => console.error("Failed to fetch unread count"));
      }
  }, [isLoggedIn, userEmail, currentView]);



  return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0', padding: '0 20px' ,position: 'relative'}}>
            <div style={{ width: '45px'}}></div> {/* Placeholder for alignment */}
            <h1  style={{position:'absolute', left:'50%',transform: 'translateX(-50%)',fontFamily: 'Arial, sans-serif', color: '#7A4988', margin: 0, textAlign: 'center', width: 'max-content' }}> Code-Collaboration Platform</h1>

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
                {/* INBOX BUTTON */}
                                {currentView !== 'INBOX' && (
                                    <button onClick={() => { setCurrentView('INBOX'); setShowProfileMenu(false); }} style={{ width: '100%', padding: '8px', backgroundColor: 'transparent', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>📨 Direct Messages</span>
                                        {unreadCount > 0 && (
                                            <span style={{ backgroundColor: '#FF073A', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '12px', fontWeight: 'bold' }}>
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>
                                )}
                                {/* Return Button if they are already in the Inbox */}
                                {currentView === 'INBOX' && (
                                    <button onClick={() => { setCurrentView('DIRECTORY'); setShowProfileMenu(false); }} style={{ width: '100%', padding: '8px', backgroundColor: '#333', border: 'none', color: '#E0B0FF', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
                                        ⬅ Back to App
                                    </button>
                                )}
                {/* My Snippets Library Button */}
                    {currentView !== 'LIBRARY' && (
                        <button onClick={() => { setCurrentView('LIBRARY'); setShowProfileMenu(false); }} style={{ width: '100%', padding: '8px', backgroundColor: 'transparent', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', marginBottom: '10px' }}>
                            💾 My Snippets
                        </button>
                    )}
{/* Regular User Settings Button */}
    {currentView !== 'SETTINGS' && (
        <button onClick={() => { setCurrentView('SETTINGS'); setShowProfileMenu(false); }} style={{ width: '100%', padding: '8px', backgroundColor: 'transparent', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', marginBottom: '10px' }}>
            👤 Profile Settings
        </button>
    )}
    {/* Return Button if they are already in Settings */}
    {currentView === 'SETTINGS' && (
        <button onClick={() => { setCurrentView('DIRECTORY'); setShowProfileMenu(false); }} style={{ width: '100%', padding: '8px', backgroundColor: '#333', border: 'none', color: '#E0B0FF', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
            ⬅ Back to App
        </button>
    )}{/* SOLO PRACTICE BUTTON */}
                      {!activeRoomId && currentView !== 'SOLO_PRACTICE' && (
                          <button
                              onClick={() => { setCurrentView('SOLO_PRACTICE'); setShowProfileMenu(false); }}
                              style={{ width: '100%', padding: '8px', backgroundColor: 'transparent', border: 'none', color: '#39FF14', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', marginBottom: '10px', fontWeight: 'bold' }}
                          >
                              💻 Solo Practice Arena
                          </button>
                      )}


                      {currentView === 'SOLO_PRACTICE' && (
                          <button
                              onClick={() => { setCurrentView('DIRECTORY'); setShowProfileMenu(false); }}
                              style={{ width: '100%', padding: '8px', backgroundColor: '#333', border: 'none', color: '#E0B0FF', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}
                          >
                              ⬅ Back to Directory
                          </button>
                      )}
                                        {(userRole === 'MENTOR' || userRole === 'ROLE_MENTOR') && currentView !== 'STUDIO' && (
                                            <button
                                                onClick={() => { setCurrentView('STUDIO'); setShowProfileMenu(false); }}
                                                style={{ width: '100%', padding: '8px', backgroundColor: 'transparent', border: 'none', color: '#E0B0FF', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', marginBottom: '10px', fontWeight: 'bold' }}
                                            >
                                                🛠️ Mentor Studio
                                            </button>
                                        )}
                                                          {currentView === 'STUDIO' && (
                                                              <button
                                                                  onClick={() => { setCurrentView('DIRECTORY'); setShowProfileMenu(false); }}
                                                                  style={{ width: '100%', padding: '8px', backgroundColor: '#333', border: 'none', color: '#E0B0FF', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}
                                                              >
                                                                  ⬅ Back to Directory
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

{isLoggedIn && (
        <ClassInvitation
            userEmail={userEmail}
            onAccept={(roomId) => {
                setActiveRoomId(roomId);
                setCurrentView('DIRECTORY');
            }}
        />
      )}

         {isLoggedIn ? (
              currentView === 'ADMIN' ? (
                  <AdminDashboard />
              ) :currentView === 'SETTINGS' ? (
                                 <ProfileSettings userEmail={userEmail} onAccountDeleted={handleAccountDeleted} />
                             ):  currentView === 'LIBRARY' ? (
                                                <SnippetLibrary />
                                            ) :currentView === 'INBOX' ? (
                                                                 <DirectMessageUI currentUserEmail={userEmail} />
                                                             ) : currentView === 'SOLO_PRACTICE' ? (
                                                                   <SoloWorkspace />
                                                               ): currentView === 'STUDIO' ? (
                                                                                    <ChallengeStudio />
                                                                                ) :(
                  <>
                      {/* The Switchboard */}
                    <UserList activeRoomId={activeRoomId} onSessionStart={(roomId) => setActiveRoomId(roomId)} onSessionEnd={() => setActiveRoomId(null)} />
                      <hr style={{ margin: '30px 0', borderColor: '#333' }} />

                      {/* Locked-down components */}
                      <VideoCall activeRoomId={activeRoomId} onSessionEnd={() => setActiveRoomId(null)} />
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