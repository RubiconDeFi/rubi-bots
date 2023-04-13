import React from 'react';
import CurrentOrderBook from '../CurrentOrderBook/CurrentOrderBook.tsx';
import TargetOrderBook from '../TargetOrderBook/TargetOrderBook.tsx';
import TradeHistory from '../TradeHistory/TradeHistory.tsx';
import './Leaderboard.css';

const Leaderboard: React.FC = () => {
  return (
    <div className="leaderboard">
      <CurrentOrderBook />
      <TargetOrderBook />
      <TradeHistory />
    </div>
  );
};

export default Leaderboard;
