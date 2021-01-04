const canvas = {width: 1000.0, height: 1000.0};

const unloaded_images = {
    dwarf: 'dwarf.png',
    dwarfHurt: 'dwarf-hurt.png',
    goblin: 'goblin.png',
    goblinHurt: 'goblin-hurt.png',
    stoneGround: 'stone-ground.jpg',
    bloodSplatter: 'blood-splatter.png',
    goblinBloodSplatter: 'goblin-blood-splatter.png',
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
	goblins.push({
	    health: {cur: 30, max: 30},
	    pos: {
		x: Math.random() * canvas.width,
		y: Math.random() * canvas.height,
	    },
	    nextDestination: null,
	});
    }
    return goblins;
}

// global state
const globalState = {};

function bloodFromHit(image, pos, num) {
    let bloods = [];
    for (let i = 0; i < num; i++) {
	bloods.push({
	    image,
	    pos,
	    velocity: {
		x: Math.random() * 6 - 3,
		y: Math.random() * 6 - 3,
		z: Math.random() * 10 + 10,
	    },
	});
    }
    return bloods;
}

function init() {
    const ele = document.getElementById("canvas");

    window.addEventListener("keydown", (e) => {
	globalState.keys[e.code] = 1.0;
	globalState.keysThisFrame[e.code] = 1.0;
    }, false);
    
    window.addEventListener("keyup", (e) => {
	delete globalState.keys[e.code];
    }, false);
    
    const c = ele.getContext('2d');

    const images = {};
    let remaining = Object.keys(unloaded_images).length;
    Object.entries(unloaded_images).forEach(([name, path]) => {
	images[name] = image(path);
	images[name].addEventListener('load', () => {
	    console.log(`loaded "${path}" as [${name}]`);
	    if (!--remaining) {
		console.log('images loaded');
		const initialState = {
		    t: 0,
		    images,
		    c,
		    keys: {},
		    keysThisFrame: {},
		    goblins: generateGoblins(),
		    dwarf: {
			health: {cur: 100, max: 100},
			pos: {x: 100, y: 100}
		    },
		    particles: [],
		};
		Object.assign(globalState, initialState);
		draw();
	    }
	})
    });
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
    const {t, images, c, keys, goblins, dwarf, particles} = globalState;
    if (globalState.start === undefined) {
	globalState.start = t;
	globalState.last = t;
    }
    const secondsElapsed = Math.max((t - globalState.last)/10.0, 0.0001);

    c.clearRect(0, 0, 1000, 1000);

    c.fillStyle = c.createPattern(images.stoneGround, 'repeat');
    c.fillRect(0, 0, 1000, 1000);

    const strobe = 1 + 0.5 * Math.sin(t / 15.0);
    
    const xDir = key('ArrowRight') - key('ArrowLeft');
    const yDir = key('ArrowDown') - key('ArrowUp');
    dwarf.pos = vec2d.add(dwarf.pos, {x: 5*xDir, y: 5*yDir});
    const startingDwarfHealth = dwarf.health.cur;

    const dwarfAttacked = keyPress('Space');

    if (dwarfAttacked) {
	c.fillStyle = 'white';
	c.arc(dwarf.pos.x, dwarf.pos.y, aggroDist, 0, 2 * Math.PI);
	c.fill();
    }

    c.font = '16px monospace';

    
    // Draw particles
    const numParticles = particles.length;
    const zchange = 1 * secondsElapsed;
    for (let i = 0; i < numParticles; i++) {
	const splatter = particles[i];

	if (splatter.pos.z > 0) {
	    splatter.velocity.z -= zchange;
	    splatter.pos = vec3d.add(splatter.pos, vec3d.multiplyScalar(splatter.velocity, secondsElapsed));
	}
	
	c.drawImage(images[splatter.image], splatter.pos.x, splatter.pos.y - splatter.pos.z/2.0, 105 , 68);
    }

    // Draw goblins
    const goblinLen = goblins.length;
    for (let i = 0; i < goblinLen; i++) {
	const goblin = goblins[i];
	
	const toDwarf = vec2d.magnitude(vec2d.subtract(dwarf.pos, goblin.pos));
	if (toDwarf < aggroDist) {
	    if (!goblin.foundDwarf) console.log('found ya! ATTACK!!!');
	    goblin.foundDwarf = true;
	    if (Math.random() < 0.01) { // 1% chance of attacking per frame
		console.log('goblin attacks! SWIPE!!');
		dwarf.health.cur = Math.max(0, dwarf.health.cur - 2);
		const newBlood = bloodFromHit('bloodSplatter', {x: dwarf.pos.x, y: dwarf.pos.y, z: 200}, 2);
		particles.push(...newBlood);

	    }

	    if (dwarfAttacked) {
		// apply dwarf attack damage if it's attacking within range
		const damage = 10 + Math.random()*6-3 + (Math.random() < 0.5 ? Math.random()*30 : 0);
		goblin.health.cur = Math.max(0, goblin.health.cur - damage);
		const newBlood = bloodFromHit('goblinBloodSplatter', {x: goblin.pos.x, y: goblin.pos.y, z: 100}, damage);
		particles.push(...newBlood);
		console.log(`goblin was sliced by the dwarf! Their health is now ${goblin.health.cur}`);
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

	const goblinTopLeft = vec2d.subtract(goblin.pos, halfGoblinDim);
	const goblinImg = goblin.health.cur < goblin.health.max ? images.goblinHurt : images.goblin;
	c.drawImage(goblinImg, goblinTopLeft.x, goblinTopLeft.y);
    }

    // Delete dead goblins
    for (let i = goblins.length - 1; i >= 0; i--) {
	if (!goblins[i].health.cur) {
	    goblins.splice(i, 1);
	}
    }

    // Draw Dwarf
    const dwarfTopLeft = vec2d.subtract(dwarf.pos, halfDwarfDim);
    const dwarfImg = dwarf.health.cur <= 0 || startingDwarfHealth > dwarf.health.cur ? images.dwarfHurt : images.dwarf;
    c.drawImage(dwarfImg, dwarfTopLeft.x, dwarfTopLeft.y);
    // c.beginPath();
    // c.strokeStyle = 'red';
    // c.arc(dwarf.pos.x, dwarf.pos.y, aggroDist, 0, 2 * Math.PI);
    // c.stroke();
    
    // draw healthbar
    const healthBars = [dwarf.health].concat(goblins.map(g => g.health));

    c.strokeStyle = 'black';
    c.lineWidth = 4;
    c.fillStyle = 'red';
    let healthBarStart = 0;
    healthBars.forEach(bar => {
	c.beginPath();
	const barWidth = bar.max*2;
	const fillWidth = Math.round(barWidth*(bar.cur / bar.max));
	c.strokeRect(1000 - 8 - barWidth, healthBarStart + 5, barWidth+4, 20);
	c.fillRect(1000 - 4 - fillWidth, healthBarStart + 9, fillWidth, 12);
	healthBarStart += 30;
    });

    globalState.keysThisFrame = {};
    
    window.requestAnimationFrame((t) => {
	globalState.last = globalState.t;
	globalState.t = t;
	draw();
    });
}
