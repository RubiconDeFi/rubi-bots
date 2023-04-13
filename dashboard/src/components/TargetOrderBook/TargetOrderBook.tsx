import React, { useEffect, useState } from 'react';

// import './TargetOrderBook.css';
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
      <div className="bids">
        <h3>Bids</h3>
        <table>
          <thead>
            <tr>
              <th>Price</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {targetOrderBook.bids.map((bid, index) => (
              <tr key={index}>
                <td>{bid.price}</td>
                <td>{bid.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="asks">
        <h3>Asks</h3>
        <table>
          <thead>
            <tr>
              <th>Price</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {targetOrderBook.asks.map((ask, index) => (
              <tr key={index}>
                <td>{ask.price}</td>
                <td>{ask.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  
};

export default TargetOrderBook;
