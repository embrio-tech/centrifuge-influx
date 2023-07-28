import axios from 'axios'

import type { AxiosInstance } from 'axios'
import { EventEmitter } from 'stream'
import Bottleneck from 'bottleneck'
import type { PipelineStage, Types } from 'mongoose'
import { ScopedServices } from '../helpers'
import { DataTypes } from '../models/source'

export class IpfsCollector {
  private ipfs: AxiosInstance
  readonly emitter: EventEmitter
  readonly limiter: Bottleneck
  readonly poolId: string
  readonly poolMetadata: Promise<IpfsPoolMetadata>
  readonly service: ReturnType<typeof ScopedServices>

  constructor(poolId: string, endpoint: string) {
    this.poolId = poolId
    this.ipfs = axios.create({ baseURL: `${endpoint}/ipfs` })
    this.emitter = new EventEmitter()
    this.limiter = new Bottleneck()
    this.service = ScopedServices(poolId)
    this.poolMetadata = new Promise<IpfsPoolMetadata>((resolve) => {
      this.emitter.once('metadataReady', resolve)
    })
  }

  public initLoanTemplate = async (ipfsTemplateId: string) => {
    let loanTemplateSource = await this.service.ipfsSource.getOneByField({ objectId: ipfsTemplateId })
    if (loanTemplateSource === null) {
      logger.info(`Initialising LoanTemplate: ${ipfsTemplateId}`)
      const newLoanTemplate = await this.service.loan.create({})
      loanTemplateSource = await this.service.ipfsSource.create({
        entity: newLoanTemplate._id,
        objectId: ipfsTemplateId,
        dataType: DataTypes.LoanTemplate,
      })
    }
    return loanTemplateSource._id
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
    const ipfsSource = await this.service.ipfsSource.getOneByField({ entity: poolId })
    if (ipfsSource === null) throw new Error('IPFS Source not found')
    const poolMetadata = await this.getPoolMetadata(ipfsSource.objectId)
    ipfsSource.lastFetchedAt = new Date()
    let poolMetadataFrame = await this.service.frame.getOneByField({ source: ipfsSource._id })
    if (!poolMetadataFrame)
      poolMetadataFrame = await this.service.frame.create({ source: ipfsSource._id, data: poolMetadata, dataType: DataTypes.PoolMetadata })
    else poolMetadataFrame.data = poolMetadata

    await Promise.all([poolMetadataFrame.save(), ipfsSource.save()])
    return poolMetadata
  }

  public indexLoanTemplate = async (loanTemplateSource: Types.ObjectId | string) => {
    const ipfsSource = await this.service.ipfsSource.getOneById(loanTemplateSource)
    if (ipfsSource === null) throw new Error('IPFS Source not found')
    logger.info(`Indexing IPFS LoanTemplate: ${loanTemplateSource}`)

    const loanTemplate = await this.getLoanMetadata(ipfsSource.objectId)
    const frameCreation = this.service.frame.create({ source: ipfsSource._id, data: loanTemplate, dataType: DataTypes.LoanTemplate })

    ipfsSource.lastFetchedAt = new Date()
    const sourceUpdate = ipfsSource.save()

    return Promise.all([frameCreation, sourceUpdate])
  }

  public handleChainEvents = (chainEmitter: EventEmitter) => {
    chainEmitter.on('poolReady', this.initMetadata)
  }

  private initMetadata = async (poolId: string | Types.ObjectId) => {
    const poolMetadata = await this.indexPoolMetadata(poolId)
    const { loanTemplates = [] } = poolMetadata
    const newTemplateSources = await Promise.all(loanTemplates.map((loanTemplate) => this.initLoanTemplate(loanTemplate.id)))
    await Promise.all(newTemplateSources.map(this.indexLoanTemplate))
    this.emitter.emit('metadataReady', poolMetadata)
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

export interface IpfsPoolMetadata {
  loanTemplates?: IpfsLoanTemplate[]
  aggregates?: { [id: string]: PipelineStage[] }
  pod?: { node: string }
}
