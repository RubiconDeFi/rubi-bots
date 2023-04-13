import React, { useEffect, useState } from 'react';
import { TradeAction } from 'path/to/TradeAction/type';
import './TradeHistory.css';

const TradeHistory: React.FC = () => {
  const [tradeHistory, setTradeHistory] = useState<TradeAction[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    setSocket(ws);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'TRADE_ACTION') {
        // Update the tradeHistory state with the new data received
        setTradeHistory((prevTradeHistory) => [...prevTradeHistory, message.data]);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="trade-history">
      {/* Render trade history data */}
    </div>
  );
};

export default TradeHistory;
