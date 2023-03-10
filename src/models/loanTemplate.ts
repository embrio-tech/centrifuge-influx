import { Schema, model } from 'mongoose'

export interface ILoanTemplate {
  _id: string
  createdAt: Date
  data: unknown
}

const LoanTemplateSchema = new Schema<ILoanTemplate>(
  {
    _id: { type: String, unique: true, index: true },
    createdAt: { type: Date, required: true },
    data: { type: Schema.Types.Mixed },
  },
  {
    optimisticConcurrency: true,
  }
)

export const LoanTemplate = model<ILoanTemplate>('LoanTemplate', LoanTemplateSchema)
