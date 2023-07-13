// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

// For PriceOracle postPrices()
//pragma experimental ABIEncoderV2;

interface PriceOracle {
    function getUnderlyingPrice(address cToken) external view returns (uint);
    //function postPrices(bytes[] calldata messages, bytes[] calldata signatures, string[] calldata symbols) external;
}
