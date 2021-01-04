const canvas = {width: 1000.0, height: 1000.0};

const unloaded_images = {
    dwarf: 'dwarf.png',
    goblin: 'goblin.png',
    stoneGround: 'stone-ground.jpg',
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
	    pos: {
		x: Math.random() * canvas.width,
		y: Math.random() * canvas.height,
	    },
	    nextDestination: null,
	});
    }
    return goblins;
}

function init() {
    const ele = document.getElementById("canvas");
    const c = ele.getContext('2d');

    const images = {};
    let remaining = Object.keys(unloaded_images).length;
    Object.entries(unloaded_images).forEach(([name, path]) => {
	images[name] = image(path);
	images[name].addEventListener('load', () => {
	    console.log(`loaded "${path}" as [${name}]`);
	    if (!--remaining) {
		console.log('images loaded');
		const initialState = {t: 0, images, c, goblins: generateGoblins()};
		draw(initialState);
	    }
	})
    });
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

const goblinDim = {x: 99, y: 122};
const halfGoblinDim = vec2d.divideScalar(goblinDim, 2.0);

function draw(state) {
    const {t, images, c, goblins} = state;
    c.clearRect(0, 0, 1000, 1000);

    c.fillStyle = c.createPattern(images.stoneGround, 'repeat');
    c.fillRect(0, 0, 1000, 1000);
    
    c.drawImage(images.dwarf, 10 + 20*Math.cos(t/100.0) + 10*Math.cos(t/40.0), 10 + 20*Math.sin(t/100.0));

    const strobe = 1 + 0.5 * Math.sin(t / 15.0);
    const iconColor = `rgb(0, ${Math.round(255*strobe)}, 0)`;

    c.strokeStyle = iconColor // "#00ff00";
    c.font = '10px sans-serif';

    const goblinLen = goblins.length;
    for (let i = 0; i < goblinLen; i++) {
	const goblin = goblins[i];
	const center = vec2d.add(goblin.pos, halfGoblinDim);
	if (goblin.nextDestination) {
	    const dist = vec2d.magnitude(vec2d.subtract(goblin.nextDestination, center));
	    c.lineWidth = 1;
	    c.strokeText(''+Math.round(dist), goblin.nextDestination.x + 5, goblin.nextDestination.y);
	    if (dist < 10) {
		console.log('got there');
		goblin.nextDestination = null;
	    }
	}
	if (!goblin.nextDestination) {
	    goblin.nextDestination = {
		x: Math.random() * canvas.width,
		y: Math.random() * canvas.height,	
	    };
	}
	c.lineWidth = 3;
	c.beginPath();
	c.arc(center.x, center.y, 5, 0, 2 * Math.PI);
	c.arc(goblin.nextDestination.x, goblin.nextDestination.y, 5, 0, 2 * Math.PI);
	c.stroke();


	const travel = vec2d.towards(center, goblin.nextDestination, 0.75);
	goblin.pos = vec2d.add(goblin.pos, travel);
	c.drawImage(images.goblin, goblin.pos.x, goblin.pos.y);
    }
    
    window.requestAnimationFrame((t) => {state.t = t; draw(state);});
}
