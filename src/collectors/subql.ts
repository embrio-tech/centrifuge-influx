import EventEmitter from 'events'
import axios from 'axios'
import { SUBQL_POLLING_INTERVAL_SECONDS } from '../config'
import { LoanService, PodSourceService } from '../helpers'

import type { AxiosError, AxiosInstance } from 'axios'

class SubqlCollector {
  private subql: AxiosInstance
  private batchSize: number
  readonly emitter: EventEmitter

  constructor(endpoint: string) {
    this.subql = axios.create({ baseURL: endpoint })
    this.batchSize = 100
    this.emitter = new EventEmitter()
  }

  private getLoansBatch = async (offset = 0) => {
    const loanRequest = await this.subql
      .post<ISubQl<{ loans: { totalCount: number; nodes: SubqlLoan[] } }>>('/', {
        query: `query getLoans($poolId: String, $amount: Int, $offset: Int) {
        loans(filter: {poolId: {equalTo: $poolId}}, offset: $offset, first: $amount, orderBy: CREATED_AT_ASC) {
          totalCount
          nodes {
            id
            createdAt
            collateralNftClassId
            collateralNftItemId
            metadata
            advanceRate
            value
            probabilityOfDefault
            lossGivenDefault
            discountRate
            maturityDate
            type
            spec
            interestRatePerSec
            isAdminWrittenOff
            poolId
            isActive
            status
            outstandingDebt
            borrowedAmountByPeriod
            repaidAmountByPeriod
            writeOffIndex
            writtenOffPercentageByPeriod
            writtenOffAmountByPeriod
            penaltyInterestRatePerSec
          }
        }
      }`,
        variables: { poolId: global.poolId, amount: this.batchSize, offset },
      })
      .catch((err: AxiosError) => {
        throw new Error(err.message)
      })
    return loanRequest.data.data?.loans
  }

  public getPoolMetadata = async () => {
    const poolRequest = await this.subql
      .post<ISubQl<{ pool: { metadata: string } }>>('/', {
        query: 'query getPool($poolId: String!) { pool( id: $poolId) { metadata } }',
        variables: { poolId: global.poolId },
      })
      .catch((err: AxiosError) => {
        throw new Error(err.message)
      })
    const poolMetadata = poolRequest.data.data?.pool.metadata ?? ''
    logger.info(`Pool Metadata: ${poolMetadata}`)
    return poolMetadata
  }

  public countInitialisedLoans = () => {
    return LoanService.count({})
  }

  private initLoans = async (offset: number) => {
    const loansBatch = await this.getLoansBatch(offset)
    const loans = loansBatch?.nodes ?? []
    if (loans.length > 0) logger.info(`Indexing loans ${offset + loans.length} of ${loansBatch?.totalCount}`)
    for (const loan of loans) {
      const newLoan = await LoanService.create({})
      await PodSourceService.create({ entity: newLoan._id, objectId: `${loan.collateralNftClassId}:${loan.collateralNftItemId}`, lastFetchedAt: new Date() })
      this.emitter.emit('newLoan', newLoan.id)
    }
    return loans.length
  }

  public collect = async (_offset?: number) => {
    const offset = _offset ?? (await this.countInitialisedLoans())
    let intervalSeconds: number
    const newLoansAmount = await this.initLoans(offset).catch((err) => {
      logger.error(err)
      return -1
    })
    switch (newLoansAmount) {
      case -1:
        logger.error(`Unable to fetch loans...re-checking in ${SUBQL_POLLING_INTERVAL_SECONDS}s`)
        intervalSeconds = parseInt(SUBQL_POLLING_INTERVAL_SECONDS, 10)
        break

      case 0:
        logger.info(`Already up to date...re-checking in ${SUBQL_POLLING_INTERVAL_SECONDS}s`)
        intervalSeconds = parseInt(SUBQL_POLLING_INTERVAL_SECONDS, 10)
        break

      case this.batchSize:
        intervalSeconds = 1
        break

      default:
        logger.info(`All loans indexed...re-checking in ${SUBQL_POLLING_INTERVAL_SECONDS}s`)
        intervalSeconds = parseInt(SUBQL_POLLING_INTERVAL_SECONDS, 10)
        break
    }
    setTimeout(() => this.collect(offset + newLoansAmount), intervalSeconds * 1000)
  }
}

interface ISubQl<Q> {
  data?: Q
  extensions?: unknown
  errors?: unknown
}

export const subqlCollector = new SubqlCollector('https://api.subquery.network/sq/embrio-tech/centrifuge-subql')
