import type { FilterQuery, PipelineStage, Model, QueryOptions, Types } from 'mongoose'
import { Frame } from '../models/frame'
import { Entity, EntityTypes } from '../models/entity'
import { Source, SourceTypes } from '../models/source'

class Service<T extends { type?: string }> {
  model: Model<T>
  entityType: string | undefined

  constructor(model: Model<T>, entityType?: string) {
    this.model = model
    this.entityType = entityType
  }

  public getAllWithCursor = async (options: QueryOptions = {}) => {
    return this.model.find({ type: this.entityType }, {}, options).cursor()
  }

  public getManyWithCursor = async (query: FilterQuery<T> = {}, options: QueryOptions = {}) => {
    return this.model.find({ ...query, type: this.entityType }, {}, options).cursor()
  }

  public getMany = (query: FilterQuery<T> = {}, options: QueryOptions = {}) => {
    return this.model.find({ ...query, type: this.entityType }, {}, options).exec()
  }

  public getOneById = async (_id: string | Types.ObjectId, options: QueryOptions = {}) => {
    const entity = await this.model.findById(_id, {}, options).exec()
    switch (this.entityType) {
      case undefined:
        return entity

      default:
        return entity?.type === this.entityType ? entity : null
    }
  }

  public getManyPopulatable = (query: FilterQuery<T> = {}, options: QueryOptions = {}) => {
    return this.model.find({ ...query, type: this.entityType }, {}, options)
  }

  public count = async (query: FilterQuery<T>): Promise<number> => {
    return this.model.countDocuments({ ...query, type: this.entityType }).exec()
  }

  public create = async (content: Omit<T, 'type'> & { _id?: unknown; __v?: unknown }) => {
    // remove _id if set on request body
    delete content._id
    delete content.__v

    return this.model.create({ ...content, type: this.entityType })
  }

  public update = async (_id: string, updates: { [key: string]: unknown; updatedBy: string }) => {
    if ('_id' in updates) delete updates['_id']
    if (!('__v' in updates)) throw new Error('Document version __v is a required property!')

    const document = await this.model.findById(_id, {}).exec()
    if (!document) throw new Error('Could not find document to update')
    if (this.entityType && document.type !== this.entityType) throw new Error('Document has wrong type!')

    // apply updates
    document.set(updates)

    // save updates
    return await document.save()
  }

  public upsert = async (query: FilterQuery<T>, content: T & { _id?: unknown; __v?: unknown }) => {
    const existing = await this.model.findOne({ ...query, type: this.entityType }, {}).exec()
    if (existing) {
      Object.assign(existing, { ...content, type: this.entityType })
      return existing.save()
    } else {
      const created = new this.model({ ...content, type: this.entityType })
      return created.save()
    }
  }

  public deleteOneById = async (_id: string | Types.ObjectId) => {
    const document = await this.model.findById(_id).exec()
    if (!document) throw new Error('Could not find document to delete!')
    if (this.entityType && document.type !== this.entityType) throw new Error('Document has wrong type!')

    await document.remove()
    return document
  }

  public deleteMany = (query: FilterQuery<T>) => {
    return this.model.deleteMany({ ...query, type: this.entityType }).exec()
  }

  public aggregate(pipeline: PipelineStage[]) {
    return this.model.aggregate(pipeline).exec()
  }
}

export const LoanService = new Service(Entity, EntityTypes.Loan)
export const LoanTemplateService = new Service(Entity, EntityTypes.LoanTemplate)
export const PodSourceService = new Service(Source, SourceTypes.POD)
export const SubqlSourceService = new Service(Source, SourceTypes.SUBQL)
export const IpfsSourceService = new Service(Source, SourceTypes.IPFS)
export const FrameService = new Service(Frame)
