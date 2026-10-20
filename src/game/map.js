export const MAP = {
  start: {
    scene: 'The air is cold and carries the smell of wet stone. A narrow corridor forks ahead. To the left, a door hangs slightly ajar. To the right, the passage slopes downward into darkness. Behind you, the way you came has already begun to feel unfamiliar.',
    choices: [
      { text: 'Push through the ajar door on the left.', next: 'door' },
      { text: 'Descend the sloping passage.', next: 'descent', dc: 13, stat: 'health' },
      { text: 'Turn back and examine the way you came.', next: 'back' }
    ]
  },
  door: {
    scene: 'The door groans open. Inside, a small room holds a rusted lantern and a folded map on a table. The lantern still has oil. The map is marked in a hand you do not recognize.',
    choices: [
      { text: 'Take the lantern and light it.', next: 'lantern', effect: { item: 'lantern' } },
      { text: 'Study the map carefully.', next: 'map_study' },
      { text: 'Leave the room and return to the fork.', next: 'start' }
    ]
  },
  descent: {
    scene: 'The slope is slick with moisture. Your foot slips and the noise echoes longer than it should. Something below has noticed.',
    choices: [
      { text: 'Freeze and stay silent.', next: 'freeze', dc: 13, stat: 'sanity' },
      { text: 'Scramble back up.', next: 'scramble', dc: 10, stat: 'health' },
      { text: 'Continue downward carefully.', next: 'down_continue', dc: 16, stat: 'health' }
    ]
  },
  lantern: {
    scene: 'The lantern catches. Its light reveals hundreds of tally marks scratched into the walls. The corridor behind you looks different in the warm glow.',
    choices: [
      { text: 'Follow the map’s new route.', next: 'map_route' },
      { text: 'Ignore the map and keep moving.', next: 'forward_blind' },
      { text: 'Search for another way out.', next: 'search_exit', dc: 13, stat: 'sanity' }
    ]
  },
  back: {
    scene: 'You turn around. The corridor stretches further than it should. Your own footprints are already gone.',
    choices: [
      { text: 'Keep walking back.', next: 'start' },
      { text: 'Stop and listen.', next: 'listen', dc: 10, stat: 'sanity' },
      { text: 'Run.', next: 'run', dc: 13, stat: 'health' }
    ]
  },
  map_study: {
    scene: 'The map is old and brittle. A red circle marks a room labeled with an unfamiliar symbol. Beneath it: “Do not open it twice.”',
    choices: [
      { text: 'Take the map.', next: 'lantern', effect: { item: 'map' } },
      { text: 'Leave it and take the lantern.', next: 'lantern', effect: { item: 'lantern' } },
      { text: 'Burn the map.', next: 'start' }
    ]
  },
  freeze: {
    scene: 'You hold still. The sound below stops. Then, very faintly, it starts again—closer.',
    choices: [
      { text: 'Hold your breath.', next: 'run', dc: 16, stat: 'sanity' },
      { text: 'Back away slowly.', next: 'start' },
      { text: 'Call out.', next: 'run', dc: 19, stat: 'health' }
    ]
  },
  scramble: {
    scene: 'You claw your way back to the fork, scraped and breathing hard. The slope below is silent again.',
    choices: [
      { text: 'Take the door.', next: 'door' },
      { text: 'Try the slope again.', next: 'descent' },
      { text: 'Examine the corridor behind you.', next: 'back' }
    ]
  },
  down_continue: {
    scene: 'The passage ends at a low doorway. Beyond it, warm light shines from a room with no visible lamp.',
    choices: [
      { text: 'Step through.', next: 'lantern' },
      { text: 'Turn back.', next: 'start' },
      { text: 'Wait and listen.', next: 'freeze' }
    ]
  },
  listen: {
    scene: 'You stop. Somewhere behind you, something exhales.',
    choices: [
      { text: 'Run back to the fork.', next: 'start' },
      { text: 'Go toward the sound.', next: 'run', dc: 16, stat: 'sanity' },
      { text: 'Stand completely still.', next: 'freeze' }
    ]
  },
  run: {
    scene: 'You run. The corridor twists. You end up at the fork again, but the door is gone.',
    choices: [
      { text: 'Take the slope.', next: 'descent' },
      { text: 'Search the walls for the door.', next: 'search_exit', dc: 16, stat: 'sanity' },
      { text: 'Sit down and breathe.', next: 'start' }
    ]
  },
  map_route: {
    scene: 'The route leads to a narrow stair descending into a chamber lit by no visible source.',
    choices: [
      { text: 'Enter the chamber.', next: 'lantern' },
      { text: 'Turn back.', next: 'start' },
      { text: 'Mark the stair and continue.', next: 'descent' }
    ]
  },
  forward_blind: {
    scene: 'You walk without looking at the map. The corridor narrows until your shoulders brush both walls.',
    choices: [
      { text: 'Keep going.', next: 'down_continue' },
      { text: 'Back out.', next: 'start' },
      { text: 'Feel along the walls.', next: 'search_exit', dc: 10, stat: 'sanity' }
    ]
  },
  search_exit: {
    scene: 'You press your palm against the stone. Somewhere beneath the surface, something presses back.',
    choices: [
      { text: 'Pull your hand away.', next: 'start' },
      { text: 'Press harder.', next: 'run', dc: 19, stat: 'sanity' },
      { text: 'Listen through the wall.', next: 'listen' }
    ]
  }
};
export function getNode(id) { return MAP[id] || null; }
