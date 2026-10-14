export interface PlanetDetail {
  color: string;
  ring?: boolean;
  size: number;
  rewardTitle: string;
  desc: string;
}

// One entry per stop in VOYAGE_STOPS (voyage.ts).
export const PLANET_DETAILS: Record<string, PlanetDetail> = {
  Moon: {
    color: '#CBD5E1',
    size: 13,
    rewardTitle: 'Lunar Launch Badge',
    desc: 'Cleared Earth orbit and set up your first lunar relay.',
  },
  Mars: {
    color: '#E07A5F',
    size: 15,
    rewardTitle: 'Red Canyon Rover',
    desc: 'Touched down at the Olympus Mons base camp.',
  },
  'Asteroid Belt': {
    color: '#A8A29E',
    size: 12,
    rewardTitle: 'Belt Navigator Wings',
    desc: 'Charted a safe path through Ceres and Vesta.',
  },
  Jupiter: {
    color: '#D8A373',
    size: 22,
    rewardTitle: 'Jovian Gravity Slingshot',
    desc: 'Used Jupiter\'s gravity to speed toward the outer planets.',
  },
  Saturn: {
    color: '#F4D58D',
    ring: true,
    size: 20,
    rewardTitle: 'Cassini Ring Explorer',
    desc: 'Glided across the icy rings of Saturn.',
  },
  Uranus: {
    color: '#7DD3FC',
    ring: true,
    size: 17,
    rewardTitle: 'Tilted Ice Voyager',
    desc: 'Crossed into the deep outer solar system.',
  },
  Neptune: {
    color: '#5FD0C4',
    size: 18,
    rewardTitle: 'Deep Space Commander',
    desc: 'Reached the fast winds of Neptune at the edge of the solar system.',
  },
};
