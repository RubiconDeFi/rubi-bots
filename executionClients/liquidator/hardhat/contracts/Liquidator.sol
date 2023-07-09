// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;
pragma abicoder v2;
// TODO: license and version

// TODO: don't hold funds in this contract, send it back to bot in swap transaction for safety
// TODO: decide on appropriate pool fee
// TODO: set approvals to 0
// TODO: lowGasSafeMath everything

// Import Uniswap components
import '@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3FlashCallback.sol';
import '@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol';
import '@uniswap/v3-periphery/contracts/base/PeripheryPayments.sol';
import '@uniswap/v3-periphery/contracts/base/PeripheryImmutableState.sol';
import '@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol';
import '@uniswap/v3-periphery/contracts/libraries/CallbackValidation.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';

// import Compound components
import "./compound/CErc20.sol";
import "./compound/Comptroller.sol";
import "./compound/PriceOracle.sol";


contract Liquidator is IUniswapV3FlashCallback, PeripheryPayments {
    using LowGasSafeMath for uint256;
    using LowGasSafeMath for int256;

    ISwapRouter public SwapRouter;

    // TODO: do I need all these?  Set addresses appropriately 
    address private desiredToken; // Token to swap into
    address private router;
    // address private factory; apparently set in PeripheryImmutableState
    // Coefficient = (1 - 1/sqrt(1.02)) for 2% slippage. Multiply by 100000 to get integer
    uint constant private SLIPPAGE_THRESHOLD_FACT = 985;

    Comptroller public comptroller;
    PriceOracle public priceOracle;
    address public bot;

    uint private closeFact;
    uint private liqIncent;

    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor( 
        ISwapRouter _swapRouter,
        address _factory,
        address _WETH9,

        address desiredTokenAddr,
        address routerAddr,
        address comptrollerAddr, 
        address botAddr
    ) PeripheryImmutableState (_factory, _WETH9) {
        owner = msg.sender;
        SwapRouter = _swapRouter;

        desiredToken = desiredTokenAddr;
        router = routerAddr;
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

    struct FlashCallbackData {
        address borrower;
        address repayCToken;
        address seizeCToken;
        PoolAddress.PoolKey poolKey;
        address token0;
        address token1;
        uint amount0;
    }

    /**
     * Liquidate a Compound user with a flash swap, auto-computing liquidation amount
     *
     * @param _borrower (address): the Compound user to liquidate
     * @param _repayCToken (address): a CToken for which the user is in debt
     * @param _seizeCToken (address): a CToken for which the user has a supply balance
     */
    function liquidateS(address _borrower, address _repayCToken, address _seizeCToken) external onlyOwner{
        ( , uint liquidity, ) = comptroller.getAccountLiquidity(_borrower);
        if (liquidity != 0) return;
        // uint(10**18) adjustments ensure that all place values are dedicated
        // to repay and seize precision rather than unnecessary closeFact and liqIncent decimals
        uint repayMax = CErc20(_repayCToken).borrowBalanceCurrent(_borrower) * closeFact / uint(10**18);
        uint seizeMax = CErc20(_seizeCToken).balanceOfUnderlying(_borrower) * uint(10**18) / liqIncent; // TODO: I dont understand why we're dividing by liqIncentives

        uint uPriceRepay = priceOracle.getUnderlyingPrice(_repayCToken);
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
    ) internal {
        address repayUnderlying = CErc20Storage(_repayCToken).underlying();
        PoolAddress.PoolKey memory poolKey;
        IUniswapV3Pool pool;

        if (_repayCToken == _seizeCToken) {
            //repayUnderlying = CErc20Storage(_repayCToken).underlying();
            //pair = UniswapV2Library.pairFor(router, repayUnderlying, weth);
            // TODO: maybe allow for token1 to be user's choice.  Seems like this is what we get paid back in
            // TODO: not sure what fee tier to choose.  Looks like 0.05 is the most common
            PoolAddress.PoolKey({token0: repayUnderlying, token1: WETH9, fee: 500});  // TODO: why weth? also decide weth/_WETH9
        }
        else {
            // repayUnderlying = CErc20Storage(_repayCToken).underlying();
            // TODO: what does getReservesWithPair do?
            // returns (uint reserveA, uint reserveB, address pair)
            //(maxBorrow, , pair) = UniswapV2Library.getReservesWithPair(factory, repayUnderlying, CErc20Storage(_seizeCToken).underlying());
            PoolAddress.PoolKey({token0: repayUnderlying, token1: CErc20Storage(_seizeCToken).underlying(), fee: 500});

            // get pool reserves for repayUnderlying
            // TODO: do I need to do all these checks?  Can we just trust pool.balance0 to be repayUnderlying balance?
            uint maxBorrow = IERC20(repayUnderlying).balanceOf(address(pool));

            // TODO: what is this calculating?  Why multiply by 100000 on the left?
            if (_amount * 100000 > maxBorrow * SLIPPAGE_THRESHOLD_FACT){
                // pair = IUniswapV2Factory(factory).getPair(repayUnderlying, weth);
                PoolAddress.PoolKey({token0: repayUnderlying, token1: WETH9, fee: 500});  // TODO: why weth? also decide weth/_WETH9
            } 
        }

        pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));

        // Initiate flash swap
        bytes memory data = abi.encode(
            FlashCallbackData({
                borrower: _borrower, 
                repayCToken: _repayCToken, 
                seizeCToken: _seizeCToken,
                poolKey: poolKey,
                token0: pool.token0(), // should always be repayUnderlying
                token1: pool.token1(),
                amount0: _amount
            })
        );
        // requesting _amount of token0 (underlying repayCToken)
        // requesting 0 of token1 (either underlying seizeToken or weth)
        pool.flash(address(this), _amount, 0, data);

        // from here on out we have a balance of underlying repayCTokens which are our profits

        // swap profits into desired profits for bot
        // TODO: swap to desired asset and pay back bot
    }

    /**
     * The function that gets called in the middle of a flash swap
     * @param fee0 additional amount owed back to the pool of token0
     * @param fee1 additional amount owed back to the pool of token1
     * @param data FlashCallbackData struct passed from liquidate()
     * @dev msg.sender is the pool
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) override external {
        // Unpack parameters sent from the `liquidate` function
        // NOTE: these are being passed in from some other contract, and cannot necessarily be trusted
        //(address borrower, address repayCToken, address seizeCToken) = abi.decode(data, (address, address, address));
        // address borrower, address repayCToken, address seizeCToken

        // decoded has properties borrower, repayCToken, seizeCToken, poolKey, token0, token1, amount0
        FlashCallbackData memory decoded = abi.decode(data, (FlashCallbackData));

        IUniswapV3Pool pool = CallbackValidation.verifyCallback(factory, decoded.poolKey);
        
        // TODO: check where factory is being set
        // TODO: this might do the same thing as CallbackValidation.verifyCallback ?
        require(msg.sender == address(pool)); // ensure that msg.sender is our v3 pool

        // TODO: these might be unnecessary.  I'm just being paranoid
        require(decoded.token0 == CErc20Storage(decoded.repayCToken).underlying()); // token0 should be the underlying repayCToken
        require(decoded.token1 == WETH9 || decoded.token1 == CErc20Storage(decoded.seizeCToken).underlying()); // token1 should be either weth or underlying seizeCToken
        // TODO: should this be poolkey.token0() ?
        require(decoded.token0 == pool.token0()); // token0s should be mapped
        require(decoded.token1 == pool.token1()); // token1s should be mapped
        require(decoded.amount0 > 0); // should have a positive amount of underlying repayCToken
        require(fee0 > 0); // we should only have taken a loan out for token1 (underlying repayCToken)
        require(fee1 == 0);

        uint amountOwedToPool = LowGasSafeMath.add(decoded.amount0, fee0);

        if (decoded.repayCToken == decoded.seizeCToken) {

            // Perform the liquidation
            //                         token,          to,                  value
            TransferHelper.safeApprove(decoded.token0, decoded.repayCToken, decoded.amount0); 
            CErc20(decoded.repayCToken).liquidateBorrow(decoded.borrower, decoded.amount0, decoded.seizeCToken);

            // Redeem all our seized cTokens for underlying ERC20
            CErc20(decoded.seizeCToken).redeem(IERC20(decoded.seizeCToken).balanceOf(address(this)));
            // now we have underlying seizeCToken which is same as underlying repayCToken

            // pay back borrowed funds
            //TransferHelper.safeTransferFrom(decoded.token0, address(this), msg.sender, amountOwedToPool);
            TransferHelper.safeApprove(decoded.token0, address(this), amountOwedToPool);
            pay(decoded.token0, address(this), msg.sender, amountOwedToPool); // TODO: what exactly is the pay keyword and why can't I find any info about it anywhere
            return;
        }

        // token0 is underlying repayCToken that we have amount0 of from loan
        // token1 is either weth or seizeToken and we have 0 balance

        // Perform the liquidation
        //                         token,  to,          value
        TransferHelper.safeApprove(decoded.token0, decoded.repayCToken, decoded.amount0); 
        CErc20(decoded.repayCToken).liquidateBorrow(decoded.borrower, decoded.amount0, decoded.seizeCToken);
        TransferHelper.safeApprove(decoded.token0, decoded.repayCToken, 0); // reset approval TODO: is this needed?

        // Redeem cTokens for underlying ERC20
        //uint seized_uUnits = CErc20(decoded.seizeCToken).balanceOfUnderlying(address(this));
        CErc20(decoded.seizeCToken).redeem(IERC20(decoded.seizeCToken).balanceOf(address(this)));
        address underlyingSeizeToken = CErc20Storage(decoded.seizeCToken).underlying();
        // so at this point we should have seized_uUints of underlying seizeCToken
        // which is NOT the same as underlying repayCToken (underlying seizeCToken could be anything)
        // we have to swap into underlying repayCToken to pay back loan

        // swap all our underlying seize tokens for underlying repay tokens
        uint amountIn = IERC20(underlyingSeizeToken).balanceOf(address(this));

        // Approves swapRouter to spend all our underlying seizeToken 
        TransferHelper.safeApprove(underlyingSeizeToken, address(SwapRouter), amountIn);
        
        // swaps back into underlying repay token and sends amount owed back to the pool
        ISwapRouter.ExactInputSingleParams memory params = 
            ISwapRouter.ExactInputSingleParams({
                tokenIn: underlyingSeizeToken,
                tokenOut: decoded.token0, // is underlying repayToken
                fee: 500, // 0.05%
                recipient: address(this), // Transfer back to this contract
                deadline: block.timestamp + 1 minutes, // TODO: pick a non-arbitrary time
                amountIn: amountIn,
                amountOutMinimum: amountOwedToPool, // TODO: use a price oracle to set this
                sqrtPriceLimitX96: 0 
        });

        // Executes the swap returning the amount we received
        uint amountOut = SwapRouter.exactInputSingle(params);
        TransferHelper.safeApprove(underlyingSeizeToken, address(SwapRouter), 0);
        require(amountOut > amountOwedToPool); // TODO: might be unnecessary

        // Pay back pair
        TransferHelper.safeApprove(decoded.token0, address(this), amountOwedToPool);
        pay(decoded.token0, address(this), msg.sender, amountOwedToPool); // TODO: what exactly is the pay keyword and why can't I find any info about it anywhere

        
    }


}