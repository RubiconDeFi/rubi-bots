import { GenericOrder, SimpleBook } from "../../configuration/config";
import { TokenInfo } from "@uniswap/token-lists";
import { ethers, BigNumber } from "ethers";
import { formatUnits } from "ethers/lib/utils";

const SQRT_PRICE_LIMIT_x96_LTR = BigNumber.from(0);
const SQRT_PRICE_LIMIT_x96_RTL = BigNumber.from(0);

var STRETCH_FACTOR;

export async function tickToBook(
    leftSizeLadderWei: Array<BigNumber>,
    rightSizeLadderWei: Array<BigNumber>,
    quoterContract: ethers.Contract,
    leftQuoteBIDERC20: TokenInfo,
    rightAssetASKERC20: TokenInfo,
    uniFee: BigNumber,
    stretch: number,
    isv2?: boolean
): Promise<SimpleBook> {
    STRETCH_FACTOR = stretch;
    /*// we have to precompose the Wei source ladder with the ETH conversion factor
    let leftSizeLadder = leftSizeLadderWei.map((item) =>
        ethers.utils.parseUnits(
            (
                parseFloat(ethers.utils.formatUnits(item, LEFT_DECIMALS)) *
                ETH_CONVESION_FACTOR
            ).toString(),
            ETH_CONVERSION_DECIMALS
        )
    );
    console.log("leftSizeLadderWei: " + leftSizeLadderWei);
    console.log("leftSizeLadder: " + leftSizeLadder);*/
    const LEFT_ADDRESS = leftQuoteBIDERC20.address; // needs to be an Address type
    const RIGHT_ADDRESS = rightAssetASKERC20.address; // needs to be an Address type
    const LEFT_DECIMALS = leftQuoteBIDERC20.decimals; // needs to be a number type
    const RIGHT_DECIMALS = rightAssetASKERC20.decimals; // needs to be a number type

    const left = { address: LEFT_ADDRESS, decimals: LEFT_DECIMALS };
    const right = { address: RIGHT_ADDRESS, decimals: RIGHT_DECIMALS };

    let book = await buildBook(
        left,
        right,
        leftSizeLadderWei,
        rightSizeLadderWei,
        uniFee,
        SQRT_PRICE_LIMIT_x96_LTR,
        SQRT_PRICE_LIMIT_x96_RTL,
        quoterContract,
        isv2
    );

    let formatted_book = formatBook(book);
    let stretched_book = stretch_book(formatted_book, STRETCH_FACTOR);
    // let pullbacked_book = pullback_book(stretched_book, ETH_CONVESION_FACTOR);

    return stretched_book;
}

