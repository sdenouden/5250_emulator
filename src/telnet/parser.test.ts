import { ok } from "../result.ts";
import { Parser } from "./parser.ts";
import { Verb, Option, Cmd, newVerbCmd, newSubNegCmd, Misc } from "./protocol.ts";

describe("telnet parser", () => {
  describe("parses command", () => {
    const commands: {
      name: string;
      bytes: number[];
      expected: Cmd;
    }[] = [
        {
          name: "DO NEW_ENVIRON",
          bytes: [0xff, 0xfd, 0x27],
          expected: newVerbCmd(Verb.DO, Option.NEW_ENVIRON),
        },
        {
          name: "DO TERMINAL_TYPE",
          bytes: [0xff, 0xfd, 0x18],
          expected: newVerbCmd(Verb.DO, Option.TERMINAL_TYPE),
        },
        {
          name: 'SUBNEG SEND TERMINAL_TYPE',
          bytes: [0xff, 0xFA, 0x18, 0x01, 0xFF, 0xF0],
          expected: newSubNegCmd(Misc.SEND, [Option.TERMINAL_TYPE])
      }
    ];

    for (const command of commands) {
      it(command.name, () => {
        const p = new Parser(Buffer.from(command.bytes));
        const result = p.next();

        expect(result).toEqual(ok(command.expected));
      });
    }
  });
});
