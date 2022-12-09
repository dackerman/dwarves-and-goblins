const canvas = {width: null, height: null};

const unloaded_images = {
  dwarf: 'dwarf.png',
  dwarfHurt: 'dwarf-hurt.png',
  goblin: 'goblin.png',
  goblinHurt: 'goblin-hurt.png',
  stoneGround: 'stone-ground.jpg',
  bloodSplatter: 'blood-splatter.png',
  goblinBloodSplatter: 'goblin-blood-splatter.png',
  health: 'health.png',
};

const unloaded_sounds = {
  goblinHit: 'goblin-hit.wav',
  goblinDie: 'goblin-die.wav',
  goblinWin: 'goblin-win.wav',
  axeHit: 'axe-hit.wav',
  axeWhiff: 'axe-whiff.wav',
  dwarfOuch: 'dwarf-ouch.wav',
  footsteps: 'footsteps.wav',
  clang: 'clang.mp3',
  glug: 'glug.mp3',
  medievalMusic: 'medieval-music.mp3',
  cave: 'cave.wav',
};

window.addEventListener('load', function() {
  console.log('window loaded');
  init();
});


function image(path){
  const img = new Image();
  img.src = path;
  return img;
}


function generateGoblins() {
  let goblins = [];
  for (let i = 0; i < 5; i++) {
    const health = 30 + Math.random() * Math.random()*80 + (Math.random() < 0.1 ? 100+Math.random()*100 : 0);
    goblins.push({
      health: {color: 'red', cur: health, max: health},
      pos: {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
      },
      nextDestination: null,
    });
  }
  return goblins;
}

function genHealthPotions() {
  const potions = [];
  for (let i = 0; i < 10; i++) {
    potions.push({
      amount: 50,
      pos: {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
      }
    });
  }
  return potions;
}

// global state
const globalState = {keys: {}};

function bloodFromHit(image, pos, num, force) {
  let bloods = [];
  for (let i = 0; i < num; i++) {
    bloods.push({
      image,
      pos,
      velocity: {
        x: Math.random() * 6 - 3 + force.x,
        y: Math.random() * 6 - 3 + force.y,
        z: Math.random() * 10 + 10,
      },
    });
  }
  return bloods;
}

function init() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ele = document.createElement('canvas');
  ele.width = ""+canvas.width;
  ele.height = ""+canvas.height;
  document.body.appendChild(ele);

  window.addEventListener("keydown", (e) => {
    globalState.keys[e.code] = 1.0;
    globalState.keysThisFrame[e.code] = 1.0;
  }, false);

  window.addEventListener("keyup", (e) => {
    delete globalState.keys[e.code];
  }, false);

  const c = ele.getContext('2d');

  const images = {};
  let remaining = Object.keys(unloaded_images).length + Object.keys(unloaded_sounds).length;
  Object.entries(unloaded_images).forEach(([name, path]) => {
    images[name] = image(path);
    images[name].addEventListener('load', () => {
      console.log(`IMAGE: loaded "${path}" as [${name}]`);
      if (!--remaining) {
        startDrawing();
      }
    })
  });

  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContext();
  const sounds = Object.fromEntries(Object.entries(unloaded_sounds).map(([name, path]) => {
    const sound = {};
    fetch(path).then(response => response.arrayBuffer()).then(buffer => {
      audioCtx.decodeAudioData(buffer, decodedData => {
        sound.buffer = decodedData;
        console.log(`SOUND: loaded ${path} as [${name}]`);
        if (!--remaining) {
          startDrawing();
        }
      });
    });

    return [name, sound];
  }));

  const soundPlayer = (function() {
    const pool = [];
    const play = (soundName, opts={}) => {
      const source = audioCtx.createBufferSource();
      source.buffer = sounds[soundName].buffer;
      if (opts.volume) {
	const gainNode = audioCtx.createGain();
	gainNode.gain.value = opts.volume;
	gainNode.connect(audioCtx.destination);
	source.connect(gainNode);
      } else {
	source.connect(audioCtx.destination);
      }

      if (opts.loop) source.loop = true;
      source.start(0);
      return source;
    };
    return {
      play,
    };
  })();

  function startDrawing() {
    console.log('everything loaded');
    // soundPlayer.play('medievalMusic', {volume: 0.1, loop: true});
    soundPlayer.play('cave', {volume: 0.1, loop: true});
    const initialState = {
      t: 0,
      images,
      sounds,
      soundPlayer,
      c,
      keys: {},
      keysThisFrame: {},
      goblins: generateGoblins(),
      dwarf: {
        stamina: {color: 'green', cur: 100, max: 100},
        health: {color: 'red', cur: 100, max: 100},
        pos: {x: 100, y: 100}
      },
      particles: [],
      hits: [],
      healthPotions: genHealthPotions(),
    };
    Object.assign(globalState, initialState);
    draw();
  }
}

