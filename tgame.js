// Simple 2D canvas game: Mr. Tanaka catches rule-breakers
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// responsive canvas: track logical CSS width/height in W/H and update on resize
let W = 1200; // CSS pixels (initial)
let H = 560;
let detentionX = W - 120;
let touchTarget = null; // pointer/touch target for mobile control

function resizeCanvas(){
  const maxWidth = 1200;
  const cssWidth = Math.min(window.innerWidth - 32, maxWidth);
  const cssHeight = Math.round(cssWidth * 560 / 1200);
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssWidth * ratio);
  canvas.height = Math.round(cssHeight * ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
  W = cssWidth; H = cssHeight; detentionX = W - 120;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let keys = {};
let score = 0;
let caughtCount = 0;
let running = false;
let lastTime = performance.now();
let spawnTimer = 0;
let debugMode = false; // toggles debug overlay (D or checkbox) // set true to start with overlay visible
const DEBUG_KEY = 'tanaka_debug';
const DEBUG_SETTINGS_KEY = 'tanaka_debug_settings';
let debugShowMironRing = true;
let debugShowTeacherRadius = true;
// load persisted debug settings if available (legacy DEBUG_KEY kept for backwards compatibility)
try{
  const raw = localStorage.getItem(DEBUG_SETTINGS_KEY);
  if(raw){ const s = JSON.parse(raw); if(typeof s.debugMode !== 'undefined') debugMode = !!s.debugMode; if(typeof s.showMironRing !== 'undefined') debugShowMironRing = !!s.showMironRing; if(typeof s.showTeacherRadius !== 'undefined') debugShowTeacherRadius = !!s.showTeacherRadius; }
  else { const dv = localStorage.getItem(DEBUG_KEY); if(dv !== null) debugMode = dv === '1' || dv === 'true'; }
}catch(e){}
function saveDebugSettings(){ try{ const s = { debugMode: !!debugMode, showMironRing: !!debugShowMironRing, showTeacherRadius: !!debugShowTeacherRadius }; localStorage.setItem(DEBUG_SETTINGS_KEY, JSON.stringify(s)); }catch(e){} }

// Level / goal variables
let level = 1;
let goalTarget = 5;
let goalProgress = 0;
let spawnInterval = 2.0; // seconds between spawns (decreases with level)
let ruleBreakerChance = 0.35; // increases with level
let studentSpeedMult = 1.0;
// Miron: special boss that appears late in a level
let miron = null; // reference to Miron entity
let mironSpawned = false; // whether Miron has appeared this level
let mironSpawnThreshold = 0.95; // fraction of goal progress when Miron appears (95%)
let mironStrengthBase = 1.0; // scales with level; updated in resetMironState()
let mironBaseSpeed = 160; // base movement speed
let mironBaseEvasion = 1.0; // base evasion multiplier
let mironRewardBase = 500; // base score reward for catching Miron

// Hideouts (areas where students can hide) -------------------
let hideouts = []; // array of {x,y,w,h,occupancy,maxOccupancy}
function generateHideouts(level){
  hideouts = [];
  const base = 2; // base number of hideouts
  const count = base + Math.floor(level/2);
  for(let i=0;i<count;i++){
    const w = 80 + Math.round(Math.random()*120);
    const h = 50 + Math.round(Math.random()*80);
    const x = 220 + Math.random()*(detentionX - 240 - w);
    const y = 40 + Math.random()*(H - 80 - h);
    const maxOcc = Math.max(1, Math.round((w*h)/600));
    hideouts.push({x,y,w,h,color:'rgba(110,122,142,0.22)', occupancy:0, maxOccupancy: maxOcc});
  }
}
function resetMironState(){ miron = null; mironSpawned = false; mironStrengthBase = 1 + (level-1)*0.2; }
function pointInRect(px,py,rect){ return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h; }




// themes for visual variety by level
const themes = [
  { name:'Classic', bg1:'#e9f0ff', bg2:'#ffffff', studentColor:'#ffd166', rulebreakerColor:'#ef476f', detentionColor:'#f1f5f9', particleColors:['#ffd166','#ef476f','#ffb4a2'], teacherGlow:'#4cc9f0' },
  { name:'Sunset', bg1:'#fff0e6', bg2:'#ffe6f0', studentColor:'#ffd166', rulebreakerColor:'#ff6b6b', detentionColor:'#fff1f2', particleColors:['#ffd166','#ff6b6b','#ffb4a2'], teacherGlow:'#ffb703' },
  { name:'Forest', bg1:'#eaf6f0', bg2:'#e6fff3', studentColor:'#bce784', rulebreakerColor:'#f94144', detentionColor:'#e8f6ef', particleColors:['#bce784','#f94144','#90be6d'], teacherGlow:'#06d6a0' },
  { name:'Night', bg1:'#1f2937', bg2:'#0b1220', studentColor:'#ffd166', rulebreakerColor:'#ff6b6b', detentionColor:'#0b1724', particleColors:['#ffd166','#ef476f','#06d6a0'], teacherGlow:'#4cc9f0' }
];
let currentTheme = themes[0];

function updateGoalBar(){ const pct = Math.min(100, Math.round((goalProgress/goalTarget)*100)); const gb = document.getElementById('goalBar'); if(gb) gb.style.width = pct + '%'; const gp = document.getElementById('goalProgress'); if(gp) gp.textContent = goalProgress; const gt = document.getElementById('goalTarget'); if(gt) gt.textContent = goalTarget;
  // Miron HUD cue: pulse the goal bar and show an alert when we reach the spawn threshold
  const ma = document.getElementById('mironAlert'); if(!mironSpawned && goalTarget > 0 && goalProgress >= Math.floor(goalTarget * mironSpawnThreshold)){
    if(gb) gb.classList.add('pulse');
    if(ma){ ma.classList.remove('hidden'); ma.classList.add('pulse'); ma.textContent = '⚠️ MIRON near!'; }
  } else {
    if(gb) gb.classList.remove('pulse');
    // if Miron already spawned, keep alert visible but change text; otherwise hide
    if(ma){ if(mironSpawned){ ma.classList.remove('hidden'); ma.classList.add('pulse'); ma.textContent = 'MIRON!'; } else { ma.classList.add('hidden'); ma.classList.remove('pulse'); } }
  } }

// update HUD DOM in a single helper so it stays in sync
function updateHUD(){ const sEl = document.getElementById('score'); if(sEl) sEl.textContent = score; const cEl = document.getElementById('caught'); if(cEl) cEl.textContent = caughtCount; const lEl = document.getElementById('level'); if(lEl) lEl.textContent = level; }

function setLevel(n){ level = n; // goal starts at 100 and doubles each level
  goalTarget = Math.round(100 * Math.pow(2, level-1)); goalProgress = 0; badCaughtThisLevel = 0; spawnInterval = Math.max(0.8, 2.0 - (level-1)*0.18); ruleBreakerChance = Math.min(0.75, 0.35 + (level-1)*0.06); studentSpeedMult = 1 + (level-1)*0.08; const levelEl = document.getElementById('level'); if(levelEl) levelEl.textContent = level; // choose theme by level
  currentTheme = themes[(level-1) % themes.length]; const themeEl = document.getElementById('themeName'); if(themeEl) themeEl.textContent = currentTheme.name; updateGoalBar(); // pre-create simple theme sprites cache
  currentTheme.sprites = currentTheme.sprites || { student: makeSprite(currentTheme.studentColor,4,36,36), rulebreaker: makeSprite(currentTheme.rulebreakerColor,4,36,36) } ; resetMironState(); generateHideouts(level); updateHUD(); }

function showOverlay(text, ms=1200, cb){ const o = document.getElementById('overlay'); if(!o){ if(cb) cb(); return; } o.textContent = text; o.classList.remove('hidden'); setTimeout(()=>{ o.classList.add('hidden'); if(cb) cb(); }, ms); }

function levelUp(){ running = false; showOverlay(`Level ${level} complete!`, 1400, ()=>{ setLevel(level+1); // spawn a few students to start the next level
  // apply Mr. Tanaka's new speed buff and show the new level briefly
  player.speed = 200 + (level-1) * 12;
  updateHUD();
  showOverlay(`Level ${level}`, 900);
  for(let i=0;i<Math.min(8,4+level); i++) spawnStudent(); running = true; }); }

// Entities
function makeSprite(color, frames=4, fw=48, fh=48){
  const c = document.createElement('canvas');
  c.width = fw * frames;
  c.height = fh;
  const ct = c.getContext('2d');
  for(let f=0; f<frames; f++){
    const x = f*fw;
    // head
    ct.fillStyle = color;
    ct.beginPath();
    ct.arc(x+fw/2, fw/2-6, 9,0,Math.PI*2); ct.fill();
    // body
    ct.fillRect(x+fw/2 - 8, fw/2+2, 16,14);
    // limbs for subtle movement
    ct.fillStyle = shadeColor(color, -12);
    if(f%2===0){
      ct.fillRect(x+fw/2 - 18, fw/2+6, 6,3);
      ct.fillRect(x+fw/2 + 12, fw/2+6, 6,3);
      ct.fillRect(x+fw/2 - 8, fw/2+16, 5,3);
      ct.fillRect(x+fw/2 + 3, fw/2+16, 5,3);
    } else {
      ct.fillRect(x+fw/2 - 14, fw/2+8, 6,3);
      ct.fillRect(x+fw/2 + 8, fw/2+4, 6,3);
      ct.fillRect(x+fw/2 - 12, fw/2+16, 5,3);
      ct.fillRect(x+fw/2 + 7, fw/2+16, 5,3);
    }
  }
  const img = new Image();
  img.src = c.toDataURL();
  return {img,fw,fh,frames};
}

function shadeColor(col, amt){
  // simple hex shade handler: expect #rrggbb
  const num = parseInt(col.slice(1),16);
  let r = (num>>16)+amt; let g = ((num>>8)&0x00FF)+amt; let b = (num&0x0000FF)+amt;
  r = Math.max(0,Math.min(255,r)); g = Math.max(0,Math.min(255,g)); b = Math.max(0,Math.min(255,b));
  const v = (r<<16) | (g<<8) | b;
  return '#'+v.toString(16).padStart(6,'0');
}

class Entity {
  constructor(x,y,r,color){ this.x=x; this.y=y; this.r=r; this.color=color; this.vx=0; this.vy=0; this.sprite=null; this.frameCount=1; this.frameIndex=0; this.frameTimer=0; this.frameW=0; this.frameH=0; this.frameInterval = 0.12; this.facing = 1; }
  updateAnimation(dt, moving=true){ if(!this.sprite) return; if(moving){ this.frameTimer += dt; if(this.frameTimer > this.frameInterval){ this.frameIndex = (this.frameIndex + 1) % this.frameCount; this.frameTimer = 0; } } else { this.frameIndex = 0; this.frameTimer = 0; } }
  draw(){
    if(this.glowColor){ ctx.save(); ctx.fillStyle = this.glowColor; ctx.beginPath(); ctx.arc(this.x,this.y,this.r + 12, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
    if(this.sprite){
      const fw = this.frameW || (this.sprite.width / this.frameCount);
      const fh = this.frameH || this.sprite.height;
      const sx = this.frameIndex * fw; const sy = 0;
      const scale = this.spriteScale || 1;
      const drawW = this.r * 2 * scale;
      const drawH = this.r * 2 * scale;
      ctx.save(); ctx.translate(this.x, this.y);
      if(this.facing < 0) ctx.scale(-1,1);
      ctx.drawImage(this.sprite, sx, sy, fw, fh, -drawW/2, -drawH/2, drawW, drawH);
      ctx.restore();
    } else {
      ctx.fillStyle=this.color; ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill();
    }
  }
}

class Player extends Entity{
  constructor(){ super(80,H/2,14,'#1a202c'); this.speed=200; this.name='Mr. Tanaka'; }
  update(dt){
    // If the user is touching/clicking and no keyboard keys are pressed, move toward touchTarget
    const anyKey = Object.values(keys).some(v => !!v);
    if(touchTarget && !anyKey){
      const dx = touchTarget.x - this.x;
      const dy = touchTarget.y - this.y;
      const dist = Math.hypot(dx,dy) || 1;
      const maxStep = this.speed * dt;
      const move = Math.min(dist, maxStep);
      this.x += (dx / dist) * move;
      this.y += (dy / dist) * move;
      // facing
      if(dx < 0) this.facing = -1; else if(dx > 0) this.facing = 1;
    } else {
      let dx=0,dy=0;
      if(keys['ArrowLeft']||keys['a']) dx=-1;
      if(keys['ArrowRight']||keys['d']) dx=1;
      if(keys['ArrowUp']||keys['w']) dy=-1;
      if(keys['ArrowDown']||keys['s']) dy=1;
      const len = Math.hypot(dx,dy) || 1;
      this.x += dx/len * this.speed * dt;
      this.y += dy/len * this.speed * dt;
    }
    // facing and animation
    const moving = Math.abs(dx) + Math.abs(dy) > 0;
    if(dx < 0) this.facing = -1; else if(dx > 0) this.facing = 1;
    this.updateAnimation(dt, moving);
    // bounds (use dynamic radius so size changes take effect)
    this.x = Math.max(this.r, Math.min(detentionX-10, this.x));
    this.y = Math.max(this.r, Math.min(H - this.r, this.y));
  }
}

class Student extends Entity{
  constructor(x,y,ruleBreaker=false){
    super(x,y,12, ruleBreaker ? '#ef476f' : '#ffd166');
    this.ruleBreaker = ruleBreaker;
    this.speed = ruleBreaker ? 70 : 40;
    this.direction = Math.random()*Math.PI*2;
    // hideout-related state
    this.hidden = false;
    this.hideTimer = 0;
    this.hideout = null;
  }
  update(dt){
    // hideout behavior (non-Miron)
    if(!this.isMiron){
      if(!this.hidden){
        // check if inside any hideout and attempt to enter
        for(const h of hideouts){
          if(pointInRect(this.x, this.y, h) && (h.occupancy < (h.maxOccupancy||999))){
            const enterProbPerSec = 0.02 + (this.ruleBreaker ? 0.03 : 0.01) + (level-1)*0.005;
            if(Math.random() < enterProbPerSec * dt){
              this.hidden = true;
              this.hideout = h;
              h.occupancy = (h.occupancy||0) + 1;
              this.vx = this.vy = 0;
              this.frameIndex = 0;
              this.hideTimer = 0;
              break;
            }
          }
        }
      } else {
        // hidden: small chance to leave each second or forced leave after timeout
        this.hideTimer += dt;
        const leaveProbPerSec = 0.06 - (this.ruleBreaker ? 0.02 : 0) - (level-1)*0.004;
        if(this.hideTimer > 8 || Math.random() < Math.max(0.01, leaveProbPerSec) * dt){
          this.hidden = false;
          if(this.hideout){ this.hideout.occupancy = Math.max(0,(this.hideout.occupancy||1)-1); this.hideout = null; }
          this.hideTimer = 0;
          this.direction = Math.random()*Math.PI*2;
        } else {
          // remain hidden - no movement, minimal animation
          this.updateAnimation(dt, false);
          return;
        }
      }
    }

    // simple wandering behavior
    this.direction += (Math.random()-0.5) * dt * 1.5;
    this.vx = Math.cos(this.direction) * this.speed;
    this.vy = Math.sin(this.direction) * this.speed;
    // Miron: evasive behavior
    if(this.isMiron){
      const dx = player.x - this.x; const dy = player.y - this.y; const dist = Math.hypot(dx,dy) || 1;
      // when player is near, Miron runs away faster; trigger distance scales with level
      const evadeTrigger = 160 + (level-1)*10;
      if(dist < evadeTrigger){
        const awayAngle = Math.atan2(-dy, -dx) + (Math.random()-0.5)*0.6;
        const evadeStrength = 1 + (this.evasion || 0.3);
        this.vx = Math.cos(awayAngle) * this.speed * evadeStrength;
        this.vy = Math.sin(awayAngle) * this.speed * evadeStrength;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // facing based on vx and animate
    if(this.vx < -0.1) this.facing = -1; else if(this.vx > 0.1) this.facing = 1;
    this.updateAnimation(dt, Math.hypot(this.vx,this.vy) > 10 && !this.caught);
    // stay inside
    if(this.x < 20) this.x = 20, this.direction = Math.random();
    if(this.x > detentionX-20) this.x = detentionX-20, this.direction = Math.random()+Math.PI;
    if(this.y < 20) this.y = 20;
    if(this.y > H-20) this.y = H-20;
  }
}

class Teacher extends Entity{
  constructor(x,y,color,name){ super(x,y,13,color); this.name=name; this.speed=110; }
  update(dt, students){
    // seek nearest rule-breaker and move toward them to help corral (ignore hidden ones)
    const rb = students.filter(s => s.ruleBreaker && !s.caught && !s.hidden);
    if(rb.length===0){ // patrol
      this.direction = (this.direction || 0) + 0.6*dt;
      this.x += Math.cos(this.direction)*30*dt;
      this.y += Math.sin(this.direction)*30*dt;
    } else {
      let nearest = rb[0];
      let minD = distance(this, nearest);
      for(const s of rb){ const d = distance(this,s); if(d<minD){ minD=d; nearest=s;} }
      // move toward nearest
      const dx = nearest.x - this.x; const dy = nearest.y - this.y;
      const dist = Math.hypot(dx,dy) || 1;
      this.x += (dx/dist)*this.speed*dt;
      this.y += (dy/dist)*this.speed*dt;
      // influence: push students away slightly when close; use power multiplier
      const power = this.power || 1;
      const influenceRadius = 40 * power;
      if(dist < influenceRadius){
        nearest.direction += (Math.random()>0.5?1:-1)*0.8*power;
        // Kawashima gives stronger redirection toward the detention side
        if(this.name === 'Kawashima'){
          const toDet = Math.atan2((50 + (students.indexOf(nearest)*26)) - nearest.y, (detentionX+40) - nearest.x);
          nearest.direction = lerpAngle(nearest.direction, toDet, 0.12*power);
        }
      }
      // face toward target
      if(dx < 0) this.facing = -1; else this.facing = 1;
    }
    this.updateAnimation(dt, true);
    // bounds
    this.x = Math.max(20, Math.min(detentionX-40, this.x));
    this.y = Math.max(20, Math.min(H-20, this.y));
  }
}

function distance(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
function lerpAngle(a,b,t){ let diff = ((b - a + Math.PI) % (Math.PI*2)) - Math.PI; return a + diff * t; }

// --- Audio helpers (WebAudio) ---
let audioCtx = null;
function ensureAudio(){ if(!audioCtx){ try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ console.warn('WebAudio not supported'); } } }
function playBeep(freq=440, time=0.08, vol=0.08){ ensureAudio(); if(!audioCtx) return; const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type = 'sine'; o.frequency.value = freq; g.gain.value = vol; o.connect(g); g.connect(audioCtx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + time); o.stop(audioCtx.currentTime + time + 0.02); }
function playLevelUpMelody(){ ensureAudio(); if(!audioCtx) return; const notes = [660,880,990]; let t = audioCtx.currentTime; for(let i=0;i<notes.length;i++){ const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type = 'triangle'; o.frequency.value = notes[i]; g.gain.value = 0.06; o.connect(g); g.connect(audioCtx.destination); o.start(t + i*0.12); g.gain.exponentialRampToValueAtTime(0.001, t + i*0.12 + 0.12); o.stop(t + i*0.12 + 0.14); } }

// Miron audio/taunt cue (short descending motif)
function playMironTaunt(){ ensureAudio(); if(!audioCtx) return; const t = audioCtx.currentTime; const freqs = [1200,900,700]; for(let i=0;i<freqs.length;i++){ const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type = 'sawtooth'; o.frequency.value = freqs[i]; g.gain.value = 0.06 - i*0.015; o.connect(g); g.connect(audioCtx.destination); o.start(t + i*0.08); g.gain.exponentialRampToValueAtTime(0.001, t + i*0.08 + 0.12); o.stop(t + i*0.08 + 0.14); } }

// --- Particle system ---
const particles = [];
class Particle{ constructor(x,y,vx,vy,life,color,r){ this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.life=life; this.maxLife=life; this.color=color; this.r=r; } update(dt){ this.x += this.vx * dt; this.y += this.vy * dt; this.vy += 60 * dt; this.life -= dt; } draw(ctx){ const a = Math.max(0, this.life/this.maxLife); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill(); ctx.restore(); } }
function emitParticles(x,y,colors,count=20){ for(let i=0;i<count;i++){ const ang = Math.random()*Math.PI*2; const sp = 80 + Math.random()*120; const vx = Math.cos(ang)*sp; const vy = Math.sin(ang)*sp * -0.6; const color = colors[Math.floor(Math.random()*colors.length)]; const r = 2 + Math.random()*3; particles.push(new Particle(x,y,vx,vy,0.8 + Math.random()*0.8,color,r)); } }
function updateParticles(dt){ for(let i=particles.length-1;i>=0;i--){ particles[i].update(dt); if(particles[i].life <= 0) particles.splice(i,1); } }
function drawParticles(ctx){ for(const p of particles) p.draw(ctx); }

// create simple sprite sheets for characters
const sprites = {
  tanaka: makeSprite('#1a202c',4,48,48),
  student: makeSprite('#ffd166',4,36,36),
  rulebreaker: makeSprite('#ef476f',4,36,36),
  teacher1: makeSprite('#4cc9f0',4,40,40),
  teacher2: makeSprite('#06d6a0',4,40,40),
  miron: makeSprite('#7b1fa2',4,44,44)
};

const player = new Player();
player.sprite = sprites.tanaka.img; player.frameCount = sprites.tanaka.frames; player.frameW = sprites.tanaka.fw; player.frameH = sprites.tanaka.fh; player.frameInterval = 0.12;
// Make Mr. Tanaka larger and highlighted
player.r = 22; // larger than Kawashima (18)
player.glowColor = 'rgba(255,215,0,0.28)'; // gold highlight
player.frameInterval = 0.10;
let students = [];
const teachers = [ new Teacher(160,80,'#4cc9f0','Kawashima'), new Teacher(160,H-80,'#06d6a0','Fukahori') ];
// Kawashima: more visible and powerful helper
teachers[0].sprite = sprites.teacher1.img; teachers[0].frameCount = sprites.teacher1.frames; teachers[0].frameW = sprites.teacher1.fw; teachers[0].frameH = sprites.teacher1.fh; teachers[0].frameInterval = 0.10;
teachers[0].speed = 150;
teachers[0].r = 18;
teachers[0].power = 1.6;
teachers[0].glowColor = 'rgba(76,201,240,0.25)';
teachers[1].sprite = sprites.teacher2.img; teachers[1].frameCount = sprites.teacher2.frames; teachers[1].frameW = sprites.teacher2.fw; teachers[1].frameH = sprites.teacher2.fh; teachers[1].frameInterval = 0.14; teachers[1].r = 15; teachers[1].glowColor = 'rgba(6,214,160,0.18)';

function spawnStudent(){
  // avoid spawning inside hideouts by retrying a few times
  let y, x; let tries = 0;
  do{ y = 40 + Math.random()*(H-80); x = 220 + Math.random()*(detentionX-240); tries++; }while(tries < 8 && hideouts.some(h => pointInRect(x,y,h)));
  const ruleBreaker = Math.random() < ruleBreakerChance; // depends on level
  const s = new Student(x,y,ruleBreaker);
  // scale speed slightly with level
  s.speed *= studentSpeedMult;
  // assign theme-aware sprites/colors
  if(ruleBreaker){ if(currentTheme.sprites && currentTheme.sprites.rulebreaker){ s.sprite = currentTheme.sprites.rulebreaker.img; s.frameCount = currentTheme.sprites.rulebreaker.frames; s.frameW = currentTheme.sprites.rulebreaker.fw; s.frameH = currentTheme.sprites.rulebreaker.fh; } else { s.sprite = sprites.rulebreaker.img; s.frameCount = sprites.rulebreaker.frames; s.frameW = sprites.rulebreaker.fw; s.frameH = sprites.rulebreaker.fh; } s.color = currentTheme.rulebreakerColor; s.frameInterval = 0.16; } else { if(currentTheme.sprites && currentTheme.sprites.student){ s.sprite = currentTheme.sprites.student.img; s.frameCount = currentTheme.sprites.student.frames; s.frameW = currentTheme.sprites.student.fw; s.frameH = currentTheme.sprites.student.fh; } else { s.sprite = sprites.student.img; s.frameCount = sprites.student.frames; s.frameW = sprites.student.fw; s.frameH = sprites.student.fh; } s.color = currentTheme.studentColor; s.frameInterval = 0.18; }
  students.push(s);
}

function spawnMiron(){
  if(mironSpawned || goalProgress >= goalTarget) return;
  const y = 40 + Math.random()*(H-80);
  const x = 220 + Math.random()*(detentionX-240);
  const s = new Student(x,y,true);
  s.isMiron = true;
  s.name = 'MIRON';
  s.color = '#7b1fa2';
  s.sprite = sprites.miron.img; s.frameCount = sprites.miron.frames; s.frameW = sprites.miron.fw; s.frameH = sprites.miron.fh; s.frameInterval = 0.08;
  // Miron is harder: smaller hitbox, faster, and stronger evasion behavior scaling with level
  s.r = 10;
  s.speed = mironBaseSpeed * (1 + (level-1)*0.12) * mironStrengthBase;
  s.evasion = mironBaseEvasion + (level-1)*0.14 * mironStrengthBase;
  // Make Miron visually larger than all other entities; scale sprite rendering to match
  s.r = 36;
  s.glowColor = 'rgba(123,31,162,0.18)';
  // increase Miron's sprite scale by adjusting draw size later via a property
  s.spriteScale = 1.6;
  miron = s;
  students.push(s);
  mironSpawned = true;
  // notify player with overlay, taunt, and particle flourish
  showOverlay('MIRON has appeared!', 1400);
  playMironTaunt();
  playBeep(1000, 0.12, 0.06);
  emitParticles(x,y, currentTheme.particleColors, 30);
  // update HUD indicator immediately
  const ma = document.getElementById('mironAlert'); if(ma){ ma.classList.remove('hidden'); ma.classList.add('pulse'); ma.textContent = 'MIRON!'; }
}

// collisions and catching
function checkCollisions(){
  for(const s of students){
    if(s.caught) continue;
    if(s.hidden) continue; // hidden students cannot be caught
    if(distance(player,s) < player.r + s.r){
      if(s.ruleBreaker){
        // caught: send to detention
        s.caught = true;
        s.caughtAt = performance.now();
        s.color = '#9aa0a6';
        // animate to detention area
        s.vx = (detentionX + 40 - s.x) * 0.02;
        s.vy = (50 + (caughtCount*26) - s.y) * 0.02;
        // Miron special case
        if(s.isMiron){
          // big reward (scales with level) and complete the goal
          score += Math.round(mironRewardBase * mironStrengthBase);
          caughtCount += 1;
          updateHUD();
          playLevelUpMelody();
          emitParticles(s.x, s.y, currentTheme.particleColors, 80);
          goalProgress = goalTarget;
          updateGoalBar();
          // hide HUD alert if present
          const ma = document.getElementById('mironAlert'); if(ma){ ma.classList.add('hidden'); ma.classList.remove('pulse'); }
          // small delay then levelUp
          setTimeout(()=>{ levelUp(); }, 200);
        } else {
          // award fixed points
          score += 100;
          caughtCount += 1;
          // reflect updated values in HUD
          updateHUD();
          // small feedback: play catch sound and particle burst at student
          try{ playBeep(800 + Math.random()*200, 0.08, 0.06); }catch(e){}
          emitParticles(s.x, s.y, currentTheme.particleColors, 14);
          // goal progress and level up check
          goalProgress += 1;
          updateGoalBar();
          if(goalProgress >= goalTarget){ // level up: play melody and big particles
            playLevelUpMelody();
            emitParticles(W/2, H/2, currentTheme.particleColors, 60);
            levelUp();
          }
        }
      } else {
        // student who obeys: friendly warning (no punishment)
        score = Math.max(0, score-10);
        updateHUD();
      }
    }
    // teachers can also tag rule-breakers indirectly by influencing them
  }
}

function update(dt){
  if(!running) return;
  lastTime += dt;
  // spawn logic
  spawnTimer += dt;
  if(spawnTimer > spawnInterval){ spawnTimer = 0; spawnStudent(); }
  // update entities
  player.update(dt);
  for(const t of teachers){ t.update(dt, students); }
  for(const s of students){
    if(s.caught){ // move toward detention
      s.x += (detentionX + 40 - s.x) * 0.1 * dt * 60;
      s.y += (50 + (students.indexOf(s)*26) - s.y) * 0.1 * dt * 60;
    } else {
      s.update(dt);
    }
  }
  checkCollisions();
  // spawn Miron when we're close to the goal (configurable threshold)
  if(!mironSpawned && goalTarget > 0 && goalProgress >= Math.floor(goalTarget * mironSpawnThreshold)){
    spawnMiron();
  }
  updateParticles(dt);
}

function draw(){
  // background theme
  ctx.clearRect(0,0,W,H);
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, currentTheme.bg1);
  g.addColorStop(1, currentTheme.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0,0,detentionX, H);
  // detention zone
  ctx.fillStyle = currentTheme.detentionColor || '#f1f5f9';
  ctx.fillRect(detentionX, 0, W-detentionX, H);
  ctx.fillStyle = currentTheme.detentionTextColor || '#888';
  ctx.font = '14px sans-serif';
  ctx.fillText('Detention', detentionX+18, 22);

  // hideouts (background interactive areas)
  for(const h of hideouts){
    ctx.fillStyle = h.color || 'rgba(110,122,142,0.22)';
    ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.strokeStyle = 'rgba(80,90,100,0.18)';
    ctx.strokeRect(h.x, h.y, h.w, h.h);
    if(h.occupancy){ ctx.fillStyle = '#222'; ctx.font = '12px sans-serif'; ctx.fillText(`● ${h.occupancy}`, h.x + 8, h.y + 16); }
  }

  // particles (behind entities)
  drawParticles(ctx);

  // students (hidden ones drawn faint)
  for(const s of students){
    if(s.hidden){ ctx.save(); ctx.globalAlpha = 0.18; s.draw(); ctx.restore(); } else { s.draw(); } 
  }
  // teachers
  for(const t of teachers) t.draw();
  // teacher labels
  for(const t of teachers){ ctx.fillStyle = '#222'; ctx.font = '12px sans-serif'; let txt = t.name + (t.power && t.power > 1 ? ' ★' : ''); if(t.name === 'Fukahori') txt += ' ✨'; ctx.fillText(txt, t.x - ctx.measureText(txt).width/2, t.y - t.r - 8); }
  // player label (visible name)
  (function(){
    const label = 'TANAKA BOSS';
    ctx.font = 'bold 14px sans-serif';
    // outline for readability
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.textAlign = 'center';
    ctx.strokeText(label, player.x, player.y - player.r - 10);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(label, player.x, player.y - player.r - 10);
    // restore defaults
    ctx.textAlign = 'start';
    ctx.lineWidth = 1;
  })();

  // Miron label (if present) with pulsing ring
  if(miron){
    // pulsing ring for visual cue (respect debug flag)
    if(debugShowMironRing){ const tPulse = performance.now() / 300; const rad = miron.r + 6 + Math.abs(Math.sin(tPulse)) * 8; ctx.save(); ctx.beginPath(); ctx.strokeStyle = 'rgba(123,31,162,0.16)'; ctx.lineWidth = 6; ctx.arc(miron.x, miron.y, rad, 0, Math.PI*2); ctx.stroke(); ctx.restore(); }
    ctx.font = 'bold 13px sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.textAlign = 'center'; ctx.strokeText('MIRON', miron.x, miron.y - miron.r - 10); ctx.fillStyle = '#ff6bcb'; ctx.fillText('MIRON', miron.x, miron.y - miron.r - 10); ctx.textAlign = 'start'; ctx.lineWidth = 1;
  }
  // player
  player.draw();

  // overlays
  // highlight rule-breakers (tinted by theme)
  for(const s of students){ if(s.ruleBreaker && !s.caught){ ctx.strokeStyle = 'rgba(255,0,80,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x,s.y,s.r+6,0,Math.PI*2); ctx.stroke(); } }

  // HUD
  ctx.fillStyle = '#000';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Score: ${score}`, 8, 16);
  ctx.fillText(`Caught: ${caughtCount}`, 8, 32);
  // debug overlay drawn on top when enabled
  drawDebugOverlay();
}

function gameLoop(ts){
  const dt = Math.min(0.05, (ts - lastTime)/1000);
  if(running){
    update(dt);
    draw();
  } else {
    // draw even if paused so player sees last state
    draw();
  }
  requestAnimationFrame(gameLoop);
}

// timer tick
// Timer disabled: game is no longer time-limited. (Previously updated every second.)

function startGame(){
  // reset values
  score = 0; caughtCount=0; students = []; spawnTimer=0; running=true; document.getElementById('score').textContent = score; document.getElementById('caught').textContent = caughtCount;
  // level setup
  setLevel(1);
  // ensure player gets the level buff and show level briefly
  player.speed = 200 + (level-1) * 12;
  showOverlay(`Level ${level}`, 900);
  // spawn initial students
  for(let i=0;i<6;i++) spawnStudent();
}

function endGame(){ running=false; updateHUD(); showOverlay(`Time's up! Score: ${score}`, 1600); // show modal to save score
  const fs = document.getElementById('finalScore'); if(fs) fs.textContent = score; const fl = document.getElementById('finalLevel'); if(fl) fl.textContent = level; const modal = document.getElementById('scoreModal'); if(modal){ modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); document.getElementById('playerName').focus(); } }

function resetGame(){ running=false; score=0; caughtCount=0; students=[]; player.x=80; player.y=H/2; setLevel(1); player.speed = 200 + (level-1) * 12; showOverlay(`Level ${level}`, 700); document.getElementById('score').textContent = score; document.getElementById('caught').textContent = caughtCount; updateGoalBar(); updateHUD(); draw(); }

// input handlers
window.addEventListener('keydown', (e)=>{ // toggle debug with 'D'
  if(e.key === 'd' || e.key === 'D'){ debugMode = !debugMode; const chk = document.getElementById('debugToggle'); if(chk) chk.checked = debugMode; saveDebugSettings(); }
  keys[e.key] = true;
});
window.addEventListener('keyup', (e)=>{ keys[e.key] = false; });

// Pointer (mouse/touch) controls for mobile: set a target position to move toward
canvas.addEventListener('pointerdown', (e)=>{
  e.preventDefault(); const r = canvas.getBoundingClientRect(); touchTarget = { x: e.clientX - r.left, y: e.clientY - r.top };
});
canvas.addEventListener('pointermove', (e)=>{ if(!touchTarget) return; e.preventDefault(); const r = canvas.getBoundingClientRect(); touchTarget.x = e.clientX - r.left; touchTarget.y = e.clientY - r.top; });
canvas.addEventListener('pointerup', (e)=>{ e.preventDefault(); touchTarget = null; });
canvas.addEventListener('pointercancel', ()=>{ touchTarget = null; });
canvas.addEventListener('contextmenu', (e)=>{ e.preventDefault(); });

// UI bindings
document.getElementById('startBtn').addEventListener('click', ()=>{ if(!running){ ensureAudio(); startGame(); } });
document.getElementById('resetBtn').addEventListener('click', ()=>{ resetGame(); });
document.getElementById('showHighScoresBtn').addEventListener('click', ()=>{ updateHighScoreList(); });
// debug checkbox binding (keeps checkbox and key 'D' in sync)
const debugToggleEl = document.getElementById('debugToggle'); if(debugToggleEl){ debugToggleEl.checked = debugMode; debugToggleEl.addEventListener('change', ()=>{ debugMode = debugToggleEl.checked; saveDebugSettings(); }); }
const debugMironEl = document.getElementById('debugMironRing'); if(debugMironEl){ debugMironEl.checked = !!debugShowMironRing; debugMironEl.addEventListener('change', ()=>{ debugShowMironRing = debugMironEl.checked; saveDebugSettings(); }); }
const debugTeacherEl = document.getElementById('debugTeacherRadius'); if(debugTeacherEl){ debugTeacherEl.checked = !!debugShowTeacherRadius; debugTeacherEl.addEventListener('change', ()=>{ debugShowTeacherRadius = debugTeacherEl.checked; saveDebugSettings(); }); }

// score modal bindings
document.getElementById('saveScoreBtn').addEventListener('click', ()=>{ const nameEl = document.getElementById('playerName'); const name = (nameEl && nameEl.value.trim()) ? nameEl.value.trim() : 'Player'; saveHighScore(name, score, level); const modal = document.getElementById('scoreModal'); if(modal){ modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); } updateHighScoreList(); });
document.getElementById('closeScoreModalBtn').addEventListener('click', ()=>{ const modal = document.getElementById('scoreModal'); if(modal){ modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); } });

// high score helpers
const HS_KEY = 'tanaka_highscores';
function getHighScores(){ try{ return JSON.parse(localStorage.getItem(HS_KEY) || '[]'); }catch(e){ return []; } }
function saveHighScore(name, sc, lvl){ const arr = getHighScores(); arr.push({ name, score: sc, level: lvl, date: Date.now() }); arr.sort((a,b)=>b.score - a.score); const top = arr.slice(0,10); localStorage.setItem(HS_KEY, JSON.stringify(top)); }
function updateHighScoreList(){ const list = document.getElementById('highScoreList'); if(!list) return; const arr = getHighScores(); list.innerHTML = ''; if(arr.length===0){ list.innerHTML = '<li>No scores yet</li>'; return; } for(const it of arr){ const li = document.createElement('li'); li.textContent = `${it.name} — ${it.score} (L${it.level})`; list.appendChild(li); } }

// keep HUD updated
const hudTicker = setInterval(()=>{ updateHUD(); }, 200);

// Debug overlay draws entity radii, teacher influence, hideout occupancy, and miron spawn info
function drawDebugOverlay(){ if(!debugMode) return; ctx.save(); ctx.globalAlpha = 0.95; ctx.font = '12px monospace'; ctx.fillStyle = 'rgba(0,0,0,0.8)'; const rbCount = students.filter(s=>s.ruleBreaker && !s.hidden).length; const hiddenCount = students.filter(s=>s.hidden).length; const lines = [ `Debug: ${students.length} students (RB:${rbCount}, hidden:${hiddenCount})`, `Level:${level} Miron@${Math.round(mironSpawnThreshold*100)}% (${mironSpawned? 'spawned' : 'pending'})`, `SpawnInterval:${spawnInterval.toFixed(2)}s`, `MironRing:${debugShowMironRing? 'on':'off'}`, `TeacherRadius:${debugShowTeacherRadius? 'on':'off'}` ]; for(let i=0;i<lines.length;i++){ ctx.fillText(lines[i], 12, 16 + i*14); }
  // draw player radius
  ctx.strokeStyle = 'rgba(255,215,0,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI*2); ctx.stroke(); ctx.fillStyle='rgba(255,215,0,0.9)'; ctx.fillText(`Player r=${player.r}`, player.x + player.r + 6, player.y);
  // draw students
  for(const s of students){ if(s.hidden){ ctx.strokeStyle='rgba(120,120,120,0.35)'; } else if(s.ruleBreaker){ ctx.strokeStyle='rgba(255,0,80,0.9)'; } else { ctx.strokeStyle='rgba(0,120,220,0.6)'; } ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 6, 0, Math.PI*2); ctx.stroke(); if(s.isMiron){ ctx.strokeStyle='rgba(123,31,162,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, s.r+20, 0, Math.PI*2); ctx.stroke(); ctx.fillStyle='rgba(60,0,80,0.9)'; ctx.fillText('MIRON', s.x + s.r + 6, s.y); } }
  // teachers influence radius (optional)
  if(debugShowTeacherRadius){ for(const t of teachers){ const p = t.power || 1; const inf = 40 * p; ctx.strokeStyle='rgba(6,214,160,0.32)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(t.x,t.y,inf,0,Math.PI*2); ctx.stroke(); ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillText(`${t.name} r=${Math.round(inf)}`, t.x + inf + 6, t.y - 2); } }
  // hideouts occupancy
  for(const h of hideouts){ ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(h.x - 1, h.y - 1, h.w + 2, h.h + 2); ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillText(`occ:${h.occupancy}/${h.maxOccupancy}`, h.x + 6, h.y + 14); }
  ctx.restore(); }

requestAnimationFrame(gameLoop);
setLevel(1);
// draw initial state
draw();
