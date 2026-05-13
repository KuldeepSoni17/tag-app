/**
 * Five fixed onboarding questions (multiple choice).
 * Answers are stored encrypted per question in `user_profile_answers`.
 * Admin criteria reference `questionId` + option letter.
 */
export type QuizOption = { id: string; label: string };

export type QuizQuestion = {
  id: number;
  prompt: string;
  options: QuizOption[];
};

export const ONBOARDING_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    prompt: "When do you usually feel most energised?",
    options: [
      { id: "A", label: "Early morning" },
      { id: "B", label: "Midday" },
      { id: "C", label: "Evening" },
      { id: "D", label: "Late night" },
    ],
  },
  {
    id: 2,
    prompt: "How do you prefer to discover new things?",
    options: [
      { id: "A", label: "Friends recommend" },
      { id: "B", label: "Social feeds" },
      { id: "C", label: "Search / research" },
      { id: "D", label: "Random serendipity" },
    ],
  },
  {
    id: 3,
    prompt: "Pick a vibe for your ideal weekend.",
    options: [
      { id: "A", label: "Outdoors + movement" },
      { id: "B", label: "Cozy indoors" },
      { id: "C", label: "City exploration" },
      { id: "D", label: "Deep work / side projects" },
    ],
  },
  {
    id: 4,
    prompt: "Favourite creative genre?",
    options: [
      { id: "A", label: "Indie / alternative" },
      { id: "B", label: "Pop / mainstream" },
      { id: "C", label: "Classical / instrumental" },
      { id: "D", label: "Hip-hop / electronic" },
    ],
  },
  {
    id: 5,
    prompt: "How do you react to friendly competition?",
    options: [
      { id: "A", label: "Love it — bring heat" },
      { id: "B", label: "Playful, not serious" },
      { id: "C", label: "Prefer collaboration" },
      { id: "D", label: "Avoid comparisons" },
    ],
  },
];

export function validateQuizPayload(answers: Record<string, string>): Record<number, string> {
  const out: Record<number, string> = {};
  for (const q of ONBOARDING_QUESTIONS) {
    const letter = answers[String(q.id)];
    if (!letter || !q.options.some((o) => o.id === letter)) {
      throw new Error(`Invalid or missing answer for question ${q.id}`);
    }
    out[q.id] = letter;
  }
  return out;
}
