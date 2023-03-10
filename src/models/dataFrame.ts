import { Schema, model, Types } from 'mongoose'

export interface IDataFrame {
  source: string
  createdAt: Date
  data: unknown
  loan: Types.ObjectId
}

const dataFrameSchema = new Schema<IDataFrame>(
  {
    loan: { type: Schema.Types.ObjectId, ref: 'Loan', required: true },
    source: { type: String },
    createdAt: { type: Date },
    data: { type: Schema.Types.Mixed },
  },
  {
    optimisticConcurrency: true,
  }
)

export const DataFrame = model<IDataFrame>('DataFrame', dataFrameSchema)
