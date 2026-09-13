export class Telnet {
  static TELNET_COMMANDS = {
    240: "SE",
    241: "NOP",
    242: "DATA-MARK",
    243: "BREAK",
    244: "INTERRUPT-PROCESS",
    245: "ABORT-OUTPUT",
    246: "ARE-YOU-THERE",
    247: "ERASE-CHARACTER",
    248: "ERASE-LINE",
    249: "GO-AHEAD",
    250: "SB",
    251: "WILL",
    252: "WON'T",
    253: "DO",
    254: "DON'T",
    255: "IAC",
  };

  static TELNET_OPTIONS = {
    0: "TRANSMIT-BINARY",
    1: "ECHO",
    2: "RECONNECTION",
    3: "SUPPRESS-GO-AHEAD",
    4: "APPROX-MESSAGE-SIZE-NEGOTIATION",
    5: "STATUS",
    6: "TIMING-MARK",
    7: "RCTE",
    8: "OUTPUT-LINE-WIDTH",
    9: "OUTPUT-PAGE-SIZE",
    10: "NAOCRD",
    11: "NAOHTS",
    12: "NAOHTD",
    13: "NAOFFD",
    14: "NAOVTS",
    15: "NAOVTD",
    16: "NAOLFD",
    17: "EXTEND-ASCII",
    18: "LOGOUT",
    19: "BYTE-MACRO",
    20: "DATA-ENTRY-TERMINAL",
    21: "SUPDUP",
    22: "SUPDUP-OUTPUT",
    23: "SEND-LOCATION",
    24: "TERMINAL-TYPE",
    25: "END-OF-RECORD",
    26: "TUID",
    27: "OUTMRK",
    28: "TTYLOC",
    29: "3270-REGIME",
    30: "X.3-PAD",
    31: "NAWS",
    32: "TERMINAL-SPEED",
    33: "TOGGLE-FLOW-CONTROL",
    34: "LINEMODE",
    35: "X-DISPLAY-LOCATION",
    36: "ENVIRON",
    37: "AUTHENTICATION",
    38: "ENCRYPT",
    39: "NEW-ENVIRON",
    40: "TN3270E",
    42: "CHARSET",
    47: "KERMIT",
  };

  static decodeTelnet(buffer) {
    const bytes = Array.from(buffer);
    const result = [];

    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 255) {
        // IAC
        const cmdByte = bytes[i + 1];

        // Case 1: Out of bounds check
        if (cmdByte === undefined) {
          result.push("[IAC (truncated)]");
          break;
        }

        // Case 2: Escaped IAC (0xFF 0xFF represents literal byte 255 in raw data stream)
        if (cmdByte === 255) {
          result.push("0xff");
          i += 1;
          continue;
        }

        // Case 3: Subnegotiation Begin (SB ... SE)
        if (cmdByte === 250) {
          // 250 = SB
          const seIndex = bytes.indexOf(240, i); // 240 = SE
          if (seIndex !== -1 && bytes[seIndex - 1] === 255) {
            const sbContent = bytes
              .slice(i, seIndex + 1)
              .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
              .join(" ");
            result.push(`[IAC SB ... IAC SE: ${sbContent}]`);
            i = seIndex; // Jump loop index past SE
            continue;
          }
        }

        // Case 4: Standard 3-byte negotiation (WILL, WONT, DO, DONT)
        if (cmdByte >= 251 && cmdByte <= 254) {
          const optByte = bytes[i + 2];
          if (optByte === undefined) {
            result.push("[IAC (truncated)]");
            break;
          }

          const cmd =
            Telnet.TELNET_COMMANDS[cmdByte] || `0x${cmdByte.toString(16)}`;
          const option =
            Telnet.TELNET_OPTIONS[optByte] || `0x${optByte.toString(16)}`;

          result.push(`[IAC ${cmd} ${option}]`);
          i += 2; // Jump past cmd and option
          continue;
        }

        // Case 5: Standard 2-byte command (NOP, GA, NOP, BREAK, etc.)
        const cmd =
          Telnet.TELNET_COMMANDS[cmdByte] || `0x${cmdByte.toString(16)}`;
        result.push(`[IAC ${cmd}]`);
        i += 1;
      } else {
        // Standard data byte
        result.push(`0x${bytes[i].toString(16).padStart(2, "0")}`);
      }
    }

    return result.join(" ");
  }
}
