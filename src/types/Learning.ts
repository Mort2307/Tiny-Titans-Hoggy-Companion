export type LearningDifficulty = 1 | 2 | 3 | 4 | 5;
export type LearningSectionKey = "who" | "what" | "why" | "when" | "how" | "examples";

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: LearningDifficulty;
};

export type LearningTopic = {
  id: string;
  title: string;
  icon: string;
  category: string;
  summary: string;
  sections: Partial<Record<LearningSectionKey, string>>;
  questions: QuizQuestion[];
};

export type TopicProgress = {
  attempts: number;
  correct: number;
  mastery: number;
  lastScore: number | null;
  completed: boolean;
};

export type LearningProgress = {
  xp: number;
  totalQuestions: number;
  totalCorrect: number;
  topics: Record<string, TopicProgress>;
  unlockedBadges: string[];
  perfectTests: number;
  completedLessons: number;
};
