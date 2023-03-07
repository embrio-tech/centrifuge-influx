import { POOL_ID } from '../config'
import { logger } from './'

export function setGlobal() {
  global.poolId = POOL_ID
  global.logger = logger
}
