export interface DayActivity {
  day: string; // YYYY-MM-DD (dia local do usuário)
  reviews: number;
  correct: number;
}

export interface CategoryRetention {
  categoryId: string | null;
  name: string;
  color: string;
  totalReviews: number;
  correctReviews: number;
  accuracy: number; // 0..1
  /** Estabilidade estimada (dias) derivada da acurácia -> curva de esquecimento. */
  stabilityDays: number;
  /** Dias até a retenção cair a 90%. */
  daysToReview: number;
}

export interface DashboardData {
  activity: DayActivity[];
  retention: CategoryRetention[];
  currentStreak: number;
  longestStreak: number;
  reviewsLast30: number;
  overallAccuracy: number; // 0..1
}
