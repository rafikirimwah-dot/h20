import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axiosConfig';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        if (token && savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
            } catch (e) {
                logout();
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            console.log('🔑 Attempting login for:', username);
            
            const response = await api.post('/auth/login', { 
                username, 
                password 
            });
            
            console.log('🔑 Login response:', response.data);
            
            if (response.data.success) {
                const { token, user } = response.data.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                setUser(user);
                return { success: true };
            }
            return { success: false, error: 'Login failed' };
        } catch (error) {
            console.error('🔑 Login error:', error);
            console.error('🔑 Error response:', error.response?.data);
            console.error('🔑 Error status:', error.response?.status);
            
            let errorMessage = 'Login failed';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Cannot connect to the backend service. Check the deployed backend URL and CORS settings.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Invalid username or password';
            } else if (error.response?.status === 500) {
                errorMessage = 'Server error. Please try again later.';
            }
            
            return { 
                success: false, 
                error: errorMessage 
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const isAdmin = () => user?.role === 'admin';
    const isSubstationAdmin = () => user?.role === 'substation_admin';
    const getSubstationId = () => user?.substation_id;

    const value = {
        user,
        login,
        logout,
        isAdmin,
        isSubstationAdmin,
        getSubstationId,
        loading,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};