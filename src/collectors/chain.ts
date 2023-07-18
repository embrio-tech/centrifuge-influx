import {
  ActiveLoan,
  centrifuge,
  ChainSourceService,
  ExtendedQueries,
  FrameService,
  IpfsSourceService,
  LoanService,
  PodSourceService,
  PoolService,
  SubqlSourceService,
} from '../helpers'
import EventEmitter from 'events'
import { firstValueFrom } from 'rxjs'
import { SUBQL_POLLING_INTERVAL_SECONDS } from '../config'
import { Types } from 'mongoose'
import type { u128, Struct, Enum } from '@polkadot/types'

type LoanPodRef = [loanIds: number[], podRefs: string[]]

const apiProm = centrifuge.getApiPromise()
export class ChainCollector {
  readonly emitter: EventEmitter
  readonly poolId: string
  readonly decimals: number
  constructor(poolId: string, decimals: number) {
    this.emitter = new EventEmitter()
    this.poolId = poolId
    this.decimals = decimals
  }

  static init = async (poolId: string) => {
    const apiQuery = (await apiProm).query as ExtendedQueries
    const poolReq = await firstValueFrom(apiQuery.poolSystem.pool(poolId))
    const poolDetails = poolReq.unwrap()
    const currency = poolDetails?.currency
    const metaReq = await firstValueFrom(apiQuery.ormlAssetRegistry.metadata(currency))
    const currencyMeta = metaReq.unwrap()
    const decimals = currencyMeta?.decimals.toNumber()
    return new this(poolId, decimals)
  }

  public getPoolInfo = async () => {
    const apiQuery = (await apiProm).query as ExtendedQueries
    const poolReq = await firstValueFrom(apiQuery.poolSystem.pool(global.poolId))
    const poolDetails = poolReq.unwrap()
    logger.info(`Fetched pool details: ${poolDetails.toString()}`)
    return poolDetails
  }

  public getCurrencyDecimals = async (currency: Enum) => {
    const apiQuery = (await apiProm).query as ExtendedQueries
    const metaReq = await firstValueFrom(apiQuery.ormlAssetRegistry.metadata(currency))
    const currencyMeta = metaReq.unwrap()
    const decimals = currencyMeta?.decimals.toNumber()
    logger.info(`Fetched currency decimals: ${decimals}`)
    return decimals
  }

  public getPoolMetadataId = async () => {
    const apiQuery = (await apiProm).query as ExtendedQueries
    const metadataReq = await firstValueFrom(apiQuery.poolRegistry.poolMetadata(global.poolId))
    const poolMetadataId = metadataReq.unwrap().metadata.toUtf8()
    logger.info(`Fetched pool metadata Id: ${poolMetadataId}`)
    return poolMetadataId
  }

  private getActiveLoans = async (): Promise<[number[], Array<Partial<ActiveLoan>>]> => {
    logger.info('Fetching active loans info')
    const apiQuery = (await apiProm).query as ExtendedQueries
    const loanReq = await firstValueFrom(apiQuery.loans.activeLoans(global.poolId))
    const loanIds = loanReq.map((loan) => loan[0].toNumber())
    const loanInfo = loanReq.map((loan) => loan[1])
    return [loanIds, loanInfo]
  }

  private getActiveLoansPodRefs = async () => {
    const apiQuery = (await apiProm).query as ExtendedQueries
    const loanReq = await firstValueFrom(apiQuery.loans.activeLoans(global.poolId))
    const loanIds = loanReq.map((loan) => loan[0].toNumber())
    const podRefs = loanReq.map((loan) => {
      const nftClassId = loan[1].collateral[0].toString()
      const nftItemId = loan[1].collateral[1].toString()
      return `${nftClassId}:${nftItemId}`
    })
    return [loanIds, podRefs] as LoanPodRef
  }

  private getClosedLoansPodRefs = async () => {
    const apiQuery = (await apiProm).query as ExtendedQueries
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
    const apiQuery = (await apiProm).query as ExtendedQueries
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
    const apiQuery = (await apiProm).query as ExtendedQueries
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

  public initPool = async () => {
    const poolMetadataId = await this.getPoolMetadataId()
    const poolMetadataSource = await IpfsSourceService.getOneByField({ objectId: poolMetadataId })
    if (poolMetadataSource === null) {
      logger.info(`Initialising PoolMetadata: ${poolMetadataId}`)
      const newPool = await PoolService.create({})
      await IpfsSourceService.create({ entity: newPool._id, objectId: poolMetadataId })
      this.emitter.emit('newPool', newPool.id)
    }
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
      const pricingData = loanInfos[i]?.pricing?.value as { normalizedDebt?: u128 } & Struct
      data['normalizedDebt'] = new Types.Decimal128(fixDecimal((pricingData['normalizedDebt'] ?? 0).toString(), this.decimals))
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

function fixDecimal(bigint: string, decimals: number) {
  const padBigInt = bigint.padStart(decimals + 1, '0')
  const len = padBigInt.length
  const result = padBigInt.split('')
  result.splice(len - decimals, 0, '.')
  return result.join('')
}
