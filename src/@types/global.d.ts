import type pino from 'pino'

/* eslint-disable no-var */
declare global {
  var pools: string[]
  var logger: pino.Logger
}

export {}
