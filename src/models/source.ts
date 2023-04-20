import { Schema, Types, model } from 'mongoose'

export enum SourceTypes {
  IPFS = 'ipfs',
  SUBQL = 'subql',
  CHAIN = 'chain',
  POD = 'pod',
}

export interface ISource {
  entity: Types.ObjectId
  type: SourceTypes
  objectId: string
  lastFetchedAt?: Date
}

const sourceSchema = new Schema<ISource>(
  {
    entity: { type: Schema.Types.ObjectId, ref: 'Entity', required: true },
    type: { type: 'String', required: true, enum: SourceTypes },
    objectId: { type: String, required: true },
    lastFetchedAt: { type: Date, required: false },
  },
  {
    optimisticConcurrency: true,
    timestamps: true,
  }
)

sourceSchema.index({ type: 1, objectId: 1 })

export const Source = model<ISource>('Source', sourceSchema)
