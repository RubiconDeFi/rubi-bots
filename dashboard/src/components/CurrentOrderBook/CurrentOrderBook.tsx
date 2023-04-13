import React, { useEffect, useState } from 'react';

// import './CurrentOrderBook.css';
import { SimpleBook } from '../../../../configuration/config';

const CurrentOrderBook: React.FC = () => {
  const [currentOrderBook, setCurrentOrderBook] = useState<SimpleBook>({ bids: [], asks: [] });
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    setSocket(ws);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'CURRENT_ORDER_BOOK') {
        setCurrentOrderBook(message.data);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="current-order-book">
      {currentOrderBook.toString()}
    </div>
  );
};

export default CurrentOrderBook;
