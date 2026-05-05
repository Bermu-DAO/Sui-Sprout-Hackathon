import type { FloorEvent, ENDINGS as ZH_ENDINGS } from './scenario_escape_lab';

// ─────────────────────────────────────────────────────
// English Scenario Events
// ─────────────────────────────────────────────────────
export const SCENARIO_EVENTS_EN: FloorEvent[] = [
  // ══ Intro: Lab Office 8F ══
  {
    id: 'intro_blackout',
    floor: 8,
    title: 'Sudden Blackout',
    description:
      'You just dropped off a stack of documents in the boss\'s office when you hear a loud "Click". The entire building plunges into darkness. Your phone screen lights up, and the electronic door flashes a red lockdown alert. You realize—all doors have been locked.',
    choices: [
      {
        id: 'search_desk',
        text: '[INT] Use your phone light to search the boss\'s desk.',
        stat: 'int',
        successText: 'Next to the shredder, you find an intact copy—a massive life insurance policy the boss took out on the company. The premium is staggering, and the beneficiary is his offshore account. You quickly snap a photo.',
        failText: 'In the dark, you knock over stacks of files. You find nothing in the panic, wasting precious time.',
        successEffect: { san: -1, addFlag: 'found_insurance' },
        failEffect: { hp: -1, san: -2 },
      },
      {
        id: 'force_door',
        text: '[STR] Smash the glass door with a chair.',
        stat: 'str',
        successText: 'The chair shatters the glass. You climb through the jagged edges, suffering minor cuts on your hands, but you are free.',
        failText: 'The chair bounces back and hits your leg. The glass only cracks. You wasted your energy and achieved nothing.',
        successEffect: { hp: -1 },
        failEffect: { hp: -3 },
      },
      {
        id: 'calm_wait',
        text: '[POW] Calm down and look for emergency exit signs.',
        stat: 'pow',
        successText: 'You force yourself not to panic. Pointing your screen upward, you spot the faint glow of an emergency exit sign—the service stairs are that way!',
        failText: 'Panic overwhelms your rationality. You stumble around the office until your knees give out. Your mind takes a hit.',
        successEffect: { san: 1 },
        failEffect: { san: -3 },
      },
    ],
  },

  // ══ 8F→7F Fire Stairs ══
  {
    id: 'stair_8_crowd',
    floor: 8,
    isStair: true,
    title: 'Stairs: Stampede',
    description: 'The stairwell is packed with panicking colleagues. Screams echo off the concrete walls. Someone falls, but the crowd keeps pushing forward.',
    choices: [
      {
        id: 'push_through',
        text: '[STR] Force your way through the crowd.',
        stat: 'str',
        successText: 'You lower your center of gravity, turn sideways, and aggressively push through the mob. You stumble out battered but safe.',
        failText: 'You are pushed down and trampled before managing to crawl up. Your chest aches from the kicks.',
        successEffect: {},
        failEffect: { hp: -2 },
      },
      {
        id: 'shout_calm',
        text: '[APP] Shout commands to clear a path.',
        stat: 'app',
        successText: '"Keep right! Keep right!" Your voice cuts through the chaos. A few people listen, forming a narrow path for you.',
        failText: 'Your shouts are drowned out by the noise. Nobody listens to you.',
        successEffect: { san: 1 },
        failEffect: {},
      },
      {
        id: 'wait_gap',
        text: '[DEX] Hug the wall, wait for a gap, and slip through.',
        stat: 'dex',
        successText: 'Pressing against the wall, you patiently wait for the crowd to thin out momentarily, then quickly slip past them.',
        failText: 'You wait too long and get dragged by the surging crowd from behind, falling hard.',
        successEffect: {},
        failEffect: { hp: -1 },
      },
    ],
  },

  // ══ 7F ══
  {
    id: 'floor7_smoke',
    floor: 7,
    title: 'Seventh Floor: Thick Smoke',
    description: 'The 7th-floor corridor is filling with smoke. You can\'t see the way to the stairs. The acrid smell burns your lungs and waters your eyes.',
    choices: [
      {
        id: 'smoke_low',
        text: '[CON] Stay low, cover your nose, and crawl through.',
        stat: 'con',
        successText: 'You cover your face with your jacket and crawl. The smoke billows above you, and you make it through safely.',
        failText: 'Thick smoke enters your lungs. You cough violently, getting dizzy, but eventually stumble through at the cost of your stamina.',
        successEffect: {},
        failEffect: { hp: -3, san: -1 },
      },
      {
        id: 'find_route',
        text: '[EDU] Recall the evacuation map and find a detour.',
        stat: 'edu',
        successText: 'You remember the map from orientation—there is a backup service corridor near the pantry! You bypass the smoke.',
        failText: 'You try to remember, but the smoke distracts you. You take a wrong turn and waste time.',
        successEffect: { san: 1 },
        failEffect: { hp: -1 },
      },
      {
        id: 'break_window',
        text: '[STR] Break a hallway window to vent the smoke.',
        stat: 'str',
        successText: 'You smash the window with a fire extinguisher. Fresh air rushes in, thinning the smoke enough for you to pass.',
        failText: 'The extinguisher is too heavy. You only crack the glass, wasting your energy to no avail.',
        successEffect: {},
        failEffect: { hp: -2 },
      },
    ],
  },

  // ══ 7F→6F Stairs ══
  {
    id: 'stair_7_fire',
    floor: 7,
    isStair: true,
    title: 'Stairs: Wall of Fire',
    description: 'Flames suddenly erupt from the stair landing. The paint on the handrail is melting. You have to pass this section.',
    choices: [
      {
        id: 'run_fast',
        text: '[DEX] Sprint straight through the flames.',
        stat: 'dex',
        successText: 'You hold your breath and sprint. A wave of heat washes over you, but you make it. The edge of your sleeve gets singed.',
        failText: 'You aren\'t fast enough. Flames lick your arm, and you have to roll on the ground to put it out.',
        successEffect: {},
        failEffect: { hp: -3 },
      },
      {
        id: 'soak_cloth',
        text: '[INT] Soak your jacket with your water bottle for protection.',
        stat: 'int',
        successText: 'You drench your jacket, wrap yourself in it, and quickly cross the fire line. A smart choice, leaving you unharmed.',
        failText: 'You can\'t find your water bottle. You have to rush through unprotected, getting lightly burned.',
        successEffect: {},
        failEffect: { hp: -1 },
      },
      {
        id: 'find_other',
        text: '[LUCK] Turn back to look for another exit—maybe luck is on your side.',
        stat: 'luck',
        successText: 'You step back and notice a previously ignored maintenance hatch slightly open. You sneak through and bypass the fire entirely!',
        failText: 'You waste time turning back. The \'backdoor\' is a dead end. You return and have to brave the flames, now even more exhausted.',
        successEffect: { san: 1 },
        failEffect: { hp: -4 },
      },
    ],
  },

  // ══ 6F ══
  {
    id: 'floor6_guard',
    floor: 6,
    title: 'Sixth Floor: Security Blockade',
    description: 'Two security guards block the 6th-floor entrance. "Go back! Upstairs is safer! Firefighters are on their way!" they shout. They seem to be following strange orders, their eyes wide and unfocused.',
    choices: [
      {
        id: 'talk_guard',
        text: '[APP] Persuade them that the fire is upstairs.',
        stat: 'app',
        successText: 'You point at the ceiling smoke detector—it’s flashing frantically. The guards exchange a nervous look and step aside.',
        failText: '"Listen to orders!" one guard yells, pushing you back violently. You have to find another way.',
        successEffect: {},
        failEffect: { hp: -1, san: -1 },
      },
      {
        id: 'trick_guard',
        text: '[INT] Pretend someone behind you needs immediate rescue.',
        stat: 'int',
        successText: '"Somebody collapsed over there!" you yell. They both turn their heads, and you immediately slip past them.',
        failText: 'They don\'t fall for it. One grabs your shoulder, and you have to wrench yourself free.',
        successEffect: {},
        failEffect: { hp: -2 },
      },
      {
        id: 'push_guard',
        text: '[SIZ] Use your bulk to shove through them.',
        stat: 'siz',
        successText: 'Using your sheer size, you slam into one guard, knocking him into the wall. You blow past the other before he can react.',
        failText: 'You fail to break through. They tackle you to the ground, and you sprain your wrist getting away.',
        successEffect: {},
        failEffect: { hp: -3 },
      },
    ],
  },

  // ══ 6F→5F Stairs ══
  {
    id: 'stair_6_creature',
    floor: 6,
    isStair: true,
    title: 'Stairs: Strange Creature',
    description: 'There is something at the landing. In the dark, you see a low, twisted silhouette emitting a wet, slurping sound. It seems to have noticed you.',
    choices: [
      {
        id: 'sneak_past',
        text: '[DEX] Tip-toe quietly along the opposite wall.',
        stat: 'dex',
        successText: 'You hold your breath and glide past. The creature twitches but doesn\'t pursue.',
        failText: 'You step on a piece of glass. The creature emits a hiss and lunges. You shove it away and run, but take a hit.',
        successEffect: {},
        failEffect: { hp: -3, san: -2 },
      },
      {
        id: 'stare_sanity',
        text: '[POW] Stare right at it to see what it is.',
        stat: 'pow',
        successText: 'You force yourself to focus—it\'s just a terrified lab rat, magnified by the shadows. Your sanity holds firm.',
        failText: 'Your eyes meet two glowing dots on the amorphous mass. Your mind recoils from the impossibility. You run past, shivering.',
        successEffect: { san: 2 },
        failEffect: { san: -4 },
      },
      {
        id: 'throw_distract',
        text: '[LUCK] Throw something to distract it.',
        stat: 'luck',
        successText: 'You chuck your keys against the far wall. The object whips its "head" toward the sound. You tiptoe past.',
        failText: 'Your throw hits the creature directly. It shrieks and charges at you. You run wildly, tripping on the steps.',
        successEffect: {},
        failEffect: { hp: -2, san: -2 },
      },
    ],
  },

  // ══ 5F ══
  {
    id: 'floor5_debris',
    floor: 5,
    title: 'Fifth Floor: Barricade',
    description: 'The corridor is entirely blocked by a massive pile of document boxes and equipment. You can see the exit sign on the other side.',
    choices: [
      {
        id: 'climb_over',
        text: '[STR] Forcefully climb over the barricade.',
        stat: 'str',
        successText: 'You haul yourself up and roll over the boxes. Your hands get scraped, but you make it across.',
        failText: 'As you climb, a box gives way. You fall backwards under a heap of heavy equipment, injuring your back.',
        successEffect: {},
        failEffect: { hp: -3 },
      },
      {
        id: 'find_side_path',
        text: '[INT] Look for a gap along the wall.',
        stat: 'int',
        successText: 'You spot a narrow gap between the boxes and the left wall. Sucking in your gut, you manage to squeeze through.',
        failText: 'You waste time searching for a gap that doesn\'t exist. You eventually have to climb over, moving much slower.',
        successEffect: { san: 1 },
        failEffect: { hp: -1 },
      },
      {
        id: 'wait_help',
        text: '[POW] Call out for help, hoping someone is on the other side.',
        stat: 'pow',
        successText: '"Is anyone there?!" A colleague on the other side hears you and knocks down the top boxes, clearing a path.',
        failText: 'You yell for a long time, but only silence answers. Disheartened, you scrape your knees climbing over alone.',
        successEffect: {},
        failEffect: { hp: -2, san: -1 },
      },
    ],
  },

  // ══ 5F→4F Stairs ══
  {
    id: 'stair_5_panic',
    floor: 5,
    isStair: true,
    title: 'Stairs: Stampede Hazard',
    description: 'A stampede has broken out below. People are screaming and slipping. An elderly man trips and falls right in front of you.',
    choices: [
      {
        id: 'help_old',
        text: '[STR] Pull him up and run together.',
        stat: 'str',
        successText: 'You hoist him up, and under your support, you both navigate the crowd. It drains your stamina, but your conscience is clear.',
        failText: 'You try to lift him, but the crowd pressure knocks you both down. You get trampled trying to protect him.',
        successEffect: { san: 2 },
        failEffect: { hp: -3, san: 1 },
      },
      {
        id: 'shout_space',
        text: '[APP] Shout commands to clear space.',
        stat: 'app',
        successText: '"Back off! Man down!" Your commanding voice halts the surge just long enough for him to get up. You both survive.',
        failText: 'Nobody listens. You get slammed into the railing by the mob, bruising your ribs badly.',
        successEffect: { san: 1 },
        failEffect: { hp: -2 },
      },
      {
        id: 'push_alone',
        text: '[DEX] Steer clear and save yourself.',
        stat: 'dex',
        successText: 'You leap over him with agility, escaping the crush. You feel a pang of guilt, but you are safe.',
        failText: 'You try to jump over but trip on his leg, landing hands-first into the trampling crowd. The chaos worsens.',
        successEffect: { san: -1 },
        failEffect: { hp: -2, san: -2 },
      },
    ],
  },

  // ══ 4F ══
  {
    id: 'floor4_explosion',
    floor: 4,
    title: 'Fourth Floor: Localized Explosion',
    description: 'BOOM! An explosion from the 4th-floor chemical storage knocks you off your feet. A heavy ceiling panel crashes down onto your legs.',
    choices: [
      {
        id: 'adrenaline_lift',
        text: '[STR] Let adrenaline take over and push it off.',
        stat: 'str',
        successText: 'Roaring with effort, you shove the heavy panel aside. Your legs are numb, but nothing is broken.',
        failText: 'It\'s too heavy. You struggle violently until you manage to pull your legs out, badly spraining an ankle.',
        successEffect: {},
        failEffect: { hp: -2 },
      },
      {
        id: 'calm_pry',
        text: '[INT] Use leverage to pry it off.',
        stat: 'int',
        successText: 'You grab a broken handrail piece and use it as a lever. With physics on your side, the panel lifts easily.',
        failText: 'Your makeshift lever snaps in half. You have to resort to brute force, cutting your hands in the process.',
        successEffect: {},
        failEffect: { hp: -1 },
      },
      {
        id: 'call_help',
        text: '[POW] Endure the pain and shout for help loudly.',
        stat: 'pow',
        successText: 'Your powerful shout cuts through the ringing in the air. Two passersby rush over and lift the debris off you.',
        failText: 'The pain makes your screams weak. No one comes. You eventually drag yourself out through sheer, agonizing willpower.',
        successEffect: { san: 1 },
        failEffect: { hp: -3, san: -2 },
      },
    ],
  },

  // ══ 3F ══
  {
    id: 'floor3_office_fire',
    floor: 3,
    title: 'Third Floor: Inferno',
    description: 'The entire row of 3rd-floor offices is engulfed in flames. Cubicles are burning, and the sprinklers finally trigger, flooding the floor in a sad drizzle. The smell of melting plastic is overpowering.',
    choices: [
      {
        id: 'sprint',
        text: '[DEX] Don\'t think. Just sprint through the flames.',
        stat: 'dex',
        successText: 'You hold your breath and run like hell. Flames lick your back, but you reach the other side unharmed.',
        failText: 'Halfway through, you choke on smoke and fall to your knees. You have to crawl the rest of the way, getting burned.',
        successEffect: {},
        failEffect: { hp: -4 },
      },
      {
        id: 'use_sprinkler',
        text: '[INT] Soak yourself under the sprinkler before crossing.',
        stat: 'int',
        successText: 'You stand under a nozzle until you\'re completely drenched, then quickly jog across. The water shields you from the fire.',
        failText: 'The sprinkler pressure dies instantly. As you look up, a blast of hot steam burns your face.',
        successEffect: {},
        failEffect: { hp: -2 },
      },
      {
        id: 'edge_path',
        text: '[SIZ] Hug the unburnt concrete wall, bullying your way across.',
        stat: 'siz',
        successText: 'Using your bulk to push burning debris aside, you carve a narrow safe path along the wall and edge across.',
        failText: 'Your large size makes you clumsy in the tight spot. You get trapped by falling debris, inhaling dangerous smoke.',
        successEffect: {},
        failEffect: { hp: -2, san: -1 },
      },
    ],
  },

  // ══ 2F ══
  {
    id: 'floor2_outside_fire',
    floor: 2,
    title: 'Second Floor: The Jumper',
    description: 'The stairway window is shattered. You can see firetrucks outside, but flames from the exterior are curling inside. A man is standing on the ledge, contemplating jumping.',
    choices: [
      {
        id: 'stop_man',
        text: '[APP] Talk him down. Tell him help is here.',
        stat: 'app',
        successText: '"Don\'t jump! Firefighters are right below us!" Your comforting tone brings him back to reality. He steps down and joins you.',
        failText: 'Before you finish your sentence, he jumps. You stare at the empty window, a heavy weight sinking into your chest.',
        successEffect: { san: 2 },
        failEffect: { san: -4 },
      },
      {
        id: 'ignore_run',
        text: '[POW] Ignore him and keep running.',
        stat: 'pow',
        successText: 'You tell yourself everyone makes their own choices. You run past without looking back, preserving your own life.',
        failText: 'You take a few steps, but guilt forces you to stop and watch. He jumps anyway. Your conscience is haunted.',
        successEffect: { san: -1 },
        failEffect: { san: -2 },
      },
      {
        id: 'help_rope',
        text: '[EDU] Use curtains and cables to make a makeshift rope.',
        stat: 'edu',
        successText: 'You tie curtains into a knot and anchor it to a pipe. He rappels safely to the 1st-floor awning.',
        failText: 'Your knot slips. You spend too much time trying to fix it and are forced by approaching flames to abandon him and run.',
        successEffect: { san: 3 },
        failEffect: { hp: -1, san: -1 },
      },
    ],
  },

  // ══ 1F: The Exit ══
  {
    id: 'floor1_exit',
    floor: 1,
    title: 'First Floor: The Exit',
    description: 'You\'ve finally made it to the lobby! The glass revolving doors are shattered, letting in the cool night air. You can hear firefighters just outside. Two paths lie before you.',
    choices: [
      {
        id: 'escape_now',
        text: '[ESCAPE] Sprint out the main doors!',
        stat: 'dex', // treated as auto success basically, or stat check gives flavor
        successText: 'You dash out and collapse on the pavement. You survived the nightmare.',
        failText: 'You cut yourself on the broken glass as you stumble out, but you are finally outside. You survived.',
        successEffect: { addFlag: 'escaped' },
        failEffect: { hp: -1, addFlag: 'escaped' },
      },
      {
        id: 'go_deeper',
        text: '[INVESTIGATE] Wait... what\'s in the basement? You head downstairs.',
        stat: 'pow',
        successText: 'Your iron will overrides your survival instinct. You are going to uncover the truth.',
        failText: 'Your logic fails you. Driven by a morbid curiosity, you blindly walk toward the basement stairs...',
        successEffect: { addFlag: 'going_basement' },
        failEffect: { addFlag: 'going_basement' },
      },
    ],
  },

  // ══ B1 Basement ══
  {
    id: 'basement1_darkness',
    floor: -1,
    title: 'Basement Level 1: Absolute Darkness',
    description: 'The basement has no light. It is quieter than upstairs... eerily quiet. You hear something moving in the darkness. Water drips from a pipe. Your phone battery is dying.',
    choices: [
      {
        id: 'use_light',
        text: '[INT] Use your phone on the lowest brightness to navigate.',
        stat: 'int',
        successText: 'You dim the screen. As your eyes adjust, you can barely make out the walls. You proceed carefully.',
        failText: 'The darkness throws off your depth perception. You smash into a concrete pillar, dropping your phone. Pitch black.',
        successEffect: {},
        failEffect: { hp: -1, san: -2 },
      },
      {
        id: 'confront_fear',
        text: '[POW] Turn off the light and use your hearing.',
        stat: 'pow',
        successText: 'You close your eyes and listen. Dripping water, ventilation hums, your own heartbeat. You find the path by sound alone.',
        failText: 'The absolute darkness breaks you. You begin to tremble uncontrollably, taking a massive hit to your sanity.',
        successEffect: { san: -1 },
        failEffect: { san: -4 },
      },
      {
        id: 'feel_wall',
        text: '[CON] Trace the wall with your hand to find the way deep down.',
        stat: 'con',
        successText: 'You press your hand against the cold concrete, following the drafts of air down into the hidden sub-level.',
        failText: 'As you drag your hand along the wall, a sharp piece of metal slices your palm open. You bleed, but continue onward.',
        successEffect: {},
        failEffect: { hp: -2 },
      },
    ],
  },
];

