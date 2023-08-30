import { PodCollector, ChainCollector, IpfsCollector } from './collectors'
import { IPFS_NODE } from './config'
import { ScopedServices, db, setGlobal } from './helpers'

const initialisedDb = db()

async function main(poolId: string) {
  await initialisedDb
  logger.info(`Starting indexer for pool: ${poolId}`)

  const services = ScopedServices(poolId)

  const chainCollector = await ChainCollector.init(poolId, services)
  const ipfsCollector = new IpfsCollector(poolId, services, IPFS_NODE)
  ipfsCollector.handleChainEvents(chainCollector.emitter)
  chainCollector.initPool()

  const { pod } = await ipfsCollector.poolMetadata
  if (pod?.node) {
    const podCollector = new PodCollector(poolId, services, pod.node)
    podCollector.handleChainEvents(chainCollector.emitter)
  }
  chainCollector.collectLoans()
  chainCollector.collectLoansInfo()
}

setGlobal()
global.pools.forEach((poolId) => {
  main(poolId)
    // .then(() => {
    //   logger.info('Successfully completed!')
    //   process.exit(0)
    // })
    .catch((error) => {
      logger.error(error)
      process.exit(1)
    })
})
