import type { CareGuide } from '../../types/CareGuide';

export const handlingAndBehaviourGuide: CareGuide = {
  id: 'handling-and-behaviour',
  title: 'Handling & Behaviour',
  category: 'handling',
  audience: 'beginner',
  summary: 'Understand defensive behaviour and build calm, predictable handling routines.',
  version: 1,
  published: false,
  reviewedAt: null,
  reviewedBy: null,
  sourceNotes: ['Tiny Titans editorial draft — verify against current behaviour and veterinary references before publication.'],
  sections: [
    {
      id: 'settling',
      title: 'Let a new snake settle',
      body: 'A newly moved snake has to learn a new enclosure, smells and routine. Give it an appropriate settling period and avoid repeatedly disturbing it simply because it has not appeared or behaved as expected.',
      important: true
    },
    {
      id: 'defensive',
      title: 'Defensive displays are communication',
      body: 'Hissing, neck flattening, musking, bluff striking and dramatic posture can be defensive responses. They should be interpreted in context rather than automatically labelled as aggression.',
      important: true
    },
    {
      id: 'technique',
      title: 'Keep handling calm',
      body: 'Support the snake rather than gripping it tightly. Keep movements controlled, avoid repeatedly chasing a nervous animal around its enclosure and return it safely if stress escalates.',
      important: true
    },
    {
      id: 'feeding',
      title: 'Respect feeding periods',
      body: 'Avoid unnecessary handling immediately after a meal. Record feeding and handling together when useful so patterns in behaviour can be identified over time.',
      important: true
    }
  ]
};
