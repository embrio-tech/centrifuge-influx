import { Schema, model } from 'mongoose'

export enum EntityTypes {
  Loan = 'Loan',
  LoanTemplate = 'LoanTemplate',
}

export interface IEntity {
  type: EntityTypes
}

const entitySchema = new Schema<IEntity>(
  {
    type: { type: 'String', required: true, enum: EntityTypes },
  },
  {
    optimisticConcurrency: true,
    timestamps: true,
  }
)

export const Entity = model<IEntity>('Entity', entitySchema)
