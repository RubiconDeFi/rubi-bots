// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;
pragma abicoder v2;
// TODO: license

// TODO: don't hold funds in this contract, send it back to bot in swap transaction for safety
// TODO: decide on appropriate pool fee

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

// ownable
import "@openzeppelin/contracts/access/Ownable.sol";

contract Liquidator is IUniswapV3FlashCallback, PeripheryPayments, Ownable {
    using LowGasSafeMath for uint256;
    using LowGasSafeMath for int256;

    ISwapRouter public SwapRouter;
    Comptroller public comptroller;
    PriceOracle public priceOracle;

    address public USDC;
    address public desiredToken; // Token to swap into and send to owner

    uint private closeFact;
    uint private liqIncent;

    constructor( 
        address _swapRouter,
        address _factory,
        address _WETH9,
        address _USDC,
        address _desiredToken,
        address _comptrollerAddr
    ) PeripheryImmutableState (_factory, _WETH9) {
        SwapRouter = ISwapRouter(_swapRouter);
        USDC = _USDC;
        desiredToken = _desiredToken;
        comptroller = Comptroller(_comptrollerAddr);
        priceOracle = PriceOracle(comptroller.oracle());

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
        address repayUnderlying;
        uint amount;
    }

    /** 
     * Mimics CToken.sol's balanceOfUnderlying but uses view function exchangeRateStored() 
     * instead of non-view exchangeRateCurrent().
     * 
     * @param _addr the address of the account to query
     * @param _cToken a cToken that _addr has a balance of
     * @return The number of tokens owned by "_addr"
     */
    function balanceOfUnderlyingStored(address _addr, address _cToken) internal view returns (uint) {
        uint exchangeRate = CErc20Storage(_cToken).exchangeRateStored(); // returns calculated exchange rate scaled by 1e18
        return (LowGasSafeMath.mul(exchangeRate, CErc20Storage(_cToken).balanceOf(_addr))) / 1e18;
    }

    /**
     * View version of currentLiquidateAmount.  
     * Uses view versions of borrowBalanceCurrent (borrowBalanceStored) and balanceOfUnderlying (balanceOfUnderlying).
     * Doesn't accrue interest so won't be entirely accurate.  
     * Used to calculate if a potential liquidation could be profitable.
     *
     * @param _borrower the Compound user to liquidate
     * @param _repayCToken a CToken for which _borrower is in debt
     * @param _seizeCToken a CToken for which _borrower has a supply balance
     * @return The estimated maximum amount of _repayCToken that we can use to liquidate _borrower
     */
    function estimateLiquidateAmount(address _borrower, address _repayCToken, address _seizeCToken) external view returns (uint){
        ( , uint liquidity, ) = comptroller.getAccountLiquidity(_borrower);
        if (liquidity != 0) return 0;

        // uint(10**18) adjustments ensure that all place values are dedicated
        // to repay and seize precision rather than unnecessary closeFact and liqIncent decimals
        uint repayMax = LowGasSafeMath.mul(CErc20Storage(_repayCToken).borrowBalanceStored(_borrower), closeFact) / uint(10**18);
        uint seizeMax = LowGasSafeMath.mul(balanceOfUnderlyingStored(_borrower, _seizeCToken), uint(10**18)) / liqIncent;

        uint uPriceRepay = priceOracle.getUnderlyingPrice(_repayCToken);

        // Gas savings -- instead of making new vars `repayMax_Eth` and `seizeMax_Eth` just reassign
        repayMax *= uPriceRepay;
        seizeMax *= priceOracle.getUnderlyingPrice(_seizeCToken);

        // Gas savings -- instead of creating new var `repay_Eth = repayMax < seizeMax ? ...` and then
        // converting to underlying _repayCToken units by dividing by uPriceRepay, we can do it all in one step
        return ((repayMax < seizeMax) ? repayMax : seizeMax) / uPriceRepay;
    }

    /**
     * @param _borrower the Compound user to liquidate
     * @param _repayCToken a CToken for which _borrower is in debt
     * @param _seizeCToken a CToken for which _borrower has a supply balance
     * @return The maximum amount of _repayCToken that we can use to liquidate _borrower
     */
    function currentLiquidateAmount(address _borrower, address _repayCToken, address _seizeCToken) internal returns (uint){
        ( , uint liquidity, ) = comptroller.getAccountLiquidity(_borrower);
        if (liquidity != 0) return 0;

        // uint(10**18) adjustments ensure that all place values are dedicated
        // to repay and seize precision rather than unnecessary closeFact and liqIncent decimals
        uint repayMax = CErc20(_repayCToken).borrowBalanceCurrent(_borrower) * closeFact / uint(10**18);
        uint seizeMax = CErc20(_seizeCToken).balanceOfUnderlying(_borrower) * uint(10**18) / liqIncent;

        uint uPriceRepay = priceOracle.getUnderlyingPrice(_repayCToken);

        // Gas savings -- instead of making new vars `repayMax_Eth` and `seizeMax_Eth` just reassign
        repayMax *= uPriceRepay;
        seizeMax *= priceOracle.getUnderlyingPrice(_seizeCToken);

        // Gas savings -- instead of creating new var `repay_Eth = repayMax < seizeMax ? ...` and then
        // converting to underlying _repayCToken units by dividing by uPriceRepay, we can do it all in one step
        return ((repayMax < seizeMax) ? repayMax : seizeMax) / uPriceRepay;
    }


    /**
     * Liquidate a Compound user with a flash swap
     *
     * @param _borrower the Compound user to liquidate
     * @param _repayCToken cToken for which the user is in debt
     * @param _seizeCToken cToken for which the user has a supply balance
     * @notice the order of params for getPoolKey(address tokenA, address tokenB, uint24 fee) do NOT 
     *      match up to the pool's token0 and token1.  Must be careful in checking
     */
    function liquidate(
        address _borrower, 
        address _repayCToken, 
        address _seizeCToken
    ) external onlyOwner {
        uint amount = currentLiquidateAmount(_borrower, _repayCToken, _seizeCToken);
        address repayUnderlying = CErc20Storage(_repayCToken).underlying();
        PoolAddress.PoolKey memory poolKey;

        // Default tokenA to WEth since that has the best liquidity on UniV3
        // but _repayCToken is cWEth, then we would end up trying to get a pool of WETH/WETH and error out.
        // If repayUnderlying is WEth, set tokenB to be the token with next highest liquidity, USDC
        if (repayUnderlying == WETH9) {
            //                               tokenA,        tokenB, fee level
            poolKey = PoolAddress.getPoolKey(repayUnderlying, USDC, 500);
        }
        else {
            //                               tokenA,         tokenB, fee level
            poolKey = PoolAddress.getPoolKey(repayUnderlying, WETH9, 500);
        }

        IUniswapV3Pool pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));

        // if the pool's token0 is repayUnderlying, set amount0=amount and amount1=0
        // do the opposite if repayUnderlying is pool's token1
        // see @notice
        uint amount0 = (pool.token0() == repayUnderlying) ? amount : 0;
        uint amount1 = (pool.token0() == repayUnderlying) ? 0 : amount;

        // Initiate flash swap
        bytes memory data = abi.encode(
            FlashCallbackData({
                borrower: _borrower, 
                repayCToken: _repayCToken, 
                seizeCToken: _seizeCToken,
                poolKey: poolKey,
                repayUnderlying: repayUnderlying,
                amount: amount
            })
        );
        
        pool.flash(address(this), amount0, amount1, data);

        // from here on out we have a balance of underlying repayCTokens which are our profits
        // TODO: swap to desired asset and pay back owner
    }

    /**
     * The function that gets called in the middle of a flash swap
     * @param fee0 additional amount owed back to the pool of token0
     * @param fee1 additional amount owed back to the pool of token1
     * @param data FlashCallbackData struct passed from liquidate()
     * @dev msg.sender is the pool
     * @notice we don't know which of the pool's tokens (token0 or token1) is our underlying repayToken
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) override external {
 
        // decoded has properties borrower, repayCToken, seizeCToken, poolKey,  repayUnderlying, amount
        FlashCallbackData memory decoded = abi.decode(data, (FlashCallbackData));

        // ensures that msg.sender is our pool
        // reverts if msg.sender != address of our pool(via poolKey)
        CallbackValidation.verifyCallback(factory, decoded.poolKey);

        // we only requested an amount of one token, so only one fee should be > 0
        // But we don't know if we requested the pool's token0 or token1
        uint amountOwedToPool = (fee0 > 0) ? LowGasSafeMath.add(decoded.amount, fee0) : LowGasSafeMath.add(decoded.amount, fee1);

        if (decoded.repayCToken == decoded.seizeCToken) {

            // Perform the liquidation
            //                         token,                    to,                  value
            TransferHelper.safeApprove(decoded.repayUnderlying, decoded.repayCToken, decoded.amount); 
            CErc20(decoded.repayCToken).liquidateBorrow(decoded.borrower, decoded.amount, decoded.seizeCToken);
            TransferHelper.safeApprove(decoded.repayUnderlying, decoded.repayCToken, 0); // reset approval TODO: is this needed?

            // Redeem all our seized cTokens for underlying ERC20
            CErc20(decoded.seizeCToken).redeem(IERC20(decoded.seizeCToken).balanceOf(address(this)));
            // now we have underlying seizeToken which is same as underlying repayToken

            // pay back borrowed funds
            TransferHelper.safeApprove(decoded.repayUnderlying, address(this), amountOwedToPool);
            pay(decoded.repayUnderlying, address(this), msg.sender, amountOwedToPool); 
            return;
        }

        // Perform the liquidation
        //                         token,                       to,              value
        TransferHelper.safeApprove(decoded.repayUnderlying, decoded.repayCToken, decoded.amount); 
        CErc20(decoded.repayCToken).liquidateBorrow(decoded.borrower, decoded.amount, decoded.seizeCToken);
        TransferHelper.safeApprove(decoded.repayUnderlying, decoded.repayCToken, 0); // reset approval TODO: is this needed?

        // Redeem all our seized cTokens for underlying ERC20
        CErc20(decoded.seizeCToken).redeem(IERC20(decoded.seizeCToken).balanceOf(address(this)));
        address underlyingSeizeToken = CErc20Storage(decoded.seizeCToken).underlying();

        // Now we have a balance of underlying seizeToken.
        // We have to swap into underlying repayToken to pay off flash loan
        // After paying off flash loan, we are left with a profit in units of underlying repayToken

        // Approves swapRouter for all our underlying seizeToken 
        uint amountToSwap = IERC20(underlyingSeizeToken).balanceOf(address(this));
        TransferHelper.safeApprove(underlyingSeizeToken, address(SwapRouter), amountToSwap);
        
        // set up swap for all underlying seizeToken back into underlying repayToken (so we can pay back borrowed funds)
        ISwapRouter.ExactInputSingleParams memory params = 
            ISwapRouter.ExactInputSingleParams({
                tokenIn: underlyingSeizeToken,
                tokenOut: decoded.repayUnderlying,
                fee: 500, // 0.05%
                recipient: address(this), // Transfer back to this contract
                deadline: block.timestamp + 1 minutes, // TODO: pick a non-arbitrary time
                amountIn: amountToSwap,
                amountOutMinimum: amountOwedToPool, // TODO: use a price oracle to make sure we get a good price
                sqrtPriceLimitX96: 0 
        });

        // Execute the swap
        SwapRouter.exactInputSingle(params);
        TransferHelper.safeApprove(underlyingSeizeToken, address(SwapRouter), 0); // reset approved tokens

        // Pay back borrowed funds
        TransferHelper.safeApprove(decoded.repayUnderlying, address(this), amountOwedToPool);
        pay(decoded.repayUnderlying, address(this), msg.sender, amountOwedToPool);
    }
}