interface SubqlLoan {
  id: string

  createdAt: string
  collateralNftClassId: bigint
  collateralNftItemId: bigint

  metadata: string

  advanceRate: bigint
  value: bigint
  probabilityOfDefault: bigint
  lossGivenDefault: bigint
  discountRate: bigint
  maturityDate: string

  type: string
  spec: string

  interestRatePerSec: bigint

  isAdminWrittenOff: boolean

  poolId: string

  isActive: boolean
  status: string

  outstandingDebt: bigint

  borrowedAmountByPeriod: bigint
  repaidAmountByPeriod: bigint

  writeOffIndex: number
  writtenOffPercentageByPeriod: bigint
  writtenOffAmountByPeriod: bigint
  penaltyInterestRatePerSec: bigint
}
