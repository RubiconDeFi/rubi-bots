// @ts-nocheck
import { GraphQLResolveInfo, SelectionSetNode, FieldNode, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
import { gql } from '@graphql-mesh/utils';

import type { GetMeshOptions } from '@graphql-mesh/runtime';
import type { YamlConfig } from '@graphql-mesh/types';
import { PubSub } from '@graphql-mesh/utils';
import { DefaultLogger } from '@graphql-mesh/utils';
import MeshCache from "@graphql-mesh/cache-localforage";
import { fetch as fetchFn } from '@whatwg-node/fetch';

import { MeshResolvedSource } from '@graphql-mesh/runtime';
import { MeshTransform, MeshPlugin } from '@graphql-mesh/types';
import GraphqlHandler from "@graphql-mesh/graphql"
import AutoPaginationTransform from "@graphprotocol/client-auto-pagination";
import UsePollingLive from "@graphprotocol/client-polling-live";
import BlockTrackingTransform from "@graphprotocol/client-block-tracking";
import BareMerger from "@graphql-mesh/merger-bare";
import { printWithCache } from '@graphql-mesh/utils';
import { createMeshHTTPHandler, MeshHTTPHandler } from '@graphql-mesh/http';
import { getMesh, ExecuteMeshFn, SubscribeMeshFn, MeshContext as BaseMeshContext, MeshInstance } from '@graphql-mesh/runtime';
import { MeshStore, FsStoreStorageAdapter } from '@graphql-mesh/store';
import { path as pathModule } from '@graphql-mesh/cross-helpers';
import { ImportFn } from '@graphql-mesh/types';
import type { MarketAidOptimismMainnetTypes } from './sources/market-aid-optimism-mainnet/types';
import * as importedModule$0 from "./sources/market-aid-optimism-mainnet/introspectionSchema";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };



/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  BigDecimal: any;
  BigInt: any;
  Bytes: any;
};

export type Aid = {
  /**  the address of the market aid contract  */
  id: Scalars['Bytes'];
  /**  time of creation  */
  created: Scalars['BigInt'];
  /**  map to the token balance entities  */
  balances: Array<AidToken>;
  /**  map to the offer entities  */
  offers: Array<Offer>;
  /**  map to the transaction entities  */
  transactions: Array<Transaction>;
};


export type AidbalancesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<AidToken_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<AidToken_filter>;
};


export type AidoffersArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Offer_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Offer_filter>;
};


export type AidtransactionsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Transaction_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Transaction_filter>;
};

export type AidToken = {
  /**  the address of the market aid contract and the asset address  */
  id: Scalars['Bytes'];
  /**  the market aid entity that this token balance belongs to  */
  aid: Aid;
  /**  map to the token entity of the asset  */
  token: Token;
  /**  the amount of the asset that the market aid contract holds  */
  balance: Scalars['BigInt'];
  /**  the history of the token balance  */
  history: Array<AidTokenHistory>;
};


export type AidTokenhistoryArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<AidTokenHistory_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<AidTokenHistory_filter>;
};

export type AidTokenHistory = {
  /**  the address of the market aid contract, asset address, transaction hash, and log index  */
  id: Scalars['Bytes'];
  /**  the timestamp of the event that resulted in this change in token balance  */
  timestamp: Scalars['BigInt'];
  /**  the market aid entity that this token balance history belongs to  */
  aid: Aid;
  /**  the market aid token entity that this token balance history belongs to  */
  aid_token: AidToken;
  /**  the token entity of the asset  */
  token: Token;
  /**  the amount of the asset that the market aid contract holds, after the change  */
  balance: Scalars['BigInt'];
  /**  the net change in the amount of the asset that the market aid contract has  */
  balance_change: Scalars['BigInt'];
  /**  the event that resulted in this change in token balance, can be either fill, deposit, or withdraw  */
  transaction: Transaction;
  /**  the log index of the event that resulted in this change in token balance  */
  index: Scalars['BigInt'];
  /**  a boolean indicating if the event was a deposit / withdraw  */
  book_update: Scalars['Boolean'];
};

export type AidTokenHistory_filter = {
  id?: InputMaybe<Scalars['Bytes']>;
  id_not?: InputMaybe<Scalars['Bytes']>;
  id_gt?: InputMaybe<Scalars['Bytes']>;
  id_lt?: InputMaybe<Scalars['Bytes']>;
  id_gte?: InputMaybe<Scalars['Bytes']>;
  id_lte?: InputMaybe<Scalars['Bytes']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_contains?: InputMaybe<Scalars['Bytes']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']>;
  timestamp?: InputMaybe<Scalars['BigInt']>;
  timestamp_not?: InputMaybe<Scalars['BigInt']>;
  timestamp_gt?: InputMaybe<Scalars['BigInt']>;
  timestamp_lt?: InputMaybe<Scalars['BigInt']>;
  timestamp_gte?: InputMaybe<Scalars['BigInt']>;
  timestamp_lte?: InputMaybe<Scalars['BigInt']>;
  timestamp_in?: InputMaybe<Array<Scalars['BigInt']>>;
  timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  aid?: InputMaybe<Scalars['String']>;
  aid_not?: InputMaybe<Scalars['String']>;
  aid_gt?: InputMaybe<Scalars['String']>;
  aid_lt?: InputMaybe<Scalars['String']>;
  aid_gte?: InputMaybe<Scalars['String']>;
  aid_lte?: InputMaybe<Scalars['String']>;
  aid_in?: InputMaybe<Array<Scalars['String']>>;
  aid_not_in?: InputMaybe<Array<Scalars['String']>>;
  aid_contains?: InputMaybe<Scalars['String']>;
  aid_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_not_contains?: InputMaybe<Scalars['String']>;
  aid_not_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_starts_with?: InputMaybe<Scalars['String']>;
  aid_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_not_starts_with?: InputMaybe<Scalars['String']>;
  aid_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_ends_with?: InputMaybe<Scalars['String']>;
  aid_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_not_ends_with?: InputMaybe<Scalars['String']>;
  aid_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_?: InputMaybe<Aid_filter>;
  aid_token?: InputMaybe<Scalars['String']>;
  aid_token_not?: InputMaybe<Scalars['String']>;
  aid_token_gt?: InputMaybe<Scalars['String']>;
  aid_token_lt?: InputMaybe<Scalars['String']>;
  aid_token_gte?: InputMaybe<Scalars['String']>;
  aid_token_lte?: InputMaybe<Scalars['String']>;
  aid_token_in?: InputMaybe<Array<Scalars['String']>>;
  aid_token_not_in?: InputMaybe<Array<Scalars['String']>>;
  aid_token_contains?: InputMaybe<Scalars['String']>;
  aid_token_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_token_not_contains?: InputMaybe<Scalars['String']>;
  aid_token_not_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_token_starts_with?: InputMaybe<Scalars['String']>;
  aid_token_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_token_not_starts_with?: InputMaybe<Scalars['String']>;
  aid_token_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_token_ends_with?: InputMaybe<Scalars['String']>;
  aid_token_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_token_not_ends_with?: InputMaybe<Scalars['String']>;
  aid_token_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_token_?: InputMaybe<AidToken_filter>;
  token?: InputMaybe<Scalars['String']>;
  token_not?: InputMaybe<Scalars['String']>;
  token_gt?: InputMaybe<Scalars['String']>;
  token_lt?: InputMaybe<Scalars['String']>;
  token_gte?: InputMaybe<Scalars['String']>;
  token_lte?: InputMaybe<Scalars['String']>;
  token_in?: InputMaybe<Array<Scalars['String']>>;
  token_not_in?: InputMaybe<Array<Scalars['String']>>;
  token_contains?: InputMaybe<Scalars['String']>;
  token_contains_nocase?: InputMaybe<Scalars['String']>;
  token_not_contains?: InputMaybe<Scalars['String']>;
  token_not_contains_nocase?: InputMaybe<Scalars['String']>;
  token_starts_with?: InputMaybe<Scalars['String']>;
  token_starts_with_nocase?: InputMaybe<Scalars['String']>;
  token_not_starts_with?: InputMaybe<Scalars['String']>;
  token_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  token_ends_with?: InputMaybe<Scalars['String']>;
  token_ends_with_nocase?: InputMaybe<Scalars['String']>;
  token_not_ends_with?: InputMaybe<Scalars['String']>;
  token_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  token_?: InputMaybe<Token_filter>;
  balance?: InputMaybe<Scalars['BigInt']>;
  balance_not?: InputMaybe<Scalars['BigInt']>;
  balance_gt?: InputMaybe<Scalars['BigInt']>;
  balance_lt?: InputMaybe<Scalars['BigInt']>;
  balance_gte?: InputMaybe<Scalars['BigInt']>;
  balance_lte?: InputMaybe<Scalars['BigInt']>;
  balance_in?: InputMaybe<Array<Scalars['BigInt']>>;
  balance_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  balance_change?: InputMaybe<Scalars['BigInt']>;
  balance_change_not?: InputMaybe<Scalars['BigInt']>;
  balance_change_gt?: InputMaybe<Scalars['BigInt']>;
  balance_change_lt?: InputMaybe<Scalars['BigInt']>;
  balance_change_gte?: InputMaybe<Scalars['BigInt']>;
  balance_change_lte?: InputMaybe<Scalars['BigInt']>;
  balance_change_in?: InputMaybe<Array<Scalars['BigInt']>>;
  balance_change_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  transaction?: InputMaybe<Scalars['String']>;
  transaction_not?: InputMaybe<Scalars['String']>;
  transaction_gt?: InputMaybe<Scalars['String']>;
  transaction_lt?: InputMaybe<Scalars['String']>;
  transaction_gte?: InputMaybe<Scalars['String']>;
  transaction_lte?: InputMaybe<Scalars['String']>;
  transaction_in?: InputMaybe<Array<Scalars['String']>>;
  transaction_not_in?: InputMaybe<Array<Scalars['String']>>;
  transaction_contains?: InputMaybe<Scalars['String']>;
  transaction_contains_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_contains?: InputMaybe<Scalars['String']>;
  transaction_not_contains_nocase?: InputMaybe<Scalars['String']>;
  transaction_starts_with?: InputMaybe<Scalars['String']>;
  transaction_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_starts_with?: InputMaybe<Scalars['String']>;
  transaction_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_ends_with?: InputMaybe<Scalars['String']>;
  transaction_ends_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_ends_with?: InputMaybe<Scalars['String']>;
  transaction_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_?: InputMaybe<Transaction_filter>;
  index?: InputMaybe<Scalars['BigInt']>;
  index_not?: InputMaybe<Scalars['BigInt']>;
  index_gt?: InputMaybe<Scalars['BigInt']>;
  index_lt?: InputMaybe<Scalars['BigInt']>;
  index_gte?: InputMaybe<Scalars['BigInt']>;
  index_lte?: InputMaybe<Scalars['BigInt']>;
  index_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  book_update?: InputMaybe<Scalars['Boolean']>;
  book_update_not?: InputMaybe<Scalars['Boolean']>;
  book_update_in?: InputMaybe<Array<Scalars['Boolean']>>;
  book_update_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<AidTokenHistory_filter>>>;
  or?: InputMaybe<Array<InputMaybe<AidTokenHistory_filter>>>;
};

export type AidTokenHistory_orderBy =
  | 'id'
  | 'timestamp'
  | 'aid'
  | 'aid__id'
  | 'aid__created'
  | 'aid_token'
  | 'aid_token__id'
  | 'aid_token__balance'
  | 'token'
  | 'token__id'
  | 'token__symbol'
  | 'token__decimals'
  | 'balance'
  | 'balance_change'
  | 'transaction'
  | 'transaction__id'
  | 'transaction__block'
  | 'transaction__index'
  | 'transaction__txn'
  | 'transaction__timestamp'
  | 'transaction__from'
  | 'transaction__eth_price'
  | 'transaction__price_source'
  | 'transaction__l2_gas_price'
  | 'transaction__l2_gas_used'
  | 'transaction__l2_execution_fee'
  | 'transaction__l2_execution_fee_usd'
  | 'transaction__l1_base_fee'
  | 'transaction__l1_gas_used'
  | 'transaction__l1_overhead'
  | 'transaction__l1_scalar'
  | 'transaction__l1_decimal'
  | 'transaction__l1_fee'
  | 'transaction__l1_fee_usd'
  | 'transaction__total_gas_fee'
  | 'transaction__total_gas_fee_usd'
  | 'index'
  | 'book_update';

export type AidToken_filter = {
  id?: InputMaybe<Scalars['Bytes']>;
  id_not?: InputMaybe<Scalars['Bytes']>;
  id_gt?: InputMaybe<Scalars['Bytes']>;
  id_lt?: InputMaybe<Scalars['Bytes']>;
  id_gte?: InputMaybe<Scalars['Bytes']>;
  id_lte?: InputMaybe<Scalars['Bytes']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_contains?: InputMaybe<Scalars['Bytes']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']>;
  aid?: InputMaybe<Scalars['String']>;
  aid_not?: InputMaybe<Scalars['String']>;
  aid_gt?: InputMaybe<Scalars['String']>;
  aid_lt?: InputMaybe<Scalars['String']>;
  aid_gte?: InputMaybe<Scalars['String']>;
  aid_lte?: InputMaybe<Scalars['String']>;
  aid_in?: InputMaybe<Array<Scalars['String']>>;
  aid_not_in?: InputMaybe<Array<Scalars['String']>>;
  aid_contains?: InputMaybe<Scalars['String']>;
  aid_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_not_contains?: InputMaybe<Scalars['String']>;
  aid_not_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_starts_with?: InputMaybe<Scalars['String']>;
  aid_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_not_starts_with?: InputMaybe<Scalars['String']>;
  aid_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_ends_with?: InputMaybe<Scalars['String']>;
  aid_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_not_ends_with?: InputMaybe<Scalars['String']>;
  aid_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_?: InputMaybe<Aid_filter>;
  token?: InputMaybe<Scalars['String']>;
  token_not?: InputMaybe<Scalars['String']>;
  token_gt?: InputMaybe<Scalars['String']>;
  token_lt?: InputMaybe<Scalars['String']>;
  token_gte?: InputMaybe<Scalars['String']>;
  token_lte?: InputMaybe<Scalars['String']>;
  token_in?: InputMaybe<Array<Scalars['String']>>;
  token_not_in?: InputMaybe<Array<Scalars['String']>>;
  token_contains?: InputMaybe<Scalars['String']>;
  token_contains_nocase?: InputMaybe<Scalars['String']>;
  token_not_contains?: InputMaybe<Scalars['String']>;
  token_not_contains_nocase?: InputMaybe<Scalars['String']>;
  token_starts_with?: InputMaybe<Scalars['String']>;
  token_starts_with_nocase?: InputMaybe<Scalars['String']>;
  token_not_starts_with?: InputMaybe<Scalars['String']>;
  token_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  token_ends_with?: InputMaybe<Scalars['String']>;
  token_ends_with_nocase?: InputMaybe<Scalars['String']>;
  token_not_ends_with?: InputMaybe<Scalars['String']>;
  token_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  token_?: InputMaybe<Token_filter>;
  balance?: InputMaybe<Scalars['BigInt']>;
  balance_not?: InputMaybe<Scalars['BigInt']>;
  balance_gt?: InputMaybe<Scalars['BigInt']>;
  balance_lt?: InputMaybe<Scalars['BigInt']>;
  balance_gte?: InputMaybe<Scalars['BigInt']>;
  balance_lte?: InputMaybe<Scalars['BigInt']>;
  balance_in?: InputMaybe<Array<Scalars['BigInt']>>;
  balance_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  history_?: InputMaybe<AidTokenHistory_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<AidToken_filter>>>;
  or?: InputMaybe<Array<InputMaybe<AidToken_filter>>>;
};

export type AidToken_orderBy =
  | 'id'
  | 'aid'
  | 'aid__id'
  | 'aid__created'
  | 'token'
  | 'token__id'
  | 'token__symbol'
  | 'token__decimals'
  | 'balance'
  | 'history';

