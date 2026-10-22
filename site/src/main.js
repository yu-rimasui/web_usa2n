import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { journeyState } from './scroll.js';

gsap.registerPlugin(ScrollTrigger);
const root = document.documentElement;
const host = document.querySelector('#canvas-host');
const journey = document.querySelector('#journey');
const toggle = document.querySelector('#motion-toggle');
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
const status = document.querySelector('#runtime-status');
const intro = document.querySelector('#hello');
const about = document.querySelector('#about');
const guide = document.querySelector('#guide');
const passage = document.querySelector('#transition-caption');
const objectLabel = document.querySelector('#object-label');
const meter = document.querySelector('#meter-fill');
let scene;
let timeline;
let generation = 0;
let reduced = systemMotion.matches;
let chapter = -1;
let pendingFocus;

function updatePanel(panel, opacity) {
  panel.style.opacity = String(opacity);
  panel.style.visibility = opacity < .01 ? 'hidden' : 'visible';
  panel.inert = opacity < .01;
  panel.setAttribute('aria-hidden', String(opacity < .01));
  if (pendingFocus === panel && opacity > .98) {
    panel.focus({ preventScroll: true });
    pendingFocus = undefined;
  }
}

function render(progress) {
  const state = scene.draw(progress) || journeyState(progress);
  updatePanel(intro, state.introOpacity);
  updatePanel(about, state.aboutOpacity);
  passage.style.opacity = String(state.passageOpacity);
  guide.style.opacity = String(Math.max(state.introOpacity, state.aboutOpacity));
  guide.inert = Math.max(state.introOpacity, state.aboutOpacity) < .01;
  objectLabel.style.opacity = String(state.introOpacity);
  meter.style.transform = `scaleX(${state.progress})`;
  if (state.chapter === chapter) return;
  chapter = state.chapter;
  document.querySelector('#chapter-code').textContent = chapter ? '01' : '00';
  document.querySelector('#chapter-name').textContent = chapter ? 'Inside the little lab.' : 'Hello, world.';
  document.querySelector('#guide-message').textContent = chapter ? 'なに、つくろっか。' : 'お、いらっしゃい。';
  document.querySelector('#scroll-message').textContent = chapter ? 'SCROLL BACK TO REPLAY' : 'SCROLL TO EXPLORE';
  document.querySelectorAll('.site-header nav a').forEach(link => {
    if (link.dataset.destination === (chapter ? 'about' : 'hello')) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

function stopScene() {
  timeline?.scrollTrigger?.kill();
  timeline?.kill();
  timeline = undefined;
  scene?.dispose();
  scene = undefined;
  chapter = -1;
  root.classList.remove('has-motion');
  [intro, about].forEach(panel => {
    panel.style.removeProperty('opacity');
    panel.style.removeProperty('visibility');
    panel.inert = false;
    panel.removeAttribute('aria-hidden');
  });
  guide.inert = false;
  guide.style.removeProperty('opacity');
}

async function setMotion(shouldReduce) {
  const ownGeneration = ++generation;
  reduced = shouldReduce;
  toggle.setAttribute('aria-pressed', String(reduced));
  document.querySelector('#motion-label').textContent = reduced ? '3Dの演出を見る' : '演出を減らす';
  toggle.disabled = !reduced;
  status.hidden = true;
  const scrollRatio = timeline ? timeline.progress() : location.hash === '#about' ? 1 : 0;
  stopScene();
  if (reduced) {
    toggle.disabled = false;
    // Keep the current chapter in view when switching to the readable static layout.
    if (scrollRatio > .72) about.scrollIntoView({ behavior: 'instant', block: 'center' });
    return;
  }
  try {
    const { createScene } = await import('./scene.js');
    if (ownGeneration !== generation) return;
    root.classList.add('has-motion');
    const nextScene = await createScene(host);
    if (ownGeneration !== generation) {
      nextScene.dispose();
      return;
    }
    scene = nextScene;
    scene.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      setMotion(true);
      status.textContent = '3Dの描画が中断されたため、読みやすい表示に切り替えました。';
      status.hidden = false;
    }, { once: true });
    const playhead = { progress: 0 };
    timeline = gsap.to(playhead, {
      progress: 1, ease: 'none',
      scrollTrigger: { trigger: journey, start: 'top top', end: 'bottom bottom', scrub: .45, invalidateOnRefresh: true },
      onUpdate: () => { if (scene) render(playhead.progress); }
    });
    ScrollTrigger.refresh();
    if (scrollRatio > 0) {
      window.scrollTo({ top: journey.offsetTop + (journey.offsetHeight - innerHeight) * scrollRatio, behavior: 'instant' });
      ScrollTrigger.update();
    }
    render(timeline.progress());
    toggle.disabled = false;
  } catch (error) {
    if (ownGeneration !== generation) return;
    stopScene();
    reduced = true;
    toggle.setAttribute('aria-pressed', 'true');
    document.querySelector('#motion-label').textContent = '3Dを再試行';
    toggle.disabled = false;
    status.textContent = 'この環境では3Dを表示できないため、イラストと文章でご案内しています。';
    status.hidden = false;
    console.warn('3D presentation could not start:', error.message);
  }
}

toggle.addEventListener('click', () => setMotion(!reduced));
systemMotion.addEventListener('change', event => setMotion(event.matches));
window.addEventListener('resize', () => scene?.resize());
window.addEventListener('pagehide', stopScene);
window.addEventListener('pageshow', event => { if (event.persisted) setMotion(reduced); });
document.querySelectorAll('[data-destination]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    const destination = link.dataset.destination;
    history.replaceState(null, '', `#${destination}`);
    const target = destination === 'about' ? about : intro;
    target.setAttribute('tabindex', '-1');
    if (event.detail === 0) pendingFocus = target;
    if (scene) {
      const top = journey.offsetTop + (destination === 'about' ? journey.offsetHeight - innerHeight : 0);
      window.scrollTo({ top, behavior: systemMotion.matches ? 'instant' : 'smooth' });
    } else target.scrollIntoView({ behavior: systemMotion.matches ? 'instant' : 'smooth', block: 'start' });
    // Keyboard users arrive at the chapter content, rather than a hidden link.
    if (!scene) target.focus({ preventScroll: true });
  });
});
document.querySelector('#year').textContent = new Date().getFullYear();
setMotion(reduced);
