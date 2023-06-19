import { Interface } from '@ethersproject/abi';
import MARKET from './RubiconMarket.json';

export const MARKET_INTERFACE = new Interface(MARKET);

export default MARKET_INTERFACE;