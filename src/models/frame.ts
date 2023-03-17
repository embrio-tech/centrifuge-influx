import { Schema, model, Types } from 'mongoose'

export interface IFrame {
  source: Types.ObjectId
  data: unknown
  type?: string
}

const frameSchema = new Schema<IFrame>(
  {
    source: { type: Schema.Types.ObjectId, ref: 'Source', required: true },
    data: { type: Schema.Types.Mixed },
  },
  {
    optimisticConcurrency: true,
    timestamps: true,
  }
)

export const Frame = model<IFrame>('Frame', frameSchema)
