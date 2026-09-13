import { Option, Misc, Verb } from "./protocol.ts";
import { ResponseBuilder } from "./response.ts";

function stoi(s: string): number[] {
  return s.split('').map((c) => {
    return c.charCodeAt(0)
  })
}

describe("response builder", () => {
  describe("builds", () => {
    const commands: {
      name: string;
      builder: ResponseBuilder;
      expected: number[];
    }[] = [
      {
        name: "WILL send TERMINAL_TYPE",
        builder: new ResponseBuilder().will(Option.TERMINAL_TYPE),
        expected: [Misc.IAC, Verb.WILL, Option.TERMINAL_TYPE],
      },
      {
        name: "WONT send NEW_ENVIRON",
        builder: new ResponseBuilder().wont(Option.NEW_ENVIRON),
        expected: [Misc.IAC, Verb.WONT, Option.NEW_ENVIRON],
      },
        {
          name: "SUBNEG TERMINAL_TYPE DATA",
          builder: new ResponseBuilder().subnegStr(Option.TERMINAL_TYPE, "foo"),
          expected: [Misc.IAC, Misc.SUBNEG_START, Option.TERMINAL_TYPE, ...stoi("foo"), Misc.IAC, Misc.SUBNEG_END]
        }
    ];

    for (const command of commands) {
      it(command.name, () => {
        const result = command.builder.build()
        expect(result).toEqual(Buffer.from(command.expected))
      })
    }
  });
});
