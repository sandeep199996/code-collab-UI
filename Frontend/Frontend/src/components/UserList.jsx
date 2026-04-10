import {useState, useEffect} from 'react';
import axios from 'axios';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('mentor_jwt');
        axios.get('http://localhost:8080/api/users/all' , {
            headers: { 'Authorization': `Bearer ${token}`
                                   }
                               } )
            .then(response => {
                setUsers(response.data);
            })
            .catch(error => {
                console.error('Error fetching users:', error);
                setError('Failed to fetch users. check the backend.');
            });
    }, []);
return (
    <div style={{ padding: '20px' , fontFamily: 'Arial, sans-serif' }}>
        <h2>Mentee & Mentor Directory</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        < div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {users.map(user => (
                <div key={user.id} style={{ border: '1px solid #ccc', borderRadius: '5px', padding: '10px', width: '200px' }}>
                    <h3>{user.name}</h3>
                    <p ><strong>Email:</strong> {user.email}</p>
                    <p><strong>Role:</strong> {user.role}</p>
                </div>
            ))}
        </div>
    </div>
);
};
export default UserList;