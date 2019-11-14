import parseArgs from 'minimist'
import express, { Request, Response } from 'express'
import cors from 'cors'
import WebSocket from 'ws'
import { logger } from './logger/logger'
import { TransportConsole } from './logger/transport/TransportConsole'
import { request } from './lib/Request'

logger.addTransport(new TransportConsole())

const args = parseArgs(process.argv)
const httpPort = args.http || 3010
const wsPort = args.ws || 3011

const http = express()
http.use(express.json())
http.use(cors())
const server = http.listen(httpPort, () => {
  logger.info('HttpServer: start listening on port', httpPort)
})

server.on('error', (error: any) => {
  if (error['syscall'] !== 'listen') {
    logger.error(new Error(error))
    process.exit(1)
  }

  switch (error.code) {
    case 'EACCES':
      logger.error(`HttpServer: Port ${httpPort} requires elevated privileges`)
      process.exit(1)
      break
    case 'EADDRINUSE':
      logger.error(`HttpServer: Port ${httpPort} is already in use`)
      process.exit(1)
      break
    default:
      throw error
  }
})

http.post('/proxy', async (req: Request, res: Response) => {
  const { method, url, headers = {}, payload = {} } = req.body
  logger.info(method, url)
  if (!method || !url) {
    res.status(400)
    res.send({ error: 'bad params' })
    return
  }

  request.setHeaders(headers)

  switch (method) {
    case 'GET': {
      const response = await request.get(url, payload)
      res.status(response.status || 500)
      res.send(response.data || response.error)
      break
    }
    case 'POST': {
      const response = await request.post(url, payload)
      res.status(response.status || 500)
      res.send(response.data || response.error)
      break
    }
    case 'DELETE': {
      const response = await request.delete(url, payload)
      res.status(response.status || 500)
      res.send(response.data || response.error)
      break
    }
    case 'PUT': {
      const response = await request.put(url, payload)
      res.status(response.status || 500)
      res.send(response.data || response.error)
      break
    }
  }
})

const wss = new WebSocket.Server({
  port: wsPort,
}, () => {
  logger.info('WsServer: start listening on port', wsPort)
})

let ws: WebSocket | null = null
wss.on('connection', client => {
  logger.info('WS open')
  client.on('message', message => {
    const { url, headers } = JSON.parse(message.toString())
    if (url) {
      ws = new WebSocket(url, { headers })
      ws.on('error', e => logger.error('WS proxy error', e))
      ws.on('close', () => {
        logger.info('WS proxy close')
        // TODO reconnect if connection lost
      })
      ws.on('message', message => client.send(message))
      ws.on('open', () => logger.info('WS proxy open'))

    } else if (ws) {
      ws.send(message)
    }
    console.log('received: %s', message)
  })

  client.on('close', () => {
    logger.info('WS close')
    ws && ws.close()
  })
})
