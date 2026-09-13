import { connect, ConnectionOptions, TLSSocket } from "tls";

type Ok<T> = {
  ok: true;
  value: T;
};

type Err = {
  ok: false;
  message: string;
  cause?: Error;
};

type Result<T> = Ok<T> | Err;

enum CommandVerb {
    WILL = 0xFB,
    WONT = 0xFC,
    DO = 0xFD,
    DONT = 0xFE
}

type VerbCommand = {
  verb: CommandVerb;
  action: CommandOption | number;
};

enum CommandOption {
  TRANSMIT_BINARY = 0x00,
  TERMINAL_TYPE = 0x18,
  END_OF_RECORD = 0x19,
  NEW_ENVIRON = 0x27,
}

type SubNegotiationCommand = {
  _type: "subnegotiation";
  option: CommandOption | number;
  data: number[]
};

type Command = VerbCommand;

class ParserError extends Error {}

class Parser {
  private bytes: Buffer;
  private currentByte: number = 0;

  private idx: number = 0;
  private commands: Command[] = [];

  constructor(buffer: Buffer) {
    this.bytes = buffer;
  }

  nextCommand(): Result<Command> {
    try {
      let result: Result<Command>;
      switch (this.readByte()) {
        case 0xff:
          result = this.readCommand();
          break;
        default:
          return {
            ok: false,
            message: "unknown byte",
          };
      }

      if (result.ok) {
        this.commands.push(result.value);
      }

      return result;
    } catch (e: unknown) {
      if (e instanceof ParserError) {
        return {
          ok: false,
          message: e.message,
          cause: e,
        };
      } else if (e instanceof Error) {
        return {
          ok: false,
          message: `unexpected: ${e.message}`,
          cause: e,
        };
      } else {
        return {
          ok: false,
          message: "unkown error",
          cause: new Error("unknown", { cause: e }),
        };
      }
    }
  }

  readAll(): Result<Command[]> {
    if (this.hasEnded()) {
      return {
        ok: false,
        message: "no more commands to read",
      };
    }

    const commands: Command[] = [];
    let i = 0;
    for (; !this.hasEnded() && i < 100; i++) {
      const res = this.nextCommand();
      if (res.ok) {
        commands.push(res.value);
      } else {
        return res;
      }
    }

    if (i >= 100) {
      return {
        ok: false,
        message: "max command reads in buffer reached",
      };
    }

    return {
      ok: true,
      value: commands,
    };
  }

  readCommand(): Result<Command> {
    switch (this.readByte()) {
      case 0xfd:
        return this.readDoCommand();
      case 0xfa:
        return this.readSubnegotiation();
      default:
        return {
          ok: false,
          message:
            "unsupported byte " + this.currentByte + " at index " + this.idx,
        };
    }
  }

  readSubnegotiation(): Result<Command> {
    throw new ParserError("starting subnegotiation");
  }

  readDoCommand(): Result<VerbCommand> {
    const cmd: VerbCommand = {
      verb: CommandVerb.DO,
      action: CommandAction.UNKNOWN,
    };

    switch (this.readByte()) {
      case 0x27:
        cmd.action = CommandAction.NEW_ENVIRON;
        break;
      case 0x18:
        cmd.action = CommandAction.TERMINAL_TYPE;
        break;
    }

    return {
      ok: true,
      value: cmd,
    };
  }

  readByte(): number {
    const b = this.bytes.at(this.idx);

    if (!b) {
      throw new ParserError("byte out of bounds");
    }

    this.currentByte = b;
    this.idx++;
    return b;
  }

  peekNextByte(): number {
    const b = this.bytes.at(this.idx + 1);

    if (!b) {
      throw new ParserError("byte out of bounds");
    }

    return b;
  }

  hasEnded(): boolean {
    return this.idx >= this.bytes.length;
  }
}

class ResponseBuilder {
  private _bytes: number[];

  constructor() {
    this._bytes = [];
  }

  command(): ResponseBuilder {
    return this.byte(0xff);
  }

  will(): ResponseBuilder {
    return this.byte(0xfb);
  }

  wont(): ResponseBuilder {
    return this.byte(0xfc);
  }

  beginSubnegotiation(): ResponseBuilder {
    this._bytes.push(0xff);
    this._bytes.push(0xfa);
    return this;
  }

  endSubnegotiation(): ResponseBuilder {
    this._bytes.push(0xff);
    this._bytes.push(0xf0);
    return this;
  }

  fieldIs(fieldByte: number): ResponseBuilder {
    return this.bytes([fieldByte, 0x00]);
  }

  ascii(value: string): ResponseBuilder {
    for (let i = 0; i < value.length; i++) {
      this._bytes.push(value.charCodeAt(i));
    }
    return this;
  }

  byte(byte: number): ResponseBuilder {
    this._bytes.push(byte);
    return this;
  }

  bytes(bytes: number[]): ResponseBuilder {
    this._bytes.push(...bytes);
    return this;
  }

  build(): Buffer {
    return Buffer.from(this._bytes);
  }
}

class Emulator {
  private sock?: TLSSocket;
  private connOptions: ConnectionOptions;

  private state: string = "new";

  constructor(connOptions: ConnectionOptions) {
    this.connOptions = connOptions;
    this.state = "new";
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const onError = (err: Error) => {
        reject(err);
      };

      this.sock = connect(this.connOptions, () => {
        this.sock?.off("error", onError);
        resolve()
      });

      this.sock?.on("data", this.onData.bind(this));
      this.sock?.once("error", onError);
    });
  }

  async onData(data: Buffer): Promise<void> {
    console.log("[DEBUG] inbound data <-", data);
    const p = new Parser(data);
    const result = p.readAll();

    if (!result.ok) {
      console.log("[ERR] ", result.message, result.cause);
      return;
    }

    const commands = result.value;

    console.log(`[DEBUG] read ${commands.length} commands`);

    switch (this.state) {
      case "new":
        return this.handleNewConnection(commands);
      default:
        console.log(`[ERR] unknown emulator state '${this.state}'`);
    }
  }

  async handleNewConnection(commands: Command[]) {
    if (commands.length != 2) {
      console.log("[ERR] unexpected amount of initial handshake commands");
      return;
    }

    if (
      commands[0]?.verb != CommandVerb.DO ||
      commands[0]?.action != CommandAction.NEW_ENVIRON
    ) {
      console.log("[ERR] expected DO NEW_ENVIRON as first command");
      return;
    }

    if (
      commands[1]?.verb != CommandVerb.DO ||
      commands[1]?.action != CommandAction.TERMINAL_TYPE
    ) {
      console.log("[ERR] expected DO TERMINAL_TYPE as first command");
      return;
    }

    console.log("[DEBUG] preparing to respond termninal requirements");

    const response = new ResponseBuilder();

    // Won't negotiate environments
    response.command().wont().byte(0x27);

    // Will declare terminal type
    response.command().will().byte(0x18);

    await this.respond(response.build());

    this.state = "negotiation";
  }

  respond(bytes: Buffer): Promise<void> {
    console.log("[DEBUG] responding ->", bytes);
    return new Promise((resolve, reject) => {
      this.sock?.write(bytes, (err) => {
        if (err === null) {
          resolve();
        } else {
          console.log("[ERR] failed to respond:", err);
          reject(err);
        }
      });
    });
  }
}

const options: ConnectionOptions = {
  host: "PUB400.com",
  port: 992,
  rejectUnauthorized: true,
};

const emulator = new Emulator(options);
emulator.connect();
