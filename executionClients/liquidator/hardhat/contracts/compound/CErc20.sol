// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

interface CErc20 {
    // function mint(uint mintAmount) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    //function redeemUnderlying(uint redeemAmount) external returns (uint);
    //function borrow(uint borrowAmount) external returns (uint);
    //function repayBorrow(uint repayAmount) external returns (uint);
    // function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint);
    function liquidateBorrow(address borrower, uint repayAmount, address collateral) external returns (uint);
    function borrowBalanceCurrent(address account) external returns (uint);
    function balanceOfUnderlying(address account) external returns (uint);
}

interface CErc20Storage {
    // function borrowBalanceStored(address account) external view returns (uint);
    function underlying() external view returns (address);
    //function exchangeRateStored() external view returns (uint);
    function balanceOf(address owner) external view returns (uint256); // TODO: might not need
}
