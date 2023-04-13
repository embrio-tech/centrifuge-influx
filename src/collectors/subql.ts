import EventEmitter from 'events'
import axios from 'axios'
import { SUBQL_ENDPOINT } from '../config'

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

  public getLoansBatch = async (offset = 0) => {
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
            probabilityOfDefault
            lossGivenDefault
            discountRate
            maturityDate
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
}

interface ISubQl<Q> {
  data?: Q
  extensions?: unknown
  errors?: unknown
}

export const subqlCollector = new SubqlCollector(SUBQL_ENDPOINT)
