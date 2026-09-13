import * as tls from "tls";

export class ConnectionService {
  host = "PUB400.com";
  port = 992;
  rejectUnauthorized = true;

  constructor(host = "PUB400.com", port = 992, rejectUnauthorized = true) {
    this.host = host;
    this.port = port;
    this.rejectUnauthorized = rejectUnauthorized;
  }

  newClient() {
    const options = {
      host: this.host,
      port: this.port,
      rejectUnauthorized: this.rejectUnauthorized,
    };

    const client = tls.connect(options, () => {
      console.log("connection and TLS handshake succesfull");
    });
    return client;
  }
}
