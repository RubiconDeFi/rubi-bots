// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;
pragma abicoder v2;
// TODO: license

// TODO: decide on appropriate pool fee

// Import Uniswap components
import '@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';

// import Compound components
import "./compound/CErc20.sol";
import "./compound/Comptroller.sol";
import "./compound/PriceOracle.sol";

// AAVE pool
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";

// ownable
import "@openzeppelin/contracts/access/Ownable.sol";

contract Liquidator is Ownable {
    using LowGasSafeMath for uint256;

    ISwapRouter public swapRouter;
    Comptroller public comptroller;
    PriceOracle public priceOracle;
    IPool public AAVE_POOL;

    address public desiredToken; // Token to swap into and send to owner

    uint private closeFact;
    uint private liqIncent;

    constructor( 
        address _swapRouter,
        address _desiredToken,
        address _comptrollerAddr,
        address _aavePool
    ) { // TODO: is peripheryImmutableState needed?
        swapRouter = ISwapRouter(_swapRouter);
        desiredToken = _desiredToken;
        comptroller = Comptroller(_comptrollerAddr);
        priceOracle = PriceOracle(comptroller.oracle());
        AAVE_POOL = IPool(_aavePool);

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
    }

    // AAVE flash loan version
    function liquidate(        
        address _borrower, 
        address _repayCToken, 
        address _seizeCToken
    ) external onlyOwner returns (uint) {
        // get maximum amount we can liquidate
        uint amount = _liquidateAmount(_borrower, _repayCToken, _seizeCToken);
        address underlyingRepayToken = address(CErc20Storage(_repayCToken).underlying());

        // set up flash loan data
        bytes memory data = abi.encode(
            FlashCallbackData({
                borrower: _borrower, 
                repayCToken: _repayCToken, 
                seizeCToken: _seizeCToken
            })
        );

        // call flash loan
        AAVE_POOL.flashLoanSimple(
            address(this), // send loan to this contract
            underlyingRepayToken, // token to receive in loan
            amount, // amount of underlying repayCToken we are requesting
            data, // callback data
            0 // referralCode.  Currently unused 
        );

        // from here on out we have a balance of underlying repayCTokens, which are our profits
        uint balanceUnderlyingRepayToken = IERC20(underlyingRepayToken).balanceOf(address(this));

        // Swap into owner's desired asset and pay out
        // Approve the router to spend our underlyingRepayToken
        TransferHelper.safeApprove(underlyingRepayToken, address(swapRouter), balanceUnderlyingRepayToken);

        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: underlyingRepayToken,
                tokenOut: desiredToken,
                fee: 500,
                recipient: owner(), // send directly to owner
                deadline: block.timestamp,
                amountIn: balanceUnderlyingRepayToken,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // execute the swap and return the amount of desiredToken sent to owner
        uint amountOut = swapRouter.exactInputSingle(params);
        require(amountOut > 0, "Liquidate was not profitable");

        return amountOut;
    }

    // AAVE flashloan callback
    function executeOperation(
        address underlyingRepayToken,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        uint amountOwedToPool = LowGasSafeMath.add(amount, premium);
        address poolToRepay = address(AAVE_POOL);

        // schizo checks.  TODO: possibly not necessary
        require(initiator == address(this)); 
        require(msg.sender == poolToRepay);
        
        // decoded has properties borrower, repayCToken, seizeCToken, poolKey, amount
        FlashCallbackData memory decoded = abi.decode(params, (FlashCallbackData));

        // case where we're seizing and repaying same asset
        if (decoded.repayCToken == decoded.seizeCToken) {

            // Perform the liquidation
            //                         token,                    to,                  value
            TransferHelper.safeApprove(underlyingRepayToken, decoded.repayCToken, amount); 
            CErc20(decoded.repayCToken).liquidateBorrow(decoded.borrower, amount, decoded.seizeCToken);
            TransferHelper.safeApprove(underlyingRepayToken, decoded.repayCToken, 0); // reset approval TODO: is this needed?

            // Redeem all our seized cTokens for underlying ERC20
            CErc20(decoded.seizeCToken).redeem(IERC20(decoded.seizeCToken).balanceOf(address(this)));
            // now we have underlying seizeToken (which is same as underlying repayToken)

            // approve borrowed funds
            TransferHelper.safeApprove(underlyingRepayToken, poolToRepay, amountOwedToPool);
            return true;
        }

        // Perform the liquidation
        //                         token,                         to,                 value
        TransferHelper.safeApprove(underlyingRepayToken, decoded.repayCToken, amount); 
        CErc20(decoded.repayCToken).liquidateBorrow(decoded.borrower, amount, decoded.seizeCToken);
        TransferHelper.safeApprove(underlyingRepayToken, decoded.repayCToken, 0); // reset approval TODO: is this needed?

        // Redeem all our seized cTokens for underlying ERC20
        CErc20(decoded.seizeCToken).redeem(IERC20(decoded.seizeCToken).balanceOf(address(this)));
        address underlyingSeizeToken = CErc20Storage(decoded.seizeCToken).underlying();

        // Now we have a balance of underlying seizeToken.
        // We have to swap into underlying repayToken to pay off flash loan
        // After paying off flash loan, we are left with a profit in units of underlying repayToken

        // Approves swapRouter for all our underlying seizeToken 
        uint allUnderlyingSeizeTokens = IERC20(underlyingSeizeToken).balanceOf(address(this));
        TransferHelper.safeApprove(underlyingSeizeToken, address(swapRouter), allUnderlyingSeizeTokens);
        
        // set up swap for all underlying seizeToken back into underlying repayToken 
        // (so we can pay back borrowed funds)
        ISwapRouter.ExactInputSingleParams memory swapParams = 
            ISwapRouter.ExactInputSingleParams({
                tokenIn: underlyingSeizeToken,
                tokenOut: underlyingRepayToken,
                fee: 500, // 0.05%
                recipient: address(this), // Transfer back to this contract
                deadline: block.timestamp, // TODO: pick a non-arbitrary time
                amountIn: allUnderlyingSeizeTokens,
                amountOutMinimum: amountOwedToPool, // TODO: or should I set this to 0 and require amtOut > amountOwedToPool
                sqrtPriceLimitX96: 0 
        });

        // Execute the swap
        swapRouter.exactInputSingle(swapParams);

        // approve borrowed funds
        TransferHelper.safeApprove(underlyingRepayToken, poolToRepay, amountOwedToPool);

        return true;
    }
    

    // struct FlashCallbackData {
    //     address borrower;
    //     address repayCToken;
    //     address seizeCToken;
    //     PoolAddress.PoolKey poolKey;
    //     address underlyingRepayToken;
    //     uint amount;
    // }

    // /**
    //  * Liquidate a Compound user with a flash swap
    //  *
    //  * @param _borrower the Compound user to liquidate
    //  * @param _repayCToken cToken for which the user is in debt
    //  * @param _seizeCToken cToken for which the user has a supply balance
    //  * @notice the order of params for getPoolKey(address tokenA, address tokenB, uint24 fee) do NOT 
    //  *      match up to the pool's token0 and token1.  Must be careful in checking
    //  */
    // function liquidate(
    //     address _borrower, 
    //     address _repayCToken, 
    //     address _seizeCToken
    // ) external onlyOwner returns (uint) {
    //     uint amount = _currentLiquidateAmount(_borrower, _repayCToken, _seizeCToken);
    //     address underlyingRepayToken = CErc20Storage(_repayCToken).underlying();
    //     PoolAddress.PoolKey memory poolKey;

    //     // Default tokenA to WEth since that has the best liquidity on UniV3
    //     // but _repayCToken is cWEth, then we would end up trying to get a pool of WETH/WETH and error out.
    //     // If underlyingRepayToken is WEth, set tokenB to be the token with next highest liquidity, USDC
    //     if (underlyingRepayToken == WETH9) {
    //         //                               tokenA,        tokenB, fee level
    //         poolKey = PoolAddress.getPoolKey(underlyingRepayToken, USDC, 500);
    //     }
    //     else {
    //         //                               tokenA,         tokenB, fee level
    //         poolKey = PoolAddress.getPoolKey(underlyingRepayToken, WETH9, 500);
    //     }

    //     IUniswapV3Pool pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));

    //     // if the pool's token0 is underlyingRepayToken, set amount0=amount and amount1=0
    //     // do the opposite if underlyingRepayToken is pool's token1
    //     // see @notice
    //     uint amount0 = (pool.token0() == underlyingRepayToken) ? amount : 0;
    //     uint amount1 = (pool.token0() == underlyingRepayToken) ? 0 : amount;

    //     // Initiate flash swap
    //     bytes memory data = abi.encode(
    //         FlashCallbackData({
    //             borrower: _borrower, 
    //             repayCToken: _repayCToken, 
    //             seizeCToken: _seizeCToken,
    //             poolKey: poolKey,
    //             underlyingRepayToken: underlyingRepayToken,
    //             amount: amount
    //         })
    //     );
        
    //     pool.flash(address(this), amount0, amount1, data);

    //     // from here on out we have a balance of underlying repayCTokens which are our profits
    //     // TODO: swap to desired asset and pay back owner

    //     uint balanceUnderlyingRepayToken = IERC20(underlyingRepayToken).balanceOf(address(this));

    //     // Approve the router to spend our underlyingRepayToken
    //     TransferHelper.safeApprove(underlyingRepayToken, address(swapRouter), balanceUnderlyingRepayToken);

    //     ISwapRouter.ExactInputSingleParams memory params =
    //         ISwapRouter.ExactInputSingleParams({
    //             tokenIn: underlyingRepayToken,
    //             tokenOut: desiredToken,
    //             fee: 500,
    //             recipient: owner(), // send directly to owner
    //             deadline: block.timestamp + 1 minutes,
    //             amountIn: balanceUnderlyingRepayToken,
    //             amountOutMinimum: 0, // TODO: use a price oracle to get a good price
    //             sqrtPriceLimitX96: 0
    //         });

    //     // execute the swap and return the amount of desiredToken sent to owner
    //     return swapRouter.exactInputSingle(params);
    // }

    // /**
    //  * The function that gets called in the middle of a flash swap
    //  * @param fee0 additional amount owed back to the pool of token0
    //  * @param fee1 additional amount owed back to the pool of token1
    //  * @param data FlashCallbackData struct passed from liquidate()
    //  * @dev msg.sender is the pool
    //  * @notice we don't know which of the pool's tokens (token0 or token1) is our underlying repayToken
    //  */
    // function uniswapV3FlashCallback(
    //     uint256 fee0,
    //     uint256 fee1,
    //     bytes calldata data
    // ) override external {
 
    //     // decoded has properties borrower, repayCToken, seizeCToken, poolKey,  underlyingRepayToken, amount
    //     FlashCallbackData memory decoded = abi.decode(data, (FlashCallbackData));

    //     // ensures that msg.sender is our pool
    //     // reverts if msg.sender != address of our pool(via poolKey)
    //     CallbackValidation.verifyCallback(factory, decoded.poolKey);

    //     // we only requested an amount of one token, so only one fee should be > 0
    //     // But we don't know if we requested the pool's token0 or token1
    //     uint amountOwedToPool = (fee0 > 0) ? LowGasSafeMath.add(decoded.amount, fee0) : LowGasSafeMath.add(decoded.amount, fee1);

    //     if (decoded.repayCToken == decoded.seizeCToken) {

    //         // Perform the liquidation
    //         //                         token,                    to,                  value
    //         TransferHelper.safeApprove(underlyingRepayToken, decoded.repayCToken, decoded.amount); 
    //         CErc20(decoded.repayCToken).liquidateBorrow(decoded.borrower, decoded.amount, decoded.seizeCToken);
    //         TransferHelper.safeApprove(underlyingRepayToken, decoded.repayCToken, 0); // reset approval TODO: is this needed?

    //         // Redeem all our seized cTokens for underlying ERC20
    //         CErc20(decoded.seizeCToken).redeem(IERC20(decoded.seizeCToken).balanceOf(address(this)));
    //         // now we have underlying seizeToken which is same as underlying repayToken

    //         // pay back borrowed funds
    //         TransferHelper.safeApprove(underlyingRepayToken, address(this), amountOwedToPool);
    //         pay(underlyingRepayToken, address(this), msg.sender, amountOwedToPool); 
    //         return;
    //     }

    //     // Perform the liquidation
    //     //                         token,                       to,              value
    //     TransferHelper.safeApprove(underlyingRepayToken, decoded.repayCToken, decoded.amount); 
    //     CErc20(decoded.repayCToken).liquidateBorrow(decoded.borrower, decoded.amount, decoded.seizeCToken);
    //     TransferHelper.safeApprove(underlyingRepayToken, decoded.repayCToken, 0); // reset approval TODO: is this needed?

    //     // Redeem all our seized cTokens for underlying ERC20
    //     CErc20(decoded.seizeCToken).redeem(IERC20(decoded.seizeCToken).balanceOf(address(this)));
    //     address underlyingSeizeToken = CErc20Storage(decoded.seizeCToken).underlying();

    //     // Now we have a balance of underlying seizeToken.
    //     // We have to swap into underlying repayToken to pay off flash loan
    //     // After paying off flash loan, we are left with a profit in units of underlying repayToken

    //     // Approves swapRouter for all our underlying seizeToken 
    //     uint amountToSwap = IERC20(underlyingSeizeToken).balanceOf(address(this));
    //     TransferHelper.safeApprove(underlyingSeizeToken, address(swapRouter), amountToSwap);
        
    //     // set up swap for all underlying seizeToken back into underlying repayToken (so we can pay back borrowed funds)
    //     ISwapRouter.ExactInputSingleParams memory params = 
    //         ISwapRouter.ExactInputSingleParams({
    //             tokenIn: underlyingSeizeToken,
    //             tokenOut: underlyingRepayToken,
    //             fee: 500, // 0.05%
    //             recipient: address(this), // Transfer back to this contract
    //             deadline: block.timestamp + 1 minutes, // TODO: pick a non-arbitrary time
    //             amountIn: amountToSwap,
    //             amountOutMinimum: amountOwedToPool, // TODO: use a price oracle to make sure we get a good price
    //             sqrtPriceLimitX96: 0 
    //     });

    //     // Execute the swap
    //     swapRouter.exactInputSingle(params);

    //     // Pay back borrowed funds
    //     TransferHelper.safeApprove(underlyingRepayToken, address(this), amountOwedToPool);
    //     pay(underlyingRepayToken, address(this), msg.sender, amountOwedToPool);
    // }

    /**
     * @param _borrower the Compound user to liquidate
     * @param _repayCToken a CToken for which _borrower is in debt
     * @param _seizeCToken a CToken for which _borrower has a supply balance
     * @return The maximum amount of _repayCToken that we can use to liquidate _borrower
     */
    function _liquidateAmount(address _borrower, address _repayCToken, address _seizeCToken) internal returns (uint){
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

}