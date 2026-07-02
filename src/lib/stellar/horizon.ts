import { Horizon } from "@stellar/stellar-sdk";
import { HORIZON_URL } from "./network";

let server: Horizon.Server | null = null;

export function getHorizonServer() {
  if (!server) {
    server = new Horizon.Server(HORIZON_URL);
  }
  return server;
}
