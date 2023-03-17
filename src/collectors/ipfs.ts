import axios from 'axios'

import type { AxiosInstance } from 'axios'
import { EventEmitter } from 'stream'
import Bottleneck from 'bottleneck'
import type { Types } from 'mongoose'
import { FrameService, IpfsSourceService } from '../helpers'

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
    const ipfsSources = await IpfsSourceService.getMany({ entity: loanId }) //loan?.sources.filter((source) => source.source === 'ipfs') ?? []
    const frameCreations = ipfsSources.map(async (source) => {
      const metadata = await this.getLoanMetadata(source.objectId)
      return FrameService.create({ source: source._id, data: metadata })
    })
    const sourceupdates = ipfsSources.map((source) => {
      source.lastFetchedAt = new Date()
      return source.save()
    })
    return Promise.all([...frameCreations, ...sourceupdates])
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
