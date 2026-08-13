import type { BoardState } from '../types/decision';

export const INITIAL_DECISION: BoardState = {
  id: 'board-new-starter',
  title: 'Decision Workspace',
  decisionPrompt: 'Which Option Should We Select?',
  preset: '2-options',
  isAnonymousAllowed: true,
  isVotingMode: false,
  criteria: [], // Zero predetermined criteria
  scenarios: [
    {
      id: 'scen-option-a',
      title: 'Option A',
      description: 'First alternative option under evaluation',
      colorHex: '#0284c7',
      badgeTag: 'Option A'
    },
    {
      id: 'scen-option-b',
      title: 'Option B',
      description: 'Second alternative option under evaluation',
      colorHex: '#059669',
      badgeTag: 'Option B'
    }
  ],
  cards: [], // Clean production slate — 0 pre-existing cards!
  connectors: [],
  shapes: [],
  comments: [],
  votes: [],
  realtimeUsers: [
    { id: 'u1', name: 'Host (You)', avatar: '', color: '#0284c7' }
  ],
  theme: 'whiteboard'
};
