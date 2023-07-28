import { Schema, model, Types } from 'mongoose'
import type { DataTypes } from './source'
import type { Root } from '../helpers'

export interface IFrame extends Root {
  source: Types.ObjectId
  data: unknown
  dataType: DataTypes
}

const frameSchema = new Schema<IFrame>(
  {
    source: { type: Schema.Types.ObjectId, ref: 'Source', required: true },
    poolId: { type: 'String', required: true },
    data: { type: Schema.Types.Mixed },
    dataType: { type: 'String', required: true },
  },
  {
    optimisticConcurrency: true,
    timestamps: true,
  }
)

frameSchema.index({ poolId: 1 })

export const Frame = model<IFrame>('Frame', frameSchema)