function key(name) {
  return globalState.keys[name] ? 1.0 : 0.0;
}

function keyPress(name) {
  return globalState.keysThisFrame[name] ? 1.0 : 0.0;
}

function printVec(v) {
  console.log(v);
  return v;
}

const vec2d = (function() {
  const vec2d = {};
  vec2d.add = (a, b) => ({
    x: a.x + b.x,
    y: a.y + b.y,
  });

  vec2d.subtract = (a, b) => ({
    x: a.x - b.x,
    y: a.y - b.y,
  });

  vec2d.multiply = (a, b) => ({
    x: a.x * b.x,
    y: a.y * b.y,
  });

  vec2d.divide = (a, b) => ({
    x: a.x / b.x,
    y: a.y / b.y,
  });

  vec2d.multiplyScalar = (a, scalar) => ({
    x: a.x * scalar,
    y: a.y * scalar,
  });

  vec2d.divideScalar = (a, scalar) => ({
    x: a.x / scalar,
    y: a.y / scalar,
  });

  vec2d.magnitude = v => Math.sqrt(v.x*v.x + v.y*v.y);

  vec2d.towards = (vstart, vend, magnitude) => {
    const vdiff = vec2d.subtract(vend, vstart);
    const vunit = vec2d.divideScalar(vdiff, vec2d.magnitude(vdiff));
    return vec2d.multiplyScalar(vunit, magnitude);
  }

  vec2d.distance = (a, b) => vec2d.magnitude(vec2d.subtract(b, a));

  Object.seal(vec2d);
  return vec2d;
})();

const vec3d = (function() {
  const vec3d = {};
  vec3d.add = (a, b) => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  });

  vec3d.subtract = (a, b) => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  });

  vec3d.multiply = (a, b) => ({
    x: a.x * b.x,
    y: a.y * b.y,
    z: a.z * b.z,
  });

  vec3d.divide = (a, b) => ({
    x: a.x / b.x,
    y: a.y / b.y,
    z: a.z / b.z,
  });

  vec3d.multiplyScalar = (a, scalar) => ({
    x: a.x * scalar,
    y: a.y * scalar,
    z: a.z * scalar,
  });

  vec3d.divideScalar = (a, scalar) => ({
    x: a.x / scalar,
    y: a.y / scalar,
    z: a.z / scalar,
  });

  vec3d.magnitude = v => Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);

  vec3d.towards = (vstart, vend, magnitude) => {
    const vdiff = vec3d.subtract(vend, vstart);
    const vunit = vec3d.divideScalar(vdiff, vec3d.magnitude(vdiff));
    return vec3d.multiplyScalar(vunit, magnitude);
  }

  Object.seal(vec3d);
  return vec3d;
})();

const goblinDim = {x: 99, y: 122};
const halfGoblinDim = vec2d.divideScalar(goblinDim, 2.0);

const dwarfDim = {x: 200, y: 200};
const halfDwarfDim = {x: 100, y: 100};

const aggroDist = 150;

