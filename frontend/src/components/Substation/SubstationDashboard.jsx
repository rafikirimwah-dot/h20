import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axiosConfig';
import { io } from 'socket.io-client';

const SubstationDashboard = () => {
    const { user, getSubstationId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [drawAmount, setDrawAmount] = useState('');
    const [selectedTap, setSelectedTap] = useState('A');
    const [socket, setSocket] = useState(null);
    const [message, setMessage] = useState(null);
    const [assignedOrders, setAssignedOrders] = useState([]);

    const substationId = getSubstationId();

    useEffect(() => {
        const newSocket = io('http://localhost:5001');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to socket server');
            if (substationId) {
                newSocket.emit('join-substation', substationId);
            }
        });

        newSocket.on('water-drawn', (data) => {
            console.log('Real-time update:', data);
            fetchDashboardData();
        });

        newSocket.on('water-allocated', (data) => {
            console.log('Water allocated:', data);
            fetchDashboardData();
        });

        newSocket.on('delivery-assigned', (order) => {
            // if assigned to this substation, refresh orders
            if (order.assigned_to === substationId) fetchAssignedOrders();
        });

        newSocket.on('delivery-delivered', (order) => {
            if (order.assigned_to === substationId) fetchAssignedOrders();
        });

        return () => newSocket.close();
    }, [substationId]);

    useEffect(() => {
        if (substationId) {
            fetchDashboardData();
        } else {
            console.error('No substation ID found for user:', user);
        }
    }, [substationId, user]);

    useEffect(() => {
        if (substationId) fetchAssignedOrders();
    }, [substationId]);

    const fetchAssignedOrders = async () => {
        try {
            const res = await api.get(`/delivery/substation/${substationId}`);
            setAssignedOrders(res.data.data || []);
        } catch (err) {
            console.error('Error fetching assigned orders:', err);
        }
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/dashboard/substation/${substationId}`);
            setData(response.data.data);
        } catch (error) {
            console.error('Error fetching substation data:', error);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleDrawWater = async (e) => {
        e.preventDefault();
        
        const amount = parseInt(drawAmount);
        if (!amount || amount <= 0) {
            setMessage({ type: 'danger', text: 'Please enter a valid amount greater than 0' });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        if (data && data.substation && data.substation.remaining_water < amount) {
            setMessage({ 
                type: 'danger', 
                text: `❌ Not enough water! Only ${data.substation.remaining_water} L available` 
            });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        try {
            const payload = {
                substation_id: parseInt(substationId),
                tap_name: selectedTap,
                amount: amount
            };

            console.log('Sending draw request:', payload);

            const response = await api.post('/taps/draw', payload);
            
            if (response.data.success) {
                setMessage({ type: 'success', text: `✅ ${response.data.message}` });
                setDrawAmount('');
                fetchDashboardData();
                setTimeout(() => setMessage(null), 3000);
            }
        } catch (error) {
            console.error('Draw error:', error.response?.data || error.message);
            const errorMsg = error.response?.data?.message || error.message;
            setMessage({ type: 'danger', text: `❌ ${errorMsg}` });
            setTimeout(() => setMessage(null), 5000);
        }
    };

    if (!substationId) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger">
                    <h4>⚠️ No Substation Assigned</h4>
                    <p>Your account does not have a substation assigned. Please contact the administrator.</p>
                    <p>User: {user?.username}, Role: {user?.role}</p>
                </div>
            </div>
        );
    }

    // Notification panel for assigned orders
    const AssignedOrdersPanel = () => (
        <div className="card mb-4">
            <div className="card-header">📦 Assigned Delivery Orders</div>
            <div className="card-body">
                {assignedOrders.length === 0 ? (
                    <div className="text-muted">No assigned orders</div>
                ) : (
                    assignedOrders.map(o => (
                        <div key={o.id} className="mb-3 border-bottom pb-2">
                            <div><strong>{o.customer_name}</strong> — {o.liters_requested} L</div>
                            <div className="small text-muted">{o.delivery_address}</div>
                            <div className="mt-2">
                                <button className="btn btn-sm btn-success me-2" onClick={async () => {
                                    try {
                                        await api.post(`/delivery/${o.id}/deliver`);
                                        fetchAssignedOrders();
                                        fetchDashboardData();
                                    } catch (err) {
                                        alert(err.response?.data?.message || err.message);
                                    }
                                }}>Mark Delivered</button>
                                <small className="text-muted">Requested: {o.delivery_date || 'N/A'} {o.delivery_time || ''}</small>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning">
                    <h4>⚠️ No Data Available</h4>
                    <p>Could not load substation data. Please try refreshing the page.</p>
                    <button className="btn btn-primary" onClick={fetchDashboardData}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const { substation, reservoir, tap_summary, recent_activity } = data;
    const percentageUsed = substation.allocated_water > 0 
        ? ((substation.total_drawn / substation.allocated_water) * 100).toFixed(1) 
        : 0;

    return (
        <div className="container-fluid p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-primary">💧 {substation?.name || 'Substation'}</h2>
                <div>
                    <span className="badge bg-success me-2">🟢 Online</span>
                    <span className="badge bg-info">🚛 {user?.username}</span>
                </div>
            </div>

            {message && (
                <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
                    {message.text}
                    <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
                </div>
            )}

            <AssignedOrdersPanel />

            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="card shadow-sm text-center">
                        <div className="card-body">
                            <h5 className="text-primary">{substation?.allocated_water?.toLocaleString() || 0} L</h5>
                            <small className="text-muted">Allocated Water</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm text-center">
                        <div className="card-body">
                            <h5 className={substation?.remaining_water < 1000 ? 'text-danger' : 'text-success'}>
                                {substation?.remaining_water?.toLocaleString() || 0} L
                            </h5>
                            <small className="text-muted">Remaining Water</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm text-center">
                        <div className="card-body">
                            <h5 className="text-warning">{substation?.total_drawn?.toLocaleString() || 0} L</h5>
                            <small className="text-muted">Total Drawn</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm text-center">
                        <div className="card-body">
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

            <div className="card shadow-sm mb-4">
                <div className="card-header" style={{ background: 'linear-gradient(135deg, #17a2b8, #0d6efd)', color: 'white' }}>
                    <h5 className="mb-0">🏊 System Reservoir</h5>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-4 text-center">
                            <h5>{reservoir?.total_liters?.toLocaleString() || 0} L</h5>
                            <small className="text-muted">Total</small>
                        </div>
                        <div className="col-md-4 text-center">
                            <h5 className="text-success">{reservoir?.remaining_liters?.toLocaleString() || 0} L</h5>
                            <small className="text-muted">Remaining</small>
                        </div>
                        <div className="col-md-4 text-center">
                            <h5 className="text-danger">{reservoir?.total_drawn?.toLocaleString() || 0} L</h5>
                            <small className="text-muted">Drawn</small>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-md-5">
                    <div className="card shadow-sm">
                        <div className="card-header" style={{ background: 'linear-gradient(135deg, #28a745, #1e7e34)', color: 'white' }}>
                            <h5 className="mb-0">🚰 Draw Water</h5>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleDrawWater}>
                                <div className="mb-3">
                                    <label className="form-label">Select Tap</label>
                                    <div className="btn-group w-100" role="group">
                                        <button 
                                            type="button" 
                                            className={`btn ${selectedTap === 'A' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => setSelectedTap('A')}
                                        >
                                            Tap A
                                        </button>
                                        <button 
                                            type="button" 
                                            className={`btn ${selectedTap === 'B' ? 'btn-warning' : 'btn-outline-warning'}`}
                                            onClick={() => setSelectedTap('B')}
                                        >
                                            Tap B
                                        </button>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Amount (Liters)</label>
                                    <input 
                                        type="number" 
                                        className="form-control"
                                        value={drawAmount}
                                        onChange={(e) => setDrawAmount(e.target.value)}
                                        placeholder="Enter amount"
                                        min="1"
                                        max={substation?.remaining_water || 0}
                                        required
                                    />
                                    <small className="text-muted">
                                        Available: {substation?.remaining_water?.toLocaleString() || 0} L
                                    </small>
                                </div>
                                <button 
                                    type="submit" 
                                    className="btn btn-success w-100"
                                    disabled={!substation || substation.remaining_water === 0}
                                >
                                    <i className="fas fa-water"></i> Draw Water from Tap {selectedTap}
                                </button>
                                {substation && substation.remaining_water === 0 && (
                                    <div className="text-danger text-center mt-2">
                                        ⚠️ No water remaining in this substation
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>

                <div className="col-md-7">
                    <div className="card shadow-sm">
                        <div className="card-header" style={{ background: 'linear-gradient(135deg, #6c757d, #495057)', color: 'white' }}>
                            <h5 className="mb-0">📊 Tap Usage Summary</h5>
                        </div>
                        <div className="card-body">
                            {tap_summary && tap_summary.length > 0 ? (
                                <div className="row">
                                    {tap_summary.map((tap) => (
                                        <div className="col-md-6" key={tap.tap_name}>
                                            <div className="card mb-2">
                                                <div className="card-body">
                                                    <h6 className={`text-${tap.tap_name === 'A' ? 'primary' : 'warning'}`}>
                                                        Tap {tap.tap_name}
                                                    </h6>
                                                    <div className="row">
                                                        <div className="col-6">
                                                            <small className="text-muted">Total Drawn</small>
                                                            <div className="fw-bold">{tap.total_drawn || 0} L</div>
                                                        </div>
                                                        <div className="col-6">
                                                            <small className="text-muted">Transactions</small>
                                                            <div className="fw-bold">{tap.total_transactions || 0}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted">
                                    <p>No tap usage recorded yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mt-4">
                <div className="col-md-12">
                    <div className="card shadow-sm">
                        <div className="card-header" style={{ background: 'linear-gradient(135deg, #6c757d, #495057)', color: 'white' }}>
                            <h5 className="mb-0">📋 Recent Tap Activity</h5>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Tap</th>
                                            <th>Amount</th>
                                            <th>Remaining After</th>
                                            <th>Drawn By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recent_activity && recent_activity.length > 0 ? (
                                            recent_activity.map((activity) => (
                                                <tr key={activity.id}>
                                                    <td>{new Date(activity.drawn_at).toLocaleTimeString()}</td>
                                                    <td>
                                                        <span className={`badge ${activity.tap_name === 'A' ? 'bg-primary' : 'bg-warning'}`}>
                                                            Tap {activity.tap_name}
                                                        </span>
                                                    </td>
                                                    <td>{activity.water_drawn} L</td>
                                                    <td>{activity.remaining_after} L</td>
                                                    <td>{activity.drawn_by || 'N/A'}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="text-center text-muted">No activity yet</td>
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

export default SubstationDashboard;