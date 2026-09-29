"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePublicClient, useWriteContract } from "wagmi";
import type { Hash, TransactionReceipt } from "viem";
import { friendlyError } from "./errors";

export type TxStatus = "idle" | "wallet" | "confirming" | "success" | "error";

/**
 * Small helper around wagmi's writeContract: tracks "Waiting for wallet" -> "Confirming",
 * waits for the receipt, maps errors to plain English, and refetches all contract reads
 * once the transaction is confirmed.
 */
export function useTx() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TxStatus>("idle");
  const [error, setError] = useState("");
  const [hash, setHash] = useState<Hash>();

  /**
   * Run a contract write (usually `() => write({...})`) and wait for it.
   * Returns the receipt, or undefined on failure.
   */
  async function send(start: () => Promise<Hash>): Promise<TransactionReceipt | undefined> {
    setError("");
    setHash(undefined);
    setStatus("wallet");
    try {
      const txHash = await start();
      setHash(txHash);
      setStatus("confirming");
      if (!publicClient) throw new Error("No connection to Monad");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") throw new Error("Transaction failed onchain");
      setStatus("success");
      await queryClient.invalidateQueries();
      return receipt;
    } catch (e) {
      setError(friendlyError(e));
      setStatus("error");
      await queryClient.invalidateQueries();
      return undefined;
    }
  }

  const busy = status === "wallet" || status === "confirming";
  return { send, write: writeContractAsync, status, error, hash, busy, reset: () => setStatus("idle") };
}
