import dotenv from 'dotenv'
dotenv.config()

// export env variables or defaults
export const {
  NODE_ENV = 'development',
  OPS_ENV = 'local',
  DB_URI = 'mongodb://mongodb:mongodb@localhost:27017/blender?authSource=admin',
  SUBQL_POLLING_INTERVAL_SECONDS = '60',
  POOL_ID,
} = process.env
