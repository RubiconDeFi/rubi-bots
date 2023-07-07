// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;
pragma abicoder v2;
// TODO: license and version

// TODO: don't hold funds in this contract, send it back to bot in swap transaction for safety

// Import Uniswap components
import '@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3FlashCallback.sol';
import '@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol';
import '@uniswap/v3-periphery/contracts/base/PeripheryPayments.sol';
import '@uniswap/v3-periphery/contracts/base/PeripheryImmutableState.sol'; // TODO: why do I need this?
import '@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol';
import '@uniswap/v3-periphery/contracts/libraries/CallbackValidation.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';

// Import ownable
import "@openzeppelin/contracts/access/Ownable.sol";

// import Compound components
import "./compound/CErc20.sol";
import "./compound/Comptroller.sol";
import "./compound/PriceOracle.sol";

// Import Uniswap components
// import './uniswap/UniswapV2Library.sol';
// import "./uniswap/IUniswapV2Factory.sol";
// import "./uniswap/IUniswapV2Router02.sol";
// import "./uniswap/IUniswapV2Callee.sol";
// import "./uniswap/IUniswapV2Pair.sol";
// import "./uniswap/IWETH.sol";


contract Liquidator is IUniswapV3FlashCallback, PeripheryPayments, Ownable {
    using LowGasSafeMath for uint256;
    using LowGasSafeMath for int256;

    ISwapRouter public Immutable swapRouter;

    // TODO: do I need all these?  Set addresses appropriately 
    address private weth;
    address private desiredToken; // Token to swap into
    address private router;
    address private factory;
    // Coefficient = (1 - 1/sqrt(1.02)) for 2% slippage. Multiply by 100000 to get integer
    uint constant private SLIPPAGE_THRESHOLD_FACT = 985;

    Comptroller public comptroller;
    PriceOracle public priceOracle;
    address payable public bot;

    uint private closeFact;
    uint private liqIncent;

    constructor( 
        ISwapRouter _swapRouter,
        address _factory,
        address _WETH9,

        address wethAddr,
        address desiredTokenAddr,
        address routerAddr,
        address factoryAddr,
        address comptrollerAddr, 
        address botAddr,
    ) PeripheryImmutableState (_factory, _WETH9) {
        swapRouter = _swapRouter;

        weth = wethAddr;
        desiredToken = desiredTokenAddr;
        router = routerAddr;
        factory = factoryAddr;
        comptroller = Comptroller(comptrollerAddr);
        priceOracle = PriceOracle(comptroller.oracle());
        bot = botAddr;

        // TODO: how often do these change?  How often should we update?
        closeFact = comptroller.closeFactorMantissa();
        liqIncent = comptroller.liquidationIncentiveMantissa();
    }

    function setComptroller(address _comptrollerAddress) external onlyOwner {
        comptroller = Comptroller(_comptrollerAddress);
        priceOracle = PriceOracle(comptroller.oracle());
        closeFact = comptroller.closeFactorMantissa();
        liqIncent = comptroller.liquidationIncentiveMantissa();
    }

    //fee1 is the fee of the pool from the initial borrow
    //fee2 is the fee of the first pool to arb from
    //fee3 is the fee of the second pool to arb from
    struct FlashParams {
        // address token0;
        // address token1;
        // uint24 fee1;
        // uint256 amount0;
        // uint256 amount1;
        // uint24 fee2;
        // uint24 fee3;
    }

    // fee2 and fee3 are the two other fees associated with the two other pools of token0 and token1
    struct FlashCallbackData {
        address borrower;
        address repayCToken;
        address seizeCToken;
        // uint256 amount0;
        // uint256 amount1;
        // address payer;
        PoolAddress.PoolKey poolKey;
        // uint24 poolFee2;
        // uint24 poolFee3;
        address token0;
        address token1;
        uint amount0;
        uint amount1;
    }

    function initFlash(FlashParams memory params) external {
        PoolAddress.PoolKey memory poolKey =
            PoolAddress.PoolKey({token0: params.token0, token1: params.token1, fee: params.fee1});
        IUniswapV3Pool pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));
        pool.flash(
            address(this),
            params.amount0,
            params.amount1,
            abi.encode(
                FlashCallbackData({
                    amount0: params.amount0,
                    amount1: params.amount1,
                    payer: msg.sender,
                    poolKey: poolKey,
                    poolFee2: params.fee2,
                    poolFee3: params.fee3
                })
            )
        );
    }

    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external override {
        FlashCallbackData memory decoded = abi.decode(data, (FlashCallbackData));
        CallbackValidation.verifyCallback(factory, decoded.poolKey);

        address token0 = decoded.poolKey.token0;
        address token1 = decoded.poolKey.token1;

        TransferHelper.safeApprove(token0, address(swapRouter), decoded.amount0);
        TransferHelper.safeApprove(token1, address(swapRouter), decoded.amount1);

        // profitable check
        // exactInputSingle will fail if this amount not met
        uint256 amount1Min = LowGasSafeMath.add(decoded.amount1, fee1);
        uint256 amount0Min = LowGasSafeMath.add(decoded.amount0, fee0);

        // call exactInputSingle for swapping token1 for token0 in pool w/fee2
        uint256 amountOut0 =
            swapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: token1,
                    tokenOut: token0,
                    fee: decoded.poolFee2,
                    recipient: address(this),
                    deadline: block.timestamp + 200,
                    amountIn: decoded.amount1,
                    amountOutMinimum: amount0Min,
                    sqrtPriceLimitX96: 0
                })
            );

        // call exactInputSingle for swapping token0 for token 1 in pool w/fee3
        uint256 amountOut1 =
            swapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: token0,
                    tokenOut: token1,
                    fee: decoded.poolFee3,
                    recipient: address(this),
                    deadline: block.timestamp + 200,
                    amountIn: decoded.amount0,
                    amountOutMinimum: amount1Min,
                    sqrtPriceLimitX96: 0
                })
            );

        // end up with amountOut0 of token0 from first swap and amountOut1 of token1 from second swap
        uint256 amount0Owed = LowGasSafeMath.add(decoded.amount0, fee0);
        uint256 amount1Owed = LowGasSafeMath.add(decoded.amount1, fee1);

        TransferHelper.safeApprove(token0, address(this), amount0Owed);
        TransferHelper.safeApprove(token1, address(this), amount1Owed);

        if (amount0Owed > 0) pay(token0, address(this), msg.sender, amount0Owed);
        if (amount1Owed > 0) pay(token1, address(this), msg.sender, amount1Owed);

        // if profitable pay profits to payer
        if (amountOut0 > amount0Owed) {
            uint256 profit0 = LowGasSafeMath.sub(amountOut0, amount0Owed);

            TransferHelper.safeApprove(token0, address(this), profit0);
            pay(token0, address(this), decoded.payer, profit0);
        }
        if (amountOut1 > amount1Owed) {
            uint256 profit1 = LowGasSafeMath.sub(amountOut1, amount1Owed);
            TransferHelper.safeApprove(token0, address(this), profit1);
            pay(token1, address(this), decoded.payer, profit1);
        }
    }

    /**
     * Liquidate a Compound user with a flash swap, auto-computing liquidation amount
     *
     * @param _borrower (address): the Compound user to liquidate
     * @param _repayCToken (address): a CToken for which the user is in debt
     * @param _seizeCToken (address): a CToken for which the user has a supply balance
     */
    function liquidateS(address _borrower, address _repayCToken, address _seizeCToken) public {
        ( , uint liquidity, ) = comptroller.getAccountLiquidity(_borrower);
        if (liquidity != 0) return;
        // uint(10**18) adjustments ensure that all place values are dedicated
        // to repay and seize precision rather than unnecessary closeFact and liqIncent decimals
        uint repayMax = CErc20(_repayCToken).borrowBalanceCurrent(_borrower) * closeFact / uint(10**18);
        uint seizeMax = CErc20(_seizeCToken).balanceOfUnderlying(_borrower) * uint(10**18) / liqIncent; // TODO: I dont understand why we're dividing by liqIncentives

        uint uPriceRepay = priceOracle.getUnderlyingPrice(_repayCToken)
        // Gas savings -- instead of making new vars `repayMax_Eth` and `seizeMax_Eth` just reassign
        repayMax *= uPriceRepay;
        seizeMax *= priceOracle.getUnderlyingPrice(_seizeCToken);

        // Gas savings -- instead of creating new var `repay_Eth = repayMax < seizeMax ? ...` and then
        // converting to underlying _repayCToken units by dividing by uPriceRepay, we can do it all in one step
        liquidate(_borrower, _repayCToken, _seizeCToken, ((repayMax < seizeMax) ? repayMax : seizeMax) / uPriceRepay);
    }

    /**
     * Liquidate a Compound user with a flash swap
     *
     * @param _borrower (address): the Compound user to liquidate
     * @param _repayCToken (address): a CToken for which the user is in debt
     * @param _seizeCToken (address): a CToken for which the user has a supply balance
     * @param _amount (uint): the amount (specified in units of _repayCToken.underlying) to flash loan and pay off
     */
    function liquidate(
        address _borrower, 
        address _repayCToken, 
        address _seizeCToken, 
        uint _amount
    ) public {
        address pair;
        address repayUnderlying = CErc20Storage(_repayCToken).underlying();
        PoolAddress.PoolKey memory poolKey;
        IUniswapV3Pool pool;

        if (_repayCToken == _seizeCToken) {
            //repayUnderlying = CErc20Storage(_repayCToken).underlying();
            //pair = UniswapV2Library.pairFor(router, repayUnderlying, weth);
            // TODO: maybe allow for token1 to be user's choice.  Seems like this is what we get paid back in
            // TODO: not sure what fee tier to choose.  Looks like 0.05 is the most common
            PoolAddress.PoolKey({token0: repayUnderlying, token1: weth, fee: 500});  // TODO: why weth? also decide weth/_WETH9
            pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));
        }
        else {
            // repayUnderlying = CErc20Storage(_repayCToken).underlying();
            // TODO: what does getReservesWithPair do?
            // returns (uint reserveA, uint reserveB, address pair)
            //(maxBorrow, , pair) = UniswapV2Library.getReservesWithPair(factory, repayUnderlying, CErc20Storage(_seizeCToken).underlying());
            PoolAddress.PoolKey({token0: repayUnderlying, token1: CErc20Storage(_seizeCToken).underlying(), fee: 500});
            pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));

            // get pool reserves for repayUnderlying
            // TODO: do I need to do all these checks?  Can we just trust pool.balance0 to be repayUnderlying balance?
            uint maxBorrow = pool.token0() == repayUnderlying ? pool.balance0() : pool.balance1();

            // TODO: what is this calculating?  Why multiply by 100000 on the left?
            if (_amount * 100000 > maxBorrow * SLIPPAGE_THRESHOLD_FACT){
                // pair = IUniswapV2Factory(factory).getPair(repayUnderlying, weth);
                PoolAddress.PoolKey({token0: repayUnderlying, token1: weth, fee: 500});  // TODO: why weth? also decide weth/_WETH9
                pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));
            } 
        }

        // need _amount of repayUnderlying and 0 of the other token (either seizeToken or weth)
        uint amount0 = _amount;
        uint amount1 = 0;

        // Initiate flash swap
        bytes memory data = abi.encode(
            FlashCallbackData({
                borrower: _borrower, 
                repayCToken: _repayCToken, 
                seizeCToken: _seizeCToken,
                poolKey: poolKey,
                token0: pool.token0(), // should always be repayUnderlying
                token1: pool.token1(),
                amount0: amount0,
                amount1: amount1 // should always be 0
            })
        );

        pool.flash(address(this), amount0, amount1, data);

        // TODO: swap to desired asset and pay back bot
    }

    /**
     * The function that gets called in the middle of a flash swap
     *
     * @param sender (address): the caller of `swap()`
     * @param amount0 (uint): the amount of token0 being borrowed
     * @param amount1 (uint): the amount of token1 being borrowed
     * @param data (bytes): data passed through from the caller
     */
    function uniswapV3FlashCallback(
        // address sender, 
        // uint amount0, 
        // uint amount1, 
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) override external {
        // Unpack parameters sent from the `liquidate` function
        // NOTE: these are being passed in from some other contract, and cannot necessarily be trusted
        //(address borrower, address repayCToken, address seizeCToken) = abi.decode(data, (address, address, address));
        // address borrower, address repayCToken, address seizeCToken

        // decoded has properties borrower, repayCToken, seizeCToken, poolKey, token0, token1, amount0, and amount1
        const {
            address borrower,
            address repayCToken,
            address seizeCToken,
            PoolAddress.PoolKey poolKey,
            address token0,
            address token1,
            uint amount0,
            uint amount1,
        } = abi.decode(data, (FlashCallbackData));
        IUniswapV3Pool pool = CallbackValidation.verifyCallback(factory, decoded.poolKey);
        
        // TODO: check where factory is being set
        // TODO: this might do the same thing as CallbackValidation.verifyCallback ?
        require(msg.sender == address(pool)); // ensure that msg.sender is our v3 pool

        // TODO: these might be unnecessary.  I'm just being paranoid
        require(token0 == CErc20Storage(repayCToken).underlying()); // token0 should be the underlying repayCToken
        require(token1 == weth || token1 == CErc20Storage(seizeCToken).underlying()); // token1 should be either weth or underlying seizeCToken
        // TODO: should this be poolkey.token0() ?
        require(token0 == pool.token0()); // token0s should be mapped
        require(token1 == pool.token1()); // token1s should be mapped
        require(amount0 > 0); // should have a positive amount of underlying repayCToken
        require(amount1 == 0); // shouldn't have gotten any of token1
        require(fee0 > 0); // we should only have taken a loan out for token1 (underlying repayCToken)
        require(fee1 = 0);

        if (repayCToken == seizeCToken) {
            // amount of repayUnderlying tokens
            //uint amount = decoded.amount0 != 0 ? decoded.amount0 : decoded.amount1;   
            //address repayUnderlying = decoded.amount0 != 0 ? token0 : token1;                       

            // Perform the liquidation
            IERC20(token0).safeApprove(repayCToken, amount0); // TODO: not sure this is approving the right contract.  We should be approving the cToken to access this balance
            CErc20(repayCToken).liquidateBorrow(borrower, amount0, seizeCToken);

            // Redeem all our seized cTokens for underlying ERC20
            CErc20(seizeCToken).redeem(IERC20(seizeCToken).balanceOf(address(this)));
            // now we have underlying seizeCToken which is same as underlying repayCToken

            // Compute debt and pay back pair
            // msg.sender is the uniswap pair to be repaid
            // IERC20(repayUnderlying).transfer(msg.sender, (amount * 1000 / 997) + 1);
            // return;

            // TODO: I don't think both fees should be >0.  Need to investigate
            // TransferHelper.safeApprove(token0, address(this), fee0);
            // TransferHelper.safeApprove(token1, address(this), fee1);

            // we initially borrowed amount0 of underlying repayCToken, so pay it back
            //pay(token0, address(this), msg.sender, LowGasSafeMath.add(amount0+fee0));
            safeTransferFrom(token0, address(this), msg.sender, LowGasSafeMath.add(amount0+fee0));
            return;
        }

        //uint amount;
        //address source;
        // address estuary;
        // if (decoded.amount0 != 0) {
        //     amount = decoded.amount0;
        //     source = token0;  // has non 0 balance
        //     estuary = token1; // has 0 balance
        // } else {
        //     amount = decoded.amount1;
        //     source = token1; // has non 0 balance
        //     estuary = token0; // has 0 balance
        // }

        // token0 is underlying repayCToken that we have amount0 of from loan
        // token1 is either weth or seizeToken and we have 0 balance

        // Perform the liquidation
        IERC20(token0).safeApprove(repayCToken, amount0); // TODO: again unsure if this is the correct approve
        CErc20(repayCToken).liquidateBorrow(borrower, amount0, seizeCToken);

        // Redeem cTokens for underlying ERC20
        uint seized_uUnits = CErc20(seizeCToken).balanceOfUnderlying(address(this));
        CErc20(seizeCToken).redeem(IERC20(seizeCToken).balanceOf(address(this)));
        address underlyingSeizeToken = CErc20Storage(seizeCToken).underlying();
        // so at this point we should have seized_uUints of underlying seizeCToken
        // which is NOT the same as underlying repayCToken (underlying seizeCToken could be anything)
        // we have to swap into underlying repayCToken to pay back loan

        // Compute debt
        // (uint reserveOut, uint reserveIn) = UniswapV2Library.getReserves(factory, token0, estuary);
        //uint debt = UniswapV2Library.getAmountIn(amount, reserveIn, reserveOut);

        // TODO: revisit this.  Didn't make sense at the time maybe I need a break
        // if (underlyingSeizeToken == token1) {
        //     // Pay back pair
        //     //IERC20(estuary).transfer(msg.sender, debt);
        //     // estuary could be token1 or 0
        //     safeTransferFrom(token1, address(this), msg.sender, LowGasSafeMath.add(decoded.amount1+fee1));
        //     return;
        // }


        // IERC20(seizeUToken).safeApprove(router, seized_uUnits);
        // // Define swapping path
        // address[] memory path = new address[](2);
        // path[0] = seizeUToken;
        // path[1] = estuary;
        // //                                                  desired, max sent,   path, recipient,     deadline
        // IUniswapV2Router02(router).swapTokensForExactTokens(debt, seized_uUnits, path, address(this), now + 1 minutes);
        // IERC20(seizeUToken).safeApprove(router, 0);

        // Pay back pair
        //IERC20(estuary).transfer(msg.sender, debt);
        // token0 is the underlying repayCtoken
        // TODO: do swap from our underlying seizeToken's (that we just got) into underlying repayTokens
        safeTransferFrom(token0, address(this), msg.sender, LowGasSafeMath.add(amount0+fee0)); 

        // from here on out we have a balance of underlying repayCTokens (token0) which are our profits

        // swap profits into desired profits for bot
    }


}