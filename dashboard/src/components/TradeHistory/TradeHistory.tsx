import React, { useEffect, useState } from "react";
// import "./TradeHistory.css";

export type TradeAction = {
  action: string;
  amount: number;
  price: number;
  timestamp: number;
};

const TradeHistory: React.FC = () => {
  const [tradeHistory, setTradeHistory] = useState<TradeAction[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");
    setSocket(ws);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "TRADE_ACTION") {
        setTradeHistory((prevTradeHistory) => [
          ...prevTradeHistory,
          message.data,
        ]);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return <div className="trade-history">{tradeHistory.toString()}</div>;
};

export default TradeHistory;
