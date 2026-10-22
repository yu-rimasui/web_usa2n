import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { journeyState, phase } from './scroll.js';

export async function createScene(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.replaceChildren(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dfe9d8');
  scene.fog = new THREE.Fog('#dfe9d8', 18, 55);
  const camera = new THREE.PerspectiveCamera(34, 1, .05, 90);
  const materials = {
    mint: new THREE.MeshStandardMaterial({ color: '#a9c29a', roughness: .78 }),
    mintDark: new THREE.MeshStandardMaterial({ color: '#6e9067', roughness: .85 }),
    cream: new THREE.MeshStandardMaterial({ color: '#eee7cf', roughness: .8 }),
    dark: new THREE.MeshStandardMaterial({ color: '#344c37', roughness: .8 }),
    paper: new THREE.MeshStandardMaterial({ color: '#f4eddb', roughness: 1 }),
    orange: new THREE.MeshStandardMaterial({ color: '#d5a07c', roughness: .8 }),
    brass: new THREE.MeshStandardMaterial({ color: '#ad9468', metalness: .28, roughness: .6 }),
    pink: new THREE.MeshStandardMaterial({ color: '#c6a6a3', roughness: .9 })
  };
  const textures = new Set();
  const customMaterials = new Set();
  const hemisphere = new THREE.HemisphereLight('#fff9e8', '#8f9e7a', 2.8);
  scene.add(hemisphere);
  const sunlight = new THREE.DirectionalLight('#fff8e4', 3.2);
  sunlight.position.set(-5, 10, 8);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  Object.assign(sunlight.shadow.camera, { left: -11, right: 11, top: 9, bottom: -16, near: .5, far: 40 });
  sunlight.shadow.normalBias = .04;
  sunlight.shadow.bias = -.0002;
  sunlight.shadow.radius = 4;
  sunlight.target.position.set(0, -1, -5);
  scene.add(sunlight, sunlight.target);
  const fill = new THREE.DirectionalLight('#e6f2df', .8);
  fill.position.set(7, 4, -7);
  scene.add(fill);

  function box(parent, size, position, material, radius = .06) {
    const geometry = radius > 0
      ? new RoundedBoxGeometry(...size, 2, Math.min(radius, Math.min(...size) / 2))
      : new THREE.BoxGeometry(...size);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function cylinder(parent, radius, depth, position, material, faceForward = false) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 28), material);
    mesh.position.set(...position);
    if (faceForward) mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function label(parent, text, position, width, height, background = '#eee7cf', foreground = '#3a5038') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = Math.round(1024 * height / width);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = foreground;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(canvas.height * .44)}px monospace`;
    ctx.fillText(text, 512, canvas.height / 2, 920);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    customMaterials.add(material);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    plane.position.set(...position);
    parent.add(plane);
    return plane;
  }

  // The same original image is used on a paper stand; no character redraw.
  let rabbitTexture;
  try {
    rabbitTexture = await new THREE.TextureLoader().loadAsync('/assets/usagi-ninja.png');
    rabbitTexture.colorSpace = THREE.SRGBColorSpace;
    textures.add(rabbitTexture);
  } catch {
    // The accessible HTML guide remains available if this decorative texture fails.
  }

  const groundMaterial = new THREE.MeshStandardMaterial({ color: '#d7e3ce', roughness: 1 });
  customMaterials.add(groundMaterial);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.85;
  ground.receiveShadow = true;
  scene.add(ground);

  const machine = new THREE.Group();
  machine.position.set(1.5, 0, 0);
  scene.add(machine);
  box(machine, [5.9, .28, 4.3], [0, -1.57, -.15], materials.cream, .13);
  label(machine, 'CURIOSITY DEPARTMENT / 001', [0, -1.55, 2.015], 2.3, .12);
  for (const x of [-1.22, 1.22]) {
    for (const z of [-.5, .65]) cylinder(machine, .15, .2, [x, -1.33, z], materials.dark);
  }
  box(machine, [3.24, .3, 1.85], [0, -1.12, .05], materials.mintDark, .12);
  const shell = [];
  for (const side of [-1, 1]) {
    const panel = new THREE.Group();
    panel.position.x = side * .87;
    machine.add(panel);
    box(panel, [1.74, 2.75, 1.72], [0, .4, 0], materials.mint, .16);
    box(panel, [1.66, 2.58, .14], [0, .4, .89], materials.cream, .10);
    for (const y of [-.75, 1.55]) {
      const screw = cylinder(panel, .042, .025, [side * .64, y, .98], materials.brass, true);
      const slot = box(panel, [.044, .008, .005], [side * .64, y, .997], materials.dark, 0);
      slot.rotation.z = .4 * side;
      screw.castShadow = false;
    }
    // Side vents and seams make the camera's turn legible in three dimensions.
    for (let i = 0; i < 7; i++) {
      box(panel, [.025, .055, .64], [side * .875, .85 - i * .145, -.12], materials.mintDark, .01);
    }
    if (side === -1) {
      label(panel, 'u. / LITTLE LAB', [0, 1.4, .982], 1.15, .16);
      box(panel, [1.1, .19, .06], [0, -.65, 1], materials.mintDark, .03);
      for (let i = 0; i < 4; i++) {
        cylinder(panel, .032, .024, [-.32 + i * .14, -.66, 1.047], i === 0 ? materials.orange : materials.cream, true);
      }
    } else {
      const dial = cylinder(panel, .25, .12, [.2, -.61, 1], materials.mintDark, true);
      box(panel, [.035, .17, .02], [.2, -.55, 1.08], materials.cream, .01);
      label(panel, 'TUNE IN', [.2, -.93, .983], .6, .1);
      label(panel, '01', [.25, 1.42, .984], .3, .16);
      dial.name = 'tuning-dial';
    }
    shell.push(panel);
  }
  const display = new THREE.Group();
  machine.add(display);
  box(display, [2.62, 1.74, .2], [0, .5, 1], materials.dark, .16);
  box(display, [2.36, 1.46, .09], [0, .5, 1.12], materials.mintDark, .12);
  const crtCanvas = document.createElement('canvas');
  crtCanvas.width = 1024;
  crtCanvas.height = 640;
  const crt = crtCanvas.getContext('2d');
  crt.fillStyle = '#b6cc9e';
  crt.fillRect(0, 0, 1024, 640);
  crt.fillStyle = '#3d5739';
  crt.font = 'bold 85px monospace';
  crt.fillText('HELLO,', 85, 225);
  crt.fillText('CURIOUS.', 85, 325);
  crt.font = '23px monospace';
  crt.fillText('A LITTLE LAB FOR BIG LITTLE IDEAS.', 85, 405);
  crt.font = '27px monospace';
  crt.fillText('> SCROLL TO OPEN _', 85, 530);
  crt.fillStyle = '#49653b0c';
  for (let y = 0; y < 640; y += 5) crt.fillRect(0, y, 1024, 1);
  const crtTexture = new THREE.CanvasTexture(crtCanvas);
  crtTexture.colorSpace = THREE.SRGBColorSpace;
  textures.add(crtTexture);
  const crtMaterial = new THREE.MeshBasicMaterial({ map: crtTexture });
  customMaterials.add(crtMaterial);
  const crtFace = new THREE.Mesh(new THREE.PlaneGeometry(2.13, 1.24), crtMaterial);
  crtFace.position.set(0, .5, 1.178);
  display.add(crtFace);
  display.children.forEach(mesh => {
    customMaterials.add(mesh.material);
    mesh.material = mesh.material.clone();
    customMaterials.add(mesh.material);
  });

  const leftExtras = new THREE.Group();
  machine.add(leftExtras);
  cylinder(leftExtras, .38, .15, [-2.12, -1.35, .3], materials.orange);
  cylinder(leftExtras, .1, .17, [-2.12, -1.33, .3], materials.cream);
  const block = box(leftExtras, [.65, .64, .65], [-2.2, -1.09, -.95], materials.paper, .05);
  block.rotation.y = -.2;
  label(leftExtras, 'IDEAS', [-2.2, -1.03, -.613], .45, .12);
  const antenna = cylinder(machine, .025, .83, [1.15, 2.1, -.2], materials.brass);
  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 8), materials.orange);
  antennaTip.position.set(1.15, 2.53, -.2);
  machine.add(antennaTip);

  const lab = new THREE.Group();
  lab.position.set(1.5, 0, -10);
  scene.add(lab);
  box(lab, [7.2, .32, 4.45], [0, -.8, 0], materials.cream, .16);
  box(lab, [6.75, .15, 4.05], [0, -1.02, 0], materials.mintDark, .06);
  for (const x of [-2.8, 2.8]) {
    for (const z of [-1.45, 1.45]) {
      box(lab, [.22, .7, .22], [x, -1.38, z], materials.mintDark, .06);
    }
  }
  label(lab, 'THE LITTLE LAB / KEEP EXPLORING', [0, -.81, 2.24], 3.3, .14);
  const assemblies = [];
  function onBench(group, x, y, z, delay = 0) {
    group.position.set(x, y, z);
    lab.add(group);
    assemblies.push({ group, y, delay });
    return group;
  }

  const monitor = onBench(new THREE.Group(), -.45, 0, -.65, 0);
  box(monitor, [2.55, 1.78, .78], [0, .65, 0], materials.mint, .16);
  box(monitor, [2.25, 1.47, .13], [0, .65, .43], materials.cream, .10);
  box(monitor, [1.94, 1.17, .06], [0, .65, .51], materials.dark, .08);
  label(monitor, '{ make. try. play. }', [0, .86, .55], 1.76, .28, '#344c37', '#d4e3c9');
  label(monitor, '> a soft spot for new ideas_', [0, .48, .55], 1.76, .12, '#344c37', '#b7cda4');
  box(monitor, [.28, .5, .25], [0, -.39, 0], materials.mintDark, .05);
  box(monitor, [1.15, .09, .7], [0, -.62, .05], materials.mintDark, .04);
  const keyboard = onBench(new THREE.Group(), -.45, -.58, .67, .1);
  box(keyboard, [2.25, .16, .74], [0, 0, 0], materials.mint, .07);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 10; col++) {
      box(keyboard, [.155, .07, .13], [-.91 + col * .202, .11, -.21 + row * .19], row === 2 && col > 6 ? materials.orange : materials.cream, .024);
    }
  }
  const lamp = onBench(new THREE.Group(), -2.45, -.6, -.65, .2);
  cylinder(lamp, .39, .09, [0, 0, 0], materials.mintDark);
  cylinder(lamp, .028, 1.5, [0, .79, 0], materials.brass);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(.56, .48, 32, 1, true), materials.mint);
  shade.position.set(0, 1.46, 0);
  lamp.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff1c5' }));
  bulb.position.set(0, 1.29, 0);
  customMaterials.add(bulb.material);
  lamp.add(bulb);

  const tower = onBench(new THREE.Group(), 1.75, -.15, -.6, .1);
  box(tower, [.86, 1.25, .9], [0, .2, 0], materials.cream, .08);
  box(tower, [.65, .24, .04], [0, .5, .48], materials.mintDark, .02);
  label(tower, 'PLAY', [0, .5, .51], .5, .13, '#6e9067', '#eee7cf');
  for (let i = 0; i < 5; i++) box(tower, [.5, .025, .03], [0, .1 - i * .1, .47], materials.mintDark, 0);
  cylinder(tower, .06, .03, [.22, -.25, .49], materials.orange, true);
  const idea = onBench(new THREE.Group(), 2.5, -.47, .93, .3);
  box(idea, [.82, .12, .96], [0, 0, 0], materials.orange, .03);
  box(idea, [.82, .10, .96], [-.1, .12, -.06], materials.paper, .03);
  box(idea, [.82, .10, .96], [-.04, .23, .04], materials.mintDark, .03);
  idea.rotation.y = -.17;
  const cup = onBench(new THREE.Group(), -2.2, -.42, 1.1, .25);
  cylinder(cup, .24, .39, [0, 0, 0], materials.orange);
  cylinder(cup, .19, .009, [0, .201, 0], materials.dark);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.16, .045, 8, 20), materials.orange);
  handle.position.set(.25, 0, 0);
  cup.add(handle);
  const note = onBench(new THREE.Group(), .7, -.6, 1.4, .2);
  const noteMesh = label(note, 'ONE LITTLE IDEA AT A TIME.', [0, 0, 0], 1.1, .75, '#eee6cc');
  noteMesh.rotation.x = -Math.PI / 2;
  note.rotation.y = -.25;
  if (rabbitTexture) {
    const stand = onBench(new THREE.Group(), .84, -.04, .55, .25);
    const material = new THREE.MeshBasicMaterial({ map: rabbitTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    customMaterials.add(material);
    const rabbit = new THREE.Mesh(new THREE.PlaneGeometry(.85, .85), material);
    stand.add(rabbit);
    box(stand, [.55, .06, .3], [0, -.43, 0], materials.mintDark, .03);
    stand.rotation.y = -.15;
  }
  const tools = onBench(new THREE.Group(), 2.55, -.4, -1.35, .35);
  cylinder(tools, .23, .48, [0, 0, 0], materials.mintDark);
  for (let i = 0; i < 4; i++) {
    const pencil = cylinder(tools, .025, .66, [-.1 + i * .065, .48, 0], i % 2 ? materials.brass : materials.orange);
    pencil.rotation.z = -.13 + i * .09;
  }

  let mobile = false;
  let disposed = false;
  let lastProgress = 0;
  let burstStart = 0;
  let previousFrame = 0;
  let frames = 0;
  function draw(progress) {
    if (disposed) return;
    lastProgress = progress;
    const state = journeyState(progress, mobile);
    const lensWidening = 21 * Math.min(1, Math.max(.2, (.8 - camera.aspect) / .34));
    camera.fov = mobile ? 43 + lensWidening * phase(progress, .78, 1) : 34;
    camera.updateProjectionMatrix();
    camera.position.set(...state.camera);
    camera.lookAt(...state.target);
    shell.forEach((panel, index) => {
      const side = index ? 1 : -1;
      panel.position.x = side * (.87 + state.opening * 3.1);
      panel.position.y = state.opening * .25;
      panel.rotation.y = side * state.opening * .32;
      panel.rotation.z = -side * state.opening * .035;
    });
    display.visible = state.screenOpacity > .01;
    display.scale.setScalar(1 - state.opening * .12);
    display.children.forEach(mesh => {
      mesh.material.transparent = true;
      mesh.material.opacity = state.screenOpacity;
    });
    leftExtras.position.x = -state.opening * .8;
    antenna.rotation.z = state.opening * -.3;
    antennaTip.position.x = 1.15 + state.opening * .12;
    lab.visible = progress > .34;
    assemblies.forEach(({ group, y, delay }) => {
      const t = Math.min(1, Math.max(0, (state.assembly - delay) / (1 - delay)));
      group.position.y = y + (1 - t) * 1.1;
      group.scale.setScalar(.6 + .4 * t);
    });
    renderer.render(scene, camera);
    host.dataset.progress = state.progress.toFixed(3);
    host.dataset.triangles = String(renderer.info.render.triangles);
    if (import.meta.env.DEV) {
      const now = performance.now();
      if (now - previousFrame > 150) { frames = 0; burstStart = now; }
      frames++;
      if (frames > 5 && now - burstStart > 150) host.dataset.fps = ((frames - 1) * 1000 / (now - burstStart)).toFixed(1);
      previousFrame = now;
    }
    return state;
  }
  function resize() {
    if (disposed) return;
    const width = host.clientWidth;
    const height = host.clientHeight;
    mobile = width < 701 || (width < 901 && height > width);
    camera.aspect = width / height;
    camera.fov = mobile ? 43 : 34;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
    renderer.setSize(width, height);
    draw(lastProgress);
  }
  resize();
  return {
    canvas: renderer.domElement,
    draw,
    resize,
    dispose() {
      disposed = true;
      const geometries = new Set();
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); });
      geometries.forEach(geometry => geometry.dispose());
      textures.forEach(texture => texture.dispose());
      new Set([...Object.values(materials), ...customMaterials]).forEach(material => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
