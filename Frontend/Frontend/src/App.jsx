import { useState } from 'react'
import UserList from './components/UserList'
import Login from './components/Login'

import './App.css'

function App() {
// We check the backpack immediately. If a token is there, they are logged in!
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('mentor_jwt'));

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
        </>
        ) : (
        <Login onLoginSuccess={() => setIsLoggedIn(true)} />
            )}
      </div>

  );
}

export default App
