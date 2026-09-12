const tracks = [['The Ultimate Bus Driver Playlist', 'Authorized local MP3 · continuous mix', '23:02']];
let index = 0, playing = false, audioCtx;
const $ = (s) => document.querySelector(s);
const title = $('#song-title'), artist = $('#song-artist'), year = $('#song-year'), number = $('#track-number'), play = $('#play'), status = $('#playback-status');
const previewAudio = $('#preview-audio'), hornAudio = $('#horn-audio');
let hornRestoreTimer;

function showToast(message) {
  const t = $('#toast');
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function updateTrack() {
  const [t, a, y] = tracks[index];
  title.textContent = t;
  artist.textContent = a;
  year.textContent = y;
  number.textContent = String(index + 1).padStart(3, '0');
  $('#track-total').textContent = String(tracks.length).padStart(3, '0');
  play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${t}`);
}

function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function tone(freq, duration, volume = .08, type = 'sine', offset = 0, destination) {
  const ctx = getAudio(), o = ctx.createOscillator(), g = ctx.createGain(), at = ctx.currentTime + offset;
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(.0001, at);
  g.gain.exponentialRampToValueAtTime(volume, at + .018);
  g.gain.exponentialRampToValueAtTime(.0001, at + duration);
  o.connect(g).connect(destination || ctx.destination);
  o.start(at);
  o.stop(at + duration + .03);
}

async function loadCurrentPreview(announce = false) {
  if (announce) status.textContent = 'LOADING AUTHORIZED MIX…';
  return true;
}

function setPlayingState(isPlaying) {
  playing = isPlaying;
  play.classList.toggle('playing', isPlaying);
  document.querySelector('.music-panel').classList.toggle('is-playing', isPlaying);
  status.textContent = isPlaying ? 'TUNED IN · FULL LOCAL MIX' : 'PAUSED AT MILE MARKER';
  play.setAttribute('aria-label', `${isPlaying ? 'Pause' : 'Play'} ${tracks[index][0]}`);
  if (window.roadSim) window.roadSim.setPlaying(isPlaying);
}

async function togglePlay() {
  try {
    if (playing) {
      previewAudio.pause();
      setPlayingState(false);
      return;
    }
    const ready = await loadCurrentPreview(true);
    if (!ready) return;
    await previewAudio.play();
    setPlayingState(true);
  } catch (error) {
    playing = false;
    status.textContent = 'AUDIO UNAVAILABLE';
    showToast('The local mix could not be played.');
  }
}

async function move(amount) {
  if (tracks.length === 1) {
    showToast('Add timestamps to unlock exact previous / next tracks.');
    return;
  }
  const continuePlaying = playing;
  previewAudio.pause();
  setPlayingState(false);
  index = (index + amount + tracks.length) % tracks.length;
  updateTrack();
  showToast(amount > 0 ? 'Next cassette loaded' : 'Previous cassette loaded');
  try {
    await loadCurrentPreview(continuePlaying);
    if (continuePlaying) {
      await previewAudio.play();
      setPlayingState(true);
    }
  } catch {
    status.textContent = 'PREVIEW UNAVAILABLE · TRY ANOTHER TRACK';
  }
}

$('#play').addEventListener('click', togglePlay);
$('#previous').addEventListener('click', () => move(-1));
$('#next').addEventListener('click', () => move(1));

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'BUTTON') return;
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  }
  if (e.key === 'ArrowRight') move(1);
  if (e.key === 'ArrowLeft') move(-1);
});

function setMusicVolume(volume, duration = 180) {
  const from = previewAudio.volume, started = performance.now();
  cancelAnimationFrame(setMusicVolume.frame);
  const fade = (now) => {
    const progress = Math.min(1, (now - started) / duration);
    previewAudio.volume = from + (volume - from) * progress;
    if (progress < 1) setMusicVolume.frame = requestAnimationFrame(fade);
  };
  setMusicVolume.frame = requestAnimationFrame(fade);
}

function restoreMusic() {
  clearTimeout(hornRestoreTimer);
  setMusicVolume(.95, 520);
  $('#roadways-horn').classList.remove('active');
}

async function playRoadwaysHorn() {
  try {
    if (window.roadSim) window.roadSim.triggerHorn();
    if (!hornAudio.paused) {
      hornAudio.pause();
      hornAudio.currentTime = 0;
      restoreMusic();
      return;
    }
    clearTimeout(hornRestoreTimer);
    $('#roadways-horn').classList.add('active');
    if (!previewAudio.paused) setMusicVolume(.18, 120);
    hornAudio.pause();
    hornAudio.currentTime = 0;
    hornAudio.volume = 1;
    await hornAudio.play();
  } catch {
    showToast('Horn audio could not be played.');
    restoreMusic();
  }
}

$('#roadways-horn').addEventListener('click', playRoadwaysHorn);
hornAudio.addEventListener('ended', restoreMusic);

const hints = {
  ignition: 'Engine idling. The route is ready.',
  headlights: 'Headlamps cut a warm lane through the rain.',
  wipers: 'Wipers are keeping the windscreen clear.',
  hazards: 'Four-way indicators are flashing for traffic.',
};

document.querySelectorAll('.system-button').forEach(b => b.addEventListener('click', () => {
  b.classList.toggle('on');
  const on = b.classList.contains('on');
  const id = b.id;
  $('#drive-hint').textContent = on ? hints[id] : 'System switched off.';
  if (id === 'ignition') {
    $('#drive-state').textContent = on ? 'HIGHWAY SPEED (80 KM/H)' : 'IGNITION OFF';
    if (window.roadSim) window.roadSim.setIgnition(on);
  }
  if (id === 'wipers') {
    $('.rain-layer').classList.toggle('wipers-on', on);
    if (window.roadSim) window.roadSim.setWipers(on);
  }
  if (id === 'hazards') {
    document.querySelector('.status-dot').style.background = on ? '#ffb12f' : '';
  }
  if (id === 'headlights') {
    document.querySelector('.cockpit-photo').style.filter = on ? 'brightness(1.14) saturate(1.08)' : '';
    if (window.roadSim) window.roadSim.setHeadlights(on);
  }
}));

previewAudio.addEventListener('ended', () => { if (playing) move(1); });
previewAudio.addEventListener('error', () => {
  if (playing) {
    setPlayingState(false);
    status.textContent = 'LOCAL AUDIO UNAVAILABLE';
  }
});
$('#catalog').addEventListener('click', () => showToast('Full authorized 23-minute mix loaded.'));
updateTrack();

/* ==========================================================================
   HIGHWAY ROAD TRAFFIC & RUNNING BUS SIMULATION ENGINE
   ========================================================================== */
class RoadHighwaySimulation {
  constructor() {
    this.canvas = document.getElementById('highway-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.photo = document.querySelector('.cockpit-photo');

    // Simulation state
    this.ignitionOn = false;
    this.musicPlaying = false;
    this.headlightsOn = false;
    this.wipersOn = false;
    this.hornFlash = 0;

    this.currentSpeed = 75; // Highway running speed in km/h
    this.targetSpeed = 75;
    this.roadOffset = 0;
    this.time = 0;

    // Windshield wiper simulation
    this.wiperAngle = 0;
    this.wiperDir = 1;

    // Traffic entities
    this.initTraffic();

    // Resize handling
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();

    // Start render loop
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initTraffic() {
    // 1. The Running Indian Roadways Bus (lead bus ahead of us)
    this.bus = {
      x: 0.73,           // lane X (0 to 1 relative to cover image)
      targetX: 0.73,
      baseX: 0.73,
      passX: 0.54,       // overtaking lane
      z: 0.44,           // perspective depth (0.1 distant to 0.9 close)
      targetZ: 0.44,
      width: 0.16,
      height: 0.13,
      indicator: 'none', // 'none', 'right', 'left'
      indicatorFlash: 0,
      brakeLight: false,
      chassisBounce: 0,
      sway: 0,
      exhaustPuffs: [],
      // Overtaking state machine: 0: cruising, 1: signaling & moving out, 2: passing, 3: signaling & merging back
      state: 0,
      stateTimer: 3.5,
      speedFactor: 1.0
    };

    // 2. Overtaken Traffic (running ahead of bus in middle lane, moving slower)
    this.slowerTraffic = [
      {
        id: 'truck',
        type: 'tata-truck',
        name: 'HORN OK PLEASE',
        x: 0.64,
        z: 0.32,
        speed: 48,
        color: '#b23420',
        active: true
      },
      {
        id: 'tempo',
        type: 'tempo',
        name: 'DELIVERY TEMPO',
        x: 0.70,
        z: -0.5, // starts far ahead
        speed: 52,
        color: '#e2d8c3',
        active: false
      }
    ];

    // 3. Oncoming Vehicles (in opposite left lane rushing towards camera)
    this.oncomingTraffic = [
      {
        id: 'oncoming-1',
        type: 'oncoming-bus',
        x: 0.34,
        z: 0.05,
        speed: 130, // relative passing speed
        headlightColor: '#ffeaad',
        timer: 1.2
      }
    ];

    // Passing highway streetlights
    this.streetlights = [
      { z: 0.15 },
      { z: 0.45 },
      { z: 0.75 }
    ];
  }

  handleResize() {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  getCoverRect() {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const imgRatio = 1672 / 941;
    const screenRatio = cw / ch;
    let w, h, x, y;

    if (screenRatio > imgRatio) {
      w = cw;
      h = cw / imgRatio;
      x = 0;
      y = (ch - h) / 2;
    } else {
      h = ch;
      w = ch * imgRatio;
      x = (cw - w) / 2;
      y = 0;
    }
    return { x, y, w, h };
  }

  setIgnition(on) {
    this.ignitionOn = on;
    this.updateRunState();
  }

  setPlaying(playing) {
    this.musicPlaying = playing;
    this.updateRunState();
  }

  setHeadlights(on) {
    this.headlightsOn = on;
  }

  setWipers(on) {
    this.wipersOn = on;
  }

  triggerHorn() {
    this.hornFlash = 1.0;
  }

  updateRunState() {
    const isRunning = this.ignitionOn || this.musicPlaying;
    if (this.photo) this.photo.classList.toggle('bus-running', isRunning);
    if (this.canvas) this.canvas.classList.toggle('bus-running', isRunning);
    this.targetSpeed = isRunning ? 82 : 65; // Always keeps dynamic highway movement
  }

  animate(now) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.time += dt;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.animate);
  }

  update(dt) {
    // Smooth speed transitions
    this.currentSpeed += (this.targetSpeed - this.currentSpeed) * (dt * 2.5);
    const speedRatio = this.currentSpeed / 80;

    // Road dashed line scrolling
    this.roadOffset = (this.roadOffset + speedRatio * dt * 2.4) % 1.0;

    // Horn flash decay
    if (this.hornFlash > 0) {
      this.hornFlash = Math.max(0, this.hornFlash - dt * 2.8);
    }

    // Wiper blade sweep animation
    if (this.wipersOn) {
      this.wiperAngle += this.wiperDir * dt * 4.2;
      if (this.wiperAngle >= 1.0) {
        this.wiperAngle = 1.0;
        this.wiperDir = -1;
      } else if (this.wiperAngle <= 0.0) {
        this.wiperAngle = 0.0;
        this.wiperDir = 1;
      }
    }

    // Streetlights moving forward
    this.streetlights.forEach(light => {
      light.z += speedRatio * dt * 0.45;
      if (light.z > 1.0) light.z -= 1.0;
    });

    // -----------------------------------------------------------------
    // THE RUNNING ROADWAYS BUS - DRIVING & OVERTAKING LOGIC
    // -----------------------------------------------------------------
    const bus = this.bus;
    bus.chassisBounce = Math.sin(this.time * 16) * 0.0018 + (Math.random() - 0.5) * 0.0008;
    bus.sway = Math.sin(this.time * 2.2) * 0.004;

    // Exhaust smoke puffs
    if (Math.random() < 0.35) {
      bus.exhaustPuffs.push({
        x: bus.x - 0.035,
        y: 0.53 + bus.chassisBounce,
        scale: 0.015,
        opacity: 0.45,
        vx: (Math.random() - 0.5) * 0.01,
        vy: -0.01 - Math.random() * 0.01
      });
    }

    // Update exhaust puffs
    for (let i = bus.exhaustPuffs.length - 1; i >= 0; i--) {
      const p = bus.exhaustPuffs[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.scale += dt * 0.04;
      p.opacity -= dt * 0.5;
      if (p.opacity <= 0) bus.exhaustPuffs.splice(i, 1);
    }

    // Indicator flashing
    bus.indicatorFlash = (bus.indicatorFlash + dt * 4.5) % 1.0;

    // Overtaking State Machine:
    // Slower truck ahead is at this.slowerTraffic[0]
    const leadTruck = this.slowerTraffic[0];

    bus.stateTimer -= dt;
    switch (bus.state) {
      case 0: // Cruising in right lane behind lead traffic
        bus.targetX = bus.baseX;
        bus.indicator = 'none';
        bus.brakeLight = false;
        // As distance closes to truck, initiate overtake
        if (leadTruck.z < 0.42 && bus.stateTimer <= 0) {
          bus.state = 1; // Signal & pull out
          bus.stateTimer = 1.2;
          bus.indicator = 'right';
          bus.brakeLight = true;
        }
        break;

      case 1: // Pulling out into overtaking lane
        bus.targetX = bus.passX;
        bus.indicator = 'right';
        if (bus.stateTimer <= 0.8) bus.brakeLight = false;
        if (Math.abs(bus.x - bus.passX) < 0.02 || bus.stateTimer <= 0) {
          bus.state = 2; // Accelerating past truck
          bus.stateTimer = 3.2;
          bus.indicator = 'none';
        }
        break;

      case 2: // Passing and crossing the truck!
        bus.targetX = bus.passX;
        // Truck falls behind as bus powers past it
        leadTruck.z += dt * 0.12;
        if (leadTruck.z > bus.z + 0.18 || bus.stateTimer <= 0) {
          bus.state = 3; // Cross complete, signaling to merge back
          bus.stateTimer = 1.4;
          bus.indicator = 'left';
        }
        break;

      case 3: // Merging back into the cruising lane
        bus.targetX = bus.baseX;
        bus.indicator = 'left';
        if (Math.abs(bus.x - bus.baseX) < 0.02 || bus.stateTimer <= 0) {
          bus.state = 0; // Back to cruising
          bus.stateTimer = 5.0; // Cruise before next overtake
          bus.indicator = 'none';
          // Reset truck ahead for continuous highway action
          leadTruck.z = 0.26;
          leadTruck.x = 0.65;
        }
        break;
    }

    // Smooth lane steering interpolation
    bus.x += (bus.targetX - bus.x) * (dt * 2.2);

    // -----------------------------------------------------------------
    // ONCOMING TRAFFIC IN OPPOSITE LANE (Rushing Towards Camera)
    // -----------------------------------------------------------------
    this.oncomingTraffic.forEach(veh => {
      veh.z += speedRatio * dt * 0.78;
      if (veh.z > 1.15) {
        veh.z = 0.04; // Respawn at horizon
        veh.x = 0.33 + (Math.random() - 0.5) * 0.04;
      }
    });
  }

  render() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const rect = this.getCoverRect();
    const toX = (nx) => rect.x + nx * rect.w;
    const toY = (ny) => rect.y + ny * rect.h;
    const toScaleW = (nw) => nw * rect.w;
    const toScaleH = (nh) => nh * rect.h;

    ctx.save();

    // 1. Precise Windshield Clipping Mask matching the cockpit photo
    ctx.beginPath();
    ctx.moveTo(toX(0.115), toY(0.030));
    ctx.lineTo(toX(0.500), toY(0.025));
    ctx.lineTo(toX(0.920), toY(0.035));
    ctx.lineTo(toX(0.922), toY(0.575));
    ctx.lineTo(toX(0.540), toY(0.575));
    ctx.lineTo(toX(0.470), toY(0.550));
    ctx.lineTo(toX(0.420), toY(0.485));
    ctx.lineTo(toX(0.350), toY(0.470));
    ctx.lineTo(toX(0.280), toY(0.470));
    ctx.lineTo(toX(0.210), toY(0.490));
    ctx.lineTo(toX(0.150), toY(0.535));
    ctx.lineTo(toX(0.115), toY(0.570));
    ctx.closePath();
    ctx.clip();

    // 2. Animated Wet Highway Road Surface (from horizon to dashboard)
    const vpX = toX(0.51);
    const vpY = toY(0.405);
    const roadLeftX = toX(0.18);
    const roadRightX = toX(0.922);
    const roadBottomY = toY(0.575);

    // Dark wet asphalt base
    const roadGrad = ctx.createLinearGradient(vpX, vpY, vpX, roadBottomY);
    roadGrad.addColorStop(0, '#1c242c');
    roadGrad.addColorStop(0.3, '#141a20');
    roadGrad.addColorStop(1, '#0e1216');

    ctx.beginPath();
    ctx.moveTo(vpX - toScaleW(0.06), vpY);
    ctx.lineTo(vpX + toScaleW(0.06), vpY);
    ctx.lineTo(roadRightX, roadBottomY);
    ctx.lineTo(roadLeftX, roadBottomY);
    ctx.closePath();
    ctx.fillStyle = roadGrad;
    ctx.fill();

    // Wet road specular reflection sheen
    ctx.fillStyle = 'rgba(180, 210, 240, 0.04)';
    ctx.fillRect(roadLeftX, vpY, roadRightX - roadLeftX, roadBottomY - vpY);

    // 3. Passing Highway Dashed Lane Markings (3D Perspective)
    const numDashes = 7;
    for (let i = 0; i < numDashes; i++) {
      const z = ((i / numDashes) + this.roadOffset * (1 / numDashes)) % 1.0;
      if (z < 0.05) continue;

      // Perspective transformation: y scales with z^1.8
      const pY = vpY + Math.pow(z, 1.7) * (roadBottomY - vpY);
      const dashLen = Math.pow(z, 1.5) * toScaleH(0.055) + 3;
      const dashW = Math.max(1.5, z * toScaleW(0.008));

      // Lane line between middle and right lane
      const laneLineX = vpX + (toX(0.68) - vpX) * z;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + z * 0.65})`;
      ctx.fillRect(laneLineX - dashW / 2, pY, dashW, dashLen);

      // Oncoming divider line (yellow dashed)
      const medianLineX = vpX + (toX(0.42) - vpX) * z;
      ctx.fillStyle = `rgba(255, 190, 70, ${0.2 + z * 0.7})`;
      ctx.fillRect(medianLineX - dashW / 2, pY, dashW, dashLen * 1.2);
    }

    // 4. Draw Overtaken Slower Traffic (Tata Goods Truck)
    this.slowerTraffic.forEach(veh => {
      if (veh.z < 0.05 || veh.z > 0.85) return;
      const vY = vpY + Math.pow(veh.z, 1.7) * (roadBottomY - vpY);
      const vX = vpX + (toX(veh.x) - vpX) * veh.z;
      const scale = veh.z * 1.35;
      const vw = toScaleW(0.13) * scale;
      const vh = toScaleH(0.12) * scale;

      // Truck body
      ctx.fillStyle = '#221d1b';
      ctx.fillRect(vX - vw / 2, vY - vh, vw, vh);

      // Colorful tailboard ("HORN OK PLEASE" chevron art)
      ctx.fillStyle = '#c83822';
      ctx.fillRect(vX - vw / 2 + 2, vY - vh * 0.6, vw - 4, vh * 0.55);

      // Yellow chevron stripes
      ctx.fillStyle = '#f5b530';
      ctx.fillRect(vX - vw * 0.35, vY - vh * 0.25, vw * 0.7, vh * 0.12);

      // Truck taillights
      ctx.fillStyle = '#ff2b20';
      ctx.shadowColor = '#ff2010';
      ctx.shadowBlur = 10 * scale;
      ctx.fillRect(vX - vw * 0.42, vY - vh * 0.22, vw * 0.18, vh * 0.14);
      ctx.fillRect(vX + vw * 0.24, vY - vh * 0.22, vw * 0.18, vh * 0.14);
      ctx.shadowBlur = 0;
    });

    // 5. Draw THE RUNNING INDIAN ROADWAYS BUS (Ahead on Highway)
    const bus = this.bus;
    const busY = vpY + Math.pow(bus.z, 1.7) * (roadBottomY - vpY) + bus.chassisBounce * rect.h;
    const busX = vpX + (toX(bus.x) - vpX) * bus.z + bus.sway * rect.w;
    const busScale = bus.z * 1.5;
    const bw = toScaleW(bus.width) * busScale;
    const bh = toScaleH(bus.height) * busScale;

    // Draw exhaust puffs behind bus
    bus.exhaustPuffs.forEach(p => {
      ctx.fillStyle = `rgba(180, 190, 200, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.y), toScaleW(p.scale), 0, Math.PI * 2);
      ctx.fill();
    });

    // Bus tire spray / monsoon water mist on tarmac
    ctx.fillStyle = 'rgba(210, 230, 255, 0.18)';
    ctx.beginPath();
    ctx.ellipse(busX - bw * 0.32, busY + 2, bw * 0.28, bh * 0.12, 0, 0, Math.PI * 2);
    ctx.ellipse(busX + bw * 0.32, busY + 2, bw * 0.28, bh * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bus Main Body (State Transport White & Crimson)
    ctx.fillStyle = '#f5efe4'; // Roadways white body
    ctx.beginPath();
    ctx.roundRect(busX - bw / 2, busY - bh, bw, bh, [4, 4, 1, 1]);
    ctx.fill();

    // Roadways Crimson & Blue Cheatline Stripes
    ctx.fillStyle = '#b5281e'; // Crimson stripe
    ctx.fillRect(busX - bw / 2, busY - bh * 0.46, bw, bh * 0.18);
    ctx.fillStyle = '#1c4273'; // Navy stripe
    ctx.fillRect(busX - bw / 2, busY - bh * 0.28, bw, bh * 0.08);

    // Rear Windshield with warm interior passenger lighting
    ctx.fillStyle = '#e8ba62';
    ctx.fillRect(busX - bw * 0.38, busY - bh * 0.88, bw * 0.76, bh * 0.35);

    // Route Destination Board (Illuminated "ROUTE 90")
    ctx.fillStyle = '#101416';
    ctx.fillRect(busX - bw * 0.34, busY - bh * 0.96, bw * 0.68, bh * 0.12);
    ctx.fillStyle = '#ffcf55';
    ctx.font = `bold ${Math.max(6, Math.floor(bh * 0.09))}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('DELHI—GOA', busX, busY - bh * 0.88);

    // Luggage Carrier on Roof with tarpaulin baggage
    ctx.fillStyle = '#3a3430';
    ctx.fillRect(busX - bw * 0.44, busY - bh * 1.08, bw * 0.88, bh * 0.11);

    // Dual Ruby-Red Roadways Taillights
    const isBraking = bus.brakeLight;
    ctx.fillStyle = isBraking ? '#ff1e00' : '#d42218';
    ctx.shadowColor = '#ff2b1a';
    ctx.shadowBlur = isBraking ? 25 : 12;

    // Left taillight cluster
    ctx.beginPath();
    ctx.arc(busX - bw * 0.36, busY - bh * 0.22, bw * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Right taillight cluster
    ctx.beginPath();
    ctx.arc(busX + bw * 0.36, busY - bh * 0.22, bw * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Amber Turn Indicators
    if (bus.indicator === 'right' && bus.indicatorFlash > 0.5) {
      ctx.fillStyle = '#ff9f1c';
      ctx.shadowColor = '#ffaa22';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(busX + bw * 0.42, busY - bh * 0.36, bw * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (bus.indicator === 'left' && bus.indicatorFlash > 0.5) {
      ctx.fillStyle = '#ff9f1c';
      ctx.shadowColor = '#ffaa22';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(busX - bw * 0.42, busY - bh * 0.36, bw * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Wet Asphalt Taillight Glow Reflections under bus
    ctx.fillStyle = 'rgba(240, 40, 20, 0.22)';
    ctx.fillRect(busX - bw * 0.42, busY + 2, bw * 0.22, toScaleH(0.04));
    ctx.fillRect(busX + bw * 0.20, busY + 2, bw * 0.22, toScaleH(0.04));

    // 6. Draw Oncoming Night Vehicles (Roaring Headlights in Left Lane)
    this.oncomingTraffic.forEach(veh => {
      const onY = vpY + Math.pow(veh.z, 1.7) * (roadBottomY - vpY);
      const onX = vpX + (toX(veh.x) - vpX) * veh.z;
      const onScale = veh.z * 1.5;
      const onW = toScaleW(0.12) * onScale;
      const onH = toScaleH(0.11) * onScale;

      // Dark silhouette of oncoming bus/truck
      ctx.fillStyle = '#151b1f';
      ctx.fillRect(onX - onW / 2, onY - onH, onW, onH);

      // Twin Blazing Halogen Headlights
      const hRadius = Math.max(2, onW * 0.16);
      ctx.fillStyle = veh.headlightColor;
      ctx.shadowColor = '#ffe28a';
      ctx.shadowBlur = 20 * onScale;

      ctx.beginPath();
      ctx.arc(onX - onW * 0.3, onY - onH * 0.28, hRadius, 0, Math.PI * 2);
      ctx.arc(onX + onW * 0.3, onY - onH * 0.28, hRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Wet road headlight reflection beam streaming towards viewer
      const beamLen = toScaleH(0.08) * onScale;
      const beamGrad = ctx.createLinearGradient(onX, onY, onX, onY + beamLen);
      beamGrad.addColorStop(0, 'rgba(255, 235, 170, 0.38)');
      beamGrad.addColorStop(1, 'rgba(255, 220, 140, 0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(onX - onW * 0.45, onY, onW * 0.9, beamLen);
    });

    // 7. Headlight High-Beam Throw from OUR bus onto the road
    if (this.headlightsOn || this.hornFlash > 0) {
      const flashBoost = this.hornFlash * 0.45;
      const headBeam = ctx.createRadialGradient(
        toX(0.52), roadBottomY, toScaleW(0.05),
        toX(0.52), vpY + toScaleH(0.04), toScaleW(0.5)
      );
      headBeam.addColorStop(0, `rgba(255, 245, 200, ${0.28 + flashBoost})`);
      headBeam.addColorStop(0.6, `rgba(255, 220, 150, ${0.12 + flashBoost * 0.5})`);
      headBeam.addColorStop(1, 'rgba(255, 220, 150, 0)');

      ctx.fillStyle = headBeam;
      ctx.fillRect(roadLeftX, vpY, roadRightX - roadLeftX, roadBottomY - vpY);
    }

    // 8. Animated Windscreen Wipers (Physical Blades Sweeping Glass)
    if (this.wipersOn) {
      ctx.strokeStyle = '#1e2225';
      ctx.lineWidth = Math.max(3, toScaleW(0.004));
      ctx.lineCap = 'round';

      // Left Wiper Blade
      const wPivotLX = toX(0.32);
      const wPivotLY = toY(0.56);
      const wArmLen = toScaleH(0.24);
      const wAngleL = -0.3 + this.wiperAngle * 1.35;
      const wEndLX = wPivotLX + Math.sin(wAngleL) * wArmLen;
      const wEndLY = wPivotLY - Math.cos(wAngleL) * wArmLen;

      ctx.beginPath();
      ctx.moveTo(wPivotLX, wPivotLY);
      ctx.lineTo(wEndLX, wEndLY);
      ctx.stroke();

      // Right Wiper Blade
      const wPivotRX = toX(0.68);
      const wPivotRY = toY(0.56);
      const wAngleR = -0.35 + this.wiperAngle * 1.35;
      const wEndRX = wPivotRX + Math.sin(wAngleR) * wArmLen;
      const wEndRY = wPivotRY - Math.cos(wAngleR) * wArmLen;

      ctx.beginPath();
      ctx.moveTo(wPivotRX, wPivotRY);
      ctx.lineTo(wEndRX, wEndRY);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// Initialize simulation on window load or DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.roadSim = new RoadHighwaySimulation();
  });
} else {
  window.roadSim = new RoadHighwaySimulation();
}
