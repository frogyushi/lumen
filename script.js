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

        if (html?.id) this.element.id = html.id;
        if (html?.classList) this.element.classList.add(...html.classList);

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
        document.addEventListener("mousemove", ({ x, y }) => (this.position = { x, y }));

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

    renderVelocity(...args) {
        for (let i of args) {
            if (Math.round(this.velocity[i] * 100) != 0) {
                this.velocity[i] *= 0.93;
                continue;
            }

            this.velocity[i] = 0;
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
        const y = this.cursor.position.y / Game.PIXEL_SIZE - 7 - this.position.y;
        const x = this.cursor.position.x / Game.PIXEL_SIZE - 7 - this.position.x;

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
        this.manaUsage = options?.manaUsage || 0;
        this.rotation = character.pointer.rotation;
        this.cursor = { position: cursor.position };

        const x = this.cursor.position.x / Game.PIXEL_SIZE - 7 - this.character.position.x;
        const y = this.cursor.position.y / Game.PIXEL_SIZE - 7 - this.character.position.y;
        const rad = (this.rotation * Math.PI) / 180;

        this.directional = {
            x: x / Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)),
            y: y / Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)),
        };

        this.position = {
            x: 25 * Math.cos(rad) + character.position.x,
            y: 25 * Math.sin(rad) + character.position.y,
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
        this.position = options?.position || { x: 0, y: 0 };
        this.keypresses = new Set();
        this.hasCooldown = false;
        this.isMoving = false;
        this.cursor = cursor;
        this.maxHp = options?.maxHp || 0;
        this.maxMana = options?.maxMana || 0;
        this.mana = options?.mana || 0;
        this.fireRate = options?.fireRate || 500;

        this.pointer = new CharacterPointer({
            game,
            cursor,
            character: this,
            html: {
                classList: ["character-pointer"],
                parent: "map",
            },
        });

        setInterval(() => {
            if (this.mana < this.maxMana) {
                this.mana += 1;
            }
        }, 100);

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

    shootProjectile() {
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
            case this.input(this.keybinds.shoot):
                if (this.hasCooldown) break;
                this.hasCooldown = true;
                this.shootProjectile();

                Game.wait(this.fireRate).then(() => {
                    this.hasCooldown = false;
                });

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
        fireRate: 300,
        keybinds: {
            up: "w",
            down: "s",
            left: "a",
            right: "d",
            shoot: " ",
        },
    },
    html: {
        id: "character",
        classList: ["character-default"],
    },
});

window.addEventListener("keydown", (event) => {
    mage.keypresses.add(event.key);
    event.preventDefault();
});

window.addEventListener("keyup", (event) => {
    mage.keypresses.delete(event.key);
});