export type Aid_filter = {
  id?: InputMaybe<Scalars['Bytes']>;
  id_not?: InputMaybe<Scalars['Bytes']>;
  id_gt?: InputMaybe<Scalars['Bytes']>;
  id_lt?: InputMaybe<Scalars['Bytes']>;
  id_gte?: InputMaybe<Scalars['Bytes']>;
  id_lte?: InputMaybe<Scalars['Bytes']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_contains?: InputMaybe<Scalars['Bytes']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']>;
  created?: InputMaybe<Scalars['BigInt']>;
  created_not?: InputMaybe<Scalars['BigInt']>;
  created_gt?: InputMaybe<Scalars['BigInt']>;
  created_lt?: InputMaybe<Scalars['BigInt']>;
  created_gte?: InputMaybe<Scalars['BigInt']>;
  created_lte?: InputMaybe<Scalars['BigInt']>;
  created_in?: InputMaybe<Array<Scalars['BigInt']>>;
  created_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  balances_?: InputMaybe<AidToken_filter>;
  offers_?: InputMaybe<Offer_filter>;
  transactions_?: InputMaybe<Transaction_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Aid_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Aid_filter>>>;
};

export type Aid_orderBy =
  | 'id'
  | 'created'
  | 'balances'
  | 'offers'
  | 'transactions';

export type Arb = {
  /**  the transaction hash and log index of the arb event  */
  id: Scalars['Bytes'];
  /**  the transaction entity that this offer was created from  */
  transaction: Transaction;
  /**  the timestamp of the arb event  */
  timestamp: Scalars['BigInt'];
  /**  the market aid instance that the function was called on  */
  aid: Aid;
  /**  the asset of the trade, this is the asset that profits are calculated in  */
  asset: Token;
  /**  the other asset of the trade, this is the asset that is being traded against  */
  quote: Token;
  /**  the amount of the asset that was traded  */
  amount: Scalars['BigInt'];
  /**  the profit that was a result of the trade, denominated in the asset token  */
  profit: Scalars['BigInt'];
};

export type Arb_filter = {
  id?: InputMaybe<Scalars['Bytes']>;
  id_not?: InputMaybe<Scalars['Bytes']>;
  id_gt?: InputMaybe<Scalars['Bytes']>;
  id_lt?: InputMaybe<Scalars['Bytes']>;
  id_gte?: InputMaybe<Scalars['Bytes']>;
  id_lte?: InputMaybe<Scalars['Bytes']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_contains?: InputMaybe<Scalars['Bytes']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']>;
  transaction?: InputMaybe<Scalars['String']>;
  transaction_not?: InputMaybe<Scalars['String']>;
  transaction_gt?: InputMaybe<Scalars['String']>;
  transaction_lt?: InputMaybe<Scalars['String']>;
  transaction_gte?: InputMaybe<Scalars['String']>;
  transaction_lte?: InputMaybe<Scalars['String']>;
  transaction_in?: InputMaybe<Array<Scalars['String']>>;
  transaction_not_in?: InputMaybe<Array<Scalars['String']>>;
  transaction_contains?: InputMaybe<Scalars['String']>;
  transaction_contains_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_contains?: InputMaybe<Scalars['String']>;
  transaction_not_contains_nocase?: InputMaybe<Scalars['String']>;
  transaction_starts_with?: InputMaybe<Scalars['String']>;
  transaction_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_starts_with?: InputMaybe<Scalars['String']>;
  transaction_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_ends_with?: InputMaybe<Scalars['String']>;
  transaction_ends_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_ends_with?: InputMaybe<Scalars['String']>;
  transaction_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_?: InputMaybe<Transaction_filter>;
  timestamp?: InputMaybe<Scalars['BigInt']>;
  timestamp_not?: InputMaybe<Scalars['BigInt']>;
  timestamp_gt?: InputMaybe<Scalars['BigInt']>;
  timestamp_lt?: InputMaybe<Scalars['BigInt']>;
  timestamp_gte?: InputMaybe<Scalars['BigInt']>;
  timestamp_lte?: InputMaybe<Scalars['BigInt']>;
  timestamp_in?: InputMaybe<Array<Scalars['BigInt']>>;
  timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  aid?: InputMaybe<Scalars['String']>;
  aid_not?: InputMaybe<Scalars['String']>;
  aid_gt?: InputMaybe<Scalars['String']>;
  aid_lt?: InputMaybe<Scalars['String']>;
  aid_gte?: InputMaybe<Scalars['String']>;
  aid_lte?: InputMaybe<Scalars['String']>;
  aid_in?: InputMaybe<Array<Scalars['String']>>;
  aid_not_in?: InputMaybe<Array<Scalars['String']>>;
  aid_contains?: InputMaybe<Scalars['String']>;
  aid_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_not_contains?: InputMaybe<Scalars['String']>;
  aid_not_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_starts_with?: InputMaybe<Scalars['String']>;
  aid_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_not_starts_with?: InputMaybe<Scalars['String']>;
  aid_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_ends_with?: InputMaybe<Scalars['String']>;
  aid_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_not_ends_with?: InputMaybe<Scalars['String']>;
  aid_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_?: InputMaybe<Aid_filter>;
  asset?: InputMaybe<Scalars['String']>;
  asset_not?: InputMaybe<Scalars['String']>;
  asset_gt?: InputMaybe<Scalars['String']>;
  asset_lt?: InputMaybe<Scalars['String']>;
  asset_gte?: InputMaybe<Scalars['String']>;
  asset_lte?: InputMaybe<Scalars['String']>;
  asset_in?: InputMaybe<Array<Scalars['String']>>;
  asset_not_in?: InputMaybe<Array<Scalars['String']>>;
  asset_contains?: InputMaybe<Scalars['String']>;
  asset_contains_nocase?: InputMaybe<Scalars['String']>;
  asset_not_contains?: InputMaybe<Scalars['String']>;
  asset_not_contains_nocase?: InputMaybe<Scalars['String']>;
  asset_starts_with?: InputMaybe<Scalars['String']>;
  asset_starts_with_nocase?: InputMaybe<Scalars['String']>;
  asset_not_starts_with?: InputMaybe<Scalars['String']>;
  asset_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  asset_ends_with?: InputMaybe<Scalars['String']>;
  asset_ends_with_nocase?: InputMaybe<Scalars['String']>;
  asset_not_ends_with?: InputMaybe<Scalars['String']>;
  asset_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  asset_?: InputMaybe<Token_filter>;
  quote?: InputMaybe<Scalars['String']>;
  quote_not?: InputMaybe<Scalars['String']>;
  quote_gt?: InputMaybe<Scalars['String']>;
  quote_lt?: InputMaybe<Scalars['String']>;
  quote_gte?: InputMaybe<Scalars['String']>;
  quote_lte?: InputMaybe<Scalars['String']>;
  quote_in?: InputMaybe<Array<Scalars['String']>>;
  quote_not_in?: InputMaybe<Array<Scalars['String']>>;
  quote_contains?: InputMaybe<Scalars['String']>;
  quote_contains_nocase?: InputMaybe<Scalars['String']>;
  quote_not_contains?: InputMaybe<Scalars['String']>;
  quote_not_contains_nocase?: InputMaybe<Scalars['String']>;
  quote_starts_with?: InputMaybe<Scalars['String']>;
  quote_starts_with_nocase?: InputMaybe<Scalars['String']>;
  quote_not_starts_with?: InputMaybe<Scalars['String']>;
  quote_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  quote_ends_with?: InputMaybe<Scalars['String']>;
  quote_ends_with_nocase?: InputMaybe<Scalars['String']>;
  quote_not_ends_with?: InputMaybe<Scalars['String']>;
  quote_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  quote_?: InputMaybe<Token_filter>;
  amount?: InputMaybe<Scalars['BigInt']>;
  amount_not?: InputMaybe<Scalars['BigInt']>;
  amount_gt?: InputMaybe<Scalars['BigInt']>;
  amount_lt?: InputMaybe<Scalars['BigInt']>;
  amount_gte?: InputMaybe<Scalars['BigInt']>;
  amount_lte?: InputMaybe<Scalars['BigInt']>;
  amount_in?: InputMaybe<Array<Scalars['BigInt']>>;
  amount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  profit?: InputMaybe<Scalars['BigInt']>;
  profit_not?: InputMaybe<Scalars['BigInt']>;
  profit_gt?: InputMaybe<Scalars['BigInt']>;
  profit_lt?: InputMaybe<Scalars['BigInt']>;
  profit_gte?: InputMaybe<Scalars['BigInt']>;
  profit_lte?: InputMaybe<Scalars['BigInt']>;
  profit_in?: InputMaybe<Array<Scalars['BigInt']>>;
  profit_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Arb_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Arb_filter>>>;
};

export type Arb_orderBy =
  | 'id'
  | 'transaction'
  | 'transaction__id'
  | 'transaction__block'
  | 'transaction__index'
  | 'transaction__txn'
  | 'transaction__timestamp'
  | 'transaction__from'
  | 'transaction__eth_price'
  | 'transaction__price_source'
  | 'transaction__l2_gas_price'
  | 'transaction__l2_gas_used'
  | 'transaction__l2_execution_fee'
  | 'transaction__l2_execution_fee_usd'
  | 'transaction__l1_base_fee'
  | 'transaction__l1_gas_used'
  | 'transaction__l1_overhead'
  | 'transaction__l1_scalar'
  | 'transaction__l1_decimal'
  | 'transaction__l1_fee'
  | 'transaction__l1_fee_usd'
  | 'transaction__total_gas_fee'
  | 'transaction__total_gas_fee_usd'
  | 'timestamp'
  | 'aid'
  | 'aid__id'
  | 'aid__created'
  | 'asset'
  | 'asset__id'
  | 'asset__symbol'
  | 'asset__decimals'
  | 'quote'
  | 'quote__id'
  | 'quote__symbol'
  | 'quote__decimals'
  | 'amount'
  | 'profit';

export type BlockChangedFilter = {
  number_gte: Scalars['Int'];
};

export type Block_height = {
  hash?: InputMaybe<Scalars['Bytes']>;
  number?: InputMaybe<Scalars['Int']>;
  number_gte?: InputMaybe<Scalars['Int']>;
};

export type BookUpdate = {
  /**  the market aid address, asset address, and transaction hash  */
  id: Scalars['Bytes'];
  /**  the timestamp of the book update event  */
  timestamp: Scalars['BigInt'];
  /**  the aid entity that this book update belongs to  */
  aid: Aid;
  /**  the market aid token entity that is tracking this asset  */
  aid_token: AidToken;
  /**  the transaction entity that this book was updated from  */
  transaction: Transaction;
  /**  the index of the log that this book update was created from  */
  index: Scalars['BigInt'];
  /**  the amount of the asset that was debited / credited  */
  amount: Scalars['BigInt'];
  /**  the user that sent or received funds from the contract  */
  user?: Maybe<Scalars['Bytes']>;
};

export type BookUpdate_filter = {
  id?: InputMaybe<Scalars['Bytes']>;
  id_not?: InputMaybe<Scalars['Bytes']>;
  id_gt?: InputMaybe<Scalars['Bytes']>;
  id_lt?: InputMaybe<Scalars['Bytes']>;
  id_gte?: InputMaybe<Scalars['Bytes']>;
  id_lte?: InputMaybe<Scalars['Bytes']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_contains?: InputMaybe<Scalars['Bytes']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']>;
  timestamp?: InputMaybe<Scalars['BigInt']>;
  timestamp_not?: InputMaybe<Scalars['BigInt']>;
  timestamp_gt?: InputMaybe<Scalars['BigInt']>;
  timestamp_lt?: InputMaybe<Scalars['BigInt']>;
  timestamp_gte?: InputMaybe<Scalars['BigInt']>;
  timestamp_lte?: InputMaybe<Scalars['BigInt']>;
  timestamp_in?: InputMaybe<Array<Scalars['BigInt']>>;
  timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  aid?: InputMaybe<Scalars['String']>;
  aid_not?: InputMaybe<Scalars['String']>;
  aid_gt?: InputMaybe<Scalars['String']>;
  aid_lt?: InputMaybe<Scalars['String']>;
  aid_gte?: InputMaybe<Scalars['String']>;
  aid_lte?: InputMaybe<Scalars['String']>;
  aid_in?: InputMaybe<Array<Scalars['String']>>;
  aid_not_in?: InputMaybe<Array<Scalars['String']>>;
  aid_contains?: InputMaybe<Scalars['String']>;
  aid_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_not_contains?: InputMaybe<Scalars['String']>;
  aid_not_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_starts_with?: InputMaybe<Scalars['String']>;
  aid_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_not_starts_with?: InputMaybe<Scalars['String']>;
  aid_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_ends_with?: InputMaybe<Scalars['String']>;
  aid_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_not_ends_with?: InputMaybe<Scalars['String']>;
  aid_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_?: InputMaybe<Aid_filter>;
  aid_token?: InputMaybe<Scalars['String']>;
  aid_token_not?: InputMaybe<Scalars['String']>;
  aid_token_gt?: InputMaybe<Scalars['String']>;
  aid_token_lt?: InputMaybe<Scalars['String']>;
  aid_token_gte?: InputMaybe<Scalars['String']>;
  aid_token_lte?: InputMaybe<Scalars['String']>;
  aid_token_in?: InputMaybe<Array<Scalars['String']>>;
  aid_token_not_in?: InputMaybe<Array<Scalars['String']>>;
  aid_token_contains?: InputMaybe<Scalars['String']>;
  aid_token_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_token_not_contains?: InputMaybe<Scalars['String']>;
  aid_token_not_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_token_starts_with?: InputMaybe<Scalars['String']>;
  aid_token_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_token_not_starts_with?: InputMaybe<Scalars['String']>;
  aid_token_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_token_ends_with?: InputMaybe<Scalars['String']>;
  aid_token_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_token_not_ends_with?: InputMaybe<Scalars['String']>;
  aid_token_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_token_?: InputMaybe<AidToken_filter>;
  transaction?: InputMaybe<Scalars['String']>;
  transaction_not?: InputMaybe<Scalars['String']>;
  transaction_gt?: InputMaybe<Scalars['String']>;
  transaction_lt?: InputMaybe<Scalars['String']>;
  transaction_gte?: InputMaybe<Scalars['String']>;
  transaction_lte?: InputMaybe<Scalars['String']>;
  transaction_in?: InputMaybe<Array<Scalars['String']>>;
  transaction_not_in?: InputMaybe<Array<Scalars['String']>>;
  transaction_contains?: InputMaybe<Scalars['String']>;
  transaction_contains_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_contains?: InputMaybe<Scalars['String']>;
  transaction_not_contains_nocase?: InputMaybe<Scalars['String']>;
  transaction_starts_with?: InputMaybe<Scalars['String']>;
  transaction_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_starts_with?: InputMaybe<Scalars['String']>;
  transaction_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_ends_with?: InputMaybe<Scalars['String']>;
  transaction_ends_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_ends_with?: InputMaybe<Scalars['String']>;
  transaction_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_?: InputMaybe<Transaction_filter>;
  index?: InputMaybe<Scalars['BigInt']>;
  index_not?: InputMaybe<Scalars['BigInt']>;
  index_gt?: InputMaybe<Scalars['BigInt']>;
  index_lt?: InputMaybe<Scalars['BigInt']>;
  index_gte?: InputMaybe<Scalars['BigInt']>;
  index_lte?: InputMaybe<Scalars['BigInt']>;
  index_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  amount?: InputMaybe<Scalars['BigInt']>;
  amount_not?: InputMaybe<Scalars['BigInt']>;
  amount_gt?: InputMaybe<Scalars['BigInt']>;
  amount_lt?: InputMaybe<Scalars['BigInt']>;
  amount_gte?: InputMaybe<Scalars['BigInt']>;
  amount_lte?: InputMaybe<Scalars['BigInt']>;
  amount_in?: InputMaybe<Array<Scalars['BigInt']>>;
  amount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  user?: InputMaybe<Scalars['Bytes']>;
  user_not?: InputMaybe<Scalars['Bytes']>;
  user_gt?: InputMaybe<Scalars['Bytes']>;
  user_lt?: InputMaybe<Scalars['Bytes']>;
  user_gte?: InputMaybe<Scalars['Bytes']>;
  user_lte?: InputMaybe<Scalars['Bytes']>;
  user_in?: InputMaybe<Array<Scalars['Bytes']>>;
  user_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  user_contains?: InputMaybe<Scalars['Bytes']>;
  user_not_contains?: InputMaybe<Scalars['Bytes']>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<BookUpdate_filter>>>;
  or?: InputMaybe<Array<InputMaybe<BookUpdate_filter>>>;
};

