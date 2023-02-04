import { Interface } from '@ethersproject/abi';
import QUOTER from './Quoter.json';

// TODO network switch

export const QUOTER_INTERFACE = new Interface(QUOTER);

export default QUOTER_INTERFACE;
