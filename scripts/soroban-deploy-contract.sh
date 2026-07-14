#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONTRACTS_ROOT="${REPO_ROOT}/contracts"
WASM_PATH="${CONTRACTS_ROOT}/target/wasm32v1-none/release/payoes.wasm"

NETWORK="testnet"
OPERATOR_ACCOUNT=""
SOURCE_ACCOUNT=""

die() {
  echo ""
  echo "$1" >&2
  exit 1
}

run() {
  echo ""
  echo "> $*"
  "$@"
}

validate_network() {
  local network="$1"
  local known_networks

  known_networks="$(stellar network ls 2>/dev/null || true)"

  if ! echo "${known_networks}" | grep -qx "${network}"; then
    die "Unknown network \"${network}\". Run: stellar network ls"
  fi
}

assert_identity_exists() {
  local identity="$1"
  local label="$2"

  if ! stellar keys public-key "${identity}" >/dev/null 2>&1; then
    die "Stellar identity \"${identity}\" not found for ${label}. Create it with: stellar keys generate --global ${identity}"
  fi
}

usage() {
  cat <<'EOF'
Deploy and initialize the Payoes Soroban escrow contract.

Usage:
  ./scripts/soroban-deploy-contract.sh --operator-account <name> [options]

Required:
  --operator-account <name>     Contract operator identity (admin / authorization_signer)
  --source-account <name>       Identity that pays deploy transaction fees

Options:
  --network <name>              Stellar CLI network (default: testnet)
  --help                        Show this help

Networks:
  Default is testnet. Any network from `stellar network ls` is accepted,
  for example: testnet, mainnet, futurenet, local.

Notes:
  Deploy fees are paid by --source-account.
  Initialize is signed by --operator-account because it must authorize as admin.

Example:
  stellar keys generate --global payoes-operator
  stellar keys generate --global payoes-funder
  curl "https://friendbot.stellar.org?addr=$(stellar keys address payoes-funder)"
  ./scripts/soroban-deploy-contract.sh \
    --operator-account payoes-operator \
    --source-account payoes-funder
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --operator-account)
      OPERATOR_ACCOUNT="$2"
      shift 2
      ;;
    --source-account)
      SOURCE_ACCOUNT="$2"
      shift 2
      ;;
    --network)
      NETWORK="$2"
      shift 2
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

if [[ -z "${OPERATOR_ACCOUNT}" ]]; then
  usage
  die "--operator-account is required"
fi

if [[ -z "${SOURCE_ACCOUNT}" ]]; then
  usage
  die "--source-account is required"
fi

if ! command -v stellar >/dev/null 2>&1; then
  die "Stellar CLI is not installed. Install it from https://developers.stellar.org/docs/tools/cli"
fi

validate_network "${NETWORK}"
assert_identity_exists "${OPERATOR_ACCOUNT}" "operator"
assert_identity_exists "${SOURCE_ACCOUNT}" "source account"

OPERATOR_SECRET="$(stellar keys secret "${OPERATOR_ACCOUNT}" -q)"
OPERATOR_PUBLIC_KEY="$(stellar keys public-key "${OPERATOR_ACCOUNT}" -q)"
SOURCE_PUBLIC_KEY="$(stellar keys public-key "${SOURCE_ACCOUNT}" -q)"

echo "Payoes Soroban contract deploy"
echo "Network: ${NETWORK}"
echo "Operator account: ${OPERATOR_ACCOUNT}"
echo "Operator public key: ${OPERATOR_PUBLIC_KEY}"
echo "Source account: ${SOURCE_ACCOUNT}"
echo "Source public key: ${SOURCE_PUBLIC_KEY}"

(
  cd "${CONTRACTS_ROOT}"
  run cargo test -p payoes
  run stellar contract build --package payoes
)

if [[ ! -f "${WASM_PATH}" ]]; then
  die "WASM not found at ${WASM_PATH}"
fi

echo ""
echo "> stellar contract deploy --wasm ${WASM_PATH} --network ${NETWORK} --source-account ${SOURCE_ACCOUNT}"

deploy_output="$(
  stellar contract deploy \
    --wasm "${WASM_PATH}" \
    --network "${NETWORK}" \
    --source-account "${SOURCE_ACCOUNT}" 2>&1
)" || die "Contract deploy failed"

echo "${deploy_output}"

CONTRACT_ID="$(echo "${deploy_output}" | grep -oE 'C[A-Z2-7]{55}' | tail -n 1 || true)"

if [[ -z "${CONTRACT_ID}" ]]; then
  die "Deploy succeeded but contract ID could not be parsed from CLI output"
fi

echo ""
echo "> stellar contract invoke --id ${CONTRACT_ID} --network ${NETWORK} --source-account ${OPERATOR_ACCOUNT} -- initialize ..."

run stellar contract invoke \
  --id "${CONTRACT_ID}" \
  --network "${NETWORK}" \
  --source-account "${OPERATOR_ACCOUNT}" \
  -- initialize \
  --admin "${OPERATOR_PUBLIC_KEY}" \
  --authorization_signer "${OPERATOR_PUBLIC_KEY}" \
  --fee_recipient "${OPERATOR_PUBLIC_KEY}"

echo ""
echo "Deploy and initialize complete."
echo ""
echo "CONTRACT_ID=${CONTRACT_ID}"
echo "OPERATOR_SECRET=${OPERATOR_SECRET}"