export type BookUpdate_orderBy =
  | 'id'
  | 'timestamp'
  | 'aid'
  | 'aid__id'
  | 'aid__created'
  | 'aid_token'
  | 'aid_token__id'
  | 'aid_token__balance'
  | 'transaction'
  | 'transaction__id'
  | 'transaction__block'
  | 'transaction__index'
  | 'transaction__txn'
  | 'transaction__timestamp'
  | 'transaction__from'
  | 'transaction__eth_price'
  | 'transaction__price_source'
  | 'transaction__l2_gas_price'
  | 'transaction__l2_gas_used'
  | 'transaction__l2_execution_fee'
  | 'transaction__l2_execution_fee_usd'
  | 'transaction__l1_base_fee'
  | 'transaction__l1_gas_used'
  | 'transaction__l1_overhead'
  | 'transaction__l1_scalar'
  | 'transaction__l1_decimal'
  | 'transaction__l1_fee'
  | 'transaction__l1_fee_usd'
  | 'transaction__total_gas_fee'
  | 'transaction__total_gas_fee_usd'
  | 'index'
  | 'amount'
  | 'user';

export type ExternalSwap = {
  /**  the market aid address, venue address, transaction hash, and log index  */
  id: Scalars['Bytes'];
  /**  the timestamp of the external swap event  */
  timestamp: Scalars['BigInt'];
  /**  the aid entity that this external swap belongs to  */
  aid: Aid;
  /**  the asset that is being sold  */
  asset_sold: Token;
  /**  the asset that is received in exchange  */
  asset_received: Token;
  /**  the amount of the asset that was sold  */
  amount_sold: Scalars['BigInt'];
  /**  the amount of the asset that was received  */
  amount_received: Scalars['BigInt'];
  /**  the transaction entity that this external swap was created from  */
  transaction: Transaction;
  /**  the address of the venue that the swap was made on  */
  venue: Scalars['Bytes'];
};

export type ExternalSwap_filter = {
  id?: InputMaybe<Scalars['Bytes']>;
  id_not?: InputMaybe<Scalars['Bytes']>;
  id_gt?: InputMaybe<Scalars['Bytes']>;
  id_lt?: InputMaybe<Scalars['Bytes']>;
  id_gte?: InputMaybe<Scalars['Bytes']>;
  id_lte?: InputMaybe<Scalars['Bytes']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_contains?: InputMaybe<Scalars['Bytes']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']>;
  timestamp?: InputMaybe<Scalars['BigInt']>;
  timestamp_not?: InputMaybe<Scalars['BigInt']>;
  timestamp_gt?: InputMaybe<Scalars['BigInt']>;
  timestamp_lt?: InputMaybe<Scalars['BigInt']>;
  timestamp_gte?: InputMaybe<Scalars['BigInt']>;
  timestamp_lte?: InputMaybe<Scalars['BigInt']>;
  timestamp_in?: InputMaybe<Array<Scalars['BigInt']>>;
  timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  aid?: InputMaybe<Scalars['String']>;
  aid_not?: InputMaybe<Scalars['String']>;
  aid_gt?: InputMaybe<Scalars['String']>;
  aid_lt?: InputMaybe<Scalars['String']>;
  aid_gte?: InputMaybe<Scalars['String']>;
  aid_lte?: InputMaybe<Scalars['String']>;
  aid_in?: InputMaybe<Array<Scalars['String']>>;
  aid_not_in?: InputMaybe<Array<Scalars['String']>>;
  aid_contains?: InputMaybe<Scalars['String']>;
  aid_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_not_contains?: InputMaybe<Scalars['String']>;
  aid_not_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_starts_with?: InputMaybe<Scalars['String']>;
  aid_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_not_starts_with?: InputMaybe<Scalars['String']>;
  aid_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_ends_with?: InputMaybe<Scalars['String']>;
  aid_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_not_ends_with?: InputMaybe<Scalars['String']>;
  aid_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_?: InputMaybe<Aid_filter>;
  asset_sold?: InputMaybe<Scalars['String']>;
  asset_sold_not?: InputMaybe<Scalars['String']>;
  asset_sold_gt?: InputMaybe<Scalars['String']>;
  asset_sold_lt?: InputMaybe<Scalars['String']>;
  asset_sold_gte?: InputMaybe<Scalars['String']>;
  asset_sold_lte?: InputMaybe<Scalars['String']>;
  asset_sold_in?: InputMaybe<Array<Scalars['String']>>;
  asset_sold_not_in?: InputMaybe<Array<Scalars['String']>>;
  asset_sold_contains?: InputMaybe<Scalars['String']>;
  asset_sold_contains_nocase?: InputMaybe<Scalars['String']>;
  asset_sold_not_contains?: InputMaybe<Scalars['String']>;
  asset_sold_not_contains_nocase?: InputMaybe<Scalars['String']>;
  asset_sold_starts_with?: InputMaybe<Scalars['String']>;
  asset_sold_starts_with_nocase?: InputMaybe<Scalars['String']>;
  asset_sold_not_starts_with?: InputMaybe<Scalars['String']>;
  asset_sold_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  asset_sold_ends_with?: InputMaybe<Scalars['String']>;
  asset_sold_ends_with_nocase?: InputMaybe<Scalars['String']>;
  asset_sold_not_ends_with?: InputMaybe<Scalars['String']>;
  asset_sold_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  asset_sold_?: InputMaybe<Token_filter>;
  asset_received?: InputMaybe<Scalars['String']>;
  asset_received_not?: InputMaybe<Scalars['String']>;
  asset_received_gt?: InputMaybe<Scalars['String']>;
  asset_received_lt?: InputMaybe<Scalars['String']>;
  asset_received_gte?: InputMaybe<Scalars['String']>;
  asset_received_lte?: InputMaybe<Scalars['String']>;
  asset_received_in?: InputMaybe<Array<Scalars['String']>>;
  asset_received_not_in?: InputMaybe<Array<Scalars['String']>>;
  asset_received_contains?: InputMaybe<Scalars['String']>;
  asset_received_contains_nocase?: InputMaybe<Scalars['String']>;
  asset_received_not_contains?: InputMaybe<Scalars['String']>;
  asset_received_not_contains_nocase?: InputMaybe<Scalars['String']>;
  asset_received_starts_with?: InputMaybe<Scalars['String']>;
  asset_received_starts_with_nocase?: InputMaybe<Scalars['String']>;
  asset_received_not_starts_with?: InputMaybe<Scalars['String']>;
  asset_received_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  asset_received_ends_with?: InputMaybe<Scalars['String']>;
  asset_received_ends_with_nocase?: InputMaybe<Scalars['String']>;
  asset_received_not_ends_with?: InputMaybe<Scalars['String']>;
  asset_received_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  asset_received_?: InputMaybe<Token_filter>;
  amount_sold?: InputMaybe<Scalars['BigInt']>;
  amount_sold_not?: InputMaybe<Scalars['BigInt']>;
  amount_sold_gt?: InputMaybe<Scalars['BigInt']>;
  amount_sold_lt?: InputMaybe<Scalars['BigInt']>;
  amount_sold_gte?: InputMaybe<Scalars['BigInt']>;
  amount_sold_lte?: InputMaybe<Scalars['BigInt']>;
  amount_sold_in?: InputMaybe<Array<Scalars['BigInt']>>;
  amount_sold_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  amount_received?: InputMaybe<Scalars['BigInt']>;
  amount_received_not?: InputMaybe<Scalars['BigInt']>;
  amount_received_gt?: InputMaybe<Scalars['BigInt']>;
  amount_received_lt?: InputMaybe<Scalars['BigInt']>;
  amount_received_gte?: InputMaybe<Scalars['BigInt']>;
  amount_received_lte?: InputMaybe<Scalars['BigInt']>;
  amount_received_in?: InputMaybe<Array<Scalars['BigInt']>>;
  amount_received_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  transaction?: InputMaybe<Scalars['String']>;
  transaction_not?: InputMaybe<Scalars['String']>;
  transaction_gt?: InputMaybe<Scalars['String']>;
  transaction_lt?: InputMaybe<Scalars['String']>;
  transaction_gte?: InputMaybe<Scalars['String']>;
  transaction_lte?: InputMaybe<Scalars['String']>;
  transaction_in?: InputMaybe<Array<Scalars['String']>>;
  transaction_not_in?: InputMaybe<Array<Scalars['String']>>;
  transaction_contains?: InputMaybe<Scalars['String']>;
  transaction_contains_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_contains?: InputMaybe<Scalars['String']>;
  transaction_not_contains_nocase?: InputMaybe<Scalars['String']>;
  transaction_starts_with?: InputMaybe<Scalars['String']>;
  transaction_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_starts_with?: InputMaybe<Scalars['String']>;
  transaction_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_ends_with?: InputMaybe<Scalars['String']>;
  transaction_ends_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_ends_with?: InputMaybe<Scalars['String']>;
  transaction_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_?: InputMaybe<Transaction_filter>;
  venue?: InputMaybe<Scalars['Bytes']>;
  venue_not?: InputMaybe<Scalars['Bytes']>;
  venue_gt?: InputMaybe<Scalars['Bytes']>;
  venue_lt?: InputMaybe<Scalars['Bytes']>;
  venue_gte?: InputMaybe<Scalars['Bytes']>;
  venue_lte?: InputMaybe<Scalars['Bytes']>;
  venue_in?: InputMaybe<Array<Scalars['Bytes']>>;
  venue_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  venue_contains?: InputMaybe<Scalars['Bytes']>;
  venue_not_contains?: InputMaybe<Scalars['Bytes']>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<ExternalSwap_filter>>>;
  or?: InputMaybe<Array<InputMaybe<ExternalSwap_filter>>>;
};

export type ExternalSwap_orderBy =
  | 'id'
  | 'timestamp'
  | 'aid'
  | 'aid__id'
  | 'aid__created'
  | 'asset_sold'
  | 'asset_sold__id'
  | 'asset_sold__symbol'
  | 'asset_sold__decimals'
  | 'asset_received'
  | 'asset_received__id'
  | 'asset_received__symbol'
  | 'asset_received__decimals'
  | 'amount_sold'
  | 'amount_received'
  | 'transaction'
  | 'transaction__id'
  | 'transaction__block'
  | 'transaction__index'
  | 'transaction__txn'
  | 'transaction__timestamp'
  | 'transaction__from'
  | 'transaction__eth_price'
  | 'transaction__price_source'
  | 'transaction__l2_gas_price'
  | 'transaction__l2_gas_used'
  | 'transaction__l2_execution_fee'
  | 'transaction__l2_execution_fee_usd'
  | 'transaction__l1_base_fee'
  | 'transaction__l1_gas_used'
  | 'transaction__l1_overhead'
  | 'transaction__l1_scalar'
  | 'transaction__l1_decimal'
  | 'transaction__l1_fee'
  | 'transaction__l1_fee_usd'
  | 'transaction__total_gas_fee'
  | 'transaction__total_gas_fee_usd'
  | 'venue';

export type FeeTakeEntity = {
  /**  the market aid address, asset address, transaction hash, and log index  */
  id: Scalars['Bytes'];
  /**  the timestamp of the fee take event  */
  timestamp: Scalars['BigInt'];
  /**  the aid entity that this fee take belongs to  */
  aid: Aid;
  /**  the asset the fee was taken in  */
  asset: Token;
  /**  the amount of the asset that was taken as a fee  */
  amount: Scalars['BigInt'];
  /**  the transaction entity that this fee take was created from  */
  transaction: Transaction;
};

export type FeeTakeEntity_filter = {
  id?: InputMaybe<Scalars['Bytes']>;
  id_not?: InputMaybe<Scalars['Bytes']>;
  id_gt?: InputMaybe<Scalars['Bytes']>;
  id_lt?: InputMaybe<Scalars['Bytes']>;
  id_gte?: InputMaybe<Scalars['Bytes']>;
  id_lte?: InputMaybe<Scalars['Bytes']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_contains?: InputMaybe<Scalars['Bytes']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']>;
  timestamp?: InputMaybe<Scalars['BigInt']>;
  timestamp_not?: InputMaybe<Scalars['BigInt']>;
  timestamp_gt?: InputMaybe<Scalars['BigInt']>;
  timestamp_lt?: InputMaybe<Scalars['BigInt']>;
  timestamp_gte?: InputMaybe<Scalars['BigInt']>;
  timestamp_lte?: InputMaybe<Scalars['BigInt']>;
  timestamp_in?: InputMaybe<Array<Scalars['BigInt']>>;
  timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  aid?: InputMaybe<Scalars['String']>;
  aid_not?: InputMaybe<Scalars['String']>;
  aid_gt?: InputMaybe<Scalars['String']>;
  aid_lt?: InputMaybe<Scalars['String']>;
  aid_gte?: InputMaybe<Scalars['String']>;
  aid_lte?: InputMaybe<Scalars['String']>;
  aid_in?: InputMaybe<Array<Scalars['String']>>;
  aid_not_in?: InputMaybe<Array<Scalars['String']>>;
  aid_contains?: InputMaybe<Scalars['String']>;
  aid_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_not_contains?: InputMaybe<Scalars['String']>;
  aid_not_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_starts_with?: InputMaybe<Scalars['String']>;
  aid_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_not_starts_with?: InputMaybe<Scalars['String']>;
  aid_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_ends_with?: InputMaybe<Scalars['String']>;
  aid_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_not_ends_with?: InputMaybe<Scalars['String']>;
  aid_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_?: InputMaybe<Aid_filter>;
  asset?: InputMaybe<Scalars['String']>;
  asset_not?: InputMaybe<Scalars['String']>;
  asset_gt?: InputMaybe<Scalars['String']>;
  asset_lt?: InputMaybe<Scalars['String']>;
  asset_gte?: InputMaybe<Scalars['String']>;
  asset_lte?: InputMaybe<Scalars['String']>;
  asset_in?: InputMaybe<Array<Scalars['String']>>;
  asset_not_in?: InputMaybe<Array<Scalars['String']>>;
  asset_contains?: InputMaybe<Scalars['String']>;
  asset_contains_nocase?: InputMaybe<Scalars['String']>;
  asset_not_contains?: InputMaybe<Scalars['String']>;
  asset_not_contains_nocase?: InputMaybe<Scalars['String']>;
  asset_starts_with?: InputMaybe<Scalars['String']>;
  asset_starts_with_nocase?: InputMaybe<Scalars['String']>;
  asset_not_starts_with?: InputMaybe<Scalars['String']>;
  asset_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  asset_ends_with?: InputMaybe<Scalars['String']>;
  asset_ends_with_nocase?: InputMaybe<Scalars['String']>;
  asset_not_ends_with?: InputMaybe<Scalars['String']>;
  asset_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  asset_?: InputMaybe<Token_filter>;
  amount?: InputMaybe<Scalars['BigInt']>;
  amount_not?: InputMaybe<Scalars['BigInt']>;
  amount_gt?: InputMaybe<Scalars['BigInt']>;
  amount_lt?: InputMaybe<Scalars['BigInt']>;
  amount_gte?: InputMaybe<Scalars['BigInt']>;
  amount_lte?: InputMaybe<Scalars['BigInt']>;
  amount_in?: InputMaybe<Array<Scalars['BigInt']>>;
  amount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  transaction?: InputMaybe<Scalars['String']>;
  transaction_not?: InputMaybe<Scalars['String']>;
  transaction_gt?: InputMaybe<Scalars['String']>;
  transaction_lt?: InputMaybe<Scalars['String']>;
  transaction_gte?: InputMaybe<Scalars['String']>;
  transaction_lte?: InputMaybe<Scalars['String']>;
  transaction_in?: InputMaybe<Array<Scalars['String']>>;
  transaction_not_in?: InputMaybe<Array<Scalars['String']>>;
  transaction_contains?: InputMaybe<Scalars['String']>;
  transaction_contains_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_contains?: InputMaybe<Scalars['String']>;
  transaction_not_contains_nocase?: InputMaybe<Scalars['String']>;
  transaction_starts_with?: InputMaybe<Scalars['String']>;
  transaction_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_starts_with?: InputMaybe<Scalars['String']>;
  transaction_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_ends_with?: InputMaybe<Scalars['String']>;
  transaction_ends_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_ends_with?: InputMaybe<Scalars['String']>;
  transaction_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_?: InputMaybe<Transaction_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<FeeTakeEntity_filter>>>;
  or?: InputMaybe<Array<InputMaybe<FeeTakeEntity_filter>>>;
};

