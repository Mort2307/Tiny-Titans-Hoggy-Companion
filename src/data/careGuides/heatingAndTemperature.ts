import type { CareGuide } from '../../types/CareGuide';

export const heatingAndTemperatureGuide: CareGuide = {
  id: 'heating-and-temperature',
  title: 'Heating & Temperature',
  category: 'heating',
  audience: 'beginner',
  summary: 'A practical guide to providing a stable thermal gradient and monitoring it safely.',
  version: 1,
  published: false,
  reviewedAt: null,
  reviewedBy: null,
  sourceNotes: ['Tiny Titans editorial draft — verify exact target ranges against current specialist veterinary husbandry references before publication.'],
  sections: [
    {
      id: 'gradient',
      title: 'Provide a usable gradient',
      body: 'A Western Hognose should be able to move between warmer and cooler areas without leaving its enclosure. The goal is a stable usable gradient rather than making the entire enclosure the same temperature.',
      important: true
    },
    {
      id: 'thermostat',
      title: 'Use thermostat control',
      body: 'Heat sources should be controlled by an appropriate thermostat and monitored independently with reliable measuring equipment. Never rely on an uncontrolled heat source or assume the thermostat display represents every part of the enclosure.',
      important: true
    },
    {
      id: 'measurement',
      title: 'Measure where the snake actually lives',
      body: 'Check the temperatures available at warm hides, cool hides and other frequently used surfaces. Record readings over time so unusual changes can be identified instead of relying on a single snapshot.',
      important: true
    },
    {
      id: 'overheating',
      title: 'Overheating warning',
      body: 'If enclosure temperatures become unexpectedly high, prioritise getting the enclosure back into a safe range and investigate the heating or thermostat fault. Do not compensate for a heating problem by repeatedly handling or disturbing the snake.',
      important: true,
      warning: true
    }
  ]
};
