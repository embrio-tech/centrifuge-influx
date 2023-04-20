import { centrifuge, ChainSourceService, ExtendedQueries, FrameService, LoanService, PodSourceService, SubqlSourceService } from '../helpers'
import EventEmitter from 'events'
import { firstValueFrom } from 'rxjs'
import { SUBQL_POLLING_INTERVAL_SECONDS } from '../config'
import { Types } from 'mongoose'
import type { ApiRx } from '@polkadot/api'
import type { ActiveLoan } from '@centrifuge/centrifuge-js'

type LoanPodRef = [loanIds: number[], podRefs: string[]]

class ChainCollector {
  private apiProm: Promise<ApiRx>
  readonly emitter: EventEmitter
  constructor() {
    this.apiProm = centrifuge.getApiPromise()
    this.emitter = new EventEmitter()
  }

  public getPoolMetadataId = async () => {
    const apiQuery = (await this.apiProm).query as ExtendedQueries
    const metadataReq = await firstValueFrom(apiQuery.poolRegistry.poolMetadata(global.poolId))
    const poolMetadataId = metadataReq.unwrap().metadata.toUtf8()
    logger.info(`Fetched pool metadata Id: ${poolMetadataId}`)
    return poolMetadataId
  }

  private getActiveLoans = async (): Promise<[number[], ActiveLoan[]]> => {
    logger.info('Fetching active loans info')
    const apiQuery = (await this.apiProm).query as ExtendedQueries
    const loanReq = await firstValueFrom(apiQuery.loans.activeLoans(global.poolId))
    const loanIds = loanReq.map((loan) => loan[0].loanId.toNumber())
    const loanInfo = loanReq.map((loan) => loan[0] as unknown as ActiveLoan)
    return [loanIds, loanInfo]
  }

  private getActiveLoansPodRefs = async () => {
    const apiQuery = (await this.apiProm).query as ExtendedQueries
    const loanReq = await firstValueFrom(apiQuery.loans.activeLoans(global.poolId))
    const loanIds = loanReq.map((loan) => loan[0].loanId.toNumber())
    const podRefs = loanReq.map((loan) => {
      const nftClassId = loan[0].info.collateral[0].toString()
      const nftItemId = loan[0].info.collateral[1].toString()
      return `${nftClassId}:${nftItemId}`
    })
    return [loanIds, podRefs] as LoanPodRef
  }

  private getClosedLoansPodRefs = async () => {
    const apiQuery = (await this.apiProm).query as ExtendedQueries
    const loanReq = await firstValueFrom(apiQuery.loans.closedLoan.entries(global.poolId))
    const loanIds = loanReq.map(([key]) => key.args[1].toNumber())
    const podRefs = loanReq.map(([, value]) => {
      const nftClassId = value.unwrap().info.collateral[0].toString()
      const nftItemId = value.unwrap().info.collateral[1].toString()
      return `${nftClassId}:${nftItemId}`
    })
    return [loanIds, podRefs] as LoanPodRef
  }

  private getCreatedLoansPodRefs = async () => {
    const apiQuery = (await this.apiProm).query as ExtendedQueries
    const loanReq = await firstValueFrom(apiQuery.loans.createdLoan.entries(global.poolId))
    const loanIds = loanReq.map(([key]) => key.args[1].toNumber())
    const podRefs = loanReq.map(([, value]) => {
      const nftClassId = value.unwrap().info.collateral[0].toString()
      const nftItemId = value.unwrap().info.collateral[1].toString()
      return `${nftClassId}:${nftItemId}`
    })
    return [loanIds, podRefs] as LoanPodRef
  }

  public getLoansPodRefs = async (offset = 0) => {
    const loanData = await Promise.all([this.getCreatedLoansPodRefs(), this.getActiveLoansPodRefs(), this.getClosedLoansPodRefs()])
    const resultIds: number[] = []
    const resultPodRefs: string[] = []
    for (const [loanIds, podRefs] of loanData) {
      for (const [i, loanId] of loanIds.entries()) {
        const targetIndex = sortedIndex(resultIds, loanId)
        resultIds.splice(targetIndex, 0, loanId)
        resultPodRefs.splice(targetIndex, 0, podRefs[i] ?? '')
      }
    }
    resultIds.splice(0, offset)
    resultPodRefs.splice(0, offset)
    return [resultIds, resultPodRefs] as LoanPodRef
  }

  public getLastLoanId = async () => {
    const apiQuery = (await this.apiProm).query as ExtendedQueries
    const loanId = await firstValueFrom(apiQuery.loans.lastLoanId(global.poolId))
    return loanId
  }

  public countInitialisedLoans = () => {
    return LoanService.count({})
  }

  private initLoans = async (offset: number) => {
    const [loanIds, loanPodRefs] = await this.getLoansPodRefs(offset)
    if (loanIds.length > 0) logger.info(`Indexing loans from ${offset + 1} to ${offset + loanIds.length}`)
    for (const [i, loanId] of loanIds.entries()) {
      const newLoan = await LoanService.create({})
      await PodSourceService.create({ entity: newLoan._id, objectId: loanPodRefs[i] ?? '' })
      await SubqlSourceService.create({ entity: newLoan._id, objectId: `${global.poolId}-${loanId}` })
      await ChainSourceService.create({ entity: newLoan._id, objectId: loanId.toString() })
      this.emitter.emit('newLoan', newLoan.id)
    }
    return loanIds.length
  }

  public collectLoans = async (_offset?: number) => {
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

      default:
        logger.info(`All loans indexed...re-checking in ${SUBQL_POLLING_INTERVAL_SECONDS}s`)
        intervalSeconds = parseInt(SUBQL_POLLING_INTERVAL_SECONDS, 10)
        break
    }
    setTimeout(() => this.collectLoans(offset + newLoansAmount), intervalSeconds * 1000)
  }

  public collectLoansInfo = async (pollingIntervalSec = 60) => {
    const [loanIds, loanInfos] = await this.getActiveLoans()
    const inserts = []
    for (const [i, loanId] of loanIds.entries()) {
      const source = await ChainSourceService.getOneByField({ objectId: loanId.toString() })
      if (source === null) break
      const data: Record<string, unknown> = {}
      data['normalizedDebt'] = new Types.Decimal128(loanInfos[i]?.normalizedDebt.toString() ?? '')
      source.lastFetchedAt = new Date()
      inserts.push(FrameService.upsert({ source: source._id }, { source: source._id, data }))
      inserts.push(source.save())
    }
    await Promise.all(inserts).catch((err) => {
      logger.error(err)
      return -1
    })
    logger.info(`Active loan info updated. Rescheduling in ${pollingIntervalSec}sec`)
    setTimeout(() => this.collectLoansInfo(pollingIntervalSec), pollingIntervalSec * 1000)
  }
}
export const chainCollector = new ChainCollector()

function sortedIndex(array: number[], value: number) {
  let low = 0,
    high = array.length

  while (low < high) {
    const mid = (low + high) >>> 1
    if ((array[mid] ?? value) < value) low = mid + 1
    else high = mid
  }
  return low
}
