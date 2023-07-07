// TODO: make sure I'm using the rubi CErc20 ABI in case it's different from compound's
import { Interface } from '@ethersproject/abi';
import CErc20 from './CErc20.json';

export const CERC20_INTERFACE = new Interface(CErc20);

export default CERC20_INTERFACE;