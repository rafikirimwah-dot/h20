import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
    const { isAdmin, isSubstationAdmin, user } = useAuth();
    const location = useLocation();
    const activePath = location.pathname;

    const navItems = [];

    if (isAdmin()) {
        navItems.push({ to: '/dashboard', label: 'Admin Dashboard' });
    }

    if (isSubstationAdmin()) {
        navItems.push({ to: '/substation-dashboard', label: 'Substation Dashboard' });
    }

    return (
        <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-inner">
                <div className="sidebar-brand mb-4">
                    <div className="sidebar-brand-header">
                        <Link className="sidebar-logo" to={navItems[0]?.to || '/'} onClick={onClose}>
                            💧 H2O
                        </Link>
                        <button className="btn-close sidebar-close-btn d-lg-none" type="button" onClick={onClose} aria-label="Close menu" />
                    </div>
                    <p className="sidebar-role">
                        {isAdmin() ? 'Administrator' : isSubstationAdmin() ? 'Substation Admin' : 'Guest'}
                    </p>
                </div>

                <nav className="sidebar-menu">
                    {navItems.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`sidebar-link ${activePath === item.to ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    {user?.username && <span>Signed in as <strong>{user.username}</strong></span>}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
