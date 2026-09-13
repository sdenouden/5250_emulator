import { ConnectionService } from "./connection/connection_service.js";
import { Telnet } from "./telnet/Telnet.js";

export class App {
  constructor() {}

  run() {
    const connection_service = new ConnectionService("PUB400.com", 992, true);
    const client = connection_service.newClient();

    client.on("data", (data) => {
      console.log(
        `decoded data from ${connection_service.host}: ${Telnet.decodeTelnet(data)}`,
      );
    });

    const buffer = Buffer.from([0xff, 0xfb, 0x27]);
    client.write(buffer);
  }
}
