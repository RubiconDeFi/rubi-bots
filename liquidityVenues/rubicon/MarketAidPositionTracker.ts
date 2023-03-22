// A class that extends GenericLiquidityVenue and overrides the updateLiveBook method
//        has a property that is a Market Aid Instance which it polls to get the liveBook

import { TokenInfo } from "@uniswap/token-lists";
import { BotConfiguration, OnChainBookWithData, SimpleBook, StrategistTrade, marketAddressesByNetwork } from "../../configuration/config";
import { AssetPair, GenericLiquidityVenue } from "../generic";
import { BigNumber, Contract, ethers } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import MARKET_INTERFACE from "../../configuration/abis/Market";

// This class only returns the book of a specific EOA operator on the market aid excluding other offers present on Rubicon for the purposes of market making
export class MarketAidPositionTracker extends GenericLiquidityVenue {
    marketAidInstance: ethers.Contract;
    myReferenceOperator: string;
    onChainStrategistTrades: BigNumber[];
    config: BotConfiguration;
    onChainBookWithData: OnChainBookWithData;
    marketContractInstance: Contract;

    constructor(assetPair: AssetPair, _ma: ethers.Contract, strategistReferenceAddress: string, configuration: BotConfiguration) {
        super(assetPair);
        this.marketAidInstance = _ma;
        this.identifier = 'rubicon';
        this.myReferenceOperator = strategistReferenceAddress;
        this.config = configuration;
        // If marketAddressesByNetwork does not have a market aid address for the network, throw an error
        if (!marketAddressesByNetwork[this.config.network]) {
            throw new Error(`No market address for this network ${this.config.network}`);
        }
        this.marketContractInstance = new ethers.Contract(
            marketAddressesByNetwork[this.config.network],
            MARKET_INTERFACE,
            this.config.connections.jsonRpcProvider // TODO: use websocket
        );
        // this.assetPair = {
        //     asset: this.config.targetTokens[0],
        //     quote: this.config.targetTokens[1]
        // };
        this.pollForStrategistBook();
    }

    // Function that uses setInterval to poll the market aid instance for the latest relevant book
    pollForStrategistBook() {
        setInterval(() => {
            this.updateLiveBook();
        }, 1000);
    }

    // Function that polls the rubiconInstance for the latest liveBook
    updateLiveBook() {
        // TODO: Query our order information through the market aid!
        // this.liveBook = this.rubiconInstance.getLiveBook();
        console.log("Query the market aid for the latest book", this.marketAidInstance.address);
        console.log("This strategist's address is", this.myReferenceOperator);

        this.getAndSetOnChainBookWithData();
        this.emitUpdate();

    }

    // TODO: This is a naive v0 of how to listen to market aid orders. The three-query query chain in place now should be replaced with an improved view function or multicall
    // async getAndSetOnChainBookWithData(marketContract: ethers.Contract): Promise<boolean> {
    //     // if (this.onChainBook == undefined) {
    //     // Have to populate the onChainBook

    //     // console.log("This assetpair is", this.assetPair.asset.address, this.assetPair.quote.address);

    //     return getOutstandingBookFromStrategist(
    //         this.assetPair.asset.address,
    //         this.assetPair.quote.address,
    //         this.marketAidInstance,
    //         this.myReferenceOperator
    //     ).then((r: BigNumber[]) => {
    //         // console.log("Setting this to on-chain book", r);

    //         this.onChainStrategistTrades = r;
    //         const _marketAidContract = this.marketAidInstance;
    //         // Trigger the queries to update the price info too
    //         // return this.getAndSetOnChainBookWithData(config, this.contract, this.marketContract);
    //         // }
    //         // Get true on-chain book with prices and return 
    //         const currentOnChain = r;
    //         async function getPricesFromStratIds(assetDecimals: number, quoteDecimals: number): Promise<any[]> {

    //             var promises = [];
    //             for (let index = 0; index < currentOnChain.length; index++) {
    //                 // console.log("Loop and index", index);

    //                 // Likely the bottleneck of the requoting process
    //                 // TODO: Refactor into a single Promise.all
    //                 const outstandingStratTradeID = currentOnChain[index];

    //                 const attempt = _marketAidContract.strategistTrades(outstandingStratTradeID).then((r: StrategistTrade) => [r.askId, r.bidId]).then((info) => {
    //                     // console.log("ARE THESE IDS???", info[0], info[1]);
    //                     return Promise.all([
    //                         getPriceAndSizeFromID( // IS THIS RIGHT ?? TODO:
    //                             info[0],
    //                             true,
    //                             marketContract,
    //                             quoteDecimals,
    //                             assetDecimals
    //                         ), getPriceAndSizeFromID(
    //                             info[1],
    //                             false,
    //                             marketContract,
    //                             quoteDecimals,
    //                             assetDecimals
    //                         ),
    //                         outstandingStratTradeID
    //                     ])
    //                 });
    //                 promises.push(attempt);

    //             }

    //             // TODO: probably room for query optimization...
    //             const queryResults = await Promise.all(promises);