export type FeeTakeEntity_orderBy =
  | 'id'
  | 'timestamp'
  | 'aid'
  | 'aid__id'
  | 'aid__created'
  | 'asset'
  | 'asset__id'
  | 'asset__symbol'
  | 'asset__decimals'
  | 'amount'
  | 'transaction'
  | 'transaction__id'
  | 'transaction__block'
  | 'transaction__index'
  | 'transaction__txn'
  | 'transaction__timestamp'
  | 'transaction__from'
  | 'transaction__eth_price'
  | 'transaction__price_source'
  | 'transaction__l2_gas_price'
  | 'transaction__l2_gas_used'
  | 'transaction__l2_execution_fee'
  | 'transaction__l2_execution_fee_usd'
  | 'transaction__l1_base_fee'
  | 'transaction__l1_gas_used'
  | 'transaction__l1_overhead'
  | 'transaction__l1_scalar'
  | 'transaction__l1_decimal'
  | 'transaction__l1_fee'
  | 'transaction__l1_fee_usd'
  | 'transaction__total_gas_fee'
  | 'transaction__total_gas_fee_usd';

export type Offer = {
  /**  the id of the offer on the RubiconMarket contract  */
  id: Scalars['ID'];
  /**  the transaction entity that this offer was created from  */
  transaction: Transaction;
  /**  the market aid entity that created this offer  */
  maker: Aid;
  /**  the token that the offer will pay with  */
  pay_gem: Token;
  /**  the token that the maker offers to buy  */
  buy_gem: Token;
  /**  the amount of the pay token that the offer will pay - in the integer format  */
  pay_amt: Scalars['BigInt'];
  /**  the amount of the buy token that the offer will buy - in the integer format  */
  buy_amt: Scalars['BigInt'];
  /**  the amount of the pay token that the offer has paid out - in the integer format  */
  paid_amt: Scalars['BigInt'];
  /**  the amount of the buy token that the offer has bought - in the integer format  */
  bought_amt: Scalars['BigInt'];
  /**  boolean indicating if the offer was filled or not  */
  filled: Scalars['Boolean'];
  /**  boolean indicating if the offer was cancelled or not  */
  cancelled: Scalars['Boolean'];
  /**  boolean indicating if the offer is live or not  */
  live: Scalars['Boolean'];
  /**  the timestamp that offer was removed at */
  removed_timestamp?: Maybe<Scalars['BigInt']>;
  /**  the take events from this offer  */
  takes: Array<Take>;
};


export type OffertakesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Take_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Take_filter>;
};

export type Offer_filter = {
  id?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  transaction?: InputMaybe<Scalars['String']>;
  transaction_not?: InputMaybe<Scalars['String']>;
  transaction_gt?: InputMaybe<Scalars['String']>;
  transaction_lt?: InputMaybe<Scalars['String']>;
  transaction_gte?: InputMaybe<Scalars['String']>;
  transaction_lte?: InputMaybe<Scalars['String']>;
  transaction_in?: InputMaybe<Array<Scalars['String']>>;
  transaction_not_in?: InputMaybe<Array<Scalars['String']>>;
  transaction_contains?: InputMaybe<Scalars['String']>;
  transaction_contains_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_contains?: InputMaybe<Scalars['String']>;
  transaction_not_contains_nocase?: InputMaybe<Scalars['String']>;
  transaction_starts_with?: InputMaybe<Scalars['String']>;
  transaction_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_starts_with?: InputMaybe<Scalars['String']>;
  transaction_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_ends_with?: InputMaybe<Scalars['String']>;
  transaction_ends_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_ends_with?: InputMaybe<Scalars['String']>;
  transaction_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_?: InputMaybe<Transaction_filter>;
  maker?: InputMaybe<Scalars['String']>;
  maker_not?: InputMaybe<Scalars['String']>;
  maker_gt?: InputMaybe<Scalars['String']>;
  maker_lt?: InputMaybe<Scalars['String']>;
  maker_gte?: InputMaybe<Scalars['String']>;
  maker_lte?: InputMaybe<Scalars['String']>;
  maker_in?: InputMaybe<Array<Scalars['String']>>;
  maker_not_in?: InputMaybe<Array<Scalars['String']>>;
  maker_contains?: InputMaybe<Scalars['String']>;
  maker_contains_nocase?: InputMaybe<Scalars['String']>;
  maker_not_contains?: InputMaybe<Scalars['String']>;
  maker_not_contains_nocase?: InputMaybe<Scalars['String']>;
  maker_starts_with?: InputMaybe<Scalars['String']>;
  maker_starts_with_nocase?: InputMaybe<Scalars['String']>;
  maker_not_starts_with?: InputMaybe<Scalars['String']>;
  maker_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  maker_ends_with?: InputMaybe<Scalars['String']>;
  maker_ends_with_nocase?: InputMaybe<Scalars['String']>;
  maker_not_ends_with?: InputMaybe<Scalars['String']>;
  maker_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  maker_?: InputMaybe<Aid_filter>;
  pay_gem?: InputMaybe<Scalars['String']>;
  pay_gem_not?: InputMaybe<Scalars['String']>;
  pay_gem_gt?: InputMaybe<Scalars['String']>;
  pay_gem_lt?: InputMaybe<Scalars['String']>;
  pay_gem_gte?: InputMaybe<Scalars['String']>;
  pay_gem_lte?: InputMaybe<Scalars['String']>;
  pay_gem_in?: InputMaybe<Array<Scalars['String']>>;
  pay_gem_not_in?: InputMaybe<Array<Scalars['String']>>;
  pay_gem_contains?: InputMaybe<Scalars['String']>;
  pay_gem_contains_nocase?: InputMaybe<Scalars['String']>;
  pay_gem_not_contains?: InputMaybe<Scalars['String']>;
  pay_gem_not_contains_nocase?: InputMaybe<Scalars['String']>;
  pay_gem_starts_with?: InputMaybe<Scalars['String']>;
  pay_gem_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pay_gem_not_starts_with?: InputMaybe<Scalars['String']>;
  pay_gem_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pay_gem_ends_with?: InputMaybe<Scalars['String']>;
  pay_gem_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pay_gem_not_ends_with?: InputMaybe<Scalars['String']>;
  pay_gem_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pay_gem_?: InputMaybe<Token_filter>;
  buy_gem?: InputMaybe<Scalars['String']>;
  buy_gem_not?: InputMaybe<Scalars['String']>;
  buy_gem_gt?: InputMaybe<Scalars['String']>;
  buy_gem_lt?: InputMaybe<Scalars['String']>;
  buy_gem_gte?: InputMaybe<Scalars['String']>;
  buy_gem_lte?: InputMaybe<Scalars['String']>;
  buy_gem_in?: InputMaybe<Array<Scalars['String']>>;
  buy_gem_not_in?: InputMaybe<Array<Scalars['String']>>;
  buy_gem_contains?: InputMaybe<Scalars['String']>;
  buy_gem_contains_nocase?: InputMaybe<Scalars['String']>;
  buy_gem_not_contains?: InputMaybe<Scalars['String']>;
  buy_gem_not_contains_nocase?: InputMaybe<Scalars['String']>;
  buy_gem_starts_with?: InputMaybe<Scalars['String']>;
  buy_gem_starts_with_nocase?: InputMaybe<Scalars['String']>;
  buy_gem_not_starts_with?: InputMaybe<Scalars['String']>;
  buy_gem_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  buy_gem_ends_with?: InputMaybe<Scalars['String']>;
  buy_gem_ends_with_nocase?: InputMaybe<Scalars['String']>;
  buy_gem_not_ends_with?: InputMaybe<Scalars['String']>;
  buy_gem_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  buy_gem_?: InputMaybe<Token_filter>;
  pay_amt?: InputMaybe<Scalars['BigInt']>;
  pay_amt_not?: InputMaybe<Scalars['BigInt']>;
  pay_amt_gt?: InputMaybe<Scalars['BigInt']>;
  pay_amt_lt?: InputMaybe<Scalars['BigInt']>;
  pay_amt_gte?: InputMaybe<Scalars['BigInt']>;
  pay_amt_lte?: InputMaybe<Scalars['BigInt']>;
  pay_amt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  pay_amt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  buy_amt?: InputMaybe<Scalars['BigInt']>;
  buy_amt_not?: InputMaybe<Scalars['BigInt']>;
  buy_amt_gt?: InputMaybe<Scalars['BigInt']>;
  buy_amt_lt?: InputMaybe<Scalars['BigInt']>;
  buy_amt_gte?: InputMaybe<Scalars['BigInt']>;
  buy_amt_lte?: InputMaybe<Scalars['BigInt']>;
  buy_amt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  buy_amt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  paid_amt?: InputMaybe<Scalars['BigInt']>;
  paid_amt_not?: InputMaybe<Scalars['BigInt']>;
  paid_amt_gt?: InputMaybe<Scalars['BigInt']>;
  paid_amt_lt?: InputMaybe<Scalars['BigInt']>;
  paid_amt_gte?: InputMaybe<Scalars['BigInt']>;
  paid_amt_lte?: InputMaybe<Scalars['BigInt']>;
  paid_amt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  paid_amt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  bought_amt?: InputMaybe<Scalars['BigInt']>;
  bought_amt_not?: InputMaybe<Scalars['BigInt']>;
  bought_amt_gt?: InputMaybe<Scalars['BigInt']>;
  bought_amt_lt?: InputMaybe<Scalars['BigInt']>;
  bought_amt_gte?: InputMaybe<Scalars['BigInt']>;
  bought_amt_lte?: InputMaybe<Scalars['BigInt']>;
  bought_amt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  bought_amt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  filled?: InputMaybe<Scalars['Boolean']>;
  filled_not?: InputMaybe<Scalars['Boolean']>;
  filled_in?: InputMaybe<Array<Scalars['Boolean']>>;
  filled_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  cancelled?: InputMaybe<Scalars['Boolean']>;
  cancelled_not?: InputMaybe<Scalars['Boolean']>;
  cancelled_in?: InputMaybe<Array<Scalars['Boolean']>>;
  cancelled_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  live?: InputMaybe<Scalars['Boolean']>;
  live_not?: InputMaybe<Scalars['Boolean']>;
  live_in?: InputMaybe<Array<Scalars['Boolean']>>;
  live_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  removed_timestamp?: InputMaybe<Scalars['BigInt']>;
  removed_timestamp_not?: InputMaybe<Scalars['BigInt']>;
  removed_timestamp_gt?: InputMaybe<Scalars['BigInt']>;
  removed_timestamp_lt?: InputMaybe<Scalars['BigInt']>;
  removed_timestamp_gte?: InputMaybe<Scalars['BigInt']>;
  removed_timestamp_lte?: InputMaybe<Scalars['BigInt']>;
  removed_timestamp_in?: InputMaybe<Array<Scalars['BigInt']>>;
  removed_timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  takes_?: InputMaybe<Take_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Offer_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Offer_filter>>>;
};

export type Offer_orderBy =
  | 'id'
  | 'transaction'
  | 'transaction__id'
  | 'transaction__block'
  | 'transaction__index'
  | 'transaction__txn'
  | 'transaction__timestamp'
  | 'transaction__from'
  | 'transaction__eth_price'
  | 'transaction__price_source'
  | 'transaction__l2_gas_price'
  | 'transaction__l2_gas_used'
  | 'transaction__l2_execution_fee'
  | 'transaction__l2_execution_fee_usd'
  | 'transaction__l1_base_fee'
  | 'transaction__l1_gas_used'
  | 'transaction__l1_overhead'
  | 'transaction__l1_scalar'
  | 'transaction__l1_decimal'
  | 'transaction__l1_fee'
  | 'transaction__l1_fee_usd'
  | 'transaction__total_gas_fee'
  | 'transaction__total_gas_fee_usd'
  | 'maker'
  | 'maker__id'
  | 'maker__created'
  | 'pay_gem'
  | 'pay_gem__id'
  | 'pay_gem__symbol'
  | 'pay_gem__decimals'
  | 'buy_gem'
  | 'buy_gem__id'
  | 'buy_gem__symbol'
  | 'buy_gem__decimals'
  | 'pay_amt'
  | 'buy_amt'
  | 'paid_amt'
  | 'bought_amt'
  | 'filled'
  | 'cancelled'
  | 'live'
  | 'removed_timestamp'
  | 'takes';

/** Defines the order direction, either ascending or descending */
export type OrderDirection =
  | 'asc'
  | 'desc';

export type Query = {
  aid?: Maybe<Aid>;
  aids: Array<Aid>;
  aidToken?: Maybe<AidToken>;
  aidTokens: Array<AidToken>;
  aidTokenHistory?: Maybe<AidTokenHistory>;
  aidTokenHistories: Array<AidTokenHistory>;
  transaction?: Maybe<Transaction>;
  transactions: Array<Transaction>;
  offer?: Maybe<Offer>;
  offers: Array<Offer>;
  take?: Maybe<Take>;
  takes: Array<Take>;
  arb?: Maybe<Arb>;
  arbs: Array<Arb>;
  bookUpdate?: Maybe<BookUpdate>;
  bookUpdates: Array<BookUpdate>;
  externalSwap?: Maybe<ExternalSwap>;
  externalSwaps: Array<ExternalSwap>;
  feeTakeEntity?: Maybe<FeeTakeEntity>;
  feeTakeEntities: Array<FeeTakeEntity>;
  token?: Maybe<Token>;
  tokens: Array<Token>;
  /** Access to subgraph metadata */
  _meta?: Maybe<_Meta_>;
};


export type QueryaidArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryaidsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Aid_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Aid_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryaidTokenArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryaidTokensArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<AidToken_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<AidToken_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryaidTokenHistoryArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryaidTokenHistoriesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<AidTokenHistory_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<AidTokenHistory_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerytransactionArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerytransactionsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Transaction_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Transaction_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryofferArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryoffersArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Offer_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Offer_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerytakeArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerytakesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Take_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Take_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryarbArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryarbsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Arb_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Arb_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerybookUpdateArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerybookUpdatesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<BookUpdate_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<BookUpdate_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryexternalSwapArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryexternalSwapsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ExternalSwap_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<ExternalSwap_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryfeeTakeEntityArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryfeeTakeEntitiesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<FeeTakeEntity_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<FeeTakeEntity_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerytokenArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerytokensArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Token_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Token_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_metaArgs = {
  block?: InputMaybe<Block_height>;
};

export type Subscription = {
  aid?: Maybe<Aid>;
  aids: Array<Aid>;
  aidToken?: Maybe<AidToken>;
  aidTokens: Array<AidToken>;
  aidTokenHistory?: Maybe<AidTokenHistory>;
  aidTokenHistories: Array<AidTokenHistory>;
  transaction?: Maybe<Transaction>;
  transactions: Array<Transaction>;
  offer?: Maybe<Offer>;
  offers: Array<Offer>;
  take?: Maybe<Take>;
  takes: Array<Take>;
  arb?: Maybe<Arb>;
  arbs: Array<Arb>;
  bookUpdate?: Maybe<BookUpdate>;
  bookUpdates: Array<BookUpdate>;
  externalSwap?: Maybe<ExternalSwap>;
  externalSwaps: Array<ExternalSwap>;
  feeTakeEntity?: Maybe<FeeTakeEntity>;
  feeTakeEntities: Array<FeeTakeEntity>;
  token?: Maybe<Token>;
  tokens: Array<Token>;
  /** Access to subgraph metadata */
  _meta?: Maybe<_Meta_>;
};


export type SubscriptionaidArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionaidsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Aid_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Aid_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionaidTokenArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionaidTokensArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<AidToken_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<AidToken_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionaidTokenHistoryArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionaidTokenHistoriesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<AidTokenHistory_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<AidTokenHistory_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiontransactionArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiontransactionsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Transaction_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Transaction_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionofferArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionoffersArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Offer_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Offer_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiontakeArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiontakesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Take_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Take_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionarbArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionarbsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Arb_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Arb_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionbookUpdateArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionbookUpdatesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<BookUpdate_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<BookUpdate_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionexternalSwapArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionexternalSwapsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ExternalSwap_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<ExternalSwap_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionfeeTakeEntityArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionfeeTakeEntitiesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<FeeTakeEntity_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<FeeTakeEntity_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiontokenArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiontokensArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Token_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Token_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_metaArgs = {
  block?: InputMaybe<Block_height>;
};

