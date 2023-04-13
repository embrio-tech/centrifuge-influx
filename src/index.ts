import { podCollector, chainCollector } from './collectors'
import { db, setGlobal } from './helpers'

setGlobal()
async function main() {
  await db()

  //const poolMetadataId = await chainCollector.getPoolMetadataId()
  //const _loanTemplates = await ipfsCollector.getLoanTemplates(poolMetadataId)

  podCollector.collect(chainCollector.emitter)
  chainCollector.collect()

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
