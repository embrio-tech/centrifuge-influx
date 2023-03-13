import type { FilterQuery, PipelineStage, Document, Model, QueryOptions, Types } from 'mongoose'
import { DataFrame } from '../models/dataFrame'
import { Loan } from '../models/loan'
import { LoanTemplate } from '../models/loanTemplate'

class Service<T> {
  model: Model<T>

  constructor(model: Model<T>) {
    this.model = model
  }

  public getAllWithCursor = async (options: QueryOptions = {}) => {
    return this.model.find({}, {}, options).cursor()
  }

  public getManyWithCursor = async (filter: FilterQuery<T> = {}, options: QueryOptions = {}) => {
    return this.model.find(filter, {}, options).cursor()
  }

  public getOneById = async (_id: string | Types.ObjectId, options: QueryOptions = {}) => {
    return this.model.findById(_id, {}, options).exec()
  }

  public getManyPopulatable = (query: FilterQuery<T> = {}, options: QueryOptions = {}) => {
    return this.model.find(query, {}, options)
  }

  public count = async (query: FilterQuery<T>): Promise<number> => {
    return this.model.countDocuments(query).exec()
  }

  public getOneByIdPopulatable = (_id: string) => {
    return this.model.findById(_id, {})
  }

  public create = async (content: T & { _id?: unknown; __v?: unknown }) => {
    // remove _id if set on request body
    delete content._id
    delete content.__v

    return this.model.create(content)
  }

  public update = async (_id: string, updates: { [key: string]: unknown; updatedBy: string }) => {
    if ('_id' in updates) delete updates['_id']
    if (!('__v' in updates)) throw new Error('Document version __v is a required property!')

    const document = await this.model.findById(_id, {}).exec()
    if (!document) throw new Error('Could not find document to update')

    // apply updates
    document.set(updates)

    // save updates
    return await document.save()
  }

  public upsert = async (query: FilterQuery<T>, content: T & { _id?: unknown; __v?: unknown }): Promise<Document<T>> => {
    const existing = await this.model.findOne(query, {}).exec()
    if (existing) {
      existing.set(content)
      return await existing.save()
    } else {
      const created = new this.model(content)
      return await created.save()
    }
  }

  public deleteOneById = async (_id: string) => {
    const document = await this.model.findById(_id).exec()
    if (!document) throw new Error('Could not find document to delete!')

    await document.remove()
    return document
  }

  public deleteMany = (query: FilterQuery<T>) => {
    return this.model.deleteMany(query).exec()
  }

  public aggregate(pipeline: PipelineStage[]) {
    return this.model.aggregate(pipeline).exec()
  }
}

export const LoanService = new Service(Loan)
export const DataFrameService = new Service(DataFrame)
export const LoanTemplateService = new Service(LoanTemplate)
