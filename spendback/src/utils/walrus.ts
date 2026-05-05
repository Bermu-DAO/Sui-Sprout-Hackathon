const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

export async function uploadReceipt(receipt: object): Promise<string> {
  try {
    const res = await fetch(`${PUBLISHER}/v1/blobs`, {
      method: "PUT",
      body: JSON.stringify(receipt),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return "";
    const json = await res.json();
    return (
      json?.newlyCreated?.blobObject?.blobId ??
      json?.alreadyCertified?.blobId ??
      ""
    );
  } catch {
    return "";
  }
}

export async function readReceipt(blobId: string): Promise<unknown> {
  const res = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`);
  if (!res.ok) throw new Error(`Walrus fetch failed: ${res.status}`);
  return res.json();
}
