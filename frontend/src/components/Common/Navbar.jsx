import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axiosConfig';
import { io } from 'socket.io-client';

const Navbar = ({ onMenuToggle }) => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [pendingCount, setPendingCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [pendingOrders, setPendingOrders] = useState([]);

    useEffect(() => {
        let socket;
        const fetchPending = async () => {
            try {
                const res = await api.get('/delivery/pending');
                setPendingOrders(res.data.data || []);
                setPendingCount((res.data.data || []).length);
            } catch (err) {
                // ignore
            }
        };

        if (isAdmin()) {
            fetchPending();
            socket = io('http://localhost:5001');
            socket.on('connect', () => socket.emit('join-admin'));
            socket.on('new-delivery-order', (order) => {
                setPendingOrders((s) => [order, ...s]);
                setPendingCount((c) => c + 1);
            });
            socket.on('delivery-updated', () => {
                fetchPending();
            });
        }

        return () => socket && socket.close();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar navbar-expand-lg" style={{ background: 'linear-gradient(135deg, #0066cc, #003d80)' }}>
            <div className="container-fluid">
                <button type="button" className="btn btn-link navbar-menu-button d-lg-none text-white me-2" onClick={onMenuToggle} aria-label="Open menu">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <Link className="navbar-brand text-white fw-bold" to="/dashboard">
                    💧 H<span style={{ fontSize: '14px' }}>2</span>O
                </Link>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav me-auto">
                        {isAdmin() ? (
                            <li className="nav-item">
                                <Link className="nav-link text-white" to="/dashboard">Admin Dashboard</Link>
                            </li>
                        ) : (
                            <li className="nav-item">
                                <Link className="nav-link text-white" to="/substation-dashboard">Substation Dashboard</Link>
                            </li>
                        )}
                    </ul>
                    <ul className="navbar-nav">
                        {isAdmin() && (
                            <li className="nav-item position-relative me-2">
                                <button className="btn btn-link text-white position-relative" onClick={() => setShowDropdown((s) => !s)} aria-label="Notifications">
                                    <i className="fas fa-bell"></i>
                                    {pendingCount > 0 && (
                                        <span className="badge bg-danger position-absolute" style={{ top: 0, right: 0 }}>{pendingCount}</span>
                                    )}
                                </button>

                                {showDropdown && (
                                    <div className="card" style={{ position: 'absolute', right: 0, width: '360px', zIndex: 2000 }}>
                                        <div className="card-body">
                                            <h6>Pending Delivery Orders</h6>
                                            {pendingOrders.length === 0 ? <div className="text-muted">No pending orders</div> : (
                                                pendingOrders.map(order => (
                                                    <div key={order.id} className="border-bottom py-2">
                                                        <div><strong>{order.customer_name}</strong> — {order.liters_requested} L</div>
                                                        <div className="small text-muted">{order.delivery_address}</div>
                                                        <div className="d-flex mt-2">
                                                            <select className="form-select form-select-sm me-2" defaultValue="" id={`assign-${order.id}`}>
                                                                <option value="">Assign to...</option>
                                                                <option value="1">Maji 1</option>
                                                                <option value="2">Maji 2</option>
                                                                <option value="3">Maji 3</option>
                                                                <option value="4">Maji 4</option>
                                                                <option value="5">Maji 5</option>
                                                                <option value="6">Maji 6</option>
                                                            </select>
                                                            <button className="btn btn-sm btn-primary" onClick={async () => {
                                                                const el = document.getElementById(`assign-${order.id}`);
                                                                const subId = parseInt(el.value);
                                                                if (!subId) return alert('Select a substation');
                                                                try {
                                                                    await api.post(`/delivery/${order.id}/assign`, { substation_id: subId });
                                                                    setPendingOrders((s) => s.filter(o => o.id !== order.id));
                                                                    setPendingCount((c) => Math.max(0, c - 1));
                                                                } catch (err) {
                                                                    alert(err.response?.data?.message || err.message);
                                                                }
                                                            }}>Assign</button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </li>
                        )}
                        <li className="nav-item">
                            <span className="nav-link text-white-50">
                                {isAdmin() ? '👑 Admin' : `💧 ${user?.substation_name || user?.username}`}
                            </span>
                        </li>
                        <li className="nav-item">
                            <button 
                                className="btn btn-outline-light btn-sm"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;