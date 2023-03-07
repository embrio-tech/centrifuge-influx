import type pino from 'pino'

/* eslint-disable no-var */
declare global {
  var poolId: string
  var logger: pino.Logger
}

export {}
