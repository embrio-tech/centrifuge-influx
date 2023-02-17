import { logger } from './helpers'

async function main() {
  logger.info('ciao')
}

main()
  .then(() => {
    logger.info('Successfully completed!')
    process.exit(0)
  })
  .catch((error) => {
    logger.error(error)
    process.exit(1)
  })
