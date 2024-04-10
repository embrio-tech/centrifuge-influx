import Fastify from 'fastify'
import { connection } from 'mongoose'
import type { Connection } from 'mongoose'
import type { RouteGenericInterface } from 'fastify'
import { HEALTHCHECK_PORT } from '../config'

const server = Fastify({ logger: true })

export async function setupHealthchecks() {
  server.get<HealthRoute>('/health', async (_req, rep) => {
    const replyPayload = {
      mongooseStatus: connection.readyState,
      pools: global.pools,
    }

    if (connection.readyState === 1) {
      return rep.status(200).send(replyPayload)
    } else {
      return rep.status(500).send(replyPayload)
    }
  })

  // Run the server!
  return server.listen({ host: '0.0.0.0', port: parseInt(HEALTHCHECK_PORT, 10) }).catch((err) => {
    logger.error(err)
    process.exit(1)
  })
}

interface HealthRoute extends RouteGenericInterface {
  Reply: HealthReply
}

interface HealthReply {
  200: HealthPayload
  500: HealthPayload
}

interface HealthPayload {
  mongooseStatus: Connection['readyState']
  pools: typeof global.pools
}
