import Bottleneck from 'bottleneck'
import { Types } from 'mongoose'
import { firstValueFrom } from 'rxjs'
import type { EventEmitter } from 'stream'
import { POD_COLLECTOR_CONCURRENCY } from '../config'
import { initWallets, centrifuge, ScopedServices } from '../helpers'
import { DataTypes } from '../models/source'

export class PodCollector {
  readonly poolId: string
  readonly podNode: string
  readonly service: ReturnType<typeof ScopedServices>
  public wallets: ReturnType<typeof initWallets>
  private limiter: Bottleneck

  constructor(poolId: string, podNode: string) {
    this.poolId = poolId
    this.podNode = podNode
    this.service = ScopedServices(poolId)
    this.wallets = initWallets()
    this.limiter = new Bottleneck({
      maxConcurrent: parseInt(POD_COLLECTOR_CONCURRENCY, 10),
      minTime: 500,
    })
  }

  public getPodDocumentId = (objectId: string) => {
    const [nftClassId = '', nftItemId = ''] = objectId.split(':')
    return firstValueFrom<string>(centrifuge.nfts.getNftDocumentId([nftClassId, nftItemId]))
  }

  public authenticate = async () => {
    const wallets = await this.wallets
    const podData = await centrifuge.auth.generateJw3t(wallets.proxyKeyring, undefined, { proxyType: 'PodAuth', onBehalfOf: wallets.operatorAddress })
    return podData
  }

  public readPod = async (objectId: string) => {
    const documentId = await this.getPodDocumentId(objectId)
    const token = await this.authenticate()
    return await centrifuge.pod.getCommittedDocument([this.podNode, token.token, documentId])
  }

  public indexPod = async (loanId: Types.ObjectId | string) => {
    logger.info(`Indexing POD for loan: ${loanId}`)
    const podSources = await this.service.podSource.getMany({ entity: loanId })
    const dataUpdates = []
    for (const source of podSources) {
      const podData = await this.readPod(source.objectId).catch((err) => {
        logger.error(`unable to read POD ${source.objectId} for loan ${loanId}: ${err}`)
        return null
      })
      if (podData === null) break
      const frameData = Object.fromEntries(
        Object.entries(podData.attributes)
          .filter((entry) => !entry[0].startsWith('_'))
          .map((entry) => [entry[0], typeMapper[entry[1].type](entry[1])])
      )
      source.lastFetchedAt = new Date()
      dataUpdates.push(source.save())
      dataUpdates.push(this.service.frame.create({ source: source._id, data: frameData, dataType: DataTypes.PodData }))
    }
    return Promise.all(dataUpdates)
  }

  public handleChainEvents = (chainEmitter: EventEmitter) => {
    chainEmitter.on('newLoan', (loanId) => {
      this.limiter.schedule(this.indexPod, loanId)
    })
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const typeMapper = {
  string: (val: any) => String(val.value),
  decimal: (val: any) => parseFloat(val.value),
  monetary: (val: any) => new Types.Decimal128(val.monetary_value.value),
  bytes: (val: any) => String(val.value),
  integer: (val: any) => parseInt(val.value, 10),
  timestamp: (val: any) => new Date(val.value),
}
