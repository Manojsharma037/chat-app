// chat-app/client/src/pages/LoginPage.jsx (Updated/Verified)
import React, { useState } from 'react';
import axios from 'axios';

const LoginPage = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Register
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors
        setLoading(true);

        const url = isLogin
            ? 'http://localhost:5000/api/auth/login'
            : 'http://localhost:5000/api/auth/register';
        const payload = isLogin
            ? { email, password }
            : { username, email, password };

        try {
            const res = await axios.post(url, payload);
            console.log('Auth successful from LoginPage:', res.data); // <-- ADD THIS LOG
            onAuthSuccess(res.data); // Pass full user data to App.jsx
        } catch (err) {
            console.error('Auth error from LoginPage:', err.response?.data?.msg || err.message || err);
            setError(err.response?.data?.msg || 'Authentication failed. Please check your credentials or try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
                <h2 className="text-4xl font-extrabold text-center mb-8 text-gray-900">
                    {isLogin ? 'Welcome Back!' : 'Join Chat App'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div>
                            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="username">
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required={!isLogin}
                                placeholder="Choose a username"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Your email address"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Your password"
                        />
                    </div>
                    {error && <p className="text-red-600 text-sm text-center font-medium mt-3">{error}</p>}
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg w-full transition duration-200 shadow-lg transform hover:scale-105"
                        disabled={loading}
                    >
                        {loading ? (isLogin ? 'Logging In...' : 'Registering...') : (isLogin ? 'Login' : 'Register')}
                    </button>
                </form>
                <div className="mt-8 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError(''); // Clear error when switching form
                            setUsername(''); // Clear fields
                            setEmail('');
                            setPassword('');
                        }}
                        className="text-blue-600 hover:text-blue-800 text-md font-medium"
                    >
                        {isLogin ? 'New user? Create an account' : 'Already have an account? Login here'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;