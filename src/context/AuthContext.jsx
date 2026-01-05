import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    // Mock Login Function
    const login = async (role) => {
        setLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        if (role === 'admin') {
            setUser({
                uid: 'admin-123',
                name: 'FedEx Super Admin',
                email: 'admin@fedex.com',
                role: 'admin',
                agencyId: null
            });
        } else {
            setUser({
                uid: 'agency-abc',
                name: 'Alpha Collections Agent',
                email: 'agent@agency.com',
                role: 'agency',
                agencyId: 'Agency A'
            });
        }
        setLoading(false);
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
