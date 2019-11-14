import axios, { AxiosInstance } from 'axios'
import { logger } from '../logger/logger'

interface TObjectAny {
  [key: string]: any
}

class Request {
  private readonly client: AxiosInstance
  private headers: TObjectAny = {}

  public constructor() {
    this.client = axios.create()
    this.setHeaders({
      'Content-Type': 'application/json; charset=UTF-8',
    })
  }

  public async get(url: string, payload: Object = {}) {
    return this.do('GET', url, payload)
  }

  public async post(url: string, payload: Object = {}) {
    return this.do('POST', url, payload)
  }

  public async put(url: string, payload: Object = {}) {
    return this.do('PUT', url, payload)
  }

  public async delete(url: string, payload: Object = {}) {
    return this.do('DELETE', url, payload)
  }

  public setHeaders(headers: TObjectAny) {
    this.headers = headers
  }

  protected async do(method: string, url: string, payload: Object): Promise<TObjectAny> {
    const options = {
      method,
      url,
      headers: this.headers,
      params: {},
      data: {},
    }

    method === 'GET' ? (options.params = payload) : (options.data = payload)

    try {
      return await this.client(options as any)
    } catch (error) {
      // tslint:disable-next-line:no-console
      logger.error(error.message)
      return { error }
    }
  }
}

const request = new Request()

export { request }
