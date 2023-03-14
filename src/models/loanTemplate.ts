import { Schema, model } from 'mongoose'

export interface ILoanTemplate {
  _id: string
  data: unknown
}

const LoanTemplateSchema = new Schema<ILoanTemplate>(
  {
    _id: { type: String, unique: true, index: true },
    data: { type: Schema.Types.Mixed },
  },
  {
    optimisticConcurrency: true,
    timestamps: true,
  }
)

export const LoanTemplate = model<ILoanTemplate>('LoanTemplate', LoanTemplateSchema)
