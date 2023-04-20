import Centrifuge from '@centrifuge/centrifuge-js'
import type { QueryableModuleStorage, QueryableStorage } from '@polkadot/api-base/types'
import type { Option, Bytes, Struct, Vec, u128, u64, StorageKey } from '@polkadot/types'
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
    createdLoan: { entries: (poolId: string) => Observable<Vec<ITuple<[StorageKey<[u64, u64]>, Option<{ borrower: AccountId32; info: LoanInfo } & Struct>]>>> }
    activeLoans: (poolId: string) => Observable<Vec<ITuple<[ActiveLoan, u64]>>>
    closedLoan: { entries: (poolId: string) => Observable<Vec<ITuple<[StorageKey<[u64, u64]>, Option<{ closedAt: Uint32Array; info: LoanInfo } & Struct>]>>> }
    lastLoanId: (poolId: string) => Observable<u64>
  } & QueryableModuleStorage<'rxjs'>
}

export interface LoanInfo extends Struct {
  collateralValue: u128
  interestRate: u128
  collateral: ITuple<[u64,u128]>
}

export interface ActiveLoan extends Struct {
  loanId: u64
  info: LoanInfo
  borrower: AccountId32
  normalizedDebt: u128
}