    //             return queryResults;

    //         }

    //         return getPricesFromStratIds(this.config.targetTokens[0].decimals, this.config.targetTokens[1].decimals).then((r: OnChainBookWithData) => {
    //             this.onChainBookWithData = r;
    //             // this.liveBook
    //             // console.log("Setting this to on-chain book with data", r);

    //             // Loop through the response and extrapolate the prices to populate the liveBook of type SimpleBook
    //             var orders: SimpleBook = <SimpleBook>{ asks: [], bids: [] };
    //             for (let index = 0; index < r.length; index++) {
    //                 const element = r[index];
    //                 // console.log("Element", element);
    //                 orders.asks.push(element[0])
    //                 orders.bids.push(element[1])
    //             }
    //             // console.log("WHAT THIS LOOK LIKE", orders); ``
    //             this.liveBook = orders;
    //             return true;
    //         })
    //     })

    // }

    getAndSetOnChainBookWithData(): Promise<boolean | void> {
        // TODO: Wire this up to new MARKET AID STACK on TestNET!!!
        return this.marketAidInstance.getStrategistBookWithPriceData(
            this.assetPair.asset.address,
            this.assetPair.quote.address,
            this.myReferenceOperator
        ).then((r: any) => {
            // console.log("\nThis book!!!", r);

            // this.updateOnChainBook()

            // Define an empty ({ askPrice: number, askSize: number, bidPrice: number, bidSize: number, stratTradeID: BigNumber }) 
            this.onChainBookWithData = r.map((a: {
                relevantStratTradeId: BigNumber,
                bidPay: BigNumber,
                bidBuy: BigNumber,
                askPay: BigNumber,
                askBuy: BigNumber
            }) => {
                return {
                    askPrice: parseFloat(formatUnits(a.askBuy, this.assetPair.quote.decimals)) / parseFloat(formatUnits(a.askPay, this.assetPair.asset.decimals)),
                    askSize: parseFloat(formatUnits(a.askPay, this.assetPair.asset.decimals)),
                    bidPrice: parseFloat(formatUnits(a.bidPay, this.assetPair.quote.decimals)) / parseFloat(formatUnits(a.bidBuy, this.assetPair.asset.decimals)),
                    bidSize: parseFloat(formatUnits(a.bidBuy, this.assetPair.asset.decimals)),
                    stratTradeID: a.relevantStratTradeId
                }
            });
            // this.onChainBook = r.map((a: any) => a.relevantStratTradeId);


            // Parse through the onChainBookWithData and populate the liveBook
            var orders: SimpleBook = <SimpleBook>{ asks: [], bids: [] };
            for (let index = 0; index < this.onChainBookWithData.length; index++) {
                const element = this.onChainBookWithData[index];
                // console.log("Element", element);
                orders.asks.push({ price: element.askPrice, size: element.askSize })
                orders.bids.push({ price: element.bidPrice, size: element.bidSize })
            }

            // Sort orders by price so the highest priced bid is first and the lowest priced ask is first
            orders.asks.sort((a, b) => a.price - b.price);
            orders.bids.sort((a, b) => b.price - a.price);
            this.liveBook = orders;
            // Also trigger a requote of liquidity
            return true;
            // TODO: Trigger next level of query that grabs the OnChainBookWithData and populate that
        });
    }
}

export async function getOutstandingBookFromStrategist(
    asset: TokenInfo["address"],
    quote: TokenInfo["address"],
    contract: ethers.Contract,
    strategist: string
): Promise<BigNumber[] | undefined> {
    const result = contract.getOutstandingStrategistTrades(
        asset,
        quote,
        strategist
    );

    return result;
}

export function getPriceAndSizeFromID(
    id: BigNumber,
    isAsk: boolean,
    marketContract: Contract, // reader only
    quoteDecimals: number,
    assetDecimals: number
): Promise<{ price: number, size: number }> {
    if (isAsk) {
        return marketContract.getOffer(id).then((askInfo) => {
            let num = BigNumber.from(askInfo[2]); // wei
            let den = BigNumber.from(askInfo[0]);
            let _num = formatUnits(num.toString(), quoteDecimals); // human
            let _den = formatUnits(den.toString(), assetDecimals); // human

            const formattedNum = parseFloat(_num); // human but parseUnits for BigNumber math and UINT
            const formattedDen = parseFloat(_den);

            const outcome = formattedNum / formattedDen; // human price in BigNumber WEI    
            return {
                price: outcome,
                size: parseFloat(_den)
            };
        });
    } else {
        return marketContract.getOffer(id).then((bidInfo) => {

            let num = BigNumber.from(bidInfo[0]);
            let den = BigNumber.from(bidInfo[2]);
            let _num = formatUnits(num.toString(), quoteDecimals);
            let _den = formatUnits(den.toString(), assetDecimals);

            const formattedNum = parseFloat(_num);
            const formattedDen = parseFloat(_den);
            const outcome = formattedNum / formattedDen;

            return {
                price: outcome,
                size: parseFloat(_den)
            };
        });
    }
}