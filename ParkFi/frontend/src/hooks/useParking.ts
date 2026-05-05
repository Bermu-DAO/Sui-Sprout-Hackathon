import { useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { ParkingSpace } from "../types/parking";
import { PACKAGE_ID } from "../constants/ids";


// 從鏈上對象解析停車格數據
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseParkingSpace(obj: any): ParkingSpace | null {
    try {
        const fields = obj.data?.content?.fields;
        if (!fields) return null;

        return {
            id: obj.data.objectId,
            location: fields.location || "",
            hourlyRate: Number(fields.hourly_rate || 0),
            owner: fields.owner || "",
            price: Number(fields.price || 0),
        };
    } catch (error) {
        console.error("解析停車格數據失敗:", error);
        return null;
    }
}

// 獲取所有停車格（從所有用戶中查詢）
export function useAllParkingSpaces() {
    const client = useSuiClient();

    return useQuery({
        queryKey: ["parkingSpaces", "all"],
        queryFn: async (): Promise<ParkingSpace[]> => {
            if (!PACKAGE_ID || PACKAGE_ID.startsWith("0x...")) {
                console.warn("PACKAGE_ID 未設置，返回空列表");
                return [];
            }

            try {
                console.log("查詢 MintEvent 事件...");
                const eventResponse = await client.queryEvents({
                    query: {
                        MoveEventType: `${PACKAGE_ID}::parking_rwa::MintEvent`,
                    },
                });
                console.log("事件查詢結果:", eventResponse);

                const spaceIds = eventResponse.data.map(
                    (event: any) => (event.parsedJson?.space_id as string)
                ).filter((id: string | undefined): id is string => !!id);
                console.log("解析出的 Space IDs:", spaceIds);

                if (spaceIds.length === 0) {
                    console.log("未找到任何 Space ID，返回空列表");
                    return [];
                }

                console.log("使用 multiGetObjects 批量獲取對象...");
                const objectResponse = await client.multiGetObjects({
                    ids: spaceIds,
                    options: {
                        showContent: true,
                        showOwner: true,
                    },
                });
                console.log("對象獲取結果:", objectResponse);

                // 根據 SDK 版本不同，multiGetObjects 可能直接返回數組或包含在 data 屬性中
                const objects = Array.isArray(objectResponse) ? objectResponse : (objectResponse as any).data || [];
                const spaces = objects
                    .map((obj: any) => parseParkingSpace(obj))
                    .filter((space: ParkingSpace | null): space is ParkingSpace => space !== null);
                console.log("成功解析的停車格:", spaces);

                return spaces;
            } catch (error) {
                console.error("查詢所有停車格失敗:", error);
                if (error instanceof Error && error.message.includes("multiGetObjects is not a function")) {
                    console.warn("multiGetObjects 不可用，退回到 getObject");
                    return fallbackGetAllSpaces(client);
                }
                return [];
            }
        },
        enabled: !PACKAGE_ID.startsWith("0x..."),
        refetchInterval: 10000,
    });
}

// Fallback 函數：如果 multiGetObjects 不可用，則逐一獲取對象
async function fallbackGetAllSpaces(client: any): Promise<ParkingSpace[]> {
    try {
        console.log("Fallback: 查詢 MintEvent 事件...");
        const eventResponse = await client.queryEvents({
            query: {
                MoveEventType: `${PACKAGE_ID}::parking_rwa::MintEvent`,
            },
        });
        console.log("Fallback: 事件查詢結果:", eventResponse);

        const spaceIds = eventResponse.data.map(
            (event: any) => (event.parsedJson?.space_id as string)
        ).filter((id: string | undefined): id is string => !!id);
        console.log("Fallback: 解析出的 Space IDs:", spaceIds);

        const spacePromises = spaceIds.map((id: string) =>
            client.getObject({
                id,
                options: { showContent: true, showOwner: true },
            })
        );

        const objects = await Promise.all(spacePromises);
        console.log("Fallback: 對象獲取結果:", objects);
        const spaces = objects
            .map((obj: any) => parseParkingSpace(obj))
            .filter((space: ParkingSpace | null): space is ParkingSpace => space !== null);
        console.log("Fallback: 成功解析的停車格:", spaces);
        return spaces;
    } catch (error) {
        console.error("Fallback 查詢停車格失敗:", error);
        return [];
    }
}

// 獲取用戶擁有的停車格
export function useMyParkingSpaces() {
    const currentAccount = useCurrentAccount();
    const { data: allSpaces, isLoading, error, refetch } = useAllParkingSpaces();

    const mySpaces = allSpaces?.filter(
        (space: ParkingSpace) => space.owner === currentAccount?.address
    );

    return { mySpaces, isLoading, error, refetch };
}

// 獲取單個停車格詳情
export function useParkingSpace(spaceId: string | undefined) {
    const client = useSuiClient();

    return useQuery({
        queryKey: ["parkingSpace", spaceId],
        queryFn: async () => {
            if (!spaceId) return null;

            const obj = await client.getObject({
                id: spaceId,
                options: {
                    showContent: true,
                    showOwner: true,
                },
            });

            return parseParkingSpace(obj);
        },
        enabled: !!spaceId,
    });
}

// 獲取可購買的停車格（price > 0）
export function useAvailableForPurchase() {
    const { data: allSpaces, ...rest } = useAllParkingSpaces();

    return {
        data: allSpaces?.filter((space: ParkingSpace) => space.price > 0) || [],
        ...rest,
    };
}
