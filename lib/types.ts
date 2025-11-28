export type Participant = {
  name: string;
  email: string;
  phone: string;
  college: string;
};

export type TeamDoc = {
  _id?: string;
  teamName: string;
  leaderName: string;
  numberOfParticipants: number;
  participants: Participant[];
  registrationDate: string;
  transactionId: string;
  paymentStatus: "Paid" | "Unpaid" | string;
};
