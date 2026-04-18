# Arena Survival

A top-down survival action game built with vanilla JavaScript and HTML5 Canvas.

## Gameplay Summary

You are the last survivor in an arena filled with deadly enemies. Use WASD or arrow keys to move around the arena, avoid enemies, collect power-ups, and survive as long as possible.

### Controls

- **W/A/S/D** or **Arrow Keys**: Move the player
- **SPACE**: Pause/Resume the game

### Enemy Types

1. **Chaser (Red)** - Standard enemy that pursues you directly. Moderate speed and damage.
2. **Sprinter (Orange)** - Fast but weak. Hard to catch but dies in one hit.
3. **Tank (Purple)** - Slow but tough. Takes multiple hits and deals heavy damage.
4. **Splitter (Pink)** - Splits into two smaller enemies when killed.

### Power-ups

1. **Health (❤)** - Restores 25 HP
2. **Speed Boost (⚡)** - 1.8x movement speed for 5 seconds
3. **Shield (🛡)** - Invincibility for 8 seconds
4. **Freeze (❄)** - Stops all enemies for 5 seconds
5. **2x Score (×2)** - Doubles score gain for 10 seconds
6. **Nuke (💥)** - Clears all enemies on screen

### Difficulty Progression

Difficulty increases every 30 seconds:
- More enemies spawn over time
- Harder enemy types unlock at higher difficulty levels
- Enemy speed increases

### Scoring

- +10 points per second survived
- Points multiplied when 2x Score power-up is active
- Bonus points for picking up power-ups

## Technical Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Rendering**: HTML5 Canvas API
- **Backend**: Node.js with Express (optional, for highscore persistence)
- **Containerization**: Docker + Docker Compose

## Project Structure

```
game-project/
├── backend/
│   ├── server.js        # Express server
│   └── package.json
├── frontend/
│   ├── index.html      # Main HTML file
│   ├── css/
│   │   └── style.css  # Game styles
│   └── js/
│       ├── game.js     # Main game engine
│       ├── entities.js # Player, enemies, power-ups
│       ├── effects.js # Particles, screen effects
│       └── sound.js   # Sound effects (Web Audio API)
├── data/               # Persistent data (highscores)
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
└── README.md
```

## Docker Setup

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Running the Game

1. Build and start the container:
   ```bash
   docker compose up --build
   ```

2. The game will be available at:
   ```
   http://localhost:3001
   ```

### Stopping the Game

Press **Ctrl+C** in the terminal running Docker Compose to stop the container.

Or in a separate terminal:
```bash
docker compose down
```

### Rebuilding After Changes

To rebuild after making changes to the code:
```bash
docker compose up --build
```

### Port Information

- **Game Port**: 3001 (mapped to container port 3001)

## Game Architecture

### Core Systems

1. **Game Loop**: Uses `requestAnimationFrame` for smooth 60fps rendering
2. **Entity System**: Player, enemies (4 types), and power-ups (6 types)
3. **Collision Detection**: Circle-based collision for all entities
4. **Particle System**: Visual effects for hits, pickups, and explosions
5. **Screen Effects**: Flash, screen shake, and freeze overlay
6. **Sound System**: Web Audio API for procedural sound effects

### State Management

- Game states: `start`, `playing`, `paused`, `gameover`
- High scores saved to browser `localStorage`
- Difficulty scales with survival time

### Rendering Pipeline

1. Clear canvas
2. Draw background (stars + grid)
3. Draw power-ups
4. Draw enemies
5. Draw player
6. Draw particles
7. Draw floating texts
8. Apply screen effects (shake, flash, freeze)

## Future Improvements

1. **Weapon System**: Allow the player to shoot projectiles
2. **Combo System**: Chain kills for bonus multipliers
3. **Boss Battles**: Periodic boss enemies at milestones
4. **Online Leaderboards**: Global high score tracking
5. **Mobile Controls**: Touch-based controls for mobile devices
6. **Upgrade System**: Earn upgrades between waves
7. **Multiple Arenas**: Different arena layouts
8. **Achievements**: Unlockable achievements

## License

MIT License