// src/domain/access.ts
export type AccessStateDto = {
  meetingId: string;
  meetingCode: string;
  accessMode: string; // "qr" | "codes" | "both"
  totalCodes: number;
  usedCodes: number;
};

