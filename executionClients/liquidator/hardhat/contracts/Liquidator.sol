// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
// TODO: license and version

// TODO: don't hold funds in this contract, send it back to bot

import "@openzeppelin/contracts/access/Ownable.sol";

// import Compound components
import "./compound/CErc20.sol";
import "./compound/Comptroller.sol";
import "./compound/PriceOracle.sol";

// Import Uniswap components
import './uniswap/UniswapV2Library.sol';
import "./uniswap/IUniswapV2Factory.sol";
import "./uniswap/IUniswapV2Router02.sol";
import "./uniswap/IUniswapV2Callee.sol";
import "./uniswap/IUniswapV2Pair.sol";
import "./uniswap/IWETH.sol";


contract Liquidator is Ownable, IUniswapV2Callee{

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
        address wethAddr,
        address desiredTokenAddr,
        address routerAddr,
        address factoryAddr,
        address comptrollerAddr, 
        address botAddr,
    ) {
        weth = wethAddr;
        desiredToken = desiredTokenAddr;
        router = routerAddr;
        factory = factoryAddr;
        comptroller = Comptroller(comptrollerAddr);
        priceOracle = PriceOracle(comptroller.oracle());
        bot = botAddr;
        closeFact = comptroller.closeFactorMantissa();
        liqIncent = comptroller.liquidationIncentiveMantissa();
    }

    // TODO: get comptroller

    // TODO: is needed?
    receive() external payable {}

    function setComptroller(address _comptrollerAddress) external onlyOwner {
        comptroller = Comptroller(_comptrollerAddress);
        priceOracle = PriceOracle(comptroller.oracle());
        closeFact = comptroller.closeFactorMantissa();
        liqIncent = comptroller.liquidationIncentiveMantissa();
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
        uint seizeMax = CErc20(_seizeCToken).balanceOfUnderlying(_borrower) * uint(10**18) / liqIncent;

        uint uPriceRepay = priceOracle.getUnderlyingPrice(_repayCToken);
        // Gas savings -- instead of making new vars `repayMax_Eth` and `seizeMax_Eth` just reassign
        repayMax *= uPriceRepay;
        seizeMax *= priceOracle.getUnderlyingPrice(_seizeCToken);

        // Gas savings -- instead of creating new var `repay_Eth = repayMax < seizeMax ? ...` and then
        // converting to underlying units by dividing by uPriceRepay, we can do it all in one step
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
    function liquidate(address _borrower, address _repayCToken, address _seizeCToken, uint _amount) public {
        address pair;
        address r;

        if (_repayCToken == _seizeCToken) {
            r = CErc20Storage(_repayCToken).underlying();
            pair = UniswapV2Library.pairFor(router, r, weth);
        }
        else {
            r = CErc20Storage(_repayCToken).underlying();
            uint maxBorrow;
            (maxBorrow, , pair) = UniswapV2Library.getReservesWithPair(factory, r, CErc20Storage(_seizeCToken).underlying());

            if (_amount * 100000 > maxBorrow * SLIPPAGE_THRESHOLD_FACT) pair = IUniswapV2Factory(factory).getPair(r, WETH);
        }

        // Initiate flash swap
        bytes memory data = abi.encode(_borrower, _repayCToken, _seizeCToken);
        uint amount0 = IUniswapV2Pair(pair).token0() == r ? _amount : 0;
        uint amount1 = IUniswapV2Pair(pair).token1() == r ? _amount : 0;

        IUniswapV2Pair(pair).swap(amount0, amount1, address(this), data);
    }

    /**
     * The function that gets called in the middle of a flash swap
     *
     * @param sender (address): the caller of `swap()`
     * @param amount0 (uint): the amount of token0 being borrowed
     * @param amount1 (uint): the amount of token1 being borrowed
     * @param data (bytes): data passed through from the caller
     */
    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) override external {
        // Unpack parameters sent from the `liquidate` function
        // NOTE: these are being passed in from some other contract, and cannot necessarily be trusted
        (address borrower, address repayCToken, address seizeCToken) = abi.decode(data, (address, address, address));

        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();
        require(msg.sender == IUniswapV2Factory(factory).getPair(token0, token1));

        if (repayCToken == seizeCToken) {
            uint amount = amount0 != 0 ? amount0 : amount1;
            address estuary = amount0 != 0 ? token0 : token1;

            // Perform the liquidation
            IERC20(estuary).safeApprove(repayCToken, amount);
            CErc20(repayCToken).liquidateBorrow(borrower, amount, seizeCToken);

            // Redeem cTokens for underlying ERC20
            CErc20(seizeCToken).redeem(IERC20(seizeCToken).balanceOf(address(this)));

            // Compute debt and pay back pair
            IERC20(estuary).transfer(msg.sender, (amount * 1000 / 997) + 1);
            return;
        }

        uint amount;
        address source;
        address estuary;
        if (amount0 != 0) {
            amount = amount0;
            source = token0;
            estuary = token1;
        } else {
            amount = amount1;
            source = token1;
            estuary = token0;
        }

        // Perform the liquidation
        IERC20(source).safeApprove(repayCToken, amount);
        CErc20(repayCToken).liquidateBorrow(borrower, amount, seizeCToken);

        // Redeem cTokens for underlying ERC20 or ETH
        uint seized_uUnits = CErc20(seizeCToken).balanceOfUnderlying(address(this));
        CErc20(seizeCToken).redeem(IERC20(seizeCToken).balanceOf(address(this)));
        address seizeUToken = CErc20Storage(seizeCToken).underlying();

        // Compute debt
        (uint reserveOut, uint reserveIn) = UniswapV2Library.getReserves(factory, source, estuary);
        uint debt = UniswapV2Library.getAmountIn(amount, reserveIn, reserveOut);

        if (seizeUToken == estuary) {
            // Pay back pair
            IERC20(estuary).transfer(msg.sender, debt);
            return;
        }

        IERC20(seizeUToken).safeApprove(router, seized_uUnits);
        // Define swapping path
        address[] memory path = new address[](2);
        path[0] = seizeUToken;
        path[1] = estuary;
        //                                                  desired, max sent,   path, recipient,     deadline
        IUniswapV2Router02(router).swapTokensForExactTokens(debt, seized_uUnits, path, address(this), now + 1 minutes);
        IERC20(seizeUToken).safeApprove(router, 0);

        // Pay back pair
        IERC20(estuary).transfer(msg.sender, debt);
    }


}