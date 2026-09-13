import { err, ok, Result } from "../result.ts";
import { Cmd, Misc, Verb, Option, VerbCmd, SubNegCmd, newSubNegCmd } from "./protocol.ts";

export class Parser {
  private bytes: Buffer;
  private readIdx: number;
  private byte: number;
  private hasError: boolean;

  private commands: Cmd[];

  constructor(buffer: Buffer) {
    this.bytes = buffer;
    this.readIdx = 0;
    this.byte = -1;
    this.commands = [];
    this.hasError = false
  }

  canRead(): boolean {
    return this.readIdx < this.bytes.length && !this.hasError
  }

  next(): Result<Cmd> {
    if (!this.canRead()) {
      this.hasError = true
      err("no more bytes to read")
    }

    try {
      let result: Result<Cmd>;

      switch (this.read()) {
        case Misc.IAC:
          result = this.readCommand();
          break;
        default:
          this.hasError = true
          return err(`unknown starting byte ${this.byte}`);
      }

      if (result.ok) {
        this.commands.push(result.value);
      }

      return result;
    } catch (error: unknown) {
      this.hasError = true
      return err(`unsupported command starting byte ${this.byte} at ${this.readIdx}`, err)
    }
  }

  private readCommand(): Result<Cmd> {
    this.read()

    if (Verb[this.byte] !== undefined) {
      return this.readVerbCommand()
    }

    if (this.byte === Misc.SUBNEG_START) {
      return this.readSubnegCommand()
    }

    return err(`unsupported command continuation byte ${this.byte} at ${this.readIdx}`)
  }

  private readSubnegCommand(): Result<SubNegCmd> {
    const optionByte = this.read()

    if (Option[optionByte] === undefined) {
      return err(`unsupported option byte ${this.byte} at ${this.readIdx}`)
    }

    const actionByte = this.read()

    // only support send since we want to respond
    if (actionByte !== Misc.SEND) {
      return err(`unsupported action byte ${this.byte} at ${this.readIdx}`)
    }

    // should loop over data until 255 (no escape)
    if (this.read() !== Misc.IAC || this.read() !== Misc.SUBNEG_END) {
      return err('only send data is supported in subnegotiation')
    }

    return ok(newSubNegCmd(actionByte, [optionByte]))
  }

  private readVerbCommand(): Result<VerbCmd> {
    const verb: Verb = this.byte
    const option: number = this.read()

    if (Option[option] === undefined) {
      return err(`unrecognized option ${option}`)
    }

    return ok({
      _type: 'verb',
      verb: verb,
      action: option
    } as VerbCmd)
  }

  private read(): number {
    this.byte = this.bytes.readUint8(this.readIdx++);
    return this.byte;
  }
}
