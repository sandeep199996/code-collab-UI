import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const [classroomTopic, setClassroomTopic] = useState('');
        const [mentorEmail, setMentorEmail] = useState('');
        const [menteeEmails, setMenteeEmails] = useState('');
        const [isLaunching, setIsLaunching] = useState(false);
const [activeRooms, setActiveRooms] = useState([]);

    const token = localStorage.getItem('mentor_jwt');

    const handleLaunchClassroom = async () => {
            if (!classroomTopic || !mentorEmail || !menteeEmails) {
                alert("Please fill out all classroom fields.");
                return;
            }

            setIsLaunching(true);
            const menteeList = menteeEmails.split(',').map(email => email.trim());

            try {
                const response = await axios.post('http://localhost:8080/api/admin/classroom/launch', {
                    topic: classroomTopic,
                    mentorEmail: mentorEmail,
                    menteeEmails: menteeList
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                alert(`Success! ${response.data.message} (Room: ${response.data.roomId})`);
                setClassroomTopic('');
                setMentorEmail('');
                setMenteeEmails('');
                fetchStats(); // Instantly refresh to show the new room
            } catch (err) {
                alert("Launch failed: " + (err.response?.data?.error || err.message));
            } finally {
                setIsLaunching(false);
            }
        };
    const handleTerminateRoom = async (roomId) => {
            if (!window.confirm("Are you sure you want to terminate this session? Everyone will be kicked out.")) return;

            try {
                await axios.post(`http://localhost:8080/api/admin/classroom/terminate/${roomId}`, {}, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                fetchStats(); // Refresh the list
            } catch (err) {
                alert("Failed to terminate room: " + err.message);
            }
        };


const fetchStats = async () => {
        setLoading(true);

        try {
            // 1. Fetch Telemetry Stats (Wait for it to finish)
            const statsResponse = await axios.get('http://localhost:8080/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setStats(statsResponse.data);
            setError(null);

            // 2. Fetch Active Rooms (Wait for it to finish)
            const roomsResponse = await axios.get('http://localhost:8080/api/admin/classroom/active', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setActiveRooms(Array.isArray(roomsResponse.data) ? roomsResponse.data : []);

        } catch (err) {
            if (err.response && err.response.status === 403) {
                setError("ACCESS DENIED: Administrator privileges required.");
            } else {
                setError("SYSTEM FAILURE: Could not reach telemetry server.");
            }
            console.error(err);
        } finally {
            // 3. ONLY turn off the loading screen after we have the data!
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Auto-refresh the dashboard every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [token]);

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#050100', border: '1px solid #FF073A', borderRadius: '8px', margin: '20px' }}>
                <h2 style={{ color: '#FF073A', fontSize: '28px' }}>⚠️ SECURITY ALERT</h2>
                <p style={{ color: 'white', fontFamily: 'monospace' }}>{error}</p>
            </div>
        );
    }

if (!stats) return <h2 style={{ color: '#40E0D0', textAlign: 'center' }}>Connecting to Mainframe...</h2>;
    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
                <h2 style={{ color: '#8F00FF', margin: 0 }}>System Telemetry & Control</h2>
                <button
                    onClick={fetchStats}
                    style={{ padding: '8px 15px', backgroundColor: 'transparent', color: '#39FF14', border: '1px solid #39FF14', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    ↻ Force Sync
                </button>
            </div>

            {/* The Metric Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>

                <StatCard title="Total Registered Accounts" value={stats.totalUsers} color="#40E0D0" />
                <StatCard title="Registered Mentors" value={stats.totalMentors} color="#E0B0FF" />
                <StatCard title="Registered Mentees" value={stats.totalMentees} color="#E0B0FF" />
                <StatCard title="Active WebSocket Connections" value={stats.activeWebSockets} color="#39FF14" />
                <StatCard title="Secure P2P Tunnels" value={stats.liveEncryptedTunnels} color="#39FF14" />

                <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: stats.serverStatus === 'OPERATIONAL' ? '0 0 15px rgba(57, 255, 20, 0.1)' : '0 0 15px rgba(255, 7, 58, 0.2)' }}>
                    <h3 style={{ color: 'gray', margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase' }}>Server Status</h3>
                    <p style={{ color: stats.serverStatus === 'OPERATIONAL' ? '#39FF14' : '#FF073A', fontSize: '24px', margin: 0, fontWeight: 'bold' }}>
                        {stats.serverStatus}
                    </p>
                </div>
            </div>

<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* THE CLASSROOM ORCHESTRATOR PANEL */}
                            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#0a0a0a', border: '1px solid #40E0D0', borderRadius: '8px' }}>
                                <h3 style={{ color: '#40E0D0', marginTop: 0 }}>🚀 Launch Classroom (1-to-N)</h3>
                                <p style={{ color: 'gray', fontSize: '14px' }}>Force-sync a Mentor and multiple Mentees into a synchronized STOMP workspace.</p>

                                <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                                    <input
                                        type="text"
                                        placeholder="Classroom Topic (e.g., Advanced React Hooks)"
                                        value={classroomTopic}
                                        onChange={(e) => setClassroomTopic(e.target.value)}
                                        style={{ padding: '10px', backgroundColor: 'black', color: 'white', border: '1px solid #333', borderRadius: '4px' }}
                                    />
                                    <input
                                        type="email"
                                        placeholder="Mentor Email"
                                        value={mentorEmail}
                                        onChange={(e) => setMentorEmail(e.target.value)}
                                        style={{ padding: '10px', backgroundColor: 'black', color: 'white', border: '1px solid #333', borderRadius: '4px' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Mentee Emails (comma separated)"
                                        value={menteeEmails}
                                        onChange={(e) => setMenteeEmails(e.target.value)}
                                        style={{ padding: '10px', backgroundColor: 'black', color: 'white', border: '1px solid #333', borderRadius: '4px' }}
                                    />
                                    <button
                                        onClick={handleLaunchClassroom}
                                        disabled={isLaunching}
                                        style={{ padding: '12px', backgroundColor: '#40E0D0', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: isLaunching ? 'wait' : 'pointer' }}
                                    >
                                        {isLaunching ? 'BROADCASTING...' : 'LAUNCH SESSION'}
                                    </button>
                                </div>
                                </div>

                                {/* THE ACTIVE ROOMS PANEL */}
                                                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#0a0a0a', border: '1px solid #FF073A', borderRadius: '8px' }}>
                                                    <h3 style={{ color: '#FF073A', marginTop: 0 }}>🔥 Live Classrooms</h3>
                                                    <p style={{ color: 'gray', fontSize: '14px' }}>Monitor and terminate ongoing group sessions.</p>

                                                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        {activeRooms.length === 0 ? (
                                                            <p style={{ color: '#555', fontStyle: 'italic', textAlign: 'center' }}>No active classrooms.</p>
                                                        ) : (
                                                            activeRooms.map((room, index) => (
                                                                <div key={index} style={{ backgroundColor: 'black', border: '1px solid #333', padding: '15px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <div>
                                                                        <h4 style={{ margin: '0 0 5px 0', color: 'white' }}>{room.topic}</h4>
                                                                        <p style={{ margin: 0, color: 'gray', fontSize: '12px' }}>Host: <span style={{color: '#40E0D0'}}>{room.mentor}</span></p>
                                                                        <p style={{ margin: 0, color: 'gray', fontSize: '12px' }}>Total Users: {room.participants}</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleTerminateRoom(room.roomId)}
                                                                        style={{ padding: '8px 15px', backgroundColor: 'transparent', color: '#FF073A', border: '1px solid #FF073A', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                                    >
                                                                        Terminate
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                            </div>
                             </div>

    );
};

// A quick helper component for the grid
const StatCard = ({ title, value, color }) => (
    <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h3 style={{ color: 'gray', margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', textAlign: 'center' }}>{title}</h3>
        <p style={{ color: color, fontSize: '36px', margin: 0, fontWeight: 'bold' }}>{value}</p>
    </div>
);

export default AdminDashboard;