import React, { useEffect, useState } from 'react';

import './CurrentOrderBook.css';
import { SimpleBook } from '../../../../configuration/config';

const CurrentOrderBook: React.FC = () => {
  const [orderBook, setOrderBook] = useState<SimpleBook | null>(null);

  useEffect(() => {
    // Fetch order book data from the bot and update the state
  }, []);

  return (
    <div className="current-order-book">
      {/* Render order book data */}
    </div>
  );
};

export default CurrentOrderBook;
