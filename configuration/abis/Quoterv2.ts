import { Interface } from '@ethersproject/abi';
import QUOTER from './Quoterv2.json';

// TODO network switch

export const QUOTER_INTERFACE_V2 = new Interface(QUOTER);

export default QUOTER_INTERFACE_V2;
