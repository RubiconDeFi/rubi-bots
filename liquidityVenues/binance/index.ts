import Binance from 'binance-api-node';
import { SimpleBook, GenericOrder, tokenList } from "../../configuration/config";
import { GenericLiquidityVenue, AssetPair, BidAndAsk } from '../generic'


type BinanceClient = typeof Binance;

// Below 5 lines are for testing purposes
// const asset = '0x4200000000000000000000000000000000000006'
// const quote = '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
// const assetTokenInfo = tokenList.tokens.find(token => token.address == asset);
// const quoteTokenInfo = tokenList.tokens.find(token => token.address == quote);
// const pair: AssetPair = {asset: assetTokenInfo, quote: quoteTokenInfo}

export class BinanceLiquidityVenue extends GenericLiquidityVenue {
  binance: BinanceClient
  symbol: string
  client: ReturnType<BinanceClient>
  tradingPair: string;

  constructor(assetPair: AssetPair) {
    super(assetPair);
    this.tradingPair = this.createTradingPair();
    this.binance = Binance;
    this.client = this.binance({
      apiKey: 'Binance_API_KEY',
      apiSecret: 'Binance_API_SECRET'
      }) as ReturnType<BinanceClient>;
  }

  private createTradingPair(): string {
    let asset = this.assetPair.asset.symbol;
    let quote = this.assetPair.quote.symbol;
    let tradingPair = `${asset}${quote}`;
    if (asset === 'WETH'|| quote === 'WETH') {
      tradingPair = tradingPair.replace('WETH', 'ETH');
    }
    console.log("trading pair:", tradingPair)
    return tradingPair;
  }

  async updateLiveBook(): Promise<SimpleBook> {
    const book = await this.client.book({ symbol: this.tradingPair, limit: 5 });
    const simpleBook = this.convertToSimpleBook(book);
    return simpleBook
  }

  // Helper function to convert Binance book to SimpleBook
  convertToSimpleBook(book: any): SimpleBook {
      const simpleBook: SimpleBook = {
          bids: [],
          asks: []
        };  
      book.bids.forEach((bid: any) => {
            const genericBid: GenericOrder = {
              price: parseFloat(bid.price),
              size: parseFloat(bid.quantity)
            };
            simpleBook.bids.push(genericBid);
        });
      book.asks.forEach((ask: any) => {
            const genericAsk: GenericOrder = {
              price: parseFloat(ask.price),
              size: parseFloat(ask.quantity)
            };
            simpleBook.asks.push(genericAsk);
        });
      return simpleBook;

}


  async pollLiveBook(interval: number): Promise<void> {
    setInterval(async () => {
      const book: SimpleBook = await this.updateLiveBook();
      if (JSON.stringify(book) !== JSON.stringify(this.liveBook)) {
        this.liveBook = book;
        this.emitUpdate();
      }
    }, interval);
  }
}


// const venue = new BinanceLiquidityVenue(pair);
// venue.pollLiveBook(1000);