export type Take = {
  /**  the transaction hash and log index of the take event  */
  id: Scalars['Bytes'];
  /**  the transaction entity that this offer was created from  */
  transaction: Transaction;
  /**  the user entity that took the offer  */
  taker: Scalars['Bytes'];
  /**  the token that the offer will pay with - what the taker receives  */
  pay_gem: Token;
  /**  the token that the offer offer to buy - what the taker pays */
  buy_gem: Token;
  /**  the amount of the pay token that the offer will pay - in the integer format - the amount the taker receives  */
  pay_amt: Scalars['BigInt'];
  /**  the amount of the buy token that the offer will buy - in the integer format - the amount the taker pays */
  buy_amt: Scalars['BigInt'];
  /**  the offer id that was taken  */
  offer_id: Scalars['String'];
  /**  the offer entity that was taken, if it is a market aid offer  */
  offer?: Maybe<Offer>;
};

export type Take_filter = {
  id?: InputMaybe<Scalars['Bytes']>;
  id_not?: InputMaybe<Scalars['Bytes']>;
  id_gt?: InputMaybe<Scalars['Bytes']>;
  id_lt?: InputMaybe<Scalars['Bytes']>;
  id_gte?: InputMaybe<Scalars['Bytes']>;
  id_lte?: InputMaybe<Scalars['Bytes']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_contains?: InputMaybe<Scalars['Bytes']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']>;
  transaction?: InputMaybe<Scalars['String']>;
  transaction_not?: InputMaybe<Scalars['String']>;
  transaction_gt?: InputMaybe<Scalars['String']>;
  transaction_lt?: InputMaybe<Scalars['String']>;
  transaction_gte?: InputMaybe<Scalars['String']>;
  transaction_lte?: InputMaybe<Scalars['String']>;
  transaction_in?: InputMaybe<Array<Scalars['String']>>;
  transaction_not_in?: InputMaybe<Array<Scalars['String']>>;
  transaction_contains?: InputMaybe<Scalars['String']>;
  transaction_contains_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_contains?: InputMaybe<Scalars['String']>;
  transaction_not_contains_nocase?: InputMaybe<Scalars['String']>;
  transaction_starts_with?: InputMaybe<Scalars['String']>;
  transaction_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_starts_with?: InputMaybe<Scalars['String']>;
  transaction_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_ends_with?: InputMaybe<Scalars['String']>;
  transaction_ends_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_not_ends_with?: InputMaybe<Scalars['String']>;
  transaction_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  transaction_?: InputMaybe<Transaction_filter>;
  taker?: InputMaybe<Scalars['Bytes']>;
  taker_not?: InputMaybe<Scalars['Bytes']>;
  taker_gt?: InputMaybe<Scalars['Bytes']>;
  taker_lt?: InputMaybe<Scalars['Bytes']>;
  taker_gte?: InputMaybe<Scalars['Bytes']>;
  taker_lte?: InputMaybe<Scalars['Bytes']>;
  taker_in?: InputMaybe<Array<Scalars['Bytes']>>;
  taker_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  taker_contains?: InputMaybe<Scalars['Bytes']>;
  taker_not_contains?: InputMaybe<Scalars['Bytes']>;
  pay_gem?: InputMaybe<Scalars['String']>;
  pay_gem_not?: InputMaybe<Scalars['String']>;
  pay_gem_gt?: InputMaybe<Scalars['String']>;
  pay_gem_lt?: InputMaybe<Scalars['String']>;
  pay_gem_gte?: InputMaybe<Scalars['String']>;
  pay_gem_lte?: InputMaybe<Scalars['String']>;
  pay_gem_in?: InputMaybe<Array<Scalars['String']>>;
  pay_gem_not_in?: InputMaybe<Array<Scalars['String']>>;
  pay_gem_contains?: InputMaybe<Scalars['String']>;
  pay_gem_contains_nocase?: InputMaybe<Scalars['String']>;
  pay_gem_not_contains?: InputMaybe<Scalars['String']>;
  pay_gem_not_contains_nocase?: InputMaybe<Scalars['String']>;
  pay_gem_starts_with?: InputMaybe<Scalars['String']>;
  pay_gem_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pay_gem_not_starts_with?: InputMaybe<Scalars['String']>;
  pay_gem_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pay_gem_ends_with?: InputMaybe<Scalars['String']>;
  pay_gem_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pay_gem_not_ends_with?: InputMaybe<Scalars['String']>;
  pay_gem_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pay_gem_?: InputMaybe<Token_filter>;
  buy_gem?: InputMaybe<Scalars['String']>;
  buy_gem_not?: InputMaybe<Scalars['String']>;
  buy_gem_gt?: InputMaybe<Scalars['String']>;
  buy_gem_lt?: InputMaybe<Scalars['String']>;
  buy_gem_gte?: InputMaybe<Scalars['String']>;
  buy_gem_lte?: InputMaybe<Scalars['String']>;
  buy_gem_in?: InputMaybe<Array<Scalars['String']>>;
  buy_gem_not_in?: InputMaybe<Array<Scalars['String']>>;
  buy_gem_contains?: InputMaybe<Scalars['String']>;
  buy_gem_contains_nocase?: InputMaybe<Scalars['String']>;
  buy_gem_not_contains?: InputMaybe<Scalars['String']>;
  buy_gem_not_contains_nocase?: InputMaybe<Scalars['String']>;
  buy_gem_starts_with?: InputMaybe<Scalars['String']>;
  buy_gem_starts_with_nocase?: InputMaybe<Scalars['String']>;
  buy_gem_not_starts_with?: InputMaybe<Scalars['String']>;
  buy_gem_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  buy_gem_ends_with?: InputMaybe<Scalars['String']>;
  buy_gem_ends_with_nocase?: InputMaybe<Scalars['String']>;
  buy_gem_not_ends_with?: InputMaybe<Scalars['String']>;
  buy_gem_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  buy_gem_?: InputMaybe<Token_filter>;
  pay_amt?: InputMaybe<Scalars['BigInt']>;
  pay_amt_not?: InputMaybe<Scalars['BigInt']>;
  pay_amt_gt?: InputMaybe<Scalars['BigInt']>;
  pay_amt_lt?: InputMaybe<Scalars['BigInt']>;
  pay_amt_gte?: InputMaybe<Scalars['BigInt']>;
  pay_amt_lte?: InputMaybe<Scalars['BigInt']>;
  pay_amt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  pay_amt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  buy_amt?: InputMaybe<Scalars['BigInt']>;
  buy_amt_not?: InputMaybe<Scalars['BigInt']>;
  buy_amt_gt?: InputMaybe<Scalars['BigInt']>;
  buy_amt_lt?: InputMaybe<Scalars['BigInt']>;
  buy_amt_gte?: InputMaybe<Scalars['BigInt']>;
  buy_amt_lte?: InputMaybe<Scalars['BigInt']>;
  buy_amt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  buy_amt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  offer_id?: InputMaybe<Scalars['String']>;
  offer_id_not?: InputMaybe<Scalars['String']>;
  offer_id_gt?: InputMaybe<Scalars['String']>;
  offer_id_lt?: InputMaybe<Scalars['String']>;
  offer_id_gte?: InputMaybe<Scalars['String']>;
  offer_id_lte?: InputMaybe<Scalars['String']>;
  offer_id_in?: InputMaybe<Array<Scalars['String']>>;
  offer_id_not_in?: InputMaybe<Array<Scalars['String']>>;
  offer_id_contains?: InputMaybe<Scalars['String']>;
  offer_id_contains_nocase?: InputMaybe<Scalars['String']>;
  offer_id_not_contains?: InputMaybe<Scalars['String']>;
  offer_id_not_contains_nocase?: InputMaybe<Scalars['String']>;
  offer_id_starts_with?: InputMaybe<Scalars['String']>;
  offer_id_starts_with_nocase?: InputMaybe<Scalars['String']>;
  offer_id_not_starts_with?: InputMaybe<Scalars['String']>;
  offer_id_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  offer_id_ends_with?: InputMaybe<Scalars['String']>;
  offer_id_ends_with_nocase?: InputMaybe<Scalars['String']>;
  offer_id_not_ends_with?: InputMaybe<Scalars['String']>;
  offer_id_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  offer?: InputMaybe<Scalars['String']>;
  offer_not?: InputMaybe<Scalars['String']>;
  offer_gt?: InputMaybe<Scalars['String']>;
  offer_lt?: InputMaybe<Scalars['String']>;
  offer_gte?: InputMaybe<Scalars['String']>;
  offer_lte?: InputMaybe<Scalars['String']>;
  offer_in?: InputMaybe<Array<Scalars['String']>>;
  offer_not_in?: InputMaybe<Array<Scalars['String']>>;
  offer_contains?: InputMaybe<Scalars['String']>;
  offer_contains_nocase?: InputMaybe<Scalars['String']>;
  offer_not_contains?: InputMaybe<Scalars['String']>;
  offer_not_contains_nocase?: InputMaybe<Scalars['String']>;
  offer_starts_with?: InputMaybe<Scalars['String']>;
  offer_starts_with_nocase?: InputMaybe<Scalars['String']>;
  offer_not_starts_with?: InputMaybe<Scalars['String']>;
  offer_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  offer_ends_with?: InputMaybe<Scalars['String']>;
  offer_ends_with_nocase?: InputMaybe<Scalars['String']>;
  offer_not_ends_with?: InputMaybe<Scalars['String']>;
  offer_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  offer_?: InputMaybe<Offer_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Take_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Take_filter>>>;
};

export type Take_orderBy =
  | 'id'
  | 'transaction'
  | 'transaction__id'
  | 'transaction__block'
  | 'transaction__index'
  | 'transaction__txn'
  | 'transaction__timestamp'
  | 'transaction__from'
  | 'transaction__eth_price'
  | 'transaction__price_source'
  | 'transaction__l2_gas_price'
  | 'transaction__l2_gas_used'
  | 'transaction__l2_execution_fee'
  | 'transaction__l2_execution_fee_usd'
  | 'transaction__l1_base_fee'
  | 'transaction__l1_gas_used'
  | 'transaction__l1_overhead'
  | 'transaction__l1_scalar'
  | 'transaction__l1_decimal'
  | 'transaction__l1_fee'
  | 'transaction__l1_fee_usd'
  | 'transaction__total_gas_fee'
  | 'transaction__total_gas_fee_usd'
  | 'taker'
  | 'pay_gem'
  | 'pay_gem__id'
  | 'pay_gem__symbol'
  | 'pay_gem__decimals'
  | 'buy_gem'
  | 'buy_gem__id'
  | 'buy_gem__symbol'
  | 'buy_gem__decimals'
  | 'pay_amt'
  | 'buy_amt'
  | 'offer_id'
  | 'offer'
  | 'offer__id'
  | 'offer__pay_amt'
  | 'offer__buy_amt'
  | 'offer__paid_amt'
  | 'offer__bought_amt'
  | 'offer__filled'
  | 'offer__cancelled'
  | 'offer__live'
  | 'offer__removed_timestamp';

export type Token = {
  /**  address of the token  */
  id: Scalars['Bytes'];
  /**  symbol of the token  */
  symbol: Scalars['String'];
  /**  decimals of the token  */
  decimals: Scalars['BigInt'];
};

export type Token_filter = {
  id?: InputMaybe<Scalars['Bytes']>;
  id_not?: InputMaybe<Scalars['Bytes']>;
  id_gt?: InputMaybe<Scalars['Bytes']>;
  id_lt?: InputMaybe<Scalars['Bytes']>;
  id_gte?: InputMaybe<Scalars['Bytes']>;
  id_lte?: InputMaybe<Scalars['Bytes']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_contains?: InputMaybe<Scalars['Bytes']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']>;
  symbol?: InputMaybe<Scalars['String']>;
  symbol_not?: InputMaybe<Scalars['String']>;
  symbol_gt?: InputMaybe<Scalars['String']>;
  symbol_lt?: InputMaybe<Scalars['String']>;
  symbol_gte?: InputMaybe<Scalars['String']>;
  symbol_lte?: InputMaybe<Scalars['String']>;
  symbol_in?: InputMaybe<Array<Scalars['String']>>;
  symbol_not_in?: InputMaybe<Array<Scalars['String']>>;
  symbol_contains?: InputMaybe<Scalars['String']>;
  symbol_contains_nocase?: InputMaybe<Scalars['String']>;
  symbol_not_contains?: InputMaybe<Scalars['String']>;
  symbol_not_contains_nocase?: InputMaybe<Scalars['String']>;
  symbol_starts_with?: InputMaybe<Scalars['String']>;
  symbol_starts_with_nocase?: InputMaybe<Scalars['String']>;
  symbol_not_starts_with?: InputMaybe<Scalars['String']>;
  symbol_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  symbol_ends_with?: InputMaybe<Scalars['String']>;
  symbol_ends_with_nocase?: InputMaybe<Scalars['String']>;
  symbol_not_ends_with?: InputMaybe<Scalars['String']>;
  symbol_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  decimals?: InputMaybe<Scalars['BigInt']>;
  decimals_not?: InputMaybe<Scalars['BigInt']>;
  decimals_gt?: InputMaybe<Scalars['BigInt']>;
  decimals_lt?: InputMaybe<Scalars['BigInt']>;
  decimals_gte?: InputMaybe<Scalars['BigInt']>;
  decimals_lte?: InputMaybe<Scalars['BigInt']>;
  decimals_in?: InputMaybe<Array<Scalars['BigInt']>>;
  decimals_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Token_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Token_filter>>>;
};

export type Token_orderBy =
  | 'id'
  | 'symbol'
  | 'decimals';

export type Transaction = {
  /**  the transaction hash  */
  id: Scalars['Bytes'];
  /**  the block number  */
  block: Scalars['BigInt'];
  /**  the index of the transaction in the block  */
  index: Scalars['BigInt'];
  /**  transaction hash as a hex string  */
  txn: Scalars['String'];
  /**  the timestamp of the transaction  */
  timestamp: Scalars['BigInt'];
  /**  map to the transaction caller  */
  from: Scalars['Bytes'];
  /**  if the transaction originated from a market aid contract, map to the market aid entity  */
  aid?: Maybe<Aid>;
  /**  the price of eth at the time of the transaction :check: */
  eth_price: Scalars['BigDecimal'];
  /**  the source of the price data  */
  price_source: Scalars['String'];
  /**  the l2 gas price in eth :check: */
  l2_gas_price: Scalars['BigDecimal'];
  /**  the amount of gas used by the l2 transaction :check: */
  l2_gas_used: Scalars['BigInt'];
  /**  the l2 executino fee in eth  */
  l2_execution_fee: Scalars['BigDecimal'];
  /**  the l2 execution fee in USD  */
  l2_execution_fee_usd: Scalars['BigDecimal'];
  /**  the l1 base fee in eth :check: */
  l1_base_fee: Scalars['BigDecimal'];
  /**  the l1_gas_used :underestimate: */
  l1_gas_used: Scalars['BigDecimal'];
  /**  overhead in the l1 transaction  */
  l1_overhead: Scalars['BigInt'];
  /**  the l1 scalar  */
  l1_scalar: Scalars['BigDecimal'];
  /**  the l1 decimal to make dynamic scalar value  */
  l1_decimal: Scalars['BigInt'];
  /**  the l1 fee in eth  */
  l1_fee: Scalars['BigDecimal'];
  /**  the l1 fee in usd  */
  l1_fee_usd: Scalars['BigDecimal'];
  /**  the total gas fee in eth  */
  total_gas_fee: Scalars['BigDecimal'];
  /**  the total gas fee in usd  */
  total_gas_fee_usd: Scalars['BigDecimal'];
  /**  map to the entities  */
  offers: Array<Offer>;
  takes: Array<Take>;
  bookUpdates: Array<BookUpdate>;
};


export type TransactionoffersArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Offer_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Offer_filter>;
};


export type TransactiontakesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Take_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Take_filter>;
};


export type TransactionbookUpdatesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<BookUpdate_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<BookUpdate_filter>;
};

