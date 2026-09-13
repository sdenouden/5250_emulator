import { ConnectionOptions } from "tls";
import { Client } from "../telnet/client.ts";
import { Cmd, cmdToString, newSubNegCmd, Option } from "../telnet/protocol.ts";
import { Err } from "../result.ts";
import { ResponseBuilder } from "../telnet/response.ts";

export class Emulator {
  private client: Client;
  // TODO: fix this (xstate or something)
  private state: "new" | "capabilities" | "more_capabilities" | "connected";

  constructor() {
    const options: ConnectionOptions = {
      host: "PUB400.com",
      port: 992,
      rejectUnauthorized: true,
    };

    this.client = new Client(options);
    this.state = "new";
  }

  async connect(): Promise<void> {
    this.client.onCommands(this.onCommands.bind(this));
    this.client.onError(this.onError.bind(this));
    return this.client
      .connect()
      .then(() => console.log("connected successfully"))
      .catch((e) => console.log("failed to connect", e));
  }

  async onCommands(commands: Cmd[]): Promise<void> {
    switch (this.state) {
      case "new":
        return this.stateNew(commands);
      case "capabilities":
        return this.stateCapabilities(commands);
      case "more_capabilities":
        return this.stateMoreCapabilities(commands);
      case "connected":
        return this.stateConnected(commands);
      default:
        console.log("unknown state " + this.state);
    }
  }

  private async stateNew(commands: Cmd[]): Promise<void> {
    // check if commands are what you expect
    try {
      await this.client.respond(
        new ResponseBuilder()
          .wont(Option.NEW_ENVIRON)
          .will(Option.TERMINAL_TYPE),
      );

      this.state = "capabilities";
    } catch (e: unknown) {
      console.log("failed to send response in new state", e);
    }
  }

  private async stateCapabilities(commands: Cmd[]): Promise<void> {
    try {
      await this.client.respond(
        new ResponseBuilder().subnegStr(Option.TERMINAL_TYPE, "IBM-3179-2"),
      );

      this.state = "more_capabilities";
    } catch (e: unknown) {
      console.log("failed to send response in new state", e);
    }
  }

  private async stateMoreCapabilities(commands: Cmd[]): Promise<void> {
    try {
      await this.client.respond(
        new ResponseBuilder()
          .will(Option.END_OF_RECORD)
          .do(Option.END_OF_RECORD)
          .will(Option.TRANSMIT_BINARY)
          .do(Option.TRANSMIT_BINARY)
      );

      this.state = "connected";
    } catch (e: unknown) {
      console.log("failed to send response in new state", e);
    }
  }

  private async stateConnected(commands: Cmd[]): Promise<void> {
    console.log("connected state reached");
    for (const cmd of commands) {
      console.log(cmdToString(cmd));
    }
  }

  private onError(error: Err): void {
    console.log("ERR: ", error);
  }
}
