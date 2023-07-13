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

    // custom error to save gas instead of require statement strings
    error LiquidationNotProfitable();
    
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
        address _comptrollerAddr,
        address _aavePool,
        address _desiredToken
    ) {
        swapRouter = ISwapRouter(_swapRouter);
        comptroller = Comptroller(_comptrollerAddr);
        priceOracle = PriceOracle(comptroller.oracle());
        AAVE_POOL = IPool(_aavePool);
        desiredToken = _desiredToken;

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

    /**
     * Liquidate a user with an AAVEv3 flash loan
     *
     * @param _borrower the user to liquidate
     * @param _repayCToken cToken for which the user is in debt
     * @param _seizeCToken cToken for which the user has a supply balance
     * @return The amount of desiredToken sent to owner as profit
     */
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

        // revert if there is no profit
        if (amountOut == 0) {
            revert LiquidationNotProfitable();
        }

        // return amount profited
        return amountOut;
    }


    /**
     * AAVEv3 flash loan callback.
     *
     * @param underlyingRepayToken token that was sent to this contract 
     * @param amount of underlyingRepayToken sent
     * @param premium additional fee owed to AAVE pool
     * @param initiator address of contract that called the swap (should be address(this))
     * @param params FlashCallbackData struct passed from liquidate(). 
     *        Has properties borrower, repayCToken, seizeCToken
     * @return True
     * @dev called by AAVEv3 pool
     */
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
        
        // decoded has properties borrower, repayCToken, seizeCToken
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