import type { FilterQuery, PipelineStage, Model, QueryOptions, Types } from 'mongoose'
import { Frame } from '../models/frame'
import { Entity, EntityTypes } from '../models/entity'
import { Source, SourceTypes } from '../models/source'

export type Root = { poolId: string }

class Service<T extends Root, U extends Partial<Root>> {
  model: Model<T>
  scope: U

  constructor(model: Model<T>, scope: U) {
    this.model = model
    this.scope = scope
  }

  public getAllWithCursor = async (options: QueryOptions = {}) => {
    return this.model.find({ ...this.scope }, {}, options).cursor()
  }

  public getManyWithCursor = async (query: FilterQuery<T> = {}, options: QueryOptions = {}) => {
    return this.model.find({ ...query, ...this.scope }, {}, options).cursor()
  }

  public getMany = (query: FilterQuery<T> = {}, options: QueryOptions = {}) => {
    return this.model.find({ ...query, ...this.scope }, {}, options).exec()
  }

  public getOneById = async (_id: string | Types.ObjectId, options: QueryOptions = {}) => {
    const entity = await this.model.findOne({ ...this.scope, _id }, {}, options).exec()
    return entity
  }

  public getOneByField = async (query: FilterQuery<T>, options: QueryOptions = {}) => {
    const entity = await this.model.findOne({ ...query, ...this.scope }, {}, options).exec()
    return entity
  }

  public getManyPopulatable = (query: FilterQuery<T> = {}, options: QueryOptions = {}) => {
    return this.model.find({ ...query, ...this.scope }, {}, options)
  }

  public count = async (query: FilterQuery<T>): Promise<number> => {
    return this.model.countDocuments({ ...query, ...this.scope }).exec()
  }

  public create = async (content: Omit<T, keyof U> & { _id?: unknown; __v?: unknown }) => {
    // remove _id if set on request body
    delete content._id
    delete content.__v

    return this.model.create({ ...content, ...this.scope })
  }

  public update = async (_id: string, updates: { [key: string]: unknown; updatedBy: string }) => {
    if ('_id' in updates) delete updates['_id']
    if (!('__v' in updates)) throw new Error('Document version __v is a required property!')

    const document = await this.model.findOne({ ...this.scope, _id }, {}).exec()
    if (!document) throw new Error('Could not find document to update, maybe has the wrong scope')
    // apply updates
    document.set({ ...updates, ...this.scope })

    // save updates
    return await document.save()
  }

  public upsert = async (query: FilterQuery<T>, content: Omit<T, keyof U> & { _id?: unknown; __v?: unknown }) => {
    const existing = await this.model.findOne({ ...query, ...this.scope }, {}).exec()
    if (existing) {
      Object.assign(existing, { ...content, ...this.scope })
      return existing.save()
    } else {
      const created = new this.model({ ...content, ...this.scope })
      return created.save()
    }
  }

  public deleteOneById = async (_id: string | Types.ObjectId) => {
    const document = await this.model.findOne({ ...this.scope, _id }).exec()
    if (!document) throw new Error('Could not find document to delete!')

    await document.remove()
    return document
  }

  public deleteMany = (query: FilterQuery<T>) => {
    return this.model.deleteMany({ ...query, ...this.scope }).exec()
  }

  public aggregate(pipeline: PipelineStage[]) {
    return this.model.aggregate([{ $match: { ...this.scope } }, ...pipeline]).exec()
  }
}

export const ScopedServices = (poolId: string) => ({
  pool: new Service(Entity, { type: EntityTypes.Pool, poolId }),
  loan: new Service(Entity, { type: EntityTypes.Loan, poolId }),

  chainSource: new Service(Source, { type: SourceTypes.CHAIN, poolId }),
  podSource: new Service(Source, { type: SourceTypes.POD, poolId }),
  subqlSource: new Service(Source, { type: SourceTypes.SUBQL, poolId }),
  ipfsSource: new Service(Source, { type: SourceTypes.IPFS, poolId }),

  frame: new Service(Frame, { poolId }),
})
