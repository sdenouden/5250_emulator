import { Misc, Option, Verb } from './protocol.ts'

export class ResponseBuilder {
  private bytes: number[]

  constructor() {
    this.bytes = []
  }

  byte(...bytes: number[]): ResponseBuilder {
    this.bytes.push(...bytes)
    return this
  }

  wont(option: Option): ResponseBuilder {
    return this.command(Verb.WONT, option)
  }

  will(option: Option): ResponseBuilder {
    return this.command(Verb.WILL, option)
  }

  dont(option: Option): ResponseBuilder {
    return this.command(Verb.DONT, option)
  }

  do(option: Option): ResponseBuilder {
    return this.command(Verb.DO, option)
  }

  subneg(option: Option, data: number[]): ResponseBuilder {
    this.byte(Misc.IAC, Misc.SUBNEG_START)
    this.byte(option)
    this.byte(...data)
    this.byte(Misc.IAC, Misc.SUBNEG_END)
    return this
  }

  subnegStr(option: Option, str: string): ResponseBuilder {
    // TODO: support more than just is if needed
    const data: number[] = [Misc.IS]
    for (let i = 0; i < str.length; i++){
      data.push(str.charCodeAt(i))
    }

    return this.subneg(option, data)
  }

  build(): Buffer {
    return Buffer.from(this.bytes)
  }

  private command(verb: Verb, option: Option): ResponseBuilder {
    return this.byte(Misc.IAC, verb, option)
  }
}
