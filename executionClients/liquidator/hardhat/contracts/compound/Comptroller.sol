// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

interface Comptroller {
    // function enterMarkets(address[] calldata cTokens) external returns (uint[] memory);
    // function exitMarket(address cToken) external returns (uint);
    function getAssetsIn(address account) external view returns (address[] memory);
    function getAccountLiquidity(address account) external view returns (uint, uint, uint);
    function closeFactorMantissa() external view returns (uint); // in ComptrollerV1Storage
    function liquidationIncentiveMantissa() external view returns (uint); // in ComptrollerV1Storage
    function oracle() external view returns (address); // in ComptrollerV1Storage
}
