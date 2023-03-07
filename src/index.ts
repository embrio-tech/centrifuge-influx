import { subqlCollector } from './collectors/subql'
import { setGlobal } from './helpers'
import { db } from './helpers'
setGlobal()

async function main() {
  await db()

  subqlCollector.collect()
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
