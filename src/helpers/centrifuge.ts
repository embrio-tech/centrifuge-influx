import Centrifuge from '@centrifuge/centrifuge-js'
import type { QueryableModuleStorage, QueryableStorage } from '@polkadot/api-base/types'
import type { Option, Bytes, Struct, Vec, u128, u64, u32, StorageKey, Enum } from '@polkadot/types'
import type { AccountId32 } from '@polkadot/types/interfaces'
import type { ITuple } from '@polkadot/types/types'
import type { Observable } from 'rxjs'

export const centrifuge = new Centrifuge({
  polkadotWsUrl: 'wss://fullnode-relay.development.cntrfg.com',
  centrifugeWsUrl: 'wss://fullnode.development.cntrfg.com',
  metadataHost: 'https://altair.mypinata.cloud',
})

export interface ExtendedQueries extends QueryableStorage<'rxjs'> {
  ['poolRegistry']: {
    poolMetadata: (poolId: string) => Observable<Option<{ metadata: Bytes } & Struct>>
  } & QueryableModuleStorage<'rxjs'>

  ['loans']: {
    createdLoan: { entries: (poolId: string) => Observable<Vec<ITuple<[StorageKey<[u64, u64]>, Option<CreatedLoan & Struct>]>>> }
    activeLoans: (poolId: string) => Observable<Vec<ITuple<[u64, ActiveLoan]>>>
    closedLoan: { entries: (poolId: string) => Observable<Vec<ITuple<[StorageKey<[u64, u64]>, Option<ClosedLoan & Struct>]>>> }
    lastLoanId: (poolId: string) => Observable<u64>
  } & QueryableModuleStorage<'rxjs'>
}

export interface LoanInfo extends Struct {
  collateral: ITuple<[u64, u128]>
  schedule: unknown
  pricing: Enum
  restrictions: unknown
}

export interface ActiveLoan extends Struct {
  schedule: unknown
  collateral: ITuple<[u64, u128]>
  restrictions: unknown
  borrower: AccountId32
  writeOffPercentage: u128
  originationDate: u64
  pricing: Enum
  totalBorrowed: u128
  totalRepaid: u128
  totalRepaidUnchecked: u128
}

export interface CreatedLoan extends Struct {
  info: LoanInfo
  borrower: AccountId32
}

export interface ClosedLoan {
  closedAt: u32
  info: LoanInfo
  totalBorrowed: u128
  totalRepaid: u128
}
