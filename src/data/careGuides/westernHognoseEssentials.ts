import type { CareGuide } from '../../types/CareGuide';

export const westernHognoseEssentials: CareGuide = {
  id: 'western-hognose-essentials',
  title: 'Western Hognose Essentials',
  category: 'getting-started',
  audience: 'beginner',
  summary: 'A practical foundation for keeping a Western Hognose healthy, settled and safely managed.',
  version: 1,
  published: false,
  reviewedAt: null,
  reviewedBy: null,
  sourceNotes: [
    'Tiny Titans editorial draft — verify against current husbandry references before publication.'
  ],
  sections: [
    {
      id: 'setup',
      title: 'Before your hoggie arrives',
      body: 'Prepare the enclosure, heating, thermostat, hides, substrate, water and monitoring equipment before introducing the snake. Run the enclosure long enough to confirm temperatures are stable rather than relying on a single reading.',
      important: true
    },
    {
      id: 'temperature',
      title: 'Heating and temperature',
      body: 'Use a reliable thermostat-controlled heat source and provide a meaningful warm-to-cool gradient. Measure temperatures at the actual usable surfaces and hides, not only the thermostat probe. The snake should be able to move away from heat whenever it chooses.',
      important: true
    },
    {
      id: 'hides',
      title: 'Security and hides',
      body: 'Provide secure hides and enough cover for the snake to feel concealed. Additional clutter, tunnels and substrate depth can encourage natural burrowing and allow the snake to choose how exposed it wants to be.',
      important: false
    },
    {
      id: 'water',
      title: 'Water and hydration',
      body: 'Provide clean drinking water at all times and replace it whenever it becomes contaminated. Monitor the enclosure rather than attempting to force hydration in an otherwise healthy snake.',
      important: true
    },
    {
      id: 'handling',
      title: 'Settling and handling',
      body: 'Allow a newly arrived snake time to settle before beginning routine handling. Handling should be calm, purposeful and appropriate to the individual. Defensive bluffing, hissing or musking can occur in Western Hognoses and does not automatically mean the snake is aggressive.',
      important: false
    },
    {
      id: 'feeding',
      title: 'Feeding',
      body: 'Use appropriately sized prey and record each meal. The Tiny Titans feeding system should use the individual snake’s successful feeding history, body-weight trend and recorded prey dimensions when enough data exists rather than applying one universal feeding percentage.',
      important: true
    },
    {
      id: 'red-flags',
      title: 'When to seek professional help',
      body: 'Persistent refusal to feed, repeated regurgitation, unexplained weight loss, breathing abnormalities, neurological signs, significant injury or other concerning changes should be treated as reasons to seek qualified reptile veterinary advice.',
      important: true
    }
  ]
};
