import { podCollector, chainCollector, ipfsCollector } from './collectors'
import { db, setGlobal } from './helpers'

setGlobal()
async function main() {
  await db()

  podCollector.collect(chainCollector.emitter)
  ipfsCollector.collectLoanTemplates(ipfsCollector.emitter)

  const poolMetadataId = await chainCollector.getPoolMetadataId()
  const loanTemplates = await ipfsCollector.getLoanTemplates(poolMetadataId)
  await Promise.all(
    loanTemplates.map( (template) => ipfsCollector.initLoanTemplate(template.id) )
  )

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
