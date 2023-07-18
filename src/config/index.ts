import dotenv from 'dotenv'
dotenv.config()

// export env variables or defaults
export const {
  NODE_ENV = 'development',
  OPS_ENV = 'local',
  DB_URI = 'mongodb://mongodb:mongodb@localhost:27017/blender?authSource=admin',
  SUBQL_POLLING_INTERVAL_SECONDS = '60',
  SUBQL_ENDPOINT = 'https://api.subquery.network/sq/embrio-tech/centrifuge-subql',
  IPFS_NODE = 'https://altair.mypinata.cloud',
  POD_NODE = 'https://pod-development.k-f.dev',
  POD_COLLECTOR_CONCURRENCY = '3',
  POOL_ID,
  PROXY_KEYRING_URI,
  OPERATOR_ADDRESS,
} = process.env
