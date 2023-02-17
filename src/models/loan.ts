import { Schema, model } from 'mongoose'

export interface ILoan {
  name: string
}

const loanSchema = new Schema<ILoan>({
  name: { type: 'string', required: true },
})

export const Loan = model<ILoan>('Loan', loanSchema)
