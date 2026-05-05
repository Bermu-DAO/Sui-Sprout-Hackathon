import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { createParkingPaymentTx } from "../contracts/parking";

export function PaymentCard({ space }: { space: { id: string; hourlyRate: number } }) {
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const handlePay = () => {
        const tx = createParkingPaymentTx(space.id, BigInt(space.hourlyRate), 1);

        signAndExecute(
            { transaction: tx as any },
            {
                onSuccess: (result) => console.log("支付成功", result.digest),
                onError: (error) => console.error("支付失敗", error),
            }
        );
    };

    return <button onClick={handlePay}>立即支付 SUI</button>;
}
