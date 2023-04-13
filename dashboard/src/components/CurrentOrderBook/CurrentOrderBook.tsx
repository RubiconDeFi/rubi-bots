import React, { useEffect, useState } from 'react';

import './CurrentOrderBook.css';
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
      <table className="order-book-table">
        <thead>
          <tr>
            <th>Bids</th>
            <th>Asks</th>
          </tr>
        </thead>
        <tbody>
          {currentOrderBook.bids.map((bid, index) => (
            <tr key={index}>
              <td>{`${bid.price} x ${bid.amount}`}</td>
              <td>{currentOrderBook.asks[index] && `${currentOrderBook.asks[index].price} x ${currentOrderBook.asks[index].amount}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CurrentOrderBook;
