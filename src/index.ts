import { podCollector, ChainCollector, ipfsCollector } from './collectors'
import { db, setGlobal } from './helpers'

setGlobal()
async function main() {
  await db()

  const chainCollector = await ChainCollector.init(global.poolId)

  ipfsCollector.collectPoolMetadata(chainCollector.emitter)
  ipfsCollector.collectLoanTemplates(ipfsCollector.emitter)
  podCollector.collect(chainCollector.emitter)

  chainCollector.initPool()
  chainCollector.collectLoans()
  chainCollector.collectLoansInfo()
}

main()
  // .then(() => {
  //   logger.info('Successfully completed!')
  //   process.exit(0)
  // })
  .catch((error) => {
    logger.error(error)
    process.exit(1)
  })
