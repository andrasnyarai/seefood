export type Verdict = "hot_dog" | "not_hot_dog";

export type Prediction = {
  label: string;
  confidence: number;
};

export type Scan = {
  id: string;
  imageUrl: string;
  verdict: Verdict;
  label: string;
  confidence: number;
  lowConfidence: boolean;
  createdAt: string;
  predictions?: Prediction[];
};
