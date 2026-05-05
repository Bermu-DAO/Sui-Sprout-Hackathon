export interface ParkingSpace {
  id: string;
  location: string;
  hourlyRate: number;
  owner: string;
  price: number; // 0 表示不出售
}

export interface ParkingLot {
  id: string;
  operator: string;
  commissionRateBps: number;
}

export interface PaymentEvent {
  spaceId: string;
  payer: string;
  hours: number;
  totalAmount: number;
  ownerShare: number;
  operatorShare: number;
}
