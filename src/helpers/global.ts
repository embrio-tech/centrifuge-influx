import { POOL_ID } from '../config'
import { logger } from './'

export function setGlobal() {
  if (POOL_ID === undefined) throw new Error('Required POOL_ID environemnt variable has not been set')

  global.poolId = POOL_ID
  global.logger = logger
}