// keep
export async function buildPairedLadderHuman(
    left: { address: any; decimals: number },
    right: { address: any; decimals: number },
    leftSizeLadder: Array<BigNumber>, // we assume that this is in native units (wei)
    fee: BigNumber,
    sqrtPriceLimitX96: BigNumber,
    quoterContract: ethers.Contract,
    isv2?: boolean
): Promise<{ sizes: Array<number>; prices: Array<number> }> {
    let leftSizeCDF = sizeLaddderToCDF(leftSizeLadder);
    let rightSizeCDF = await Promise.all(
        leftSizeCDF.map((item) =>
            quoteExactInputSingleStatic(
                quoterContract,
                left.address,
                right.address,
                fee,
                item,
                sqrtPriceLimitX96,
                isv2
            )
        )
    );

    // console.log("rightSizeCDF length" + rightSizeCDF.length);

    // console.log("rightSizeCDF: " + rightSizeCDF);

    // Turn rightSizeCDF into an array that is every 4th element starting with the first one
    // rightSizeCDF = rightSizeCDF.filter((_, i) => i % 4 == 0);

    if (isv2 == true) {
        rightSizeCDF = rightSizeCDF.map(subArray => subArray[0]);
    }
    // console.log(firstElements.map(item => item.toString()));

    // console.log("rightSizeCDFAFTER: " + rightSizeCDF);

    // const firstElements2 = rightSizeCDF.filter((_, i) => i % 4 === 0);
    // console.log(firstElements2);

    if (rightSizeCDF == undefined) throw "Got an undefined response on quoteExactInputSingleStatic calls"
    // can we go get the amount of ether that comes out of each bin?
    // basically, we have this right CDF, can we get the PDF from it?
    // this should be a yes

    let rightSizePDF: Array<BigNumber> = [];
    for (let i = rightSizeCDF.length - 1; i > 0; i--) {
        if (rightSizeCDF[i] == undefined) throw "Got an undefined response on quoteExactInputSingleStatic calls"
        rightSizePDF.push(rightSizeCDF[i].sub(rightSizeCDF[i - 1]));
    }
    // we gotta adjust the last bit of the PDF
    rightSizePDF.push(rightSizeCDF[0]);

    // we need to reverse the PDF
    rightSizePDF.reverse(); // this is in place so this is good

    var rightSizePDFHuman: number[] = [];
    var leftSizeLadderHuman: number[] = [];

    for (let i = 0; i < leftSizeLadder.length; i++) {
        leftSizeLadderHuman.push(
            parseFloat(
                ethers.utils.formatUnits(leftSizeLadder[i], left.decimals)
            )
        );
    }

    for (let i = 0; i < rightSizePDF.length; i++) {
        rightSizePDFHuman.push(
            parseFloat(
                ethers.utils.formatUnits(rightSizePDF[i], right.decimals)
            )
        );
    }

    // let's get prices now, right?
    let ltrPriceLadderHuman: Array<number> = [];
    for (let i = 0; i < leftSizeLadderHuman.length; i++) {
        //console.log(rightSizePDF[i].toString());
        //rightSizePDF[i].div(leftSizeLadder[i]);
        ltrPriceLadderHuman.push(rightSizePDFHuman[i] / leftSizeLadderHuman[i]);
    }

    return { prices: ltrPriceLadderHuman, sizes: leftSizeLadderHuman };
}

// keep
export async function buildBook(
    left: { address: any; decimals: number },
    right: { address: any; decimals: number },
    leftSizeLadder: Array<BigNumber>, // we assume that this is in native units (wei)
    rightSizeLadder: Array<BigNumber>, // we assume that this is in native units (wei)
    fee: BigNumber,
    sqrtPriceLimitX96LTR: BigNumber, // Source to target
    sqrtPriceLimitX96RTL: BigNumber, // target to source
    quoterContract: ethers.Contract,
    isv2?: boolean
): Promise<{
    sourceToTarget: { sizes: Array<number>; prices: Array<number> };
    targetToSource: { sizes: Array<number>; prices: Array<number> };
}> {
    // output is valued in right units (not wei)
    let rightBookPromise = buildPairedLadderHuman(
        left,
        right,
        leftSizeLadder,
        fee,
        sqrtPriceLimitX96LTR,
        quoterContract,
        isv2
    );
    // output is valued in left units (not wei)
    let leftBookPromise = buildPairedLadderHuman(
        right,
        left,
        rightSizeLadder,
        fee,
        sqrtPriceLimitX96RTL,
        quoterContract,
        isv2
    );

    // await the books
    let leftBook = await leftBookPromise;
    let rightBook = await rightBookPromise;

    // rightBook has to be inverted
    let invPrices = [];
    let invSizes = [];

    for (let i = 0; i < rightBook.prices.length; i++) {
        invSizes.push(rightBook.prices[i] * rightBook.sizes[i]); // this is the new size
        invPrices.push(1 / rightBook.prices[i]); // this is the new price
    }

    let invRightBookFloat = {
        prices: invPrices,
        sizes: invSizes,
    };

    return {
        sourceToTarget: invRightBookFloat,
        targetToSource: leftBook,
    };
}

