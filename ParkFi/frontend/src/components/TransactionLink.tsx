interface TransactionLinkProps {
  digest: string;
  network?: 'mainnet' | 'testnet';
  className?: string;
}

export function TransactionLink({
  digest,
  network = 'testnet',
  className = ''
}: TransactionLinkProps) {
  const explorerUrl = `https://suiscan.xyz/${network}/tx/${digest}`;

  const shortDigest = digest.length > 32
    ? `${digest.slice(0, 16)}...${digest.slice(-16)}`
    : digest;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline text-sm"
        title={digest}
      >
        前往查看交易
      </a>
    </div>
  );
}
