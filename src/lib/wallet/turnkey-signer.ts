import "server-only";

import { Keypair, xdr, type Transaction } from "@stellar/stellar-sdk";
import { getTurnkeyClient } from "./turnkey-service";

type SignRawPayloadResult = {
  r: string;
  s?: string;
};

function parseTurnkeyEd25519SignatureHex(result: SignRawPayloadResult): string {
  const r = result.r.replace(/^0x/i, "");
  const s = (result.s ?? "").replace(/^0x/i, "");

  if (r.length === 128) {
    return r;
  }

  if (r.length === 64 && s.length === 64) {
    return r + s;
  }

  throw new Error(
    `Unexpected Turnkey signature format (r=${r.length}, s=${s.length})`,
  );
}

export async function signStellarTransaction(
  publicKey: string,
  organizationId: string,
  transaction: Transaction,
): Promise<Buffer> {
  const apiClient = getTurnkeyClient().apiClient();
  const payloadHash = transaction.hash().toString("hex");

  const result = await apiClient.signRawPayload({
    organizationId,
    signWith: publicKey,
    payload: payloadHash,
    encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
    hashFunction: "HASH_FUNCTION_NOT_APPLICABLE",
  });

  const signatureHex = parseTurnkeyEd25519SignatureHex(result);
  const signatureBuffer = Buffer.from(signatureHex, "hex");

  if (signatureBuffer.length !== 64) {
    throw new Error(
      `Invalid Stellar signature length: ${signatureBuffer.length} bytes`,
    );
  }

  return signatureBuffer;
}

export async function signAndAttachSignature(
  publicKey: string,
  organizationId: string,
  transaction: Transaction,
) {
  const signatureBuffer = await signStellarTransaction(
    publicKey,
    organizationId,
    transaction,
  );

  const keypair = Keypair.fromPublicKey(publicKey);

  transaction.addDecoratedSignature(
    new xdr.DecoratedSignature({
      hint: keypair.signatureHint(),
      signature: signatureBuffer,
    }),
  );

  return transaction;
}
