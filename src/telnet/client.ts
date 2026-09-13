import { connect, ConnectionOptions, TLSSocket } from 'tls'
import { Cmd } from './protocol.ts'
import { Parser } from './parser.ts'
import { err, Err } from '../result.ts'
import { ResponseBuilder } from './response.ts'


export class Client {
  private sock?: TLSSocket
  private commandCbs: ((commands: Cmd[]) => void)[]
  private errorCbs: ((error: Err) => void)[]

  constructor(private connOpts: ConnectionOptions) {
    this.commandCbs = []
    this.errorCbs = []
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const onError = (err: Error) => {
        reject(err)
      }

      this.sock = connect(this.connOpts, () => {
        this.sock?.off('error', onError)
        resolve()
      })

      this.sock?.on("data", this.handleData.bind(this))
      this.sock.once("error", onError)
    })
  }

  async respond(builder: ResponseBuilder): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sock?.write(builder.build(), (error?: Error | null) => {
        if (error === undefined || error === null) {
          resolve()
        } else {
          reject(error)
        }
      })
    })
  }

  async handleData(data: Buffer): Promise<void> {
    console.log("data in:", data)
    const parser = new Parser(data)
    const commands: Cmd[] = []

    while (parser.canRead()) {
      const result = parser.next()

      if (result.ok) {
        commands.push(result.value)
      } else {
        this.triggerErrorCbs(result)
      }
    }

    if (commands.length === 0) {
      this.triggerErrorCbs(err("no commands found in data"))
    }

    this.triggerCommandsCbs(commands)
  }

  onCommands(cb: (commands: Cmd[]) => void): void {
    this.commandCbs.push(cb)
  }

  onError(cb: (error: Err) => void): void {
    this.errorCbs.push(cb)
  }

  private triggerErrorCbs(error: Err): void {
    for (const cb of this.errorCbs) {
      cb(error)
    }
  }

  private triggerCommandsCbs(commands: Cmd[]): void {
    for (const cb of this.commandCbs) {
      cb(commands)
    }
  }
}