export type Transaction_filter = {
  id?: InputMaybe<Scalars['Bytes']>;
  id_not?: InputMaybe<Scalars['Bytes']>;
  id_gt?: InputMaybe<Scalars['Bytes']>;
  id_lt?: InputMaybe<Scalars['Bytes']>;
  id_gte?: InputMaybe<Scalars['Bytes']>;
  id_lte?: InputMaybe<Scalars['Bytes']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_contains?: InputMaybe<Scalars['Bytes']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']>;
  block?: InputMaybe<Scalars['BigInt']>;
  block_not?: InputMaybe<Scalars['BigInt']>;
  block_gt?: InputMaybe<Scalars['BigInt']>;
  block_lt?: InputMaybe<Scalars['BigInt']>;
  block_gte?: InputMaybe<Scalars['BigInt']>;
  block_lte?: InputMaybe<Scalars['BigInt']>;
  block_in?: InputMaybe<Array<Scalars['BigInt']>>;
  block_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index?: InputMaybe<Scalars['BigInt']>;
  index_not?: InputMaybe<Scalars['BigInt']>;
  index_gt?: InputMaybe<Scalars['BigInt']>;
  index_lt?: InputMaybe<Scalars['BigInt']>;
  index_gte?: InputMaybe<Scalars['BigInt']>;
  index_lte?: InputMaybe<Scalars['BigInt']>;
  index_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  txn?: InputMaybe<Scalars['String']>;
  txn_not?: InputMaybe<Scalars['String']>;
  txn_gt?: InputMaybe<Scalars['String']>;
  txn_lt?: InputMaybe<Scalars['String']>;
  txn_gte?: InputMaybe<Scalars['String']>;
  txn_lte?: InputMaybe<Scalars['String']>;
  txn_in?: InputMaybe<Array<Scalars['String']>>;
  txn_not_in?: InputMaybe<Array<Scalars['String']>>;
  txn_contains?: InputMaybe<Scalars['String']>;
  txn_contains_nocase?: InputMaybe<Scalars['String']>;
  txn_not_contains?: InputMaybe<Scalars['String']>;
  txn_not_contains_nocase?: InputMaybe<Scalars['String']>;
  txn_starts_with?: InputMaybe<Scalars['String']>;
  txn_starts_with_nocase?: InputMaybe<Scalars['String']>;
  txn_not_starts_with?: InputMaybe<Scalars['String']>;
  txn_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  txn_ends_with?: InputMaybe<Scalars['String']>;
  txn_ends_with_nocase?: InputMaybe<Scalars['String']>;
  txn_not_ends_with?: InputMaybe<Scalars['String']>;
  txn_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  timestamp?: InputMaybe<Scalars['BigInt']>;
  timestamp_not?: InputMaybe<Scalars['BigInt']>;
  timestamp_gt?: InputMaybe<Scalars['BigInt']>;
  timestamp_lt?: InputMaybe<Scalars['BigInt']>;
  timestamp_gte?: InputMaybe<Scalars['BigInt']>;
  timestamp_lte?: InputMaybe<Scalars['BigInt']>;
  timestamp_in?: InputMaybe<Array<Scalars['BigInt']>>;
  timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  from?: InputMaybe<Scalars['Bytes']>;
  from_not?: InputMaybe<Scalars['Bytes']>;
  from_gt?: InputMaybe<Scalars['Bytes']>;
  from_lt?: InputMaybe<Scalars['Bytes']>;
  from_gte?: InputMaybe<Scalars['Bytes']>;
  from_lte?: InputMaybe<Scalars['Bytes']>;
  from_in?: InputMaybe<Array<Scalars['Bytes']>>;
  from_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  from_contains?: InputMaybe<Scalars['Bytes']>;
  from_not_contains?: InputMaybe<Scalars['Bytes']>;
  aid?: InputMaybe<Scalars['String']>;
  aid_not?: InputMaybe<Scalars['String']>;
  aid_gt?: InputMaybe<Scalars['String']>;
  aid_lt?: InputMaybe<Scalars['String']>;
  aid_gte?: InputMaybe<Scalars['String']>;
  aid_lte?: InputMaybe<Scalars['String']>;
  aid_in?: InputMaybe<Array<Scalars['String']>>;
  aid_not_in?: InputMaybe<Array<Scalars['String']>>;
  aid_contains?: InputMaybe<Scalars['String']>;
  aid_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_not_contains?: InputMaybe<Scalars['String']>;
  aid_not_contains_nocase?: InputMaybe<Scalars['String']>;
  aid_starts_with?: InputMaybe<Scalars['String']>;
  aid_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_not_starts_with?: InputMaybe<Scalars['String']>;
  aid_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aid_ends_with?: InputMaybe<Scalars['String']>;
  aid_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_not_ends_with?: InputMaybe<Scalars['String']>;
  aid_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aid_?: InputMaybe<Aid_filter>;
  eth_price?: InputMaybe<Scalars['BigDecimal']>;
  eth_price_not?: InputMaybe<Scalars['BigDecimal']>;
  eth_price_gt?: InputMaybe<Scalars['BigDecimal']>;
  eth_price_lt?: InputMaybe<Scalars['BigDecimal']>;
  eth_price_gte?: InputMaybe<Scalars['BigDecimal']>;
  eth_price_lte?: InputMaybe<Scalars['BigDecimal']>;
  eth_price_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  eth_price_not_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  price_source?: InputMaybe<Scalars['String']>;
  price_source_not?: InputMaybe<Scalars['String']>;
  price_source_gt?: InputMaybe<Scalars['String']>;
  price_source_lt?: InputMaybe<Scalars['String']>;
  price_source_gte?: InputMaybe<Scalars['String']>;
  price_source_lte?: InputMaybe<Scalars['String']>;
  price_source_in?: InputMaybe<Array<Scalars['String']>>;
  price_source_not_in?: InputMaybe<Array<Scalars['String']>>;
  price_source_contains?: InputMaybe<Scalars['String']>;
  price_source_contains_nocase?: InputMaybe<Scalars['String']>;
  price_source_not_contains?: InputMaybe<Scalars['String']>;
  price_source_not_contains_nocase?: InputMaybe<Scalars['String']>;
  price_source_starts_with?: InputMaybe<Scalars['String']>;
  price_source_starts_with_nocase?: InputMaybe<Scalars['String']>;
  price_source_not_starts_with?: InputMaybe<Scalars['String']>;
  price_source_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  price_source_ends_with?: InputMaybe<Scalars['String']>;
  price_source_ends_with_nocase?: InputMaybe<Scalars['String']>;
  price_source_not_ends_with?: InputMaybe<Scalars['String']>;
  price_source_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  l2_gas_price?: InputMaybe<Scalars['BigDecimal']>;
  l2_gas_price_not?: InputMaybe<Scalars['BigDecimal']>;
  l2_gas_price_gt?: InputMaybe<Scalars['BigDecimal']>;
  l2_gas_price_lt?: InputMaybe<Scalars['BigDecimal']>;
  l2_gas_price_gte?: InputMaybe<Scalars['BigDecimal']>;
  l2_gas_price_lte?: InputMaybe<Scalars['BigDecimal']>;
  l2_gas_price_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l2_gas_price_not_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l2_gas_used?: InputMaybe<Scalars['BigInt']>;
  l2_gas_used_not?: InputMaybe<Scalars['BigInt']>;
  l2_gas_used_gt?: InputMaybe<Scalars['BigInt']>;
  l2_gas_used_lt?: InputMaybe<Scalars['BigInt']>;
  l2_gas_used_gte?: InputMaybe<Scalars['BigInt']>;
  l2_gas_used_lte?: InputMaybe<Scalars['BigInt']>;
  l2_gas_used_in?: InputMaybe<Array<Scalars['BigInt']>>;
  l2_gas_used_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  l2_execution_fee?: InputMaybe<Scalars['BigDecimal']>;
  l2_execution_fee_not?: InputMaybe<Scalars['BigDecimal']>;
  l2_execution_fee_gt?: InputMaybe<Scalars['BigDecimal']>;
  l2_execution_fee_lt?: InputMaybe<Scalars['BigDecimal']>;
  l2_execution_fee_gte?: InputMaybe<Scalars['BigDecimal']>;
  l2_execution_fee_lte?: InputMaybe<Scalars['BigDecimal']>;
  l2_execution_fee_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l2_execution_fee_not_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l2_execution_fee_usd?: InputMaybe<Scalars['BigDecimal']>;
  l2_execution_fee_usd_not?: InputMaybe<Scalars['BigDecimal']>;
  l2_execution_fee_usd_gt?: InputMaybe<Scalars['BigDecimal']>;
  l2_execution_fee_usd_lt?: InputMaybe<Scalars['BigDecimal']>;
  l2_execution_fee_usd_gte?: InputMaybe<Scalars['BigDecimal']>;
  l2_execution_fee_usd_lte?: InputMaybe<Scalars['BigDecimal']>;
  l2_execution_fee_usd_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l2_execution_fee_usd_not_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l1_base_fee?: InputMaybe<Scalars['BigDecimal']>;
  l1_base_fee_not?: InputMaybe<Scalars['BigDecimal']>;
  l1_base_fee_gt?: InputMaybe<Scalars['BigDecimal']>;
  l1_base_fee_lt?: InputMaybe<Scalars['BigDecimal']>;
  l1_base_fee_gte?: InputMaybe<Scalars['BigDecimal']>;
  l1_base_fee_lte?: InputMaybe<Scalars['BigDecimal']>;
  l1_base_fee_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l1_base_fee_not_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l1_gas_used?: InputMaybe<Scalars['BigDecimal']>;
  l1_gas_used_not?: InputMaybe<Scalars['BigDecimal']>;
  l1_gas_used_gt?: InputMaybe<Scalars['BigDecimal']>;
  l1_gas_used_lt?: InputMaybe<Scalars['BigDecimal']>;
  l1_gas_used_gte?: InputMaybe<Scalars['BigDecimal']>;
  l1_gas_used_lte?: InputMaybe<Scalars['BigDecimal']>;
  l1_gas_used_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l1_gas_used_not_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l1_overhead?: InputMaybe<Scalars['BigInt']>;
  l1_overhead_not?: InputMaybe<Scalars['BigInt']>;
  l1_overhead_gt?: InputMaybe<Scalars['BigInt']>;
  l1_overhead_lt?: InputMaybe<Scalars['BigInt']>;
  l1_overhead_gte?: InputMaybe<Scalars['BigInt']>;
  l1_overhead_lte?: InputMaybe<Scalars['BigInt']>;
  l1_overhead_in?: InputMaybe<Array<Scalars['BigInt']>>;
  l1_overhead_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  l1_scalar?: InputMaybe<Scalars['BigDecimal']>;
  l1_scalar_not?: InputMaybe<Scalars['BigDecimal']>;
  l1_scalar_gt?: InputMaybe<Scalars['BigDecimal']>;
  l1_scalar_lt?: InputMaybe<Scalars['BigDecimal']>;
  l1_scalar_gte?: InputMaybe<Scalars['BigDecimal']>;
  l1_scalar_lte?: InputMaybe<Scalars['BigDecimal']>;
  l1_scalar_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l1_scalar_not_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l1_decimal?: InputMaybe<Scalars['BigInt']>;
  l1_decimal_not?: InputMaybe<Scalars['BigInt']>;
  l1_decimal_gt?: InputMaybe<Scalars['BigInt']>;
  l1_decimal_lt?: InputMaybe<Scalars['BigInt']>;
  l1_decimal_gte?: InputMaybe<Scalars['BigInt']>;
  l1_decimal_lte?: InputMaybe<Scalars['BigInt']>;
  l1_decimal_in?: InputMaybe<Array<Scalars['BigInt']>>;
  l1_decimal_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  l1_fee?: InputMaybe<Scalars['BigDecimal']>;
  l1_fee_not?: InputMaybe<Scalars['BigDecimal']>;
  l1_fee_gt?: InputMaybe<Scalars['BigDecimal']>;
  l1_fee_lt?: InputMaybe<Scalars['BigDecimal']>;
  l1_fee_gte?: InputMaybe<Scalars['BigDecimal']>;
  l1_fee_lte?: InputMaybe<Scalars['BigDecimal']>;
  l1_fee_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l1_fee_not_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l1_fee_usd?: InputMaybe<Scalars['BigDecimal']>;
  l1_fee_usd_not?: InputMaybe<Scalars['BigDecimal']>;
  l1_fee_usd_gt?: InputMaybe<Scalars['BigDecimal']>;
  l1_fee_usd_lt?: InputMaybe<Scalars['BigDecimal']>;
  l1_fee_usd_gte?: InputMaybe<Scalars['BigDecimal']>;
  l1_fee_usd_lte?: InputMaybe<Scalars['BigDecimal']>;
  l1_fee_usd_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  l1_fee_usd_not_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  total_gas_fee?: InputMaybe<Scalars['BigDecimal']>;
  total_gas_fee_not?: InputMaybe<Scalars['BigDecimal']>;
  total_gas_fee_gt?: InputMaybe<Scalars['BigDecimal']>;
  total_gas_fee_lt?: InputMaybe<Scalars['BigDecimal']>;
  total_gas_fee_gte?: InputMaybe<Scalars['BigDecimal']>;
  total_gas_fee_lte?: InputMaybe<Scalars['BigDecimal']>;
  total_gas_fee_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  total_gas_fee_not_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  total_gas_fee_usd?: InputMaybe<Scalars['BigDecimal']>;
  total_gas_fee_usd_not?: InputMaybe<Scalars['BigDecimal']>;
  total_gas_fee_usd_gt?: InputMaybe<Scalars['BigDecimal']>;
  total_gas_fee_usd_lt?: InputMaybe<Scalars['BigDecimal']>;
  total_gas_fee_usd_gte?: InputMaybe<Scalars['BigDecimal']>;
  total_gas_fee_usd_lte?: InputMaybe<Scalars['BigDecimal']>;
  total_gas_fee_usd_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  total_gas_fee_usd_not_in?: InputMaybe<Array<Scalars['BigDecimal']>>;
  offers_?: InputMaybe<Offer_filter>;
  takes_?: InputMaybe<Take_filter>;
  bookUpdates_?: InputMaybe<BookUpdate_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Transaction_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Transaction_filter>>>;
};

export type Transaction_orderBy =
  | 'id'
  | 'block'
  | 'index'
  | 'txn'
  | 'timestamp'
  | 'from'
  | 'aid'
  | 'aid__id'
  | 'aid__created'
  | 'eth_price'
  | 'price_source'
  | 'l2_gas_price'
  | 'l2_gas_used'
  | 'l2_execution_fee'
  | 'l2_execution_fee_usd'
  | 'l1_base_fee'
  | 'l1_gas_used'
  | 'l1_overhead'
  | 'l1_scalar'
  | 'l1_decimal'
  | 'l1_fee'
  | 'l1_fee_usd'
  | 'total_gas_fee'
  | 'total_gas_fee_usd'
  | 'offers'
  | 'takes'
  | 'bookUpdates';

export type _Block_ = {
  /** The hash of the block */
  hash?: Maybe<Scalars['Bytes']>;
  /** The block number */
  number: Scalars['Int'];
  /** Integer representation of the timestamp stored in blocks for the chain */
  timestamp?: Maybe<Scalars['Int']>;
};

/** The type for the top-level _meta field */
export type _Meta_ = {
  /**
   * Information about a specific subgraph block. The hash of the block
   * will be null if the _meta field has a block constraint that asks for
   * a block number. It will be filled if the _meta field has no block constraint
   * and therefore asks for the latest  block
   *
   */
  block: _Block_;
  /** The deployment ID */
  deployment: Scalars['String'];
  /** If `true`, the subgraph encountered indexing errors at some past block */
  hasIndexingErrors: Scalars['Boolean'];
};

