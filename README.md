# Gavel

Live onchain auctions on Monad: bid in MON or USDC, watch bids land in real time, and settle onchain.

## What Gavel is

Gavel is a web app where anyone can put an item up for auction and anyone else can bid on it. Every auction is priced in one currency chosen by the seller (native MON or Circle USDC), every bid is an onchain transaction, and the page updates live as bids arrive. Late bids extend the clock so nobody can snipe, and when time runs out anyone can settle the auction so the seller and outbid bidders can collect their funds.

## Why Monad

Every bid in Gavel is a real onchain transaction, not an offchain order. A live auction only feels live if bids confirm in about a second and cost almost nothing, which needs fast, cheap blocks. Monad's sub-second blocks and low fees make that possible.

## How it works

1. **Create**: a seller creates an auction with a title, an optional image URL, a currency (MON or USDC), a start price, a minimum increment and a duration (5 minutes to 7 days).
2. **Bid**: the first bid must be at least the start price; each later bid must be at least the highest bid plus the minimum increment. MON bids send the MON with the transaction. USDC bids take two steps: approve the exact bid amount, then bid.
3. **Anti-sniping**: a bid placed in the last 2 minutes pushes the end time to 2 minutes after that bid.
4. **Settle**: after the end time, anyone can settle. The winning bid is credited to the seller.
5. **Withdraw**: Gavel never pushes funds to anyone. Outbid bidders and sellers see a "You have X to collect" banner and withdraw their MON or USDC themselves (`withdrawMon()` / `withdrawUsdc()`).

The seller can cancel an auction only while it has no bids. The contract has no owner, admin, fees, pause, upgradeability or token sweep.

## Contract

| Network | Chain ID | Gavel address | Explorer |
| --- | --- | --- | --- |
| Monad testnet | 10143 | `0xBDC3F5e9cc6af3b125A45d177E65C67154fa008c` | https://testnet.monadvision.com/address/0xBDC3F5e9cc6af3b125A45d177E65C67154fa008c |
| Monad mainnet | 143 | not deployed yet | https://monadvision.com |

USDC (Circle, 6 decimals): testnet `0x534b2f3A21130d7a60830c2Df862319e593943A3`, mainnet `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` ([source](https://developers.circle.com/stablecoins/usdc-contract-addresses)).

## Repository layout

```
contracts/   Foundry project (src/Gavel.sol, test/Gavel.t.sol, script/Deploy.s.sol)
web/         Next.js app (App Router, TypeScript, Tailwind, wagmi, viem, React Query)
```

## Setup

Requirements: Node.js 20+, Git, Foundry v1.8+ (`curl -L https://foundry.paradigm.xyz | bash` then `foundryup`), and a browser wallet.

### Contracts

```sh
cd contracts
forge build
```

OpenZeppelin Contracts and forge-std are vendored in `contracts/lib`, so no extra install step is needed.

### Web app

```sh
cd web
npm install
cp .env.example .env.local      # then set NEXT_PUBLIC_GAVEL_ADDRESS to the deployed Gavel address
npm run dev                     # http://localhost:3000
```

Until `NEXT_PUBLIC_GAVEL_ADDRESS` is set, the app shows a "Contract not configured" message. Chain settings live in `web/src/config/chains.ts`; the contract address, ABI and USDC addresses are in `web/src/config/contract.ts` and `web/src/config/gavelAbi.ts`. After changing the contract, refresh the ABI with `forge build` (in `contracts/`) and then `npm run export-abi` (in `web/`).

## Tests

```sh
cd contracts
forge test -vv
```

The suite covers creation limits, MON and USDC bidding (including approval and msg.value checks), outbidding and pending balances, anti-sniping extension, settle, cancel, withdrawals, a reentrancy attack on `withdrawMon()`, and a check that the contract holds exactly 0 MON and 0 USDC after two full auctions are settled and withdrawn.

## Deploy to Monad testnet

Network facts are from the Monad docs ([testnet network information](https://docs.monad.xyz/developer-essentials/testnet), [verify with Foundry](https://docs.monad.xyz/guides/verify-smart-contract/foundry)): chain ID `10143`, RPC `https://testnet-rpc.monad.xyz`, explorer https://testnet.monadvision.com (also https://testnet.monadscan.com), faucet https://faucet.monad.xyz.

Your private key never goes in a file. Import it once into Foundry's encrypted keystore (you'll be asked for the key and a password):

```sh
cast wallet import gavel-deployer --interactive
```

Deploy:

```sh
cd contracts
cp .env.example .env            # set MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz
source .env
forge script script/Deploy.s.sol --rpc-url $MONAD_TESTNET_RPC_URL --account gavel-deployer --broadcast
```

The script picks USDC by chain ID (10143 or 143, anything else reverts) and prints the Gavel address.

Verify on MonadVision (Sourcify), from `contracts/` so the same compiler settings are used:

```sh
forge verify-contract <GAVEL_ADDRESS> src/Gavel.sol:Gavel \
  --chain 10143 \
  --verifier sourcify \
  --verifier-url https://sourcify-api-monad.blockvision.org/ \
  --constructor-args $(cast abi-encode "constructor(address)" 0x534b2f3A21130d7a60830c2Df862319e593943A3)
```

Or verify on Monadscan (needs an Etherscan API key in `ETHERSCAN_API_KEY`, kept out of git):

```sh
forge verify-contract <GAVEL_ADDRESS> src/Gavel.sol:Gavel \
  --chain 10143 \
  --verifier etherscan \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" 0x534b2f3A21130d7a60830c2Df862319e593943A3) \
  --watch
```

Then put the address in `web/.env.local` (and in Vercel) as `NEXT_PUBLIC_GAVEL_ADDRESS`, and in the Contract table above.

## Deploy the website to Vercel

1. Push this repo to GitHub.
2. In Vercel, choose **Add New → Project** and import the GitHub repo.
3. Set **Root Directory** to `web`. Vercel detects Next.js; keep the default build command (`npm run build`).
4. Under **Environment Variables**, add `NEXT_PUBLIC_GAVEL_ADDRESS` = your deployed Gavel address. It's the only variable the app needs to run, and it isn't secret.
5. Deploy. If you change the variable later, redeploy: `NEXT_PUBLIC_` values are built into the site at build time.
6. Optional: photo uploads need a Vercel Blob store connected to the project (**Storage → Create → Blob**, public access). Connecting it adds `BLOB_READ_WRITE_TOKEN` (server-only) automatically; redeploy afterwards. Without it, the create page just asks for a photo link. For local development, run `vercel env pull .env.local` in `web/`.

   Uploads are checked on the server: the seller signs a free wallet message (short-lived nonce, used once), files must be JPG/PNG/WebP up to 4 MB, and each wallet and IP can upload 10 photos per hour. Nonces and rate-limit counters are stored as tiny blobs under `gavel-internal/` in the same store; they build up slowly and can be deleted at any time.

## Limitations

- Each auction uses one currency: MON or official Circle USDC only. No other tokens.
- Delivery of the item is offchain, between the seller and the winner. The contract only handles payment.
- The contract is not audited. Use it at your own risk.
- Bid history is read straight from the chain. Public Monad RPCs cap `eth_getLogs` at 100 blocks per request, so the site loads history in 100-block chunks. For long auctions whose early bids are days old, that can take a while.

## License

MIT. See [LICENSE](LICENSE).