function draw() {
  const {t, images, sounds, soundPlayer, c, keys, goblins, dwarf, particles, hits, healthPotions} = globalState;
  if (globalState.start === undefined) {
    globalState.start = t;
    globalState.last = t;
  }
  const frameTimeSeconds = Math.max((t - globalState.last)/10.0, 0.0001);

  c.clearRect(0, 0, canvas.width, canvas.height);

  c.fillStyle = c.createPattern(images.stoneGround, 'repeat');
  c.fillRect(0, 0, canvas.width, canvas.height);

  const strobe = 1 + 0.5 * Math.sin(t / 15.0);

  const xDir = key('ArrowRight') - key('ArrowLeft');
  const yDir = key('ArrowDown') - key('ArrowUp');
  const startingDwarfHealth = dwarf.health.cur;

  const walking = Math.abs(xDir)+Math.abs(yDir) && !dwarf.knockedBack;

  dwarf.stamina.cur += 0.5;
  dwarf.stamina.cur -= 0.1 * walking;

  if (walking) {
    if (!dwarf.walkingSound) {
      dwarf.walkingSound = soundPlayer.play('footsteps', {loop: true});
    }
  } else {
    if (dwarf.walkingSound) {
      dwarf.walkingSound.stop();
      delete dwarf.walkingSound;
    }
  }

  if (dwarf.stamina.cur > 0 && walking) {
    dwarf.pos = vec2d.add(dwarf.pos, {x: 5*xDir, y: 5*yDir});
  }

  if (dwarf.knockedBack) {
    console.log('knockedback');
    console.log(dwarf.pos);
    console.log(dwarf.knockedBack);
    dwarf.knockedBack.velocity.z -= frameTimeSeconds;
    dwarf.knockedBack.pos = vec3d.add(dwarf.knockedBack.pos, vec3d.multiplyScalar(dwarf.knockedBack.velocity, frameTimeSeconds));
    dwarf.pos = {x: dwarf.knockedBack.pos.x, y: dwarf.knockedBack.pos.y - dwarf.knockedBack.pos.z/2.0};
    console.log(dwarf.pos);
    console.log(dwarf.knockedBack);
    if (dwarf.knockedBack.pos.z < 0) { // stop physics when dwarf hits the ground
      delete dwarf.knockedBack;
    }
  }

  const dwarfAttacked = keyPress('Space') && dwarf.stamina.cur > 20;
  const dwarfBlocked = key('Backspace') && !dwarfAttacked && dwarf.stamina.cur > 10;

  if (dwarfAttacked) {
    dwarf.stamina.cur -= 20;
    c.fillStyle = 'white';
    c.arc(dwarf.pos.x, dwarf.pos.y, aggroDist, 0, 2 * Math.PI);
    c.fill();
  }
  if (dwarfBlocked) {
    c.strokeStyle = 'white';
    c.lineWidth = 2;
    c.arc(dwarf.pos.x, dwarf.pos.y, aggroDist*1.2, 0, 2 * Math.PI);
    c.stroke();
    dwarf.stamina.cur -= 1;
  }
  dwarf.stamina.cur = Math.max(0, Math.min(dwarf.stamina.max, dwarf.stamina.cur));

  c.font = '24px monospace';

  // Render and use health potions
  healthPotions.forEach(potion => {
    if (dwarf.health.cur < dwarf.health.max && vec2d.distance(dwarf.pos, potion.pos) < aggroDist) {
      console.log(`got health of ${potion.amount}!!`);
      dwarf.health.cur = Math.min(dwarf.health.max, dwarf.health.cur + potion.amount);
      potion.taken = true;
      soundPlayer.play('glug');
    }
    c.drawImage(images.health, potion.pos.x - images.health.width/2.0, potion.pos.y - images.health.height/2.0);
  });

  // delete taken health potions
  for (let i = healthPotions.length - 1; i >= 0; i--) {
    if (healthPotions[i].taken) {
      healthPotions.splice(i, 1);
    }
  }

  // Draw particles
  c.globalAlpha = 0.3;
  const numParticles = particles.length;
  const zchange = 1 * frameTimeSeconds;
  for (let i = 0; i < numParticles; i++) {
    const splatter = particles[i];

    if (splatter.pos.z > 0) {
      splatter.velocity.z -= zchange;
      splatter.pos = vec3d.add(splatter.pos, vec3d.multiplyScalar(splatter.velocity, frameTimeSeconds));
    }

    c.drawImage(images[splatter.image], splatter.pos.x, splatter.pos.y - splatter.pos.z/2.0, 105 , 68);
  }
  c.globalAlpha = 1;


  // Draw goblins
  const goblinLen = goblins.length;
  let hitAGoblin = false;
  for (let i = 0; i < goblinLen; i++) {
    const goblin = goblins[i];

    const toDwarfVec = vec2d.subtract(dwarf.pos, goblin.pos);
    const distToDwarf = vec2d.magnitude(toDwarfVec);
    const toDwarfNormVec = vec2d.divideScalar(toDwarfVec, 0.5*distToDwarf);
    const damageMultiplier = Math.max(1, goblin.health.max/30.0);
    if (distToDwarf < aggroDist) {
      goblin.foundDwarf = true;
      if (Math.random() < 0.01 && dwarf.health.cur > 0) { // 1% chance of attacking per frame
        let damage = 2*damageMultiplier*damageMultiplier + (Math.random() < 0.5 ? Math.random()*10 : 0);
        const blockAmount = dwarfBlocked ? Math.min(100, damage*0.9) : 0;
        damage -= blockAmount;
        console.log(`goblin attacks! SWIPE for ${damage} damage!! Blocked ${blockAmount}`);
        dwarf.health.cur = Math.max(0, dwarf.health.cur - damage);
        const vecMultiplier = Math.min(5, Math.max(1, damage/15.0));
	const multipliedVec = vec2d.multiplyScalar(toDwarfNormVec, vecMultiplier);
        const newBlood = bloodFromHit('bloodSplatter', {x: dwarf.pos.x, y: dwarf.pos.y, z: 200}, damage, multipliedVec);
        particles.push(...newBlood);
        hits.push({at: t, pos: {x: dwarf.pos.x, y: dwarf.pos.y}, velocity: toDwarfNormVec, damage});
	if (dwarfBlocked) {
	  soundPlayer.play('clang');
	} else {
	  soundPlayer.play('dwarfOuch');
	  soundPlayer.play('axeHit');
	  const knockedbackValue = {pos: {x: dwarf.pos.x, y: dwarf.pos.y, z: 100}, velocity: {x: multipliedVec.x, y: multipliedVec.y, z: 5}};
	  dwarf.knockedBack = knockedbackValue;
	}
      }

      if (dwarfAttacked) {
        // apply dwarf attack damage if it's attacking within range
        const damage = Math.min(goblin.health.cur, 5 + (10 + Math.random()*30 + (Math.random() < 0.5 ? Math.random()*30 : 0)) * Math.min((t - (dwarf.lastHit||t))/1000.0, 1));
        goblin.health.cur = Math.max(0, goblin.health.cur - damage);
        const vecMultiplier = Math.max(1, damage/15.0);
        console.log(vecMultiplier);
        const velocity = vec2d.multiplyScalar(toDwarfNormVec, -1 * vecMultiplier);
        const newBlood = bloodFromHit('goblinBloodSplatter', {x: goblin.pos.x, y: goblin.pos.y, z: 100}, damage, velocity);
        particles.push(...newBlood);
        hits.push({at: t, pos: {x: goblin.pos.x, y: goblin.pos.y}, velocity, damage});
        hitAGoblin = true;
        console.log(`goblin was sliced by the dwarf for ${damage} damage! Their health is now ${goblin.health.cur}`);
      }
    } else {
      goblin.foundDwarf = false;
    }


    if (!goblin.foundDwarf) {
      if (goblin.nextDestination) {
        const dist = vec2d.magnitude(vec2d.subtract(goblin.nextDestination, goblin.pos));
        // c.lineWidth = 1;
        // const color = Math.round(205 + 50*strobe);
        // c.strokeStyle = `rgb(${color},${color},${color})`;
        // c.strokeText(''+Math.round(dist), goblin.nextDestination.x + 5, goblin.nextDestination.y);
        if (dist < 10) {
          goblin.nextDestination = null;
        }
      }
      if (!goblin.nextDestination) {
        goblin.nextDestination = {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
        };
      }
      const travel = vec2d.towards(goblin.pos, goblin.nextDestination, 0.75);
      goblin.pos = vec2d.add(goblin.pos, travel);

      // c.strokeStyle = `rgb(0, ${Math.round(255*strobe)}, 0)`;
      // c.lineWidth = 3;
      // c.beginPath();
      // c.moveTo(goblin.pos.x, goblin.pos.y);
      // c.lineTo(goblin.nextDestination.x, goblin.nextDestination.y);
      // c.stroke();
    }

    const size = 1 + 0.5 * (goblin.health.max / 30.0 - 1.0);
    const goblinTopLeft = vec2d.subtract(goblin.pos, vec2d.multiplyScalar(halfGoblinDim, size));
    const goblinImg = goblin.health.cur < goblin.health.max ? images.goblinHurt : images.goblin;
    c.drawImage(goblinImg, goblinTopLeft.x, goblinTopLeft.y, goblinDim.x*size, goblinDim.y*size);
    c.fillStyle = 'white';
    c.fillText(`h:${Math.round(goblin.health.cur)} d:${Math.round(100*2*damageMultiplier*damageMultiplier)/100.0}`, goblin.pos.x, goblin.pos.y);
  }

  if (hitAGoblin) {
    dwarf.lastHit = t;
    soundPlayer.play('goblinHit');
    soundPlayer.play('axeHit');
  } else if (dwarfAttacked) {
    soundPlayer.play('axeWhiff');
  }

  // Delete dead goblins
  for (let i = goblins.length - 1; i >= 0; i--) {
    if (!goblins[i].health.cur) {
      soundPlayer.play('goblinDie');
      goblins.splice(i, 1);
    }
  }

  // Draw Dwarf
  const dwarfTopLeft = vec2d.subtract(dwarf.pos, halfDwarfDim);
  const dwarfImg = dwarf.health.cur <= 0 || startingDwarfHealth > dwarf.health.cur ? images.dwarfHurt : images.dwarf;
  c.drawImage(dwarfImg, dwarfTopLeft.x, dwarfTopLeft.y);

  if (startingDwarfHealth > 0 && dwarf.health.cur <= 0) {
    soundPlayer.play('goblinWin');
  }

  // Draw damage texts
  const hitLifetime = 1000;
  hits.forEach(hit => {
    hit.pos.x += hit.velocity.x * frameTimeSeconds * 0.5;
    hit.pos.y += hit.velocity.y * frameTimeSeconds * 0.5;
    const age = (t - hit.at) / hitLifetime;
    const col = 255 - 255*age;
    c.lineWidth = 1;
    c.fillStyle = `rgb(255,255,${col})`;
    c.fillText('' + Math.round(hit.damage), hit.pos.x, hit.pos.y+Math.sin(t/50.0)*10);
  });

  for (let i = hits.length - 1; i >= 0; i--) {
    if (t - hits[i].at > hitLifetime) {
      hits.splice(i, 1);
    }
  }


  // draw healthbars
  const healthBars = [dwarf.health, dwarf.stamina].concat(goblins.map(g => g.health));
  c.strokeStyle = 'black';
  c.lineWidth = 4;
  let healthBarStart = 0;
  healthBars.forEach(bar => {
    c.fillStyle = bar.color;
    c.beginPath();
    const barWidth = bar.max*2;
    const fillWidth = Math.round(barWidth*(bar.cur / bar.max));
    c.strokeRect(canvas.width - 8 - barWidth, healthBarStart + 5, barWidth+4, 20);
    c.fillRect(canvas.width - 4 - fillWidth, healthBarStart + 9, fillWidth, 12);
    healthBarStart += 30;
  });

  globalState.keysThisFrame = {};

  window.requestAnimationFrame((t) => {
    globalState.last = globalState.t;
    globalState.t = t;
    draw();
  });
}