export type _SubgraphErrorPolicy_ =
  /** Data will be returned even if the subgraph has indexing errors */
  | 'allow'
  /** If the subgraph has indexing errors, data will be omitted. The default. */
  | 'deny';

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type LegacyStitchingResolver<TResult, TParent, TContext, TArgs> = {
  fragment: string;
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type NewStitchingResolver<TResult, TParent, TContext, TArgs> = {
  selectionSet: string | ((fieldNode: FieldNode) => SelectionSetNode);
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type StitchingResolver<TResult, TParent, TContext, TArgs> = LegacyStitchingResolver<TResult, TParent, TContext, TArgs> | NewStitchingResolver<TResult, TParent, TContext, TArgs>;
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>
  | StitchingResolver<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Aid: ResolverTypeWrapper<Aid>;
  AidToken: ResolverTypeWrapper<AidToken>;
  AidTokenHistory: ResolverTypeWrapper<AidTokenHistory>;
  AidTokenHistory_filter: AidTokenHistory_filter;
  AidTokenHistory_orderBy: AidTokenHistory_orderBy;
  AidToken_filter: AidToken_filter;
  AidToken_orderBy: AidToken_orderBy;
  Aid_filter: Aid_filter;
  Aid_orderBy: Aid_orderBy;
  Arb: ResolverTypeWrapper<Arb>;
  Arb_filter: Arb_filter;
  Arb_orderBy: Arb_orderBy;
  BigDecimal: ResolverTypeWrapper<Scalars['BigDecimal']>;
  BigInt: ResolverTypeWrapper<Scalars['BigInt']>;
  BlockChangedFilter: BlockChangedFilter;
  Block_height: Block_height;
  BookUpdate: ResolverTypeWrapper<BookUpdate>;
  BookUpdate_filter: BookUpdate_filter;
  BookUpdate_orderBy: BookUpdate_orderBy;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>;
  Bytes: ResolverTypeWrapper<Scalars['Bytes']>;
  ExternalSwap: ResolverTypeWrapper<ExternalSwap>;
  ExternalSwap_filter: ExternalSwap_filter;
  ExternalSwap_orderBy: ExternalSwap_orderBy;
  FeeTakeEntity: ResolverTypeWrapper<FeeTakeEntity>;
  FeeTakeEntity_filter: FeeTakeEntity_filter;
  FeeTakeEntity_orderBy: FeeTakeEntity_orderBy;
  Float: ResolverTypeWrapper<Scalars['Float']>;
  ID: ResolverTypeWrapper<Scalars['ID']>;
  Int: ResolverTypeWrapper<Scalars['Int']>;
  Offer: ResolverTypeWrapper<Offer>;
  Offer_filter: Offer_filter;
  Offer_orderBy: Offer_orderBy;
  OrderDirection: OrderDirection;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']>;
  Subscription: ResolverTypeWrapper<{}>;
  Take: ResolverTypeWrapper<Take>;
  Take_filter: Take_filter;
  Take_orderBy: Take_orderBy;
  Token: ResolverTypeWrapper<Token>;
  Token_filter: Token_filter;
  Token_orderBy: Token_orderBy;
  Transaction: ResolverTypeWrapper<Transaction>;
  Transaction_filter: Transaction_filter;
  Transaction_orderBy: Transaction_orderBy;
  _Block_: ResolverTypeWrapper<_Block_>;
  _Meta_: ResolverTypeWrapper<_Meta_>;
  _SubgraphErrorPolicy_: _SubgraphErrorPolicy_;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Aid: Aid;
  AidToken: AidToken;
  AidTokenHistory: AidTokenHistory;
  AidTokenHistory_filter: AidTokenHistory_filter;
  AidToken_filter: AidToken_filter;
  Aid_filter: Aid_filter;
  Arb: Arb;
  Arb_filter: Arb_filter;
  BigDecimal: Scalars['BigDecimal'];
  BigInt: Scalars['BigInt'];
  BlockChangedFilter: BlockChangedFilter;
  Block_height: Block_height;
  BookUpdate: BookUpdate;
  BookUpdate_filter: BookUpdate_filter;
  Boolean: Scalars['Boolean'];
  Bytes: Scalars['Bytes'];
  ExternalSwap: ExternalSwap;
  ExternalSwap_filter: ExternalSwap_filter;
  FeeTakeEntity: FeeTakeEntity;
  FeeTakeEntity_filter: FeeTakeEntity_filter;
  Float: Scalars['Float'];
  ID: Scalars['ID'];
  Int: Scalars['Int'];
  Offer: Offer;
  Offer_filter: Offer_filter;
  Query: {};
  String: Scalars['String'];
  Subscription: {};
  Take: Take;
  Take_filter: Take_filter;
  Token: Token;
  Token_filter: Token_filter;
  Transaction: Transaction;
  Transaction_filter: Transaction_filter;
  _Block_: _Block_;
  _Meta_: _Meta_;
}>;

export type entityDirectiveArgs = { };

export type entityDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = entityDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type subgraphIdDirectiveArgs = {
  id: Scalars['String'];
};

export type subgraphIdDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = subgraphIdDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type derivedFromDirectiveArgs = {
  field: Scalars['String'];
};

export type derivedFromDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = derivedFromDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type AidResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Aid'] = ResolversParentTypes['Aid']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  created?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  balances?: Resolver<Array<ResolversTypes['AidToken']>, ParentType, ContextType, RequireFields<AidbalancesArgs, 'skip' | 'first'>>;
  offers?: Resolver<Array<ResolversTypes['Offer']>, ParentType, ContextType, RequireFields<AidoffersArgs, 'skip' | 'first'>>;
  transactions?: Resolver<Array<ResolversTypes['Transaction']>, ParentType, ContextType, RequireFields<AidtransactionsArgs, 'skip' | 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AidTokenResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['AidToken'] = ResolversParentTypes['AidToken']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  aid?: Resolver<ResolversTypes['Aid'], ParentType, ContextType>;
  token?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  balance?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  history?: Resolver<Array<ResolversTypes['AidTokenHistory']>, ParentType, ContextType, RequireFields<AidTokenhistoryArgs, 'skip' | 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AidTokenHistoryResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['AidTokenHistory'] = ResolversParentTypes['AidTokenHistory']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  aid?: Resolver<ResolversTypes['Aid'], ParentType, ContextType>;
  aid_token?: Resolver<ResolversTypes['AidToken'], ParentType, ContextType>;
  token?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  balance?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  balance_change?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
  index?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  book_update?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArbResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Arb'] = ResolversParentTypes['Arb']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  aid?: Resolver<ResolversTypes['Aid'], ParentType, ContextType>;
  asset?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  quote?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  amount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  profit?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface BigDecimalScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigDecimal'], any> {
  name: 'BigDecimal';
}

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type BookUpdateResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['BookUpdate'] = ResolversParentTypes['BookUpdate']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  aid?: Resolver<ResolversTypes['Aid'], ParentType, ContextType>;
  aid_token?: Resolver<ResolversTypes['AidToken'], ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
  index?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  amount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface BytesScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Bytes'], any> {
  name: 'Bytes';
}

export type ExternalSwapResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['ExternalSwap'] = ResolversParentTypes['ExternalSwap']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  aid?: Resolver<ResolversTypes['Aid'], ParentType, ContextType>;
  asset_sold?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  asset_received?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  amount_sold?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  amount_received?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
  venue?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FeeTakeEntityResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['FeeTakeEntity'] = ResolversParentTypes['FeeTakeEntity']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  aid?: Resolver<ResolversTypes['Aid'], ParentType, ContextType>;
  asset?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  amount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OfferResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Offer'] = ResolversParentTypes['Offer']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
  maker?: Resolver<ResolversTypes['Aid'], ParentType, ContextType>;
  pay_gem?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  buy_gem?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  pay_amt?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  buy_amt?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  paid_amt?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  bought_amt?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  filled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  cancelled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  live?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  removed_timestamp?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  takes?: Resolver<Array<ResolversTypes['Take']>, ParentType, ContextType, RequireFields<OffertakesArgs, 'skip' | 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  aid?: Resolver<Maybe<ResolversTypes['Aid']>, ParentType, ContextType, RequireFields<QueryaidArgs, 'id' | 'subgraphError'>>;
  aids?: Resolver<Array<ResolversTypes['Aid']>, ParentType, ContextType, RequireFields<QueryaidsArgs, 'skip' | 'first' | 'subgraphError'>>;
  aidToken?: Resolver<Maybe<ResolversTypes['AidToken']>, ParentType, ContextType, RequireFields<QueryaidTokenArgs, 'id' | 'subgraphError'>>;
  aidTokens?: Resolver<Array<ResolversTypes['AidToken']>, ParentType, ContextType, RequireFields<QueryaidTokensArgs, 'skip' | 'first' | 'subgraphError'>>;
  aidTokenHistory?: Resolver<Maybe<ResolversTypes['AidTokenHistory']>, ParentType, ContextType, RequireFields<QueryaidTokenHistoryArgs, 'id' | 'subgraphError'>>;
  aidTokenHistories?: Resolver<Array<ResolversTypes['AidTokenHistory']>, ParentType, ContextType, RequireFields<QueryaidTokenHistoriesArgs, 'skip' | 'first' | 'subgraphError'>>;
  transaction?: Resolver<Maybe<ResolversTypes['Transaction']>, ParentType, ContextType, RequireFields<QuerytransactionArgs, 'id' | 'subgraphError'>>;
  transactions?: Resolver<Array<ResolversTypes['Transaction']>, ParentType, ContextType, RequireFields<QuerytransactionsArgs, 'skip' | 'first' | 'subgraphError'>>;
  offer?: Resolver<Maybe<ResolversTypes['Offer']>, ParentType, ContextType, RequireFields<QueryofferArgs, 'id' | 'subgraphError'>>;
  offers?: Resolver<Array<ResolversTypes['Offer']>, ParentType, ContextType, RequireFields<QueryoffersArgs, 'skip' | 'first' | 'subgraphError'>>;
  take?: Resolver<Maybe<ResolversTypes['Take']>, ParentType, ContextType, RequireFields<QuerytakeArgs, 'id' | 'subgraphError'>>;
  takes?: Resolver<Array<ResolversTypes['Take']>, ParentType, ContextType, RequireFields<QuerytakesArgs, 'skip' | 'first' | 'subgraphError'>>;
  arb?: Resolver<Maybe<ResolversTypes['Arb']>, ParentType, ContextType, RequireFields<QueryarbArgs, 'id' | 'subgraphError'>>;
  arbs?: Resolver<Array<ResolversTypes['Arb']>, ParentType, ContextType, RequireFields<QueryarbsArgs, 'skip' | 'first' | 'subgraphError'>>;
  bookUpdate?: Resolver<Maybe<ResolversTypes['BookUpdate']>, ParentType, ContextType, RequireFields<QuerybookUpdateArgs, 'id' | 'subgraphError'>>;
  bookUpdates?: Resolver<Array<ResolversTypes['BookUpdate']>, ParentType, ContextType, RequireFields<QuerybookUpdatesArgs, 'skip' | 'first' | 'subgraphError'>>;
  externalSwap?: Resolver<Maybe<ResolversTypes['ExternalSwap']>, ParentType, ContextType, RequireFields<QueryexternalSwapArgs, 'id' | 'subgraphError'>>;
  externalSwaps?: Resolver<Array<ResolversTypes['ExternalSwap']>, ParentType, ContextType, RequireFields<QueryexternalSwapsArgs, 'skip' | 'first' | 'subgraphError'>>;
  feeTakeEntity?: Resolver<Maybe<ResolversTypes['FeeTakeEntity']>, ParentType, ContextType, RequireFields<QueryfeeTakeEntityArgs, 'id' | 'subgraphError'>>;
  feeTakeEntities?: Resolver<Array<ResolversTypes['FeeTakeEntity']>, ParentType, ContextType, RequireFields<QueryfeeTakeEntitiesArgs, 'skip' | 'first' | 'subgraphError'>>;
  token?: Resolver<Maybe<ResolversTypes['Token']>, ParentType, ContextType, RequireFields<QuerytokenArgs, 'id' | 'subgraphError'>>;
  tokens?: Resolver<Array<ResolversTypes['Token']>, ParentType, ContextType, RequireFields<QuerytokensArgs, 'skip' | 'first' | 'subgraphError'>>;
  _meta?: Resolver<Maybe<ResolversTypes['_Meta_']>, ParentType, ContextType, Partial<Query_metaArgs>>;
}>;

export type SubscriptionResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  aid?: SubscriptionResolver<Maybe<ResolversTypes['Aid']>, "aid", ParentType, ContextType, RequireFields<SubscriptionaidArgs, 'id' | 'subgraphError'>>;
  aids?: SubscriptionResolver<Array<ResolversTypes['Aid']>, "aids", ParentType, ContextType, RequireFields<SubscriptionaidsArgs, 'skip' | 'first' | 'subgraphError'>>;
  aidToken?: SubscriptionResolver<Maybe<ResolversTypes['AidToken']>, "aidToken", ParentType, ContextType, RequireFields<SubscriptionaidTokenArgs, 'id' | 'subgraphError'>>;
  aidTokens?: SubscriptionResolver<Array<ResolversTypes['AidToken']>, "aidTokens", ParentType, ContextType, RequireFields<SubscriptionaidTokensArgs, 'skip' | 'first' | 'subgraphError'>>;
  aidTokenHistory?: SubscriptionResolver<Maybe<ResolversTypes['AidTokenHistory']>, "aidTokenHistory", ParentType, ContextType, RequireFields<SubscriptionaidTokenHistoryArgs, 'id' | 'subgraphError'>>;
  aidTokenHistories?: SubscriptionResolver<Array<ResolversTypes['AidTokenHistory']>, "aidTokenHistories", ParentType, ContextType, RequireFields<SubscriptionaidTokenHistoriesArgs, 'skip' | 'first' | 'subgraphError'>>;
  transaction?: SubscriptionResolver<Maybe<ResolversTypes['Transaction']>, "transaction", ParentType, ContextType, RequireFields<SubscriptiontransactionArgs, 'id' | 'subgraphError'>>;
  transactions?: SubscriptionResolver<Array<ResolversTypes['Transaction']>, "transactions", ParentType, ContextType, RequireFields<SubscriptiontransactionsArgs, 'skip' | 'first' | 'subgraphError'>>;
  offer?: SubscriptionResolver<Maybe<ResolversTypes['Offer']>, "offer", ParentType, ContextType, RequireFields<SubscriptionofferArgs, 'id' | 'subgraphError'>>;
  offers?: SubscriptionResolver<Array<ResolversTypes['Offer']>, "offers", ParentType, ContextType, RequireFields<SubscriptionoffersArgs, 'skip' | 'first' | 'subgraphError'>>;
  take?: SubscriptionResolver<Maybe<ResolversTypes['Take']>, "take", ParentType, ContextType, RequireFields<SubscriptiontakeArgs, 'id' | 'subgraphError'>>;
  takes?: SubscriptionResolver<Array<ResolversTypes['Take']>, "takes", ParentType, ContextType, RequireFields<SubscriptiontakesArgs, 'skip' | 'first' | 'subgraphError'>>;
  arb?: SubscriptionResolver<Maybe<ResolversTypes['Arb']>, "arb", ParentType, ContextType, RequireFields<SubscriptionarbArgs, 'id' | 'subgraphError'>>;
  arbs?: SubscriptionResolver<Array<ResolversTypes['Arb']>, "arbs", ParentType, ContextType, RequireFields<SubscriptionarbsArgs, 'skip' | 'first' | 'subgraphError'>>;
  bookUpdate?: SubscriptionResolver<Maybe<ResolversTypes['BookUpdate']>, "bookUpdate", ParentType, ContextType, RequireFields<SubscriptionbookUpdateArgs, 'id' | 'subgraphError'>>;
  bookUpdates?: SubscriptionResolver<Array<ResolversTypes['BookUpdate']>, "bookUpdates", ParentType, ContextType, RequireFields<SubscriptionbookUpdatesArgs, 'skip' | 'first' | 'subgraphError'>>;
  externalSwap?: SubscriptionResolver<Maybe<ResolversTypes['ExternalSwap']>, "externalSwap", ParentType, ContextType, RequireFields<SubscriptionexternalSwapArgs, 'id' | 'subgraphError'>>;
  externalSwaps?: SubscriptionResolver<Array<ResolversTypes['ExternalSwap']>, "externalSwaps", ParentType, ContextType, RequireFields<SubscriptionexternalSwapsArgs, 'skip' | 'first' | 'subgraphError'>>;
  feeTakeEntity?: SubscriptionResolver<Maybe<ResolversTypes['FeeTakeEntity']>, "feeTakeEntity", ParentType, ContextType, RequireFields<SubscriptionfeeTakeEntityArgs, 'id' | 'subgraphError'>>;
  feeTakeEntities?: SubscriptionResolver<Array<ResolversTypes['FeeTakeEntity']>, "feeTakeEntities", ParentType, ContextType, RequireFields<SubscriptionfeeTakeEntitiesArgs, 'skip' | 'first' | 'subgraphError'>>;
  token?: SubscriptionResolver<Maybe<ResolversTypes['Token']>, "token", ParentType, ContextType, RequireFields<SubscriptiontokenArgs, 'id' | 'subgraphError'>>;
  tokens?: SubscriptionResolver<Array<ResolversTypes['Token']>, "tokens", ParentType, ContextType, RequireFields<SubscriptiontokensArgs, 'skip' | 'first' | 'subgraphError'>>;
  _meta?: SubscriptionResolver<Maybe<ResolversTypes['_Meta_']>, "_meta", ParentType, ContextType, Partial<Subscription_metaArgs>>;
}>;

