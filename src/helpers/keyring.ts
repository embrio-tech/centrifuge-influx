import Keyring from '@polkadot/keyring'
import { waitReady } from '@polkadot/wasm-crypto'

export async function initWallets() {
  await waitReady()
  const kr = new Keyring({ type: 'sr25519' })
  const wallets = {
    proxy: kr.createFromUri('//Bob'),
    operator: kr.createFromUri('//Alice'),
  }
  return wallets
}
