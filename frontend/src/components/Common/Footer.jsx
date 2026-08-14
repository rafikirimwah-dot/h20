import React from 'react';

const Footer = () => {
    return (
        <footer className="text-center py-3 mt-auto" style={{ 
            background: 'linear-gradient(135deg, #003d80, #0066cc)',
            color: 'white'
        }}>
            <div className="container">
                <p className="mb-0">© 2024 H2O Water Distribution System. All rights reserved.</p>
                <small className="text-white-50">Powered by Node.js + React</small>
            </div>
        </footer>
    );
};

export default Footer;