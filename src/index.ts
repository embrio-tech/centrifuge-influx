import { subqlCollector, podCollector } from './collectors'
import { db, setGlobal } from './helpers'

setGlobal()
async function main() {
  await db()

  //const poolMetadataId = await chainCollector.getPoolMetadataId()
  //const _loanTemplates = await ipfsCollector.getLoanTemplates(poolMetadataId)

  podCollector.collect(subqlCollector.emitter)
  subqlCollector.collect()

  //const pod = await podCollector.readPod('2367081686:6589781820389572051')
  //logger.info(pod)
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