export const RANDOM_STAIR_EVENTS_EN: FloorEvent[] = [
  {
    id: 'random_help',
    floor: 0,
    isStair: true,
    title: 'Stairs: Someone in Need',
    description: 'An injured woman lies in the stairwell corner. Her ankle is twisted, and she struggles to stand. She looks at you with a glimmer of hope.',
    choices: [
      {
        id: 'carry_her',
        text: '[STR] Put her on your back and run.',
        stat: 'str',
        successText: 'You hoist her up. It’s heavy, but you endure the burning in your muscles. Both of you make it through.',
        failText: 'You try to carry her but your legs give out after a few steps. She tells you to put her down, and you both limp forward slowly.',
        successEffect: { san: 2 },
        failEffect: { hp: -2 },
      },
      {
        id: 'guide_her',
        text: '[APP] Offer your shoulder and encourage her to walk.',
        stat: 'app',
        successText: '"You can do this, lean on me!" She grits her teeth and keeps pace. You both survive the descent.',
        failText: 'She doesn\'t trust your scrawny appearance and refuses your help, telling you to go on. Your conscience aches.',
        successEffect: { san: 3 },
        failEffect: { san: -1 },
      },
      {
        id: 'leave',
        text: '[POW] Tell yourself there is nothing you can do, and leave.',
        stat: 'pow',
        successText: 'You rationalize that firefighters will help her. You keep descending. Your heart feels heavy, but you are alive.',
        failText: 'You walk away but guilt drags you back. You waste time returning for her, carrying her out but taking massive exhaustion damage.',
        successEffect: { san: -2 },
        failEffect: { hp: -1, san: 1 },
      },
    ],
  },
];

