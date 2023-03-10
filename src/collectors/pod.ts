import Bottleneck from 'bottleneck'
import { Types } from 'mongoose'
import { firstValueFrom } from 'rxjs'
import type { EventEmitter } from 'stream'
import { POD_COLLECTOR_CONCURRENCY } from '../config'
import { initWallets, centrifuge, LoanService, DataFrameService } from '../helpers'

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
    const podData = await centrifuge.auth.generateJw3t(wallets.proxy, undefined, { proxyType: 'Any', onBehalfOf: wallets.operator.address })
    return podData
  }

  public readPod = async (objectId: string) => {
    const documentId = await this.getPodDocumentId(objectId)
    const token = await this.authenticate()
    return await centrifuge.pod.getCommittedDocument(['https://pod.development.cntrfg.com/', token.token, documentId])
  }

  public indexLoanMetadata = async (loanId: Types.ObjectId | string) => {
    logger.info(`Indexing POD for loan: ${loanId}`)
    const loan = await LoanService.getOneById(loanId)
    if (!loan) throw Error('Corresponding loan not found')
    const ipfsSources = loan?.sources.filter((source) => source.source === 'pod') ?? []
    const dbCreates = ipfsSources.map(async (source) => {
      const podData = await this.readPod(source.objectId)
      return DataFrameService.create({ source: 'pod', data: podData, loan: new Types.ObjectId(loanId) })
    })
    ipfsSources.forEach((source) => (source.lastFetchedAt = new Date()))
    return Promise.all([...dbCreates, loan.save()])
  }

  public collect = (loanEmitter: EventEmitter) => {
    loanEmitter.on('newLoan', (loanId) => {
      this.limiter.schedule(this.indexLoanMetadata, loanId)
    })
  }
}
export const podCollector = new PodCollector()
