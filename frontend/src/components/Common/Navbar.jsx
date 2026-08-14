import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = ({ onMenuToggle }) => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();

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