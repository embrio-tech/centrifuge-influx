import Bottleneck from 'bottleneck'
import { Types } from 'mongoose'
import { firstValueFrom } from 'rxjs'
import type { EventEmitter } from 'stream'
import { POD_COLLECTOR_CONCURRENCY, POD_NODE } from '../config'
import { initWallets, centrifuge, FrameService, PodSourceService } from '../helpers'

class PodCollector {
  public wallets: ReturnType<typeof initWallets>
  private limiter: Bottleneck

  constructor() {
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
    const podData = await centrifuge.auth.generateJw3t(wallets.proxyKeyring, undefined, { proxyType: 'Any', onBehalfOf: wallets.operatorAddress })
    return podData
  }

  public readPod = async (objectId: string) => {
    const documentId = await this.getPodDocumentId(objectId)
    const token = await this.authenticate()
    return await centrifuge.pod.getCommittedDocument([POD_NODE, token.token, documentId])
  }

  public indexLoanMetadata = async (loanId: Types.ObjectId | string) => {
    logger.info(`Indexing POD for loan: ${loanId}`)
    const podSources = await PodSourceService.getMany({ entity: loanId }) //loan?.sources.filter((source) => source.source === 'pod') ?? []
    const frameCreations = podSources.map(async (source) => {
      const podData = await this.readPod(source.objectId)
      const frameEntries = Object.entries(podData.attributes)
        .filter(entry => !entry[0].startsWith('_'))
        .map((entry) => [entry[0], typeMapper[entry[1].type](entry[1])])
      return FrameService.create({ source: source._id, data: Object.fromEntries(frameEntries) })
    })
    const podSourcesUpdates = podSources.map((source) => {
      source.lastFetchedAt = new Date()
      return source.save()
    })
    return Promise.all([...frameCreations, podSourcesUpdates])
  }

  public collect = (loanEmitter: EventEmitter) => {
    loanEmitter.on('newLoan', (loanId) => {
      this.limiter.schedule(this.indexLoanMetadata, loanId)
    })
  }
}
export const podCollector = new PodCollector()

/* eslint-disable @typescript-eslint/no-explicit-any */
const typeMapper = {
  string: (val: any) => String(val.value),
  decimal: (val: any) => parseFloat(val.value),
  monetary: (val: any) => new Types.Decimal128(val.monetary_value.value),
  bytes: (val: any) => String(val.value),
  integer: (val: any) => parseInt(val.value, 10),
  timestamp: (val: any) => new Date(val.value),
}
