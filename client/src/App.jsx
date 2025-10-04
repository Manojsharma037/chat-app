// chat-app/client/src/App.jsx (Updated/Verified)
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';

const App = () => {
    // user state now holds the full user object from login/register (including _id, username, email)
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Set up Axios interceptor to add JWT token to all requests
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        // Function to load user data if a token exists
        const loadUser = async () => {
            if (token) {
                try {
                    // Call the new /api/auth/me endpoint to get user details
                    const res = await axios.get('http://localhost:5000/api/auth/me');
                    setUser(res.data); // Set user data (including email)
                } catch (err) {
                    console.error('Token invalid or expired:', err.response?.data?.msg || err.message);
                    localStorage.removeItem('token'); // Clear invalid token
                    axios.defaults.headers.common['Authorization'] = ''; // Clear header
                    setUser(null);
                }
            }
            setLoadingAuth(false);
        };

        loadUser();

        // Cleanup interceptor if component unmounts (though for App.jsx it's less critical)
        return () => {
            axios.defaults.headers.common['Authorization'] = '';
        };
    }, []); // Empty dependency array: runs only once on mount

    // Handler for successful login/registration
    const handleAuthSuccess = (userData) => {
        console.log('handleAuthSuccess called with:', userData); // <-- ADD THIS LOG
        setUser(userData); // userData includes _id, username, email, and token
        localStorage.setItem('token', userData.token); // Store token
        axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`; // Set header
    };

    // Handler for logout
    const handleLogout = () => {
        localStorage.removeItem('token');
        axios.defaults.headers.common['Authorization'] = ''; // Clear header
        setUser(null);
    };

    if (loadingAuth) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 text-xl font-semibold">
                Loading authentication...
            </div>
        );
    }

    return (
        <div className="App">
            {user ? ( // This is the conditional rendering logic
                <ChatPage user={user} onLogout={handleLogout} />
            ) : (
                <LoginPage onAuthSuccess={handleAuthSuccess} />
            )}
        </div>
    );
};

export default App;