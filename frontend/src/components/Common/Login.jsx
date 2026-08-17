import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axiosConfig';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(username, password);
            
            if (result.success) {
                navigate('/dashboard');
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #0066cc, #003d80)'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '40px',
                width: '400px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{ color: '#0066cc', margin: 0, fontSize: '36px' }}>
                        💧 H<span style={{ color: '#003d80' }}>2</span>O
                    </h1>
                    <p style={{ color: '#666', marginTop: '5px' }}>Water Distribution System</p>
                    <p style={{ color: '#999', fontSize: '12px', marginTop: '5px' }}>
                        Frontend: Port 5174 | Backend: Port 5001
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: '#f8d7da',
                        color: '#721c24',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '16px'
                            }}
                            placeholder="Enter username"
                            disabled={loading}
                        />
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '16px'
                            }}
                            placeholder="Enter password"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'linear-gradient(135deg, #0066cc, #003d80)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '25px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                {/* Public Delivery Order Form */}
                <div style={{ marginTop: '30px' }}>
                    <h4 style={{ marginBottom: '10px' }}>📦 Place Delivery Order (No login required)</h4>
                    <DeliveryForm />
                </div>
            </div>
        </div>
    );
};

export default Login;

const DeliveryForm = () => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [liters, setLiters] = useState(10);
    const [datetime, setDatetime] = useState('');
    const [message, setMessage] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const validatePhone = (p) => {
        return /^\+?[0-9\- ]{7,15}$/.test(p);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        if (!name || !phone || !address || !liters) {
            setMessage({ type: 'danger', text: 'Please fill all fields' });
            return;
        }
        if (!validatePhone(phone)) {
            setMessage({ type: 'danger', text: 'Please enter a valid phone number' });
            return;
        }
        if (liters < 10 || liters > 5000) {
            setMessage({ type: 'danger', text: 'Liters must be between 10 and 5000' });
            return;
        }

        try {
            setSubmitting(true);

            // optional: check reservoir quickly
            const d = datetime ? new Date(datetime) : null;
            const delivery_date = d ? d.toISOString().split('T')[0] : null;
            const delivery_time = d ? d.toTimeString().split(' ')[0] : null;

            const payload = {
                customer_name: name,
                customer_phone: phone,
                delivery_address: address,
                liters_requested: parseInt(liters),
                delivery_date,
                delivery_time
            };

            const res = await api.post('/delivery', payload);
            if (res.data.success) {
                setMessage({ type: 'success', text: 'Order placed successfully' });
                setName(''); setPhone(''); setAddress(''); setLiters(10); setDatetime('');
            } else {
                setMessage({ type: 'danger', text: res.data.message || 'Failed to place order' });
            }
        } catch (err) {
            setMessage({ type: 'danger', text: err.response?.data?.message || err.message });
        } finally {
            setSubmitting(false);
            setTimeout(() => setMessage(null), 4000);
        }
    };

    return (
        <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
            {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gap: '10px' }}>
                    <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="form-control" />
                    <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-control" />
                    <input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="form-control" />
                    <input type="number" min="10" max="5000" value={liters} onChange={(e) => setLiters(e.target.value)} className="form-control" />
                    <input type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} className="form-control" />
                    <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Placing...' : 'Place Order'}</button>
                </div>
            </form>
        </div>
    );
};