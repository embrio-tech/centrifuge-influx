import Keyring from '@polkadot/keyring'
import { waitReady } from '@polkadot/wasm-crypto'
import { OPERATOR_ADDRESS, PROXY_KEYRING_URI } from '../config'

export async function initWallets() {
  if (!PROXY_KEYRING_URI) throw new Error('Missing PROXY_KEYRING_URI env')
  if (!OPERATOR_ADDRESS) throw new Error('Missing OPERATOR_ADDRESS env')
  await waitReady()
  const kr = new Keyring({ type: 'sr25519' })
  const wallets = {
    proxyKeyring: kr.createFromUri(PROXY_KEYRING_URI),
    operatorAddress: OPERATOR_ADDRESS,
  }
  return wallets
}