export type TakeResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Take'] = ResolversParentTypes['Take']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
  taker?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  pay_gem?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  buy_gem?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  pay_amt?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  buy_amt?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  offer_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  offer?: Resolver<Maybe<ResolversTypes['Offer']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TokenResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Token'] = ResolversParentTypes['Token']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  symbol?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  decimals?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TransactionResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Transaction'] = ResolversParentTypes['Transaction']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  block?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  index?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  txn?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  from?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  aid?: Resolver<Maybe<ResolversTypes['Aid']>, ParentType, ContextType>;
  eth_price?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  price_source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  l2_gas_price?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  l2_gas_used?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  l2_execution_fee?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  l2_execution_fee_usd?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  l1_base_fee?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  l1_gas_used?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  l1_overhead?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  l1_scalar?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  l1_decimal?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  l1_fee?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  l1_fee_usd?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  total_gas_fee?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  total_gas_fee_usd?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  offers?: Resolver<Array<ResolversTypes['Offer']>, ParentType, ContextType, RequireFields<TransactionoffersArgs, 'skip' | 'first'>>;
  takes?: Resolver<Array<ResolversTypes['Take']>, ParentType, ContextType, RequireFields<TransactiontakesArgs, 'skip' | 'first'>>;
  bookUpdates?: Resolver<Array<ResolversTypes['BookUpdate']>, ParentType, ContextType, RequireFields<TransactionbookUpdatesArgs, 'skip' | 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type _Block_Resolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['_Block_'] = ResolversParentTypes['_Block_']> = ResolversObject<{
  hash?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
  number?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type _Meta_Resolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['_Meta_'] = ResolversParentTypes['_Meta_']> = ResolversObject<{
  block?: Resolver<ResolversTypes['_Block_'], ParentType, ContextType>;
  deployment?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  hasIndexingErrors?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = MeshContext> = ResolversObject<{
  Aid?: AidResolvers<ContextType>;
  AidToken?: AidTokenResolvers<ContextType>;
  AidTokenHistory?: AidTokenHistoryResolvers<ContextType>;
  Arb?: ArbResolvers<ContextType>;
  BigDecimal?: GraphQLScalarType;
  BigInt?: GraphQLScalarType;
  BookUpdate?: BookUpdateResolvers<ContextType>;
  Bytes?: GraphQLScalarType;
  ExternalSwap?: ExternalSwapResolvers<ContextType>;
  FeeTakeEntity?: FeeTakeEntityResolvers<ContextType>;
  Offer?: OfferResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  Take?: TakeResolvers<ContextType>;
  Token?: TokenResolvers<ContextType>;
  Transaction?: TransactionResolvers<ContextType>;
  _Block_?: _Block_Resolvers<ContextType>;
  _Meta_?: _Meta_Resolvers<ContextType>;
}>;

export type DirectiveResolvers<ContextType = MeshContext> = ResolversObject<{
  entity?: entityDirectiveResolver<any, any, ContextType>;
  subgraphId?: subgraphIdDirectiveResolver<any, any, ContextType>;
  derivedFrom?: derivedFromDirectiveResolver<any, any, ContextType>;
}>;

export type MeshContext = MarketAidOptimismMainnetTypes.Context & BaseMeshContext;


const baseDir = pathModule.join(typeof __dirname === 'string' ? __dirname : '/', '..');

const importFn: ImportFn = <T>(moduleId: string) => {
  const relativeModuleId = (pathModule.isAbsolute(moduleId) ? pathModule.relative(baseDir, moduleId) : moduleId).split('\\').join('/').replace(baseDir + '/', '');
  switch(relativeModuleId) {
    case ".graphclient/sources/market-aid-optimism-mainnet/introspectionSchema":
      return Promise.resolve(importedModule$0) as T;
    
    default:
      return Promise.reject(new Error(`Cannot find module '${relativeModuleId}'.`));
  }
};

const rootStore = new MeshStore('.graphclient', new FsStoreStorageAdapter({
  cwd: baseDir,
  importFn,
  fileType: "ts",
}), {
  readonly: true,
  validate: false
});

export const rawServeConfig: YamlConfig.Config['serve'] = undefined as any
export async function getMeshOptions(): Promise<GetMeshOptions> {
const pubsub = new PubSub();
const sourcesStore = rootStore.child('sources');
const logger = new DefaultLogger("GraphClient");
const cache = new (MeshCache as any)({
      ...({} as any),
      importFn,
      store: rootStore.child('cache'),
      pubsub,
      logger,
    } as any)

const sources: MeshResolvedSource[] = [];
const transforms: MeshTransform[] = [];
const additionalEnvelopPlugins: MeshPlugin<any>[] = [];
const marketAidOptimismMainnetTransforms = [];
const additionalTypeDefs = [] as any[];
const marketAidOptimismMainnetHandler = new GraphqlHandler({
              name: "market-aid-optimism-mainnet",
              config: {"endpoint":"https://api.thegraph.com/subgraphs/name/denverbaumgartner/market-aid-optimism-mainnet"},
              baseDir,
              cache,
              pubsub,
              store: sourcesStore.child("market-aid-optimism-mainnet"),
              logger: logger.child("market-aid-optimism-mainnet"),
              importFn,
            });
transforms[0] = new (AutoPaginationTransform as any)({
            apiName: '',
            config: {"validateSchema":true},
            baseDir,
            cache,
            pubsub,
            importFn,
            logger,
          })
additionalEnvelopPlugins[0] = await UsePollingLive({
          ...({
  "defaultInterval": 1000
}),
          logger: logger.child("pollingLive"),
          cache,
          pubsub,
          baseDir,
          importFn,
        })
marketAidOptimismMainnetTransforms[0] = new BlockTrackingTransform({
                  apiName: "market-aid-optimism-mainnet",
                  config: {"validateSchema":true,"limitOfRecords":1000},
                  baseDir,
                  cache,
                  pubsub,
                  importFn,
                  logger,
                });
sources[0] = {
          name: 'market-aid-optimism-mainnet',
          handler: marketAidOptimismMainnetHandler,
          transforms: marketAidOptimismMainnetTransforms
        }
const additionalResolvers = [] as any[]
const merger = new(BareMerger as any)({
        cache,
        pubsub,
        logger: logger.child('bareMerger'),
        store: rootStore.child('bareMerger')
      })

  return {
    sources,
    transforms,
    additionalTypeDefs,
    additionalResolvers,
    cache,
    pubsub,
    merger,
    logger,
    additionalEnvelopPlugins,
    get documents() {
      return [
      {
        document: TokenBalancesDocument,
        get rawSDL() {
          return printWithCache(TokenBalancesDocument);
        },
        location: 'TokenBalancesDocument.graphql'
      },{
        document: AidsDocument,
        get rawSDL() {
          return printWithCache(AidsDocument);
        },
        location: 'AidsDocument.graphql'
      },{
        document: TransactionsDocument,
        get rawSDL() {
          return printWithCache(TransactionsDocument);
        },
        location: 'TransactionsDocument.graphql'
      },{
        document: TokenHistoryDocument,
        get rawSDL() {
          return printWithCache(TokenHistoryDocument);
        },
        location: 'TokenHistoryDocument.graphql'
      },{
        document: TokenSnapshotsDocument,
        get rawSDL() {
          return printWithCache(TokenSnapshotsDocument);
        },
        location: 'TokenSnapshotsDocument.graphql'
      }
    ];
    },
    fetchFn,
  };
}

export function createBuiltMeshHTTPHandler<TServerContext = {}>(): MeshHTTPHandler<TServerContext> {
  return createMeshHTTPHandler<TServerContext>({
    baseDir,
    getBuiltMesh: getBuiltGraphClient,
    rawServeConfig: undefined,
  })
}


let meshInstance$: Promise<MeshInstance> | undefined;

export function getBuiltGraphClient(): Promise<MeshInstance> {
  if (meshInstance$ == null) {
    meshInstance$ = getMeshOptions().then(meshOptions => getMesh(meshOptions)).then(mesh => {
      const id = mesh.pubsub.subscribe('destroy', () => {
        meshInstance$ = undefined;
        mesh.pubsub.unsubscribe(id);
      });
      return mesh;
    });
  }
  return meshInstance$;
}

export const execute: ExecuteMeshFn = (...args) => getBuiltGraphClient().then(({ execute }) => execute(...args));

export const subscribe: SubscribeMeshFn = (...args) => getBuiltGraphClient().then(({ subscribe }) => subscribe(...args));
export function getBuiltGraphSDK<TGlobalContext = any, TOperationContext = any>(globalContext?: TGlobalContext) {
  const sdkRequester$ = getBuiltGraphClient().then(({ sdkRequesterFactory }) => sdkRequesterFactory(globalContext));
  return getSdk<TOperationContext, TGlobalContext>((...args) => sdkRequester$.then(sdkRequester => sdkRequester(...args)));
}
export type TokenBalancesQueryVariables = Exact<{
  aid: Scalars['String'];
}>;


export type TokenBalancesQuery = { aidTokens: Array<(
    Pick<AidToken, 'balance'>
    & { aid: Pick<Aid, 'id'>, token: Pick<Token, 'id'> }
  )> };

export type AidsQueryVariables = Exact<{
  aidID: Scalars['Bytes'];
}>;


export type AidsQuery = { aids: Array<(
    Pick<Aid, 'id' | 'created'>
    & { balances: Array<(
      Pick<AidToken, 'balance'>
      & { token: Pick<Token, 'id'> }
    )> }
  )> };

export type TransactionsQueryVariables = Exact<{
  lastID: Scalars['Bytes'];
  aidID: Scalars['String'];
  startTime: Scalars['BigInt'];
  endTime: Scalars['BigInt'];
  first?: InputMaybe<Scalars['Int']>;
  skip?: InputMaybe<Scalars['Int']>;
}>;


export type TransactionsQuery = { transactions: Array<(
    Pick<Transaction, 'txn' | 'timestamp' | 'total_gas_fee' | 'total_gas_fee_usd'>
    & { aid?: Maybe<Pick<Aid, 'id'>> }
  )> };

export type TokenHistoryQueryVariables = Exact<{
  lastID: Scalars['Bytes'];
  aidID: Scalars['String'];
  tokenID: Scalars['String'];
  startTime: Scalars['BigInt'];
  endTime: Scalars['BigInt'];
  first?: InputMaybe<Scalars['Int']>;
  skip?: InputMaybe<Scalars['Int']>;
}>;


export type TokenHistoryQuery = { aidTokenHistories: Array<(
    Pick<AidTokenHistory, 'timestamp' | 'balance'>
    & { aid: Pick<Aid, 'id'>, aid_token: { token: Pick<Token, 'id'> }, transaction: Pick<Transaction, 'id'> }
  )> };

export type TokenSnapshotsQueryVariables = Exact<{
  aidID: Scalars['String'];
  sixHour: Scalars['BigInt'];
  twelveHour: Scalars['BigInt'];
  oneDay: Scalars['BigInt'];
  twoDay: Scalars['BigInt'];
}>;


export type TokenSnapshotsQuery = { aidTokens: Array<(
    Pick<AidToken, 'balance'>
    & { aid: Pick<Aid, 'id'>, token: Pick<Token, 'id'>, six_hour: Array<Pick<AidTokenHistory, 'timestamp' | 'balance'>>, twelve_hour: Array<Pick<AidTokenHistory, 'timestamp' | 'balance'>>, one_day: Array<Pick<AidTokenHistory, 'timestamp' | 'balance'>>, two_day: Array<Pick<AidTokenHistory, 'timestamp' | 'balance'>> }
  )> };


export const TokenBalancesDocument = gql`
    query TokenBalances($aid: String!) {
  aidTokens(first: 1000, where: {aid: $aid}) {
    aid {
      id
    }
    token {
      id
    }
    balance
  }
}
    ` as unknown as DocumentNode<TokenBalancesQuery, TokenBalancesQueryVariables>;
export const AidsDocument = gql`
    query Aids($aidID: Bytes!) {
  aids(where: {id: $aidID}) {
    id
    created
    balances {
      token {
        id
      }
      balance
    }
  }
}
    ` as unknown as DocumentNode<AidsQuery, AidsQueryVariables>;
export const TransactionsDocument = gql`
    query Transactions($lastID: Bytes!, $aidID: String!, $startTime: BigInt!, $endTime: BigInt!, $first: Int = 1000, $skip: Int = 0) {
  transactions(
    first: $first
    skip: $skip
    where: {id_gt: $lastID, aid: $aidID, timestamp_gte: $startTime, timestamp_lte: $endTime}
  ) {
    txn
    timestamp
    aid {
      id
    }
    total_gas_fee
    total_gas_fee_usd
  }
}
    ` as unknown as DocumentNode<TransactionsQuery, TransactionsQueryVariables>;
export const TokenHistoryDocument = gql`
    query TokenHistory($lastID: Bytes!, $aidID: String!, $tokenID: String!, $startTime: BigInt!, $endTime: BigInt!, $first: Int, $skip: Int = 0) {
  aidTokenHistories(
    first: 1
    skip: $skip
    where: {id_gt: $lastID, aid: $aidID, aid_token: $tokenID, timestamp_gte: $startTime, timestamp_lte: $endTime}
  ) {
    timestamp
    aid {
      id
    }
    aid_token {
      token {
        id
      }
    }
    balance
    transaction {
      id
    }
  }
}
    ` as unknown as DocumentNode<TokenHistoryQuery, TokenHistoryQueryVariables>;
export const TokenSnapshotsDocument = gql`
    query TokenSnapshots($aidID: String!, $sixHour: BigInt!, $twelveHour: BigInt!, $oneDay: BigInt!, $twoDay: BigInt!) {
  aidTokens(first: 1000, where: {aid: $aidID}) {
    aid {
      id
    }
    token {
      id
    }
    balance
    six_hour: history(
      first: 1
      orderBy: timestamp
      orderDirection: desc
      where: {timestamp_lte: $sixHour}
    ) {
      timestamp
      balance
    }
    twelve_hour: history(
      first: 1
      orderBy: timestamp
      orderDirection: desc
      where: {timestamp_lte: $twelveHour}
    ) {
      timestamp
      balance
    }
    one_day: history(
      first: 1
      orderBy: timestamp
      orderDirection: desc
      where: {timestamp_lte: $oneDay}
    ) {
      timestamp
      balance
    }
    two_day: history(
      first: 1
      orderBy: timestamp
      orderDirection: desc
      where: {timestamp_lte: $twoDay}
    ) {
      timestamp
      balance
    }
  }
}
    ` as unknown as DocumentNode<TokenSnapshotsQuery, TokenSnapshotsQueryVariables>;






export type Requester<C = {}, E = unknown> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>
export function getSdk<C, E>(requester: Requester<C, E>) {
  return {
    TokenBalances(variables: TokenBalancesQueryVariables, options?: C): Promise<TokenBalancesQuery> {
      return requester<TokenBalancesQuery, TokenBalancesQueryVariables>(TokenBalancesDocument, variables, options) as Promise<TokenBalancesQuery>;
    },
    Aids(variables: AidsQueryVariables, options?: C): Promise<AidsQuery> {
      return requester<AidsQuery, AidsQueryVariables>(AidsDocument, variables, options) as Promise<AidsQuery>;
    },
    Transactions(variables: TransactionsQueryVariables, options?: C): Promise<TransactionsQuery> {
      return requester<TransactionsQuery, TransactionsQueryVariables>(TransactionsDocument, variables, options) as Promise<TransactionsQuery>;
    },
    TokenHistory(variables: TokenHistoryQueryVariables, options?: C): Promise<TokenHistoryQuery> {
      return requester<TokenHistoryQuery, TokenHistoryQueryVariables>(TokenHistoryDocument, variables, options) as Promise<TokenHistoryQuery>;
    },
    TokenSnapshots(variables: TokenSnapshotsQueryVariables, options?: C): Promise<TokenSnapshotsQuery> {
      return requester<TokenSnapshotsQuery, TokenSnapshotsQueryVariables>(TokenSnapshotsDocument, variables, options) as Promise<TokenSnapshotsQuery>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;