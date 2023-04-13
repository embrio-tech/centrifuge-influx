import Keyring from '@polkadot/keyring'
import { waitReady } from '@polkadot/wasm-crypto'

export async function initWallets() {
  await waitReady()
  const kr = new Keyring({ type: 'sr25519' })
  const wallets = {
    proxyKeyring: kr.createFromUri('//Bob'),
    operatorAddress: '4g8zNcypnFHE5jqCifLGYoutCCM7uKWhF1NjWHka29hQE2rx',
  }
  return wallets
}
