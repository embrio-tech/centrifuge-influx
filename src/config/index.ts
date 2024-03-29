import dotenv from 'dotenv'
dotenv.config({ path: '../.env' })

// export env variables or defaults
export const {
  NODE_ENV = 'development',
  OPS_ENV = 'local',
  DB_URI = 'mongodb://mongodb:mongodb@localhost:27017/blender?authSource=admin',
  SUBQL_POLLING_INTERVAL_SECONDS = '60',
  CFG_RELAY_NODE_ENDPOINT = 'wss://fullnode-relay.development.cntrfg.com',
  CFG_NODE_ENDPOINT = 'wss://fullnode.development.cntrfg.com',
  SUBQL_ENDPOINT = 'https://api.subquery.network/sq/embrio-tech/centrifuge-subql',
  IPFS_NODE = 'https://centrifuge.mypinata.cloud',
  POD_COLLECTOR_CONCURRENCY = '2',
  POOL_ID,
  PROXY_KEYRING_URI,
  OPERATOR_ADDRESS,
} = process.env
