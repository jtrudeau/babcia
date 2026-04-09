import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Camera, Footprints, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Stars, Sun, Moon, Play, Gift, Lock, X } from 'lucide-react';
import './App.css';

// --- CONFIGURATION ---
const BDAY_HEADER = "STO LAT BABCIU!";
const BDAY_SUB_MAIN = "Happy 80th Birthday from Kasia, Julek, and Izzie!";
const BDAY_SUB_LOVE = "We love you!";

/** Kasia, Julek, and three Izzie icons on the map must be gathered to open the gift. */
const REQUIRED_FOR_GIFT = ['K', 'J', 'I1', 'I2', 'I3'];
const IZZIE_TILES = ['I1', 'I2', 'I3'];

const countMissingForGift = (set) => REQUIRED_FOR_GIFT.filter((k) => !set.has(k)).length;

const FAMILY_MEMORIES = {
  'K': { id: 'kasia', name: 'Kasia', quote: "Kochana Mami, życzę Ci luzu i wyzwolenia radości która w Tobie drzemie. Żebyśmy się mogli razem długo chichrać i delektować życiem." },
  'J': { id: 'joel', name: 'Julek', quote: "Happy 80th birthday Babciu! Życzę Ci zdrowia, szczęścia i miło spędzonego czasu z tymi, których kochasz." },
  'I1': { id: 'izzie1', name: 'Izzie', quote: "Wszystkiego najlepszego Babciu! I love you!" },
  'I2': { id: 'izzie2', name: 'Izzie', quote: "Babciu, jestem bardzo wdzięczna, że ​​nauczyłam się grać z Tobą w szachy. To stało się ważną częścią naszego życia!" },
  'I3': { id: 'izzie3', name: 'Izzie', quote: "Chodźmy wzdłuż dolnej ścieżki — prezent czeka tam, gdzie Róg Wolności!" },
};

const IZZIE_CLUES = {
  I1: { pl: 'Izzie: Szachy i róg wolności — tędy!', en: 'Izzie: Chess and the horn of liberty — this way!' },
  I2: { pl: 'Izzie: Ściany są blisko — idź ostrożnie!', en: 'Izzie: The walls are close — step carefully!' },
  I3: { pl: 'Izzie: Dolna ścieżka prowadzi do prezentu!', en: 'Izzie: The bottom path leads toward the gift!' },
};

const WALL_CHARS = ['♜', '♝', '♟', '♛', '♞'];
const getWallChar = (x, y) => WALL_CHARS[(x * 7 + y * 13) % WALL_CHARS.length];

// 10x10 Maze
const MAZE_DESC = [
  "W W W W W W W W W W",
  "W I1 P P P W P P G W",
  "W P W W P W P W W W",
  "W P W J P K P P P W",
  "W P W P W W W W P W",
  "W P P P W I2 P P P W",
  "W W W P W W W P W W",
  "W P P P P P P P P W",
  "W P W W W W W W P W",
  "W S P T I3 P P P P W"
];

const GRID_MAP = MAZE_DESC.map(row => row.split(' '));
const ROWS = GRID_MAP.length;
const COLS = GRID_MAP[0].length;

const findCoord = (char) => {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (GRID_MAP[y][x] === char) return { x, y };
    }
  }
  return { x: 1, y: 9 };
};

const START_POS = findCoord('S');
const TELEPORT_EXIT = findCoord('T');

/** Let the teleport “land” on the board before the memory modal covers it. */
const PORTAL_MODAL_DELAY_MS = 600;

// --- HELPER COMPONENT (FULL MODAL OVERLAY) ---
const MemoryModal = ({ memoryId, onClose }) => {
  const data = FAMILY_MEMORIES[memoryId];
  if (!data) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div className="modal-content memory-modal">
        <button
          type="button"
          className="memory-modal-close"
          onClick={onClose}
          aria-label="Zamknij (Close)"
        >
          <X size={22} strokeWidth={2.5} />
        </button>
        <h2 className="whimsical-font memory-modal-title">{data.name}</h2>

        <div className="memory-photo-container large-featured">
           <img 
              src={`${import.meta.env.BASE_URL}assets/${data.id}.jpg`} 
              alt={data.name}
              className="memory-photo"
              onError={(e) => {
                 e.target.style.display = 'none';
                 e.target.parentElement.classList.add('missing-photo');
                 e.target.parentElement.innerHTML = `<span>(Drop <b>${data.id}.jpg</b> into <b>public/assets/</b>)</span>`;
              }}
           />
        </div>

        <p className="memory-quote whimsical-font">"{data.quote}"</p>

        {/* Audio disabled — likely unused; re-enable if you add per-memory .mp3 under public/assets/
        <div className="audio-wrapper">
            <audio src={`/assets/${data.id}.mp3`} autoPlay controls />
        </div>
        */}
      </div>
    </div>
  );
};


