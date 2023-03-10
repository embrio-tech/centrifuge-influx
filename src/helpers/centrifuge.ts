import Centrifuge from '@centrifuge/centrifuge-js'
import type { QueryableModuleStorage, QueryableStorage } from '@polkadot/api-base/types'
import type { Option, Bytes, Struct } from '@polkadot/types'
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
}
