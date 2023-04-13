import React from 'react';
import CurrentOrderBook from '../CurrentOrderBook/CurrentOrderBook';
import TargetOrderBook from '../TargetOrderBook/TargetOrderBook';
import TradeHistory from '../TradeHistory/TradeHistory';
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