// keep
export function formatBook(input: {
    sourceToTarget: { sizes: Array<number>; prices: Array<number> };
    targetToSource: { sizes: Array<number>; prices: Array<number> };
}): SimpleBook {
    let bids: GenericOrder[] = [];
    let asks: GenericOrder[] = [];

    for (let i = 0; i < input.sourceToTarget.sizes.length; i++) {
        bids.push({
            price: input.sourceToTarget.prices[i],
            size: input.sourceToTarget.sizes[i],
        });
    }

    for (let i = 0; i < input.targetToSource.sizes.length; i++) {
        asks.push({
            price: input.targetToSource.prices[i],
            size: input.targetToSource.sizes[i],
        });
    }

    // highest priced bid needs to be in index zero
    // lowest priced ask needs to be in index zero
    bids.sort((a, b) => a.price - b.price);
    bids.sort((a, b) => b.price - a.price);

    bids.sort();
    asks.sort();

    // the names are inverted here so we reverse the arrays
    // bids.reverse(); // remove this
    asks.reverse();

    let output: SimpleBook = {
        bids: asks,
        asks: bids,
    };

    return output;
}

// keep
export function quoteExactInputSingleStatic(
    poolContract: ethers.Contract,
    tokenIn: any,
    tokenOut: any,
    fee: BigNumber,
    amountIn: BigNumber,
    sqrtPriceLimitX96: BigNumber,
    isv2?: boolean
): Promise<BigNumber> {
    // let options = { gasLimit: 8500000 }; // cost us 35000 gas I think
    // console.log("\nquoteExactInputSingleStatic");
    // console.log("tokenIn", tokenIn);
    // console.log("tokenOut", tokenOut);
    // console.log("fee", fee.toString());
    // console.log("amountIn", formatUnits(amountIn));
    // console.log("sqrtPriceLimitX96", sqrtPriceLimitX96);

    if (isv2 != undefined && isv2 == true) {
        // console.log("calling v2");

        return poolContract.callStatic.quoteExactInputSingle(
            {
                tokenIn,
                tokenOut,
                amountIn,
                fee,
                sqrtPriceLimitX96,
            }
            // options
        );
    }

    return poolContract.callStatic.quoteExactInputSingle(
        tokenIn,
        tokenOut,
        fee,
        amountIn,
        sqrtPriceLimitX96,
        // options
    ).catch((e) => console.log("May have failed calling static", e.reason, e, "called with these params", tokenIn, tokenOut, fee.toString(), amountIn.toString(), sqrtPriceLimitX96.toString()));
}

// keep
export function sizeLaddderToCDF(
    input_size_ladder: Array<BigNumber>
): Array<BigNumber> {
    let cdf: Array<BigNumber> = [];
    for (let i = 0; i < input_size_ladder.length; i++) {
        if (i == 0) {
            cdf.push(input_size_ladder[i]);
        } else {
            cdf.push(cdf[i - 1].add(input_size_ladder[i]));
        }
    }
    return cdf;
}

/**
 *
 * @param input
 * @param conversion_factor this is the conversion factor. for example, to turn a USDC => ETH book into a BTC => ETH book, you'd plug in 1 / 31749.0 as the conversion factor.
 * @returns the converted book
 */
function pullback_book(
    input: SimpleBook,
    conversion_factor: number
): SimpleBook {
    let output: SimpleBook = {
        bids: [],
        asks: [],
    };

    for (let i = 0; i < input.bids.length; i++) {
        output.bids.push({
            price: input.bids[i].price * conversion_factor,
            size: input.bids[i].size * conversion_factor,
        });
    }

    for (let i = 0; i < input.asks.length; i++) {
        output.asks.push({
            price: input.asks[i].price * conversion_factor,
            size: input.asks[i].size,
        });
    }

    return output;
}

/**
 *
 * @param booK
 * @param scalar This is the thing that stretches the book. 1 is identity, a number greater than 1 increases the spread, less than 1 decreases it.
 */
function stretch_book(book: SimpleBook, scalar: number): SimpleBook {
    // console.log("\nHere is my book stretch scalar", scalar);

    // console.log("here's a bid price", book.bids[0].price);

    for (let i = 0; i < book.bids.length; i++) {
        book.bids[i].price = book.bids[i].price / scalar;
    }

    for (let i = 0; i < book.asks.length; i++) {
        book.asks[i].price = book.asks[i].price * scalar;
    }

    return book;
}
