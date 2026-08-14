import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

// Import Components
import Login from './components/Common/Login';
import AdminDashboard from './components/Admin/AdminDashboard';
import SubstationDashboard from './components/Substation/SubstationDashboard';
import Navbar from './components/Common/Navbar';
import Sidebar from './components/Common/Sidebar';
import Footer from './components/Common/Footer';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false, substationOnly = false }) => {
    const { isAuthenticated, isAdmin, isSubstationAdmin, loading } = useAuth();
    
    if (loading) {
        return <div className="text-center mt-5">Loading...</div>;
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    
    if (adminOnly && !isAdmin()) {
        return <Navigate to="/substation-dashboard" />;
    }

    if (substationOnly && isAdmin()) {
        return <Navigate to="/dashboard" />;
    }

    if (substationOnly && !isSubstationAdmin()) {
        return <Navigate to="/dashboard" />;
    }
    
    return children;
};

function AppContent() {
    const { isAuthenticated } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const closeSidebar = () => setSidebarOpen(false);
    const toggleSidebar = () => setSidebarOpen((state) => !state);

    return (
        <Router>
            <div className="app-shell">
                {isAuthenticated && <Navbar onMenuToggle={toggleSidebar} />}
                <div className="app-body">
                    {isAuthenticated && <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />}
                    {isAuthenticated && (
                        <div className={`sidebar-backdrop ${sidebarOpen ? 'active' : ''}`} onClick={closeSidebar} />
                    )}
                    <main className="app-main">
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
                            <Route 
                                path="/dashboard" 
                                element={
                                    <ProtectedRoute adminOnly>
                                        <AdminDashboard />
                                    </ProtectedRoute>
                                } 
                            />
                            <Route 
                                path="/substation-dashboard" 
                                element={
                                    <ProtectedRoute substationOnly>
                                        <SubstationDashboard />
                                    </ProtectedRoute>
                                } 
                            />
                            <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
                        </Routes>
                    </main>
                </div>
                {isAuthenticated && <Footer />}
            </div>
        </Router>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;