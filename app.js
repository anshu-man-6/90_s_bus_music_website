const tracks = [['The Ultimate Bus Driver Playlist', 'Authorized local MP3 · continuous mix', '23:02']];
let index = 0, playing = false, audioCtx;
const $ = (s) => document.querySelector(s);
const title = $('#song-title'), artist = $('#song-artist'), year = $('#song-year'), number = $('#track-number'), play = $('#play'), status = $('#playback-status');
const previewAudio = $('#preview-audio'), hornAudio = $('#horn-audio');
let hornRestoreTimer;
function showToast(message) { const t=$('#toast'); t.textContent=message; t.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>t.classList.remove('show'),2200); }
function updateTrack() { const [t,a,y]=tracks[index]; title.textContent=t; artist.textContent=a; year.textContent=y; number.textContent=String(index+1).padStart(3,'0'); $('#track-total').textContent=String(tracks.length).padStart(3,'0'); play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${t}`); }
function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}
function tone(freq, duration, volume=.08, type='sine', offset=0, destination) {
  const ctx=getAudio(), o=ctx.createOscillator(), g=ctx.createGain(), at=ctx.currentTime+offset;
  o.type=type; o.frequency.setValueAtTime(freq,at);
  g.gain.setValueAtTime(.0001,at); g.gain.exponentialRampToValueAtTime(volume,at+.018); g.gain.exponentialRampToValueAtTime(.0001,at+duration);
  o.connect(g).connect(destination || ctx.destination); o.start(at); o.stop(at+duration+.03);
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
}
async function togglePlay() {
  try {
    if (playing) { previewAudio.pause(); setPlayingState(false); return; }
    const ready = await loadCurrentPreview(true);
    if (!ready) return;
    await previewAudio.play();
    setPlayingState(true);
  } catch (error) {
    playing=false; status.textContent='AUDIO UNAVAILABLE'; showToast('The local mix could not be played.');
  }
}
async function move(amount){
  if (tracks.length === 1) { showToast('Add timestamps to unlock exact previous / next tracks.'); return; }
  const continuePlaying = playing;
  previewAudio.pause(); setPlayingState(false);
  index=(index+amount+tracks.length)%tracks.length; updateTrack();
  showToast(amount>0?'Next cassette loaded':'Previous cassette loaded');
  try { await loadCurrentPreview(continuePlaying); if (continuePlaying) { await previewAudio.play(); setPlayingState(true); } } catch { status.textContent='PREVIEW UNAVAILABLE · TRY ANOTHER TRACK'; }
}
$('#play').addEventListener('click',togglePlay);$('#previous').addEventListener('click',()=>move(-1));$('#next').addEventListener('click',()=>move(1));
document.addEventListener('keydown',e=>{if(e.target.tagName==='BUTTON')return;if(e.code==='Space'){e.preventDefault();togglePlay()} if(e.key==='ArrowRight')move(1);if(e.key==='ArrowLeft')move(-1);});
function setMusicVolume(volume, duration = 180) {
  const from = previewAudio.volume, started = performance.now();
  cancelAnimationFrame(setMusicVolume.frame);
  const fade = (now) => { const progress = Math.min(1, (now - started) / duration); previewAudio.volume = from + (volume - from) * progress; if (progress < 1) setMusicVolume.frame = requestAnimationFrame(fade); };
  setMusicVolume.frame = requestAnimationFrame(fade);
}
function restoreMusic() { clearTimeout(hornRestoreTimer); setMusicVolume(.95, 520); $('#roadways-horn').classList.remove('active'); }
async function playRoadwaysHorn() {
  try {
    if (!hornAudio.paused) {
      hornAudio.pause(); hornAudio.currentTime = 0;
      restoreMusic();
      return;
    }
    clearTimeout(hornRestoreTimer);
    $('#roadways-horn').classList.add('active');
    if (!previewAudio.paused) setMusicVolume(.18, 120);
    hornAudio.pause(); hornAudio.currentTime = 0; hornAudio.volume = 1;
    await hornAudio.play();
  } catch { showToast('Horn audio could not be played.'); restoreMusic(); }
}
$('#roadways-horn').addEventListener('click', playRoadwaysHorn);
hornAudio.addEventListener('ended', restoreMusic);
const hints={ignition:'Engine idling. The route is ready.',headlights:'Headlamps cut a warm lane through the rain.',wipers:'Wipers are keeping the windscreen clear.',hazards:'Four-way indicators are flashing for traffic.',};
document.querySelectorAll('.system-button').forEach(b=>b.addEventListener('click',()=>{b.classList.toggle('on');const on=b.classList.contains('on');const id=b.id;$('#drive-hint').textContent=on?hints[id]:'System switched off.';if(id==='ignition')$('#drive-state').textContent=on?'ENGINE IDLING':'IGNITION OFF';if(id==='wipers')$('.rain-layer').classList.toggle('wipers-on',on);if(id==='hazards')document.querySelector('.status-dot').style.background=on?'#ffb12f':'';if(id==='headlights')document.querySelector('.cockpit-photo').style.filter=on?'brightness(1.14) saturate(1.08)':'';}));
previewAudio.addEventListener('ended', () => { if (playing) move(1); });
previewAudio.addEventListener('error', () => { if (playing) { setPlayingState(false); status.textContent='LOCAL AUDIO UNAVAILABLE'; } });
$('#catalog').addEventListener('click',()=>showToast('Full authorized 23-minute mix loaded.'));
updateTrack();
