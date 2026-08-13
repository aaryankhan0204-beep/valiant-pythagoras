export type ClassificationType = 'Fact' | 'Opinion' | 'Assumption' | 'Suggestion' | 'Question';

export type StanceType = 'Support' | 'Oppose' | 'Neutral';

export interface EvidenceItem {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'link' | 'file';
  url?: string;
  summary?: string;
  size?: string;
}

export interface ArgumentCard {
  id: string;
  title: string;
  content: string;
  classification: ClassificationType;
  stance: StanceType;
  scenarioId: string; // Belongs to a scenario column or option
  x: number;
  y: number;
  width?: number;
  height?: number;
  author: string;
  authorAvatar?: string;
  isAnonymous: boolean;
  supportsCardId?: string;
  evidence?: EvidenceItem[];
  counterArguments?: ArgumentCard[];
  upvotes: number;
  downvotes: number;
  userVoted?: 'up' | 'down';
  createdAt: string;
  cardType?: 'sticky' | 'text' | 'image' | 'drawing' | 'comment' | 'standard' | 'shape' | 'arrow';
  imageUrl?: string;
  color?: string; // Yellow, Blue, Pink, Green, Purple
  penPoints?: { x: number; y: number }[];
  penColor?: string;
  penThickness?: number;
  isLocked?: boolean;
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  textAlign?: 'left' | 'center' | 'right';
  shapeType?: 'rect' | 'circle' | 'diamond' | 'container';
  arrowStart?: { x: number; y: number };
  arrowEnd?: { x: number; y: number };
  arrowControl?: { x: number; y: number };
}

export interface Scenario {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  colorHex: string;
  badgeTag: string;
}

export interface Criteria {
  id: string;
  name: string;
  weight: number; // 1 to 10 scale
  description?: string;
}

export interface Connector {
  id: string;
  fromId: string;
  toId: string;
  type: 'support' | 'oppose' | 'relates';
  label?: string;
}

export interface CanvasComment {
  id: string;
  x: number;
  y: number;
  author: string;
  text: string;
  createdAt: string;
}

export interface CanvasShape {
  id: string;
  type: 'rect' | 'circle' | 'table' | 'checklist' | 'webpage';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  data?: any;
}

export interface UserVote {
  userId: string;
  userName: string;
  scenarioRankings: string[]; // Scenario IDs in order of preference
  criteriaRatings: Record<string, Record<string, number>>; // scenarioId -> criteriaId -> rating (1-10)
  explanation?: string;
}

export interface DecisionAnalysis {
  winningScenarioId: string;
  winningScenarioTitle: string;
  confidenceScore: number;
  voteBreakdown: { scenarioId: string; totalPoints: number; percentage: number }[];
  agreements: string[];
  disagreements: string[];
  unresolvedAssumptions: string[];
  strongestArguments: { scenarioId: string; text: string; author: string }[];
  aiSummary: string;
  timestamp: string;
}

export interface RealtimeUser {
  id: string;
  name: string;
  avatar: string;
  color: string;
  cursor?: { x: number; y: number };
}

export interface BoardState {
  id: string;
  title: string;
  decisionPrompt: string; // "Which option should we select?"
  preset: '2-options' | '3-options' | 'multi-option' | 'keep-change' | 'custom';
  scenarios: Scenario[];
  cards: ArgumentCard[];
  connectors: Connector[];
  shapes: CanvasShape[];
  comments: CanvasComment[];
  criteria: Criteria[];
  isAnonymousAllowed: boolean;
  isVotingMode: boolean;
  votes: UserVote[];
  analysis?: DecisionAnalysis;
  tiebreakerResult?: { scenarioId: string; method: string; date: string };
  realtimeUsers: RealtimeUser[];
  theme?: 'blackboard' | 'whiteboard';
}
