import React from 'react';
import CurrentOrderBook from '../CurrentOrderBook/CurrentOrderBook.tsx';
import TargetOrderBook from '../TargetOrderBook/TargetOrderBook.tsx';
import TradeHistory from '../TradeHistory/TradeHistory.tsx';
import './Leaderboard.css';

const Leaderboard: React.FC = () => {
  return (
    <div className="leaderboard">
      <div className="order-books-row">
        <CurrentOrderBook />
        <TargetOrderBook />
      </div>
      <div className="trade-history-row">
        <TradeHistory />
      </div>
    </div>
  );
};

export default Leaderboard;
