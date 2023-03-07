import { Schema, model } from 'mongoose'

export interface ILoan {
  sources: Source[]
}

export interface Source {
  source: string
  objectId: string
  lastFetchedAt?: Date
}

const loanSchema = new Schema<ILoan>(
  {
    sources: [
      {
        source: { type: String, required: true },
        objectId: { type: String, required: true },
        lastFetchedAt: { type: Date, required: false },
      },
    ],
  },
  {
    optimisticConcurrency: true,
  }
)

export const Loan = model<ILoan>('Loan', loanSchema)
