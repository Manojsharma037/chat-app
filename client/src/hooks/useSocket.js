import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const useSocket = (serverUrl) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(serverUrl);
    setSocket(newSocket);

    // Clean up the socket connection when the component unmounts
    return () => {
      newSocket.disconnect();
    };
  }, [serverUrl]);

  return socket;
};

export default useSocket;