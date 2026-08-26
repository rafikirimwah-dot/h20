import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axiosConfig';
import { io } from 'socket.io-client';

const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [selectedSubstation, setSelectedSubstation] = useState(null);
    const [allocationAmount, setAllocationAmount] = useState('');
    const [drawAmountAdmin, setDrawAmountAdmin] = useState('');
    const [selectedTapAdmin, setSelectedTapAdmin] = useState('A');
    const [socket, setSocket] = useState(null);

    // Initialize Socket.io connection
    useEffect(() => {
        const newSocket = io('http://localhost:5001');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to socket server');
            newSocket.emit('join-admin');
        });

        // Listen for real-time updates
        newSocket.on('water-drawn', (data) => {
            console.log('Real-time update:', data);
            fetchDashboardData();
        });

        newSocket.on('water-allocated', (data) => {
            console.log('Water allocated:', data);
            fetchDashboardData();
        });

        return () => newSocket.close();
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/dashboard');
            const data = response.data.data;
            const reservoir = data?.reservoir || {};
            const summary = data?.summary || {};
            const toNumber = (value) => Number(value) || 0;

            setDashboardData({
                reservoir: {
                    total_liters: toNumber(reservoir.total_liters),
                    remaining_liters: toNumber(reservoir.remaining_liters),
                    total_drawn: toNumber(reservoir.total_drawn)
                },
                summary: {
                    total_substations: toNumber(summary.total_substations),
                    active_substations: toNumber(summary.active_substations),
                    total_allocated: toNumber(summary.total_allocated),
                    total_drawn: toNumber(summary.total_drawn)
                },
                substations: Array.isArray(data?.substations)
                    ? data.substations.map((substation) => ({
                        ...substation,
                        allocated_water: toNumber(substation.allocated_water),
                        remaining_water: toNumber(substation.remaining_water),
                        total_drawn: toNumber(substation.total_drawn),
                        tap_a_drawn: toNumber(substation.tap_a_drawn),
                        tap_b_drawn: toNumber(substation.tap_b_drawn)
                    }))
                    : [],
                recent_activity: Array.isArray(data?.recent_activity) ? data.recent_activity : []
            });
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            if (error.response?.status === 403) {
                navigate('/substation-dashboard');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAllocateWater = async (e) => {
        e.preventDefault();
        if (!selectedSubstation || !allocationAmount) return;

        try {
            const response = await api.post(`/substations/${selectedSubstation}/allocate`, {
                amount: parseInt(allocationAmount)
            });
            
            if (response.data.success) {
                alert(`✅ ${response.data.message}`);
                setAllocationAmount('');
                setSelectedSubstation(null);
                fetchDashboardData();
            }
        } catch (error) {
            alert('❌ Failed to allocate water: ' + (error.response?.data?.message || error.message));
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!dashboardData) {
        return <div className="alert alert-danger m-4">Failed to load dashboard data</div>;
    }

    const { reservoir, summary, substations, recent_activity } = dashboardData;
    const percentageUsed = reservoir.total_liters > 0
        ? ((reservoir.total_drawn / reservoir.total_liters) * 100).toFixed(1)
        : '0.0';

    return (
        <div className="container-fluid p-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-primary">💧 Admin Dashboard</h2>
                <div>
                    <span className="badge bg-success me-2">🟢 Online</span>
                    <span className="badge bg-info">👑 {user?.username}</span>
                </div>
            </div>

            {/* Reservoir Status Card */}
            <div className="row mb-4">
                <div className="col-md-12">
                    <div className="card shadow-sm">
                        <div className="card-header" style={{ background: 'linear-gradient(135deg, #0066cc, #003d80)', color: 'white' }}>
                            <h5 className="mb-0">💧 Reservoir Status</h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-3 text-center">
                                    <h3 className="text-primary">{reservoir.total_liters.toLocaleString()} L</h3>
                                    <small className="text-muted">Total Capacity</small>
                                </div>
                                <div className="col-md-3 text-center">
                                    <h3 className="text-success">{reservoir.remaining_liters.toLocaleString()} L</h3>
                                    <small className="text-muted">Remaining</small>
                                </div>
                                <div className="col-md-3 text-center">
                                    <h3 className="text-danger">{reservoir.total_drawn.toLocaleString()} L</h3>
                                    <small className="text-muted">Total Drawn</small>
                                </div>
                                <div className="col-md-3 text-center">
                                    <div className="progress" style={{ height: '25px' }}>
                                        <div 
                                            className="progress-bar" 
                                            role="progressbar" 
                                            style={{ 
                                                width: `${percentageUsed}%`,
                                                background: percentageUsed > 80 ? '#dc3545' : 
                                                           percentageUsed > 50 ? '#ffc107' : '#28a745'
                                            }}
                                        >
                                            {percentageUsed}%
                                        </div>
                                    </div>
                                    <small className="text-muted">Usage</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="card shadow-sm text-center">
                        <div className="card-body">
                            <h5 className="text-primary">{summary.total_substations}</h5>
                            <small className="text-muted">Total Substations</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm text-center">
                        <div className="card-body">
                            <h5 className="text-success">{summary.active_substations}</h5>
                            <small className="text-muted">Active Substations</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm text-center">
                        <div className="card-body">
                            <h5 className="text-info">{summary.total_allocated.toLocaleString()} L</h5>
                            <small className="text-muted">Total Allocated</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm text-center">
                        <div className="card-body">
                            <h5 className="text-warning">{summary.total_drawn.toLocaleString()} L</h5>
                            <small className="text-muted">Total Drawn</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Substations and Allocate Water */}
            <div className="row">
                {/* Substations List */}
                <div className="col-md-8">
                    <div className="card shadow-sm">
                        <div className="card-header" style={{ background: 'linear-gradient(135deg, #0066cc, #003d80)', color: 'white' }}>
                            <h5 className="mb-0">🏗️ Substations Overview</h5>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Substation</th>
                                            <th>Allocated</th>
                                            <th>Remaining</th>
                                            <th>Drawn</th>
                                            <th>Tap A</th>
                                            <th>Tap B</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {substations.map((sub) => (
                                            <tr key={sub.id}>
                                                <td><strong>{sub.name}</strong></td>
                                                <td>{sub.allocated_water.toLocaleString()} L</td>
                                                <td className={sub.remaining_water < 1000 ? 'text-danger fw-bold' : ''}>
                                                    {sub.remaining_water.toLocaleString()} L
                                                </td>
                                                <td>{sub.total_drawn.toLocaleString()} L</td>
                                                <td>{sub.tap_a_drawn.toLocaleString()} L</td>
                                                <td>{sub.tap_b_drawn.toLocaleString()} L</td>
                                                <td>
                                                    <span className={`badge ${sub.remaining_water > 0 ? 'bg-success' : 'bg-danger'}`}>
                                                        {sub.remaining_water > 0 ? '🟢 Active' : '🔴 Empty'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Allocate Water Form */}
                <div className="col-md-4">
                    <div className="card shadow-sm">
                        <div className="card-header" style={{ background: 'linear-gradient(135deg, #28a745, #1e7e34)', color: 'white' }}>
                            <h5 className="mb-0">💧 Allocate Water</h5>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleAllocateWater}>
                                <div className="mb-3">
                                    <label className="form-label">Select Substation</label>
                                    <select 
                                        className="form-select"
                                        value={selectedSubstation || ''}
                                        onChange={(e) => setSelectedSubstation(parseInt(e.target.value))}
                                        required
                                    >
                                        <option value="">Choose...</option>
                                        {substations.map((sub) => (
                                            <option key={sub.id} value={sub.id}>
                                                {sub.name} (Remaining: {sub.remaining_water}L)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Amount (Liters)</label>
                                    <input 
                                        type="number" 
                                        className="form-control"
                                        value={allocationAmount}
                                        onChange={(e) => setAllocationAmount(e.target.value)}
                                        placeholder="Enter amount"
                                        min="1"
                                        max={reservoir.remaining_liters}
                                        required
                                    />
                                    <small className="text-muted">Available: {reservoir.remaining_liters.toLocaleString()} L</small>
                                </div>
                                <button type="submit" className="btn btn-success w-100">
                                    <i className="fas fa-water"></i> Allocate Water
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Admin Draw/Dispense Water Form */}
                    <div className="card shadow-sm mt-3">
                        <div className="card-header" style={{ background: 'linear-gradient(135deg, #ffc107, #ff8c00)', color: 'white' }}>
                            <h5 className="mb-0">🚰 Dispense Water (Admin)</h5>
                        </div>
                        <div className="card-body">
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!selectedSubstation || !drawAmountAdmin) return;

                                try {
                                    const payload = {
                                        substation_id: parseInt(selectedSubstation),
                                        tap_name: selectedTapAdmin,
                                        amount: parseInt(drawAmountAdmin)
                                    };

                                    const response = await api.post('/taps/draw', payload);
                                    if (response.data.success) {
                                        alert(`✅ ${response.data.message}`);
                                        setDrawAmountAdmin('');
                                        fetchDashboardData();
                                    }
                                } catch (error) {
                                    alert('❌ Failed to draw water: ' + (error.response?.data?.message || error.message));
                                }
                            }}>
                                <div className="mb-3">
                                    <label className="form-label">Select Tap</label>
                                    <select className="form-select" value={selectedTapAdmin} onChange={(e) => setSelectedTapAdmin(e.target.value)}>
                                        <option value="A">Tap A</option>
                                        <option value="B">Tap B</option>
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Amount (Liters)</label>
                                    <input type="number" className="form-control" value={drawAmountAdmin} onChange={(e) => setDrawAmountAdmin(e.target.value)} min="1" required />
                                </div>
                                <button type="submit" className="btn btn-warning w-100">🚰 Dispense</button>
                            </form>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="card shadow-sm mt-3">
                        <div className="card-body">
                            <h6 className="text-muted">🔄 Real-time Updates</h6>
                            <div className="small text-success">
                                <i className="fas fa-circle text-success"></i> Connected to server
                            </div>
                            <div className="small text-muted mt-1">
                                Last update: {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="row mt-4">
                <div className="col-md-12">
                    <div className="card shadow-sm">
                        <div className="card-header" style={{ background: 'linear-gradient(135deg, #6c757d, #495057)', color: 'white' }}>
                            <h5 className="mb-0">📋 Recent Activity</h5>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Substation</th>
                                            <th>Tap</th>
                                            <th>Amount</th>
                                            <th>Remaining</th>
                                            <th>Drawn By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recent_activity && recent_activity.length > 0 ? (
                                            recent_activity.map((activity) => (
                                                <tr key={activity.id}>
                                                    <td>{new Date(activity.drawn_at).toLocaleTimeString()}</td>
                                                    <td>{activity.substation_name}</td>
                                                    <td>
                                                        <span className={`badge ${activity.tap_name === 'A' ? 'bg-primary' : 'bg-warning'}`}>
                                                            Tap {activity.tap_name}
                                                        </span>
                                                    </td>
                                                    <td>{activity.water_drawn} L</td>
                                                    <td>{activity.remaining_after} L</td>
                                                    <td>{activity.drawn_by_username || activity.drawn_by}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="text-center text-muted">No activity yet</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;