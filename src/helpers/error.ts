import { logger } from './'

export const errorHandler = (error: unknown) => {
  logger.error(error)
}
