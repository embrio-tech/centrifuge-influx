import axios from 'axios'

import type { AxiosInstance } from 'axios'
import { EventEmitter } from 'stream'
import Bottleneck from 'bottleneck'
import { Types } from 'mongoose'
import { DataFrameService, LoanService } from '../helpers'

class IpfsCollector {
  private ipfs: AxiosInstance
  readonly emitter: EventEmitter
  readonly bottleneck: Bottleneck

  constructor(endpoint: string) {
    this.ipfs = axios.create({ baseURL: `${endpoint}/ipfs` })
    this.emitter = new EventEmitter()
    this.bottleneck = new Bottleneck()
  }

  public getLoanTemplates = async (poolMetadata: string) => {
    const ipfsRequest = await this.ipfs.get<{ loanTemplates?: IpfsLoanTemplate[] }>(poolMetadata)
    return ipfsRequest.data['loanTemplates'] || []
  }

  public getLoanMetadata = async (loanMetadata: string) => {
    const ipfsRequest = await this.ipfs.get<IpfsLoanMetadata>(loanMetadata)
    return ipfsRequest.data
  }

  public indexLoanTemplates = async (poolMetadata: string) => {
    poolMetadata
  }

  public indexLoanMetadata = async (loanId: Types.ObjectId | string) => {
    logger.info(`Indexing IPFS metadata for loan: ${loanId}`)
    const loan = await LoanService.getOneById(loanId)
    const ipfsSources = loan?.sources.filter((source) => source.source === 'ipfs') ?? []
    const dbCreates = ipfsSources.map(async (source) => {
      const metadata = await this.getLoanMetadata(source.objectId)
      return DataFrameService.create({ createdAt: new Date(), source: 'ipfs', data: metadata, loan: new Types.ObjectId(loanId) })
    })
    return Promise.all(dbCreates)
  }

  public collect = (loanEmitter: EventEmitter) => {
    loanEmitter.on('newLoan', this.indexLoanMetadata)
  }
}

interface IpfsLoanTemplate {
  id: string
  createdAt: string
}

interface IpfsLoanMetadata {
  name: string
  properties: { _template: string; [labels: string]: unknown }
}

export const ipfsCollector = new IpfsCollector('https://altair.mypinata.cloud')
