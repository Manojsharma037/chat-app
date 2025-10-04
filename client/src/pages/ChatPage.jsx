import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { FiSend, FiLogOut, FiUser } from 'react-icons/fi';
import ThemeToggle from "../components/ThemeToggle";

const ChatPage = ({ user, onLogout }) => {
    const [allChatMessages, setAllChatMessages] = useState({});
    const [messageInput, setMessageInput] = useState('');
    const [typingStatus, setTypingStatus] = useState('');
    const [recipient, setRecipient] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [showSidebar, setShowSidebar] = useState(false); 

    const socketRef = useRef(null);
    const chatBottomRef = useRef(null);
    const userRef = useRef(user);
    const recipientRef = useRef(recipient);

    useEffect(() => {
        userRef.current = user;
        recipientRef.current = recipient;
    }, [user, recipient]);

    const getAvatarColor = useCallback((username) => {
        if (!username) return 'bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-gray-100';
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colors = [
            'bg-red-200 text-red-800 dark:bg-red-700 dark:text-red-100',
            'bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-100',
            'bg-green-200 text-green-800 dark:bg-green-700 dark:text-green-100',
            'bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100',
            'bg-purple-200 text-purple-800 dark:bg-purple-700 dark:text-purple-100',
            'bg-indigo-200 text-indigo-800 dark:bg-indigo-700 dark:text-indigo-100',
            'bg-pink-200 text-pink-800 dark:bg-pink-700 dark:text-pink-100',
            'bg-teal-200 text-teal-800 dark:bg-teal-700 dark:text-teal-100',
        ];
        return colors[Math.abs(hash) % colors.length];
    }, []);

    const getInitials = useCallback((username) => {
        if (!username) return '??';
        return username.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }, []);

    const calculateChatRoomId = useCallback((u1, u2) => {
        if (!u1 || !u2) return null;
        const id1 = (u1._id && u1._id.toString) ? u1._id.toString() : String(u1._id);
        const id2 = (u2._id && u2._id.toString) ? u2._id.toString() : String(u2._id);
        const sortedIds = [id1, id2].sort();
        return sortedIds.join('-');
    }, []);

    // --- AI Integration Helper (No changes needed here, it was correct) ---
    const sendToAi = async (prompt) => {
  try {
    const res = await fetch("http://localhost:5000/api/gemini/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("AI ERROR RESPONSE:", err);
      throw new Error(err.error || "AI request failed");
    }

    const data = await res.json();
    console.log("AI RAW RESPONSE:", data);

    return data.reply || "No response from AI.";
  } catch (error) {
    console.error("Frontend AI error:", error);
    return "⚠️ AI failed. Details: " + error.message;
  }
};



    // --- SOCKET.IO INITIALIZATION ---
    useEffect(() => {
        if (!userRef.current || socketRef.current) return;
        const socket = io('http://localhost:5000', {
            query: { userId: userRef.current._id },
        });
        socketRef.current = socket;

        socket.on('connect', () => console.log(`[CLIENT SOCKET] Connected: ${socket.id}`));
        socket.on('disconnect', () => console.log('[CLIENT SOCKET] Disconnected.'));
        socket.on('connect_error', (err) => console.error('[CLIENT SOCKET ERROR] Connection error:', err));

        socket.on('onlineUsers', (users) => {
            setOnlineUsers(users);
        });

        socket.on('receive_message', (data) => {
            let chatRoomId = data.chatRoomId;
            if (!chatRoomId && data.sender && data.recipient) {
                try {
                    const senderId = (data.sender._id && data.sender._id.toString) ? data.sender._id.toString() : String(data.sender._id);
                    const recipientId = (data.recipient._id && data.recipient._id.toString) ? data.recipient._id.toString() : String(data.recipient._id);
                    chatRoomId = [senderId, recipientId].sort().join('-');
                    data.chatRoomId = chatRoomId;
                } catch (err) {
                    console.warn('[CLIENT] Failed to reconstruct chatRoomId', err);
                }
            }

            if (!chatRoomId) return;

            setAllChatMessages((prevAllMessages) => {
                const roomMessages = prevAllMessages[chatRoomId] || [];
                const filteredMessages = roomMessages.filter(
                    (m) => !(m._id?.startsWith('temp-') && m.content === data.content && m.sender._id.toString() === data.sender._id.toString())
                );

                if (data._id && filteredMessages.some((m) => m._id && m._id.toString() === data._id.toString())) {
                    return prevAllMessages;
                }

                return {
                    ...prevAllMessages,
                    [chatRoomId]: [...filteredMessages, data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
                };
            });

            if (!recipientRef.current || (data.sender._id !== recipientRef.current._id)) {
                const senderId = data.sender._id.toString();
                setUnreadCounts((prevCounts) => ({
                    ...prevCounts,
                    [senderId]: (prevCounts[senderId] || 0) + 1,
                }));
            } else if (data.sender._id) {
                const senderId = data.sender._id.toString();
                setUnreadCounts((prevCounts) => ({
                    ...prevCounts,
                    [senderId]: 0,
                }));
            }
        });

        socket.on('typing', (data) => {
            const currentRoom = calculateChatRoomId(userRef.current, recipientRef.current);
            if (data.chatRoomId === currentRoom && data.username !== userRef.current.username) {
                setTypingStatus(data.isTyping ? `${data.username} is typing...` : '');
            }
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [calculateChatRoomId]);

    // --- JOIN ROOM WHEN RECIPIENT SELECTED ---
    useEffect(() => {
        if (!user || !recipient || !socketRef.current) return;
        if (recipient._id !== 'ai') {
            const roomToJoin = calculateChatRoomId(user, recipient);
            if (roomToJoin) socketRef.current.emit('join_room', { chatRoomId: roomToJoin });
        }
        setTypingStatus('');
        setUnreadCounts((prevCounts) => ({ ...prevCounts, [recipient._id]: 0 }));
    }, [recipient, user, calculateChatRoomId]);

    // --- FETCH CONTACTS ---
    const fetchContacts = useCallback(async () => {
        if (!user) return;
        try {
            const res = await axios.get('http://localhost:5000/api/users');
            const backendContacts = res.data.filter(u => u._id !== user._id);
            setContacts([{ _id: 'ai', username: 'AI Assistant' }, ...backendContacts]);
        } catch (err) {
            if (err.response && err.response.status === 401) onLogout();
        }
    }, [user, onLogout]);

    useEffect(() => { fetchContacts(); }, [fetchContacts]);

    // --- FETCH MESSAGES FOR SELECTED RECIPIENT ---
    const fetchMessagesForRecipient = useCallback(async () => {
        if (!recipient || !user) return;
        if (recipient._id === 'ai') {
            setAllChatMessages((prev) => ({ ...prev, ['ai-bot']: prev['ai-bot'] || [] }));
            setUnreadCounts((prevCounts) => ({ ...prevCounts, ['ai']: 0 }));
            return;
        }
        const room = calculateChatRoomId(user, recipient);
        if (!room) return;
        try {
            const res = await axios.get(`http://localhost:5000/api/messages/${user._id}/${recipient._id}`);
            setAllChatMessages((prevAllMessages) => ({ ...prevAllMessages, [room]: res.data || [] }));
            setUnreadCounts((prevCounts) => ({ ...prevCounts, [recipient._id]: 0 }));
        } catch (err) {
            if (err.response && err.response.status === 401) onLogout();
            setAllChatMessages((prevAllMessages) => ({ ...prevAllMessages, [room]: [] }));
        }
    }, [user, recipient, calculateChatRoomId, onLogout]);

    useEffect(() => { fetchMessagesForRecipient(); }, [recipient, fetchMessagesForRecipient]);

    // --- SCROLL TO BOTTOM ---
    useEffect(() => {
        if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [allChatMessages, recipient]);

    const handleInputChange = (e) => {
        setMessageInput(e.target.value);
        const room = calculateChatRoomId(userRef.current, recipientRef.current);
        if (socketRef.current && room && recipientRef.current._id !== 'ai') {
            socketRef.current.emit('typing', { chatRoomId: room, username: userRef.current.username, isTyping: e.target.value.length > 0 });
        }
    };

    // --------------------------------
    // >>> CORRECTED SEND MESSAGE <<<
    // --------------------------------
    const sendMessage = async (e) => {
        e.preventDefault();
        const room = calculateChatRoomId(userRef.current, recipientRef.current);

        // --- AI conversation handling ---
        if (recipient && recipient._id === 'ai') {
            if (!messageInput.trim()) return;
            const timestamp = new Date().toISOString();
            
            // Ensure sender/recipient objects are complete, matching what the database returns
            const userMessage = {
                _id: `temp-${Date.now()}`,
                sender: { 
                    _id: userRef.current._id, 
                    username: userRef.current.username, 
                    email: userRef.current.email || '' // Ensure email property exists
                },
                recipient: { 
                    _id: 'ai', 
                    username: 'AI Assistant',
                    email: 'ai@system.com' // Ensure email property exists
                },
                content: messageInput,
                chatRoomId: 'ai-bot',
                timestamp,
            };

            // 1. Add user's message (optimistic update)
            setAllChatMessages((prevAllMessages) => {
                const roomMessages = prevAllMessages['ai-bot'] || [];
                return { ...prevAllMessages, ['ai-bot']: [...roomMessages, userMessage] };
            });

            // 2. Clear input
            const prompt = messageInput;
            setMessageInput('');
            setUnreadCounts((prevCounts) => ({ ...prevCounts, ['ai']: 0 }));

            try {
                // 3. Call AI backend
                const aiText = await sendToAi(prompt);
                
                // Prepare the AI response message (received message)
                const aiMessage = {
                    _id: `ai-${Date.now()}`,
                    sender: { 
                        _id: 'ai', 
                        username: 'AI Assistant',
                        email: 'ai@system.com' // Ensure email property exists
                    },
                    recipient: { 
                        _id: userRef.current._id, 
                        username: userRef.current.username,
                        email: userRef.current.email || '' // Ensure email property exists
                    },
                    content: aiText,
                    chatRoomId: 'ai-bot',
                    timestamp: new Date().toISOString(),
                };

                // 4. Add AI response
                setAllChatMessages((prevAllMessages) => {
                    const roomMessages = prevAllMessages['ai-bot'] || [];
                    return { ...prevAllMessages, ['ai-bot']: [...roomMessages, aiMessage] };
                });
            } catch (err) {
                console.error('AI error:', err);
                
                // 5. Display detailed error message to the user
                const errMsg = {
                    _id: `ai-err-${Date.now()}`,
                    sender: { _id: 'ai', username: 'AI Assistant', email: 'ai@system.com' },
                    recipient: { _id: userRef.current._id, username: userRef.current.username, email: userRef.current.email || '' },
                    content: `⚠️ AI failed. Details: ${typeof err.message === 'string' ? err.message : 'Check console logs.'}`,
                    chatRoomId: 'ai-bot',
                    timestamp: new Date().toISOString(),
                };
                setAllChatMessages((prevAllMessages) => {
                    const roomMessages = prevAllMessages['ai-bot'] || [];
                    return { ...prevAllMessages, ['ai-bot']: [...roomMessages, errMsg] };
                });
            }
            return;
        }

        // --- normal message flow (unchanged) ---
        if (!messageInput.trim() || !room) return;

        const tempMessage = {
            _id: `temp-${Date.now()}`,
            sender: { _id: userRef.current._id, username: userRef.current.username, email: userRef.current.email },
            recipient: { _id: recipientRef.current._id, username: recipientRef.current.username, email: recipientRef.current.email },
            content: messageInput,
            chatRoomId: room,
            timestamp: new Date().toISOString(), // Use current time for temp message
        };

        setAllChatMessages((prevAllMessages) => {
            const roomMessages = prevAllMessages[room] || [];
            return { ...prevAllMessages, [room]: [...roomMessages, tempMessage] };
        });

        socketRef.current.emit('send_message', {
            sender: userRef.current._id,
            username: userRef.current.username,
            recipient: recipientRef.current._id,
            content: messageInput,
            chatRoomId: room,
            timestamp: tempMessage.timestamp,
        });

        setMessageInput('');
        socketRef.current.emit('typing', { chatRoomId: room, username: userRef.current.username, isTyping: false });
    };

    const currentMessages = recipient
        ? (recipient._id === 'ai'
            ? (allChatMessages['ai-bot'] || [])
            : (allChatMessages[calculateChatRoomId(user, recipient)] || []))
        : [];

    const renderMessageRow = (msg, index) => {
        if (!msg.sender || !msg.sender._id) return null;
        const isMe = msg.sender._id.toString() === user._id.toString();
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return (
            <div key={msg._id || `${msg.sender._id}-${msg.timestamp}-${index}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
                <div className="flex flex-col max-w-[90%] sm:max-w-[75%] lg:max-w-[60%]">
                    <div className={`px-4 py-2 rounded-xl shadow-md break-words text-lg
                        ${isMe
                            ? 'bg-blue-600 text-white rounded-br-none dark:bg-blue-700'
                            : 'bg-gray-200 text-gray-900 rounded-bl-none dark:bg-gray-700 dark:text-gray-100'}`}>
                        {!isMe && <div className="font-semibold text-sm mb-1 text-gray-700 dark:text-gray-200">{msg.sender.username}</div>}
                        <p className="text-base">{msg.content}</p>
                    </div>
                    <span className={`text-xs mt-1 ${isMe ? 'text-gray-500 text-right dark:text-gray-400' : 'text-gray-500 text-left dark:text-gray-400'}`}>{time}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-sans antialiased text-gray-800 dark:bg-gray-900 dark:text-gray-100">

            {/* Sidebar */}
            <div className={`w-1/4 min-w-[280px] bg-white border-r border-gray-200 shadow-xl flex flex-col dark:bg-gray-800 dark:border-gray-700
                ${showSidebar ? 'flex absolute z-50 h-screen' : 'hidden'} md:flex`}>

                <div className="p-6 border-b border-gray-200 flex items-center justify-between dark:border-gray-700">
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">Chats</h2>
                    <div className="flex items-center space-x-3">
                        <ThemeToggle />
                        {user && (
                            <div className="flex items-center space-x-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(user.username)}`}>
                                    {getInitials(user.username)}
                                </div>
                                <span className="font-medium dark:text-gray-100">{user.username}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto">
                    {contacts.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 p-4">No other users found. Invite some friends!</p>
                    ) : (
                        <ul className="space-y-2">
                            {contacts.map((c) => {
                                const isOnline = onlineUsers.includes(c._id);
                                return (
                                    <li key={c._id}>
                                        <button
                                            onClick={() => { setRecipient(c); setShowSidebar(false); }}
                                            className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 relative
                                                ${recipient?._id === c._id 
                                                    ? 'bg-blue-600 text-white shadow-lg dark:bg-blue-700' 
                                                    : 'hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-gray-700 dark:hover:text-gray-200'}`}>

                                            <div className="relative">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-md mr-3 ${getAvatarColor(c.username)}`}>
                                                    {getInitials(c.username)}
                                                </div>
                                                {isOnline && (
                                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                                )}
                                            </div>

                                            <span className="font-medium text-lg dark:text-gray-100">{c.username}</span>
                                            {unreadCounts[c._id] > 0 && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full dark:bg-red-600">
                                                    {unreadCounts[c._id]}
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center bg-red-500 text-white py-3 px-6 rounded-xl hover:bg-red-600 transition duration-200 shadow-md dark:bg-red-600 dark:hover:bg-red-700"
                    >
                        <FiLogOut className="mr-2" /> Logout
                    </button>
                </div>
            </div>

            {/* Chat Section */}
            <div className="flex-1 flex flex-col w-full md:w-auto">

                {/* Mobile Sidebar Toggle */}
                <div className="md:hidden p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <button
                        onClick={() => setShowSidebar(prev => !prev)}
                        className="text-blue-600 dark:text-blue-400 font-bold"
                    >
                        Contacts
                    </button>
                    {recipient && (
                        <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mr-2 ${getAvatarColor(recipient.username)}`}>
                                {getInitials(recipient.username)}
                            </div>
                            <span className="font-medium dark:text-gray-100">{recipient.username}</span>
                        </div>
                    )}
                </div>

                <div className="bg-white border-b border-gray-200 p-5 flex items-center justify-between shadow-xl z-10 dark:bg-gray-800 dark:border-gray-700">
                    {recipient ? (
                        <div className="flex items-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mr-3 ${getAvatarColor(recipient.username)}`}>
                                {getInitials(recipient.username)}
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{recipient.username}</h1>
                        </div>
                    ) : (
                        <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Select a contact to chat</h1>
                    )}
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-900">
                    {!recipient && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 text-lg italic animate-fadeIn">
                            <FiUser className="text-6xl mb-4 text-gray-400 dark:text-gray-500" />
                            <p>Pick a contact from the left sidebar to start chatting</p>
                        </div>
                    )}
                    {recipient && currentMessages.map((msg, idx) => renderMessageRow(msg, idx))}
                    {typingStatus && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 italic text-center animate-pulse">{typingStatus}</div>
                    )}
                    <div ref={chatBottomRef} />
                </div>

                {recipient && (
                    <form onSubmit={sendMessage} className="p-4 md:p-6 bg-white border-t border-gray-200 flex items-center shadow-inner z-10 dark:bg-gray-800 dark:border-gray-700">
                        <input
                            type="text"
                            placeholder="Type your message..."
                            value={messageInput}
                            onChange={handleInputChange}
                            className="flex-1 p-4 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        />
                        <button
                            type="submit"
                            className="ml-4 bg-blue-600 text-white p-4 rounded-full hover:bg-blue-700 transition duration-200 shadow-md transform hover:scale-105 dark:bg-blue-700 dark:hover:bg-blue-800"
                        >
                            <FiSend className="w-6 h-6" />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ChatPage;