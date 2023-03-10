import { centrifuge, ExtendedQueries } from '../helpers'
import type { ApiRx } from '@polkadot/api'
import { firstValueFrom } from 'rxjs'

class ChainCollector {
  private apiProm: Promise<ApiRx>
  constructor() {
    this.apiProm = centrifuge.getApiPromise()
  }

  public getPoolMetadataId = async () => {
    const apiQuery = (await this.apiProm).query as ExtendedQueries
    const metadataReq = await firstValueFrom(apiQuery.poolRegistry.poolMetadata(global.poolId))
    const poolMetadataId = metadataReq.unwrap().metadata.toUtf8()
    logger.info(`Fetched pool metadata Id: ${poolMetadataId}`)
    return poolMetadataId
  }
}

export const chainCollector = new ChainCollector()
