import React, { useEffect, useState } from 'react';

import './TargetOrderBook.css';
import { SimpleBook } from '../../../../configuration/config';

const TargetOrderBook: React.FC = () => {
  const [targetOrderBook, setTargetOrderBook] = useState<SimpleBook>({ bids: [], asks: [] });
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    setSocket(ws);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'TARGET_ORDER_BOOK') {
        setTargetOrderBook(message.data);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="target-order-book">
      {/* Render target order book data */}
    </div>
  );
};

export default TargetOrderBook;
