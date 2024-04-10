import { Keyring } from '@polkadot/keyring'
import { waitReady } from '@polkadot/wasm-crypto'
import { PROXY_KEYRING_URI } from '../config'

export async function initWallets() {
  if (!PROXY_KEYRING_URI) throw new Error('Missing PROXY_KEYRING_URI env')
  await waitReady()
  const kr = new Keyring({ type: 'sr25519' })
  const wallets = {
    proxyKeyring: kr.createFromUri(PROXY_KEYRING_URI),
  }
  return wallets
}
