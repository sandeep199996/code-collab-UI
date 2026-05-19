import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('mentor_jwt');

    const fetchStats = () => {
        setLoading(true);
        axios.get('http://localhost:8080/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => {
            setStats(response.data);
            setError(null);
        })
        .catch(err => {
            if (err.response && err.response.status === 403) {
                setError("ACCESS DENIED: Administrator privileges required.");
            } else {
                setError("SYSTEM FAILURE: Could not reach telemetry server.");
            }
        })
        .finally(() => {
            setLoading(false);
        });
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

    if (loading && !stats) return <h2 style={{ color: '#40E0D0', textAlign: 'center' }}>Connecting to Mainframe...</h2>;

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