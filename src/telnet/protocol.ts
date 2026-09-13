export enum Option {
  TRANSMIT_BINARY = 0x00,
  TERMINAL_TYPE = 0x18,
  END_OF_RECORD = 0x19,
  NEW_ENVIRON = 0x27,
}

export enum Misc {
  IAC = 0xFF,
  SEND = 0x01,
  SUBNEG_START = 0xFA,
  SUBNEG_END = 0xF0,
  IS = 0x00
}

export enum Verb {
  WILL = 0xfb,
  WONT = 0xfc,
  DO = 0xfd,
  DONT = 0xfe,
}


export type SubNegCmd = {
  _type: "subneg";
  option: Option | number;
  data: number[];
};

export function newSubNegCmd(option: Option | number, data: number[]): SubNegCmd {
  return { _type: "subneg", option, data }
}

export type VerbCmd = {
  _type: "verb";
  verb: Verb;
  action: Option | number;
};

export function newVerbCmd(verb: Verb, action: Option | number): VerbCmd {
  return { _type: 'verb', verb, action }
}

export type Cmd = VerbCmd | SubNegCmd;

export function cmdToString(cmd: Cmd): string {
  switch (cmd._type) {
    case 'verb':
      return `verb: ${Verb[cmd.verb]} (${cmd.verb}) - ${Option[cmd.action]} (${cmd.action})`
  }
}
