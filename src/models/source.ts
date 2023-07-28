import { Schema, Types, model } from 'mongoose'
import type { Root } from '../helpers'

export enum SourceTypes {
  IPFS = 'ipfs',
  SUBQL = 'subql',
  CHAIN = 'chain',
  POD = 'pod',
}

export enum DataTypes {
  LoanTemplate = 'loanTemplate',
  PoolMetadata = 'poolMetadata',
  PodData = 'podData',
  LoanInfo = 'loanInfo',
}

export interface ISource extends Root {
  entity: Types.ObjectId
  type: SourceTypes
  dataType: DataTypes
  objectId: string
  lastFetchedAt?: Date | null
}

const sourceSchema = new Schema<ISource>(
  {
    entity: { type: Schema.Types.ObjectId, ref: 'Entity', required: true },
    poolId: { type: 'String', required: true },
    type: { type: 'String', required: true, enum: SourceTypes },
    dataType: { type: 'String', required: true, enum: DataTypes },
    objectId: { type: String, required: true },
    lastFetchedAt: { type: Date, default: null },
  },
  {
    optimisticConcurrency: true,
    timestamps: true,
  }
)

sourceSchema.index({ type: 1, objectId: 1 })
sourceSchema.index({ poolId: 1 })

export const Source = model<ISource>('Source', sourceSchema)
