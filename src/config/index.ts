import dotenv from 'dotenv'
dotenv.config({ path: '../.env' })

// export env variables or defaults
export const {
  NODE_ENV = 'development',
  OPS_ENV = 'local',
  DB_URI = 'mongodb://mongodb:mongodb@localhost:27017/blender?authSource=admin',
  SUBQL_POLLING_INTERVAL_SECONDS = '60',
  CFG_RELAY_NODE_ENDPOINT = 'wss://fullnode-relay.demo.k-f.dev/public-ws',
  CFG_NODE_ENDPOINT = 'wss://fullnode.demo.k-f.dev/public-ws',
  SUBQL_ENDPOINT = 'https://api.subquery.network/sq/centrifuge/pools-demo',
  IPFS_NODE = 'https://centrifuge.mypinata.cloud',
  HEALTHCHECK_PORT = '5000',
  POD_COLLECTOR_CONCURRENCY = '2',
  POOL_ID,
  PROXY_KEYRING_URI,
} = process.env
