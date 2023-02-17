import * as pino from 'pino'

export const logger = pino.default({
  name: 'influx',
  level: 'debug',
})
