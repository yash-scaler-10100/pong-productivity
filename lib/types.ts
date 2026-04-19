export type PlayerId = "you" | "teammate";

export type ShipEntry = {
  id: string;
  player: PlayerId;
  text: string;
  timestamp: string;
};

export type MatchScore = {
  you: number;
  teammate: number;
  rallies: number;
  chaos: number;
};

export type MatchData = {
  id?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  score: MatchScore;
  ships: ShipEntry[];
  combos: number;
};
