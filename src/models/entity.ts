import { Schema, model } from 'mongoose'
import type { Root } from '../helpers'

export enum EntityTypes {
  Loan = 'loan',
  Pool = 'pool',
}

export interface IEntity extends Root {
  type: EntityTypes
  poolId: string
}

const entitySchema = new Schema<IEntity>(
  {
    type: { type: 'String', required: true, enum: EntityTypes },
    poolId: { type: 'String', required: true },
  },
  {
    optimisticConcurrency: true,
    timestamps: true,
  }
)

entitySchema.index({ poolId: 1 })

export const Entity = model<IEntity>('Entity', entitySchema)