export const BOSS_DATA_EN = {
  id: 'boss_professor',
  floor: -2,
  title: 'Basement Level 2: The True Boss',
  description:
    'In the abyss, a massive shadow looms. It is your boss. Or, rather, it used to be. His suit is shredded, and grayish-purple tentacles sprout from his back and arms, quivering and dripping slime. His eyes glow with an unnatural light as he smirks:\n\n"Good boy... you actually made it down here... It must be fate..."\n\nYou know you have to fight him.',
  bossHp: 7,
  bossAtk: '1d4' as const,
  playerAtk: '1d3' as const,
};

// We don't redefine ENDINGS logic here entirely, just the translated fields to be patched over.
export const ENDINGS_EN: typeof ZH_ENDINGS = {
  escaped: {
    id: 'escaped',
    title: 'Escaped',
    titleEn: 'ESCAPE',
    description:
      'You burst out of the building. Behind you, the inferno rages. You collapse on the pavement, gulping down the cold outside air.\n\nThe sirens of the firetrucks, the murmurs of the bystanders, the boss\'s eerie absence... it all pieces together. But you are alive.\n\nWeeks later, investigators confirm arson. The insurance claim is denied, and the boss remains missing.',
    flavor: 'You survived. But some questions will never be answered.',
    color: 'text-green-400',
    bg: 'border-green-500/40',
    emoji: '🚪',
  },
  escaped_with_evidence: {
    id: 'escaped_with_evidence',
    title: 'Surviving With The Truth',
    titleEn: 'TRUTH & ESCAPE',
    description:
      'You run out of the building. In your phone lies the photo of the insurance policy.\n\nThe first thing a firefighter hears from you is "Thank God," but all you can think about is the photo.\n\nYou deliver the evidence to the investigators. Three months later, an international warrant is issued for your boss for arson and fraud.\n\nYou are the sole witness to the truth.',
    flavor: 'Justice may be delayed, but it still arrives.',
    color: 'text-blue-400',
    bg: 'border-blue-500/40',
    emoji: '📋',
  },
  died_inside: {
    id: 'died_inside',
    title: 'Trapped Forever',
    titleEn: 'NEVER LEFT',
    description:
      'You never made it out.\n\nPerhaps your stamina ran out, perhaps the smoke overwhelmed you, or perhaps something unspeakable found you in the basement.\n\nThe fire report states your body was found on the 3rd floor, facedown, clutching a phone with a blurry, unidentifiable picture.\n\nNobody will ever know what it meant.',
    flavor: 'Some companies... once you join, you never leave.',
    color: 'text-red-500',
    bg: 'border-red-700/40',
    emoji: '🔒',
  },
  boss_defeated: {
    id: 'boss_defeated',
    title: 'True Culprit Defeated',
    titleEn: 'TRUTH SLAYER',
    description:
      'The boss falls. The tentacles slowly retract, dissolving into his broken body. He lies on the floor, looking like nothing more than an ordinary man.\n\nYou stand in the dark of B2, battered and bleeding, standing over your former employer—now just a prisoner awaiting trial.\n\nYou drag him up to the surface and surrender him to the police. The next day\'s headlines read:\n\n"Fire Hero Captures Arsonist: Bizarre Tentacle Incident Shocks Experts"\n\nYou know it wasn\'t just a headline. What you saw was real.',
    flavor: 'Some truths can only be unveiled by the brave.',
    color: 'text-yellow-400',
    bg: 'border-yellow-500/40',
    emoji: '⚔️',
  },
};
