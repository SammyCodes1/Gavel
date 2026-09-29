import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, toFunctionSelector } from "viem";

// Plain-English messages for the Gavel contract's custom errors.
const GAVEL_ERRORS: Record<string, string> = {
  ZeroAddress: "Invalid address",
  EmptyTitle: "Please enter a title",
  TitleTooLong: "Title is too long",
  ImageUrlTooLong: "Image URL is too long",
  ZeroStartPrice: "Start price must be above 0",
  ZeroMinIncrement: "Minimum increment must be above 0",
  InvalidDuration: "Duration must be between 5 minutes and 7 days",
  AuctionNotFound: "Auction not found",
  AuctionIsCancelled: "Auction was cancelled",
  AuctionAlreadySettled: "Auction is already settled",
  AuctionEnded: "Auction has ended",
  AuctionNotEnded: "Auction has not ended yet",
  SellerCannotBid: "You can't bid on your own auction",
  WrongMsgValue: "Wrong amount of MON sent with the bid",
  BidTooLow: "Your bid is too low",
  NotSeller: "Only the seller can do that",
  HasBids: "Auction already has bids, so it can't be cancelled",
  NothingToWithdraw: "Nothing to collect",
  TransferFailed: "Transfer failed",
  ReentrancyGuardReentrantCall: "Transaction blocked",
  // OpenZeppelin ERC20 errors raised by USDC during bid / withdraw
  ERC20InsufficientAllowance: "Approve USDC first",
  ERC20InsufficientBalance: "Not enough USDC",
  SafeERC20FailedOperation: "USDC transfer failed",
};

// USDC's errors are not in the Gavel ABI, so also match them by selector.
const SELECTOR_ERRORS: Record<string, string> = {
  [toFunctionSelector("ERC20InsufficientAllowance(address,uint256,uint256)")]: "Approve USDC first",
  [toFunctionSelector("ERC20InsufficientBalance(address,uint256,uint256)")]: "Not enough USDC",
};

/** Turn any wallet / RPC / contract error into a short plain-English message. */
export function friendlyError(error: unknown): string {
  if (!error) return "";
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) {
      return "Transaction rejected in wallet";
    }
    const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name && GAVEL_ERRORS[name]) return GAVEL_ERRORS[name];
      const raw = reverted.raw ?? reverted.signature;
      if (raw) {
        const selector = raw.slice(0, 10).toLowerCase();
        if (SELECTOR_ERRORS[selector]) return SELECTOR_ERRORS[selector];
      }
      if (reverted.reason) return reverted.reason;
    }
    const text = `${error.shortMessage} ${error.details ?? ""}`.toLowerCase();
    if (text.includes("user rejected") || text.includes("user denied")) {
      return "Transaction rejected in wallet";
    }
    if (text.includes("insufficient funds")) return "Not enough MON to pay for this transaction";
    if (error.name === "ChainMismatchError") return "Please switch your wallet to Monad";
    return error.shortMessage;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
