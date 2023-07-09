// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;
// TODO: license and version
// TODO: check function signatures to make sure they match up with ours

// For PriceOracle postPrices()
pragma experimental ABIEncoderV2;

interface PriceOracle {
    function getUnderlyingPrice(address cToken) external view returns (uint);
    function postPrices(bytes[] calldata messages, bytes[] calldata signatures, string[] calldata symbols) external;
}