export default function App() {
  const [theme, setTheme] = useState('light'); // Init to light mode
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeMemory, setActiveMemory] = useState(null); // 'K', 'J', 'I1'|'I2'|'I3'

  const [pos, setPos] = useState(START_POS);
  const [revealed, setRevealed] = useState(() => new Set());
  
  const [flashActive, setFlashActive] = useState(false);
  const [clue, setClue] = useState({ 
    pl: "Babciu! Idziemy po labiryncie. Przesuń rycerza!", 
    en: "Babcia! Let's go through the maze. Move the knight!" 
  });
  const [complete, setComplete] = useState(false);
  
  const [collected, setCollected] = useState(new Set());
  /** Cycles which Izzie memory opens when tapping the combined Izzie HUD row. */
  const [izzieHudCycle, setIzzieHudCycle] = useState(0);

  const portalModalTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (portalModalTimerRef.current !== null) {
        clearTimeout(portalModalTimerRef.current);
      }
    };
  }, []);

  const isGamePaused = showWelcome || activeMemory !== null;

  const revealAround = useCallback((x, y, radius = 2) => {
    setRevealed(prev => {
      const next = new Set(prev);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (x + dx >= 0 && x + dx < COLS && y + dy >= 0 && y + dy < ROWS) {
            next.add(`${x + dx},${y + dy}`);
          }
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    revealAround(START_POS.x, START_POS.y);
  }, [revealAround]);

  const move = useCallback((dx, dy) => {
    if (complete || isGamePaused) return;
    
    setPos(current => {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return current;
      
      const targetTile = GRID_MAP[ny][nx];
      if (targetTile === 'W') return current; 

      let finalPos = { x: nx, y: ny };

      if (targetTile === 'K') {
        setActiveMemory('K');
        setCollected(prev => new Set(prev).add('K'));
        setClue({ pl: "Kasia: Błysk flesza! Oświetlam całą mapę!", en: "Kasia: Camera flash! Lighting up the map!" });
        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 4000); 
      }
      
      if (targetTile === 'J') {
        setCollected((prev) => new Set(prev).add('J'));
        setClue({
          pl: 'Julek: Tędy! Kosmiczny portal przez czasoprzestrzeń!',
          en: 'Julek: This way! A portal through spacetime!',
        });
        finalPos = TELEPORT_EXIT;
        if (portalModalTimerRef.current !== null) clearTimeout(portalModalTimerRef.current);
        portalModalTimerRef.current = setTimeout(() => {
          portalModalTimerRef.current = null;
          setActiveMemory('J');
        }, PORTAL_MODAL_DELAY_MS);
      }

      if (IZZIE_TILES.includes(targetTile)) {
        setActiveMemory(targetTile);
        setCollected((prev) => new Set(prev).add(targetTile));
        const clueLine = IZZIE_CLUES[targetTile];
        if (clueLine) setClue(clueLine);
      }

      if (targetTile === 'G') {
        const missing = countMissingForGift(collected);
        if (missing > 0) {
            setClue({
              pl: `Zamknięte! Zbierz wszystkie ikony: Kasia, Julek oraz trzy znaczniki Izzie na mapie. (Brakuje: ${missing})`,
              en: `Locked! Collect every icon: Kasia, Julek, and three Izzie markers on the map. (Missing: ${missing})`,
            });
            return current;
        } else {
            setClue({ pl: "Wszystkiego Najlepszego!!!", en: "Happy Birthday!!!" });
            setActiveMemory(null); // clear sidebar for celebration
            setComplete(true);
            playFanfare();
            triggerConfetti();
        }
      }

      revealAround(finalPos.x, finalPos.y);
      return finalPos;
    });
  }, [complete, isGamePaused, revealAround, collected]);

  // Read keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp') move(0, -1);
      if (e.key === 'ArrowDown') move(0, 1);
      if (e.key === 'ArrowLeft') move(-1, 0);
      if (e.key === 'ArrowRight') move(1, 0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  const playFanfare = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // C5 – E5 – G5 – C6 arpeggio, then a held C-major chord
    const arpNotes  = [523.25, 659.25, 783.99, 1046.50];
    const arpTimes  = [0, 0.13, 0.26, 0.39];
    const chordFreqs = [523.25, 659.25, 783.99];

    arpNotes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + arpTimes[i];
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.36);
    });

    chordFreqs.forEach((freq) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + 0.58;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      osc.start(t);
      osc.stop(t + 1.1);
    });
  };

  const triggerConfetti = () => {
    const duration = 6000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 10,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors: ['#FF7043', '#4FC3F7', '#7E57C2', '#FFD700', '#FFFFFF']
      });
      confetti({
        particleCount: 10,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors: ['#FF7043', '#4FC3F7', '#7E57C2', '#FFD700', '#FFFFFF']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const isFog = (x, y) => {
    if (flashActive) return false;
    return !revealed.has(`${x},${y}`);
  };

  const getTileClasses = (x, y, char) => {
    const fog = isFog(x, y);
    const isPlayer = pos.x === x && pos.y === y;
    
    let classes = ['tile'];
    
    if (char === 'W') classes.push('wall');
    if (char === 'P' || char === 'S') classes.push('path');
    if (char === 'K') classes.push('kasia-tile', 'path');
    if (char === 'J') classes.push('joel-tile', 'path');
    if (IZZIE_TILES.includes(char)) classes.push('izzie-tile', 'path');
    if (char === 'G') classes.push('goal-tile', 'path');
    if (char === 'T') classes.push('exit-tile', 'path');

    if (fog) {
        classes.push('fog');
    } else {
        classes.push('revealed');
    }
    
    if (isPlayer) classes.push('player');
    return classes.join(' ');
  };

  const renderTileContent = (char, x, y) => {
    const fog = isFog(x, y);
    const isPlayer = pos.x === x && pos.y === y;
    const goalUnlocked = countMissingForGift(collected) === 0;
    
    if (isPlayer) return <span className="player-icon">♘</span>; 
    
    if (fog) {
        if (char === 'G') {
            return goalUnlocked 
                ? <Gift size={20} color="#FFD700" className="opacity-50" />
                : <Lock size={20} color="#FFD700" className="opacity-50" />;
        }
        return null;
    }
    
    if (char === 'W') return <span className="wall-chess-piece">{getWallChar(x, y)}</span>;
    if (char === 'K') return <Camera size={26} color="#FF7043" />;
    if (IZZIE_TILES.includes(char)) {
      return (
        <span className="izzie-icon-wrap izzie-icon-map" title="Izzie">
          <span className="izzie-icon">👦</span>
        </span>
      );
    }
    if (char === 'J') return <Stars size={26} color="#7E57C2" />;
    
    if (char === 'G') {
       return goalUnlocked 
           ? <Gift size={32} color="#FFD700" />
           : <Lock size={32} color="#A3B1C6" />;
    }
    if (char === 'T') {
      return (
        <span className="blackhole-swirl" title="Wyjście z portalu — czarna dziura">
          <span className="blackhole-swirl-ring" aria-hidden />
        </span>
      );
    }
    
    return null;
  };

  const izzieGatheredIds = IZZIE_TILES.filter((id) => collected.has(id));
  const izzieGatheredCount = izzieGatheredIds.length;

  return (
    <div className={`app-wrapper theme-${theme}`}>
      
      {/* 
        ========================================
        LEFT COLUMN: CONTROL PANEL / SIDEBAR
        ========================================
      */}
      <aside className="sidebar">
          <div className="sidebar-header">
            <h1 className="sidebar-title whimsical-font">Babcia's Maze!</h1>
            <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <div className="sidebar-section">
             <h3 className="section-title">Zebrane ikony (Gathered icons)</h3>
             <div className="collection-hud">
                <button 
                  className={`hud-item ${collected.has('K') ? 'active interactable' : ''}`}
                  onClick={() => collected.has('K') && setActiveMemory('K')}
                >
                  <Camera size={18} /> Kasia
                </button>
                <button 
                  className={`hud-item ${collected.has('J') ? 'active interactable' : ''}`}
                  onClick={() => collected.has('J') && setActiveMemory('J')}
                >
                  <Stars size={18} /> Julek
                </button>
                <button
                  type="button"
                  className={`hud-item hud-izzie ${izzieGatheredCount > 0 ? 'active interactable' : ''}`}
                  aria-label={`Izzie: zebrano ${izzieGatheredCount} z 3. Klik przewija między zebranymi zdjęciami.`}
                  onClick={() => {
                    if (izzieGatheredIds.length === 0) return;
                    const pick = izzieGatheredIds[izzieHudCycle % izzieGatheredIds.length];
                    setActiveMemory(pick);
                    setIzzieHudCycle((c) => c + 1);
                  }}
                >
                  <div className="hud-izzie-line">
                    <span className="izzie-icon-small" aria-hidden>👦</span>
                    <span className="hud-izzie-text">
                      <span className="hud-izzie-title">Izzie</span>
                      <span className="hud-izzie-count">{izzieGatheredCount}/3</span>
                    </span>
                  </div>
                  <span className="izzie-hud-bar" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`izzie-hud-bar-seg ${i < izzieGatheredCount ? 'filled' : ''}`}
                      />
                    ))}
                  </span>
                </button>
             </div>
          </div>

          <div className="sidebar-dynamic-area">
             <div className="sidebar-hint whimsical-font">
                 <p>Przemierzaj mglę i szukaj ikon na planszy (Kasia, Julek, Izzie). Gdy w panelu obok zapali się „Izzie” z paskiem postępu, kliknij, by zobaczyć zdjęcia.</p>
             </div>
          </div>

          <div className="dpad-container">
             <div className={`dpad ${complete ? 'hidden' : ''}`}>
                <button className="dir-btn up" onClick={() => move(0, -1)}><ArrowUp size={32} /></button>
                <div className="dpad-middle">
                  <button className="dir-btn left" onClick={() => move(-1, 0)}><ArrowLeft size={32} /></button>
                  <div className="dpad-center"><Footprints size={28} className="footprints-icon" /></div>
                  <button className="dir-btn right" onClick={() => move(1, 0)}><ArrowRight size={32} /></button>
                </div>
                <button className="dir-btn down" onClick={() => move(0, 1)}><ArrowDown size={32} /></button>
              </div>
          </div>
      </aside>

      {/* 
        ========================================
        RIGHT COLUMN: MAZE CONTENT
        ========================================
      */}
      <main className="maze-area">
        
        {/* Welcome Modal Overlay */}
        {showWelcome && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 className="whimsical-font">Witaj Babciu! 👋</h2>
              <p>
                Aby zagrać, przesuń skoczka szachowego w labiryncie.
                <br /><br />
                W mgle kryją się ikony — znaczniki <strong>Kasi</strong> (aparat), <strong>Julka</strong> (gwiazdy) oraz <strong>trzy Izzie</strong> (ten sam znacznik w trzech miejscach; w panelu liczy się postęp 0/3). Chodzi o symbole na planszy, nie o „zbieranie” rodziny.
                Odnajdź wszystkie pięć ikon na mapie; gdy zapalą się w panelu obok, drzwi do urodzinowego prezentu się otworzą.
              </p>
              <button className="modal-btn whimsical-font" onClick={() => setShowWelcome(false)}>
                <Play size={20} /> Zaczynamy! (Play)
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Memory Modals */}
        {activeMemory && (
            <MemoryModal memoryId={activeMemory} onClose={() => setActiveMemory(null)} />
        )}

        {/* Floating Clue Box */}
        <div className={`clue-box ${(complete || isGamePaused) ? 'hidden' : ''}`}>
          <div className="clue-content">
            <p className="clue-pl whimsical-font">{clue.pl}</p>
            <p className="clue-en whimsical-font" style={{fontSize: '1.1rem'}}>{clue.en}</p>
          </div>
        </div>

        {/* Celebration */}
        <div className={`balloon ${complete ? 'burst' : ''}`}>
          <h1 className="sto-lat whimsical-font">{BDAY_HEADER}</h1>
          <p className="happy-bday whimsical-font">
            {BDAY_SUB_MAIN}
            <br />
            {BDAY_SUB_LOVE}
          </p>
        </div>

        {/* The Grid Canvas */}
        <div className={`grid-container ${complete ? 'fade-out' : ''}`}>
          <div className={`board ${flashActive ? 'flash' : ''}`}>
            {GRID_MAP.map((row, y) => (
              <div key={y} className="row">
                {row.map((char, x) => (
                  <div 
                    key={`${x}-${y}`} 
                    className={getTileClasses(x, y, char)}
                    onClick={() => {
                      if (!complete && Math.abs(pos.x - x) + Math.abs(pos.y - y) === 1) {
                        move(x - pos.x, y - pos.y);
                      }
                    }}
                  >
                    {renderTileContent(char, x, y)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
