class Game {
    static PIXEL_SIZE = 4;
    static CANVAS = "map";

    constructor() {
        this.objects = new Set();
        this.map = document.getElementById("map");
    }

    static getRandom(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    static wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

class GameObject {
    constructor({ game, html }) {
        this.position = { x: 0, y: 0 };
        this.rotation = 0;
        this.element = document.createElement("div");
        this.html = html;

        if (html?.id) {
            this.element.id = html.id;
        }

        if (html?.classList) {
            this.element.classList.add(...html.classList);
        }

        game.objects.add(this);
    }

    render() {
        document.getElementById(this.html?.parent || Game.CANVAS).append(this.element);
    }

    load() {
        if (typeof this.onUpdate === "function") {
            setInterval(() => this.onUpdate(), 1000 / 60);
        }

        if (typeof this.onAnimation === "function") {
            const step = () => {
                this.onAnimation();
                window.requestAnimationFrame(step);
            };

            step();
        }
    }

    animate() {
        let x = this.position.x * Game.PIXEL_SIZE;
        let y = this.position.y * Game.PIXEL_SIZE;

        this.element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${this.rotation}deg)`;
    }
}

class Cursor extends GameObject {
    constructor({ game, html }) {
        super({ game, html });

        document.addEventListener("mousemove", ({ x, y }) => {
            this.position = { x, y };
        });

        this.load();
        this.render();
    }

    onAnimation() {
        let x = this.position?.x - 28;
        let y = this.position?.y - 28;

        this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
}

class Entity extends GameObject {
    constructor({ game, html, options }) {
        super({ game, html });
        this.hp = options?.hp || 0;
        this.speed = options?.speed || 0;
        this.elapsedTime = 0;
        this.velocity = { x: 0, y: 0 };
    }

    renderVelocity(...c) {
        for (let x of c) {
            if (Math.round(this.velocity[x] * 100) != 0) this.velocity[x] *= 0.93;
            else this.velocity[x] = 0;
        }
    }
}

class CharacterPointer extends Entity {
    constructor({ game, character, cursor, html }) {
        super({ game, html });
        this.cursor = cursor;
        this.character = character;
        this.position = character.position;

        this.load();
        this.render();
    }

    onUpdate() {
        const margin = getComputedStyle(game.map).margin.slice(0, 2) / Game.PIXEL_SIZE || 0;
        const y = this.cursor.position.y / Game.PIXEL_SIZE - 7 - this.position.y - margin;
        const x = this.cursor.position.x / Game.PIXEL_SIZE - 7 - this.position.x - margin;

        this.rotation = Math.atan2(y, x) * (180 / Math.PI);
    }

    onAnimation() {
        this.animate();
    }
}

class Projectile extends Entity {
    constructor({ game, character, options, html, cursor }) {
        super({ game, html, options });
        this.character = character;
        this.cursor = { position: { ...cursor.position } };
        this.manaUsage = options?.manaUsage || 0;

        let accuracy = character?.accuracy || 0;
        let spread = Game.getRandom(-accuracy, accuracy);
        this.rotation = character.pointer.rotation - spread;

        const margin = getComputedStyle(game.map).margin.slice(0, 2) / Game.PIXEL_SIZE || 0;
        let x = this.cursor.position.x / Game.PIXEL_SIZE - 7 - this.character.position.x - margin;
        let y = this.cursor.position.y / Game.PIXEL_SIZE - 7 - this.character.position.y - margin;
        this.directional = {
            x: x / Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)),
            y: y / Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)),
        };

        let rad = (this.rotation * Math.PI) / 180;
        let r = 25;
        this.position = {
            x: r * Math.cos(rad) + character.position.x,
            y: r * Math.sin(rad) + character.position.y,
        };
    }

    onUpdate() {
        this.position.x += this.directional.x * this.speed;
        this.position.y += this.directional.y * this.speed;
    }

    onAnimation() {
        this.animate();
    }
}

class Character extends Entity {
    constructor({ game, cursor, html, options }) {
        super({ game, html, options });
        this.id = html?.id || null;
        this.keybinds = options?.keybinds || {};
        this.keypresses = new Set();
        this.hasCooldown = false;
        this.maxHp = options?.maxHp || 0;
        this.maxMana = 100;
        this.mana = options?.mana || 0;
        this.isMoving = false;
        this.cursor = cursor;

        setInterval(() => {
            if (this.mana < this.maxMana) {
                this.mana += 1;
            }
        }, 100);

        if (options?.position) {
            this.position = options.position;
        }

        if (options?.firerate) {
            this.firerate = options.firerate;
        }

        if (options?.accuracy) {
            this.accuracy = options.accuracy;
        }

        this.pointer = new CharacterPointer({
            game,
            cursor,
            character: this,
            html: {
                classList: ["character-pointer"],
                parent: "map",
            },
        });

        this.load();
        this.render();
    }

    set view(direction) {
        this.element.setAttribute("view", direction);
    }

    input(...keypresses) {
        for (const key of keypresses) {
            if (!this.keypresses.has(key)) {
                return false;
            }
        }

        return true;
    }

    attack() {
        const projectile = new Projectile({
            game,
            cursor: this.cursor,
            character: this,
            options: {
                speed: 1.5,
                manaUsage: 10,
            },
            html: {
                classList: ["fireball"],
            },
        });

        if (this.mana - projectile.manaUsage > 0) {
            this.mana -= projectile.manaUsage;
            projectile.load();
            projectile.render();
        }
    }

    onUpdate() {
        this.isMoving = true;
        this.elapsedTime += 0.01;
        this.view = this.pointer.rotation < 90 && this.pointer.rotation > -90 ? "right" : "left";

        switch (true) {
            case this.input(this.keybinds.attack):
                if (this.hasCooldown) break;
                this.hasCooldown = true;
                this.attack();
                Game.wait(this.firerate).then(() => (this.hasCooldown = false));
                break;
        }

        switch (true) {
            case this.input(this.keybinds.up, this.keybinds.right):
                this.velocity.x += this.elapsedTime;
                this.velocity.y -= this.elapsedTime;
                break;
            case this.input(this.keybinds.down, this.keybinds.right):
                this.velocity.x += this.elapsedTime;
                this.velocity.y += this.elapsedTime;
                break;
            case this.input(this.keybinds.up, this.keybinds.left):
                this.velocity.x -= this.elapsedTime;
                this.velocity.y -= this.elapsedTime;
                break;
            case this.input(this.keybinds.down, this.keybinds.left):
                this.velocity.x -= this.elapsedTime;
                this.velocity.y += this.elapsedTime;
                break;
            case this.input(this.keybinds.up):
                this.velocity.y -= this.elapsedTime;
                break;
            case this.input(this.keybinds.down):
                this.velocity.y += this.elapsedTime;
                break;
            case this.input(this.keybinds.left):
                this.velocity.x -= this.elapsedTime;
                break;
            case this.input(this.keybinds.right):
                this.velocity.x += this.elapsedTime;
                break;
            default:
                this.isMoving = false;
                break;
        }

        this.renderVelocity("x", "y");
        this.move();

        if (this.elapsedTime > this.speed) {
            this.elapsedTime = this.speed;
        }
    }

    onAnimation() {
        this.animate();
    }

    move() {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

const game = new Game();

const cursor = new Cursor({
    game,
    html: {
        parent: "canvas",
        id: "cursor",
    },
});

const mage = new Character({
    game,
    cursor,
    options: {
        maxHp: 50,
        hp: 50,
        maxMana: 100,
        mana: 100,
        speed: 0.15,
        accuracy: 0,
        firerate: 300,
        keybinds: {
            up: "w",
            down: "s",
            left: "a",
            right: "d",
            attack: " ",
        },
    },
    html: {
        id: "character",
        classList: ["character-default"],
    },
});

window.addEventListener("keydown", function (e) {
    if (e.key == " " && e.target == document.body) {
        e.preventDefault();
    }
});

window.addEventListener("keydown", (e) => mage.keypresses.add(e.key));
window.addEventListener("keyup", (e) => mage.keypresses.delete(e.key));
