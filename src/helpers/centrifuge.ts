import Centrifuge from '@centrifuge/centrifuge-js'
import type { QueryableModuleStorage, QueryableModuleCalls, QueryableStorage, QueryableCalls } from '@polkadot/api-base/types'
import type { Option, Bytes, Struct, Vec, u128, u64, u32, StorageKey, Enum } from '@polkadot/types'
import type { AccountId32 } from '@polkadot/types/interfaces'
import type { ITuple } from '@polkadot/types/types'
import type { Observable } from 'rxjs'
import { CFG_NODE_ENDPOINT, CFG_RELAY_NODE_ENDPOINT, IPFS_NODE } from '../config'

export const centrifuge = new Centrifuge({
  polkadotWsUrl: CFG_RELAY_NODE_ENDPOINT,
  centrifugeWsUrl: CFG_NODE_ENDPOINT,
  metadataHost: IPFS_NODE,
})

export interface ExtendedQueries extends QueryableStorage<'rxjs'> {
  ['ormlAssetRegistry']: {
    metadata: (currency: Enum) => Observable<Option<AssetMetadata & Struct>>
  } & QueryableModuleStorage<'rxjs'>

  ['poolRegistry']: {
    poolMetadata: (poolId: string) => Observable<Option<{ metadata: Bytes } & Struct>>
  } & QueryableModuleStorage<'rxjs'>

  ['poolSystem']: {
    pool: (poolId: string) => Observable<Option<PoolDetails & Struct>>
  } & QueryableModuleStorage<'rxjs'>

  ['loans']: {
    createdLoan: { entries: (poolId: string) => Observable<Vec<ITuple<[StorageKey<[u64, u64]>, Option<CreatedLoan & Struct>]>>> }
    activeLoans: (poolId: string) => Observable<Vec<ITuple<[u64, ActiveLoan]>>>
    closedLoan: { entries: (poolId: string) => Observable<Vec<ITuple<[StorageKey<[u64, u64]>, Option<ClosedLoan & Struct>]>>> }
    lastLoanId: (poolId: string) => Observable<u64>
  } & QueryableModuleStorage<'rxjs'>
}

export interface ExtendedCalls extends QueryableCalls<'rxjs'> {
  ['loansApi']: {
    portfolio: (poolId: string) => Observable<Vec<ITuple<[u64, ActiveLoanInfo]>>>
  } & QueryableModuleCalls<'rxjs'>
}

export interface LoanInfo extends Struct {
  collateral: ITuple<[u64, u128]>
  schedule: unknown
  pricing: Enum
  restrictions: unknown
}

export interface ActiveLoan extends Struct {
  schedule: RepaymentSchedule
  collateral: ITuple<[u64, u128]>
  restrictions: unknown
  borrower: AccountId32
  writeOffPercentage: u128
  originationDate: u64
  pricing: ActivePricing
  totalBorrowed: u128
  totalRepaid: RepaidAmount
  repaymentsOnScheduleUntil: u64
}

export interface ActiveLoanInfo extends Struct {
  activeLoan: ActiveLoan
  presentValue: u128
  outstandingPrincipal: u128
  outstandingInterest: u128
}

export interface CreatedLoan extends Struct {
  info: LoanInfo
  borrower: AccountId32
}

export interface ClosedLoan extends Struct {
  closedAt: u32
  info: LoanInfo
  totalBorrowed: u128
  totalRepaid: u128
}

export interface PoolDetails extends Struct {
  currency: Enum
  tranches: unknown
  parameters: unknown
  metadata: Option<Bytes>
  status: unknown
  epoch: unknown
  reserve: unknown
}

export interface AssetMetadata extends Struct {
  decimals: u32
  name: Bytes
  symbol: Bytes
  existentialDeposit: u128
  location: unknown
  additional: unknown
}

interface RepaymentSchedule extends Struct {
  maturity: Maturity
  interestPayments: unknown
  payDownSchedule: unknown
}

export interface Maturity extends Enum {
  isFixed: boolean
  asFixed: {
    date: u64
    extension: u64
  }
}

export interface ActivePricing extends Enum {
  isInternal: boolean
  asInternal: {
    info: unknown
    interest: ActiveInterestRate
  }
  isExternal: boolean
  asExternal: {
    info: unknown
    interest: ActiveInterestRate
    outstandingQuantity: u128
  }
}

interface ActiveInterestRate extends Struct {
  interestRate: InterestRate
  normalizedAcc: u128
  penalty: u128
}

interface InterestRate extends Enum {
  isFixed: boolean
  asFixed: {
    ratePerYear: u128
    compounding: unknown
  }
}

interface RepaidAmount extends Struct {
  principal: u128
  interest: u128
  unscheduled: u128
}
