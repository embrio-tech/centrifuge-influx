import axios from 'axios'

import type { AxiosInstance } from 'axios'
import { EventEmitter } from 'stream'
import Bottleneck from 'bottleneck'
import type { PipelineStage, Types } from 'mongoose'
import { FrameService, IpfsSourceService, LoanTemplateService } from '../helpers'
import { IPFS_NODE } from '../config'

class IpfsCollector {
  private ipfs: AxiosInstance
  readonly emitter: EventEmitter
  readonly bottleneck: Bottleneck

  constructor(endpoint: string) {
    this.ipfs = axios.create({ baseURL: `${endpoint}/ipfs` })
    this.emitter = new EventEmitter()
    this.bottleneck = new Bottleneck()
  }

  public initLoanTemplate = async (ipfsTemplateId: string) => {
    const loanTemplateSource = await IpfsSourceService.getOneByField({ objectId: ipfsTemplateId })
    if (loanTemplateSource === null) {
      logger.info(`Initialising LoanTemplate: ${ipfsTemplateId}`)
      const newLoanTemplate = await LoanTemplateService.create({})
      await IpfsSourceService.create({ entity: newLoanTemplate._id , objectId: ipfsTemplateId })
      this.emitter.emit('newLoanTemplate', newLoanTemplate.id)
    }
  }

  public getPoolMetadata = async (poolMetadataId: string) => {
    const ipfsRequest = await this.ipfs.get<IpfsPoolMetadata>(poolMetadataId)
    return ipfsRequest.data
  }

  public getLoanMetadata = async (loanMetadata: string) => {
    const ipfsRequest = await this.ipfs.get<IpfsLoanMetadata>(loanMetadata)
    return ipfsRequest.data
  }

  public indexPoolMetadata = async (poolId: Types.ObjectId | string) => {
    logger.info(`Indexing IPFS metadata for pool: ${poolId}`)
    const ipfsSource = await IpfsSourceService.getOneByField({ entity: poolId })
    if (ipfsSource === null) throw new Error('IPFS Source not found')
    const poolMetadata = await this.getPoolMetadata(ipfsSource.objectId)
    ipfsSource.lastFetchedAt = new Date()
    await Promise.all([
      FrameService.create({ source: ipfsSource._id, data: poolMetadata }),
      ipfsSource.save(),
    ])
    this.emitter.emit('newPoolMetadata', poolMetadata)
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

  public indexLoanTemplate = async (loanTemplateId: Types.ObjectId | string) => {
    logger.info(`Indexing IPFS LoanTemplate: ${loanTemplateId}`)
    const ipfsSources = await IpfsSourceService.getMany({ entity: loanTemplateId }) //loan?.sources.filter((source) => source.source === 'ipfs') ?? []
    const frameCreations = ipfsSources.map(async (source) => {
      const loanTemplate = await this.getLoanMetadata(source.objectId)
      return FrameService.create({ source: source._id, data: loanTemplate })
    })
    const sourceupdates = ipfsSources.map((source) => {
      source.lastFetchedAt = new Date()
      return source.save()
    })
    return Promise.all([...frameCreations, ...sourceupdates])
  }

  public collectPoolMetadata = ( poolEmitter: EventEmitter ) => {
    poolEmitter.on('newPool', this.indexPoolMetadata)
  }

  public collectLoanTemplates = (loanTemplateEmitter: EventEmitter) => {
    this.emitter.on('newPoolMetadata', (poolMetadata: IpfsPoolMetadata) => {
      poolMetadata.loanTemplates.map( loanTemplate => this.initLoanTemplate(loanTemplate.id) )
    })

    loanTemplateEmitter.on('newLoanTemplate', this.indexLoanTemplate)
  }

  public collectLoans = (loanEmitter: EventEmitter) => {
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

interface IpfsPoolMetadata {
  loanTemplates: IpfsLoanTemplate[]
  aggregates: { [id: string]: PipelineStage[] }
}

export const ipfsCollector = new IpfsCollector(IPFS_NODE)
