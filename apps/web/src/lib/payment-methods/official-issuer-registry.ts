import type { Organization } from "@/lib/db/schema";
import {
  OFFICIAL_STELLAR_ISSUERS,
  type OfficialIssuerAssetCode,
} from "@/constants/assets/issuers";

export { OFFICIAL_STELLAR_ISSUERS, type OfficialIssuerAssetCode };

export function getBuiltinOfficialIssuer(
  code: OfficialIssuerAssetCode,
  environment: Organization["environment"]
): string | null {
  return OFFICIAL_STELLAR_ISSUERS[code][environment];
}
