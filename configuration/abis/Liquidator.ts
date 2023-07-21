import { Interface } from '@ethersproject/abi';
import Liquidator from './Liquidator.json'; // TODO: make sure this is the most updated liquidator.  fetch straight from hardhat

export const LIQUIDATOR_INTERFACE = new Interface(Liquidator);

export default LIQUIDATOR_INTERFACE;