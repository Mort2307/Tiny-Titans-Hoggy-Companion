export type LearningDifficulty = 1 | 2 | 3 | 4 | 5;
export type LearningBank = 1 | 2 | 3 | 4 | 5;
export type LanguageLevel = "young" | "teen" | "keeper" | "advanced";
export type LearningSectionKey = "who" | "what" | "why" | "when" | "how" | "examples";

export type LearnerProfile = {
  languageLevel: LanguageLevel;
  showScientificTerms: boolean;
  profileSet: boolean;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: LearningDifficulty;
  bank?: LearningBank;
  promptByLanguage?: Partial<Record<LanguageLevel, string>>;
  explanationByLanguage?: Partial<Record<LanguageLevel, string>>;
  terminology?: Array<{ term: string; simple: string; definition: string }>;
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
  bestScore: number;
  completed: boolean;
  lastAttemptAt: string | null;
  currentBank: LearningBank;
  masteredBanks: LearningBank[];
  seenQuestionIds: string[];
  missedQuestionIds: string[];
  recentQuestionIds: string[];
};

export type LearningProgress = {
  xp: number;
  totalQuestions: number;
  totalCorrect: number;
  topics: Record<string, TopicProgress>;
  unlockedBadges: string[];
  perfectTests: number;
  completedLessons: number;
  currentStreak: number;
  longestStreak: number;
  lastTestAt: string | null;
  learnerProfile: LearnerProfile;
};
