import mongoose from 'mongoose'
import { DB_URI } from '../config'

export async function db() {
  mongoose.set('strictQuery', false)
  await mongoose.connect(`${DB_URI}`)
  logger.info('DB Successfully connected!')
  return
}
