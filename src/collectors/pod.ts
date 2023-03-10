import { Types } from 'mongoose'
import { firstValueFrom } from 'rxjs'
import type { EventEmitter } from 'stream'
import { initWallets, centrifuge, LoanService, DataFrameService } from '../helpers'

class PodCollector {
  public wallets: ReturnType<typeof initWallets>

  constructor() {
    this.wallets = initWallets()
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
    const ipfsSources = loan?.sources.filter((source) => source.source === 'pod') ?? []
    const dbCreates = ipfsSources.map(async (source) => {
      const podData = await this.readPod(source.objectId)
      return DataFrameService.create({ createdAt: new Date(), source: 'pod', data: podData, loan: new Types.ObjectId(loanId) })
    })
    return Promise.all(dbCreates)
  }

  public collect = (loanEmitter: EventEmitter) => {
    loanEmitter.on('newLoan', this.indexLoanMetadata)
  }
}
export const podCollector = new PodCollector()
