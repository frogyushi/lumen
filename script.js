class Game {
    static PIXEL_SIZE = 4;
    static CANVAS = "map";

    constructor() {
        this.objects = new Set();
        this.map = document.getElementById("map");
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

        if (html?.id) {
            this.element.id = html.id;
        }

        if (html?.classList) {
            this.element.classList.add(...html.classList);
        }

        document.getElementById(html?.parent || Game.CANVAS).append(this.element);

        game.objects.add(this);
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

        document.addEventListener("mousemove", (event) => {
            this.position.x = event.x;
            this.position.y = event.y;
        });

        this.load();
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
        this.hp = options?.hp ? options.hp : 0;
        this.speed = options?.speed ? options.speed : 0;
        this.elapsedTime = 0;
        this.velocity = { x: 0, y: 0 };
    }

    render(c) {
        if (Math.round(this.velocity[c] * 100) != 0) this.velocity[c] *= 0.93;
        else this.velocity[c] = 0;
    }
}

class CharacterPointer extends Entity {
    constructor({ game, character, cursor, html }) {
        super({ game, html });
        this.cursor = cursor;
        this.character = character;
        this.position = character.position;

        this.load();
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
    constructor({ game, character, html, cursor }) {
        super({ game, html });
        this.mage = mage;

        this.cursor = {
            position: { ...cursor.position },
        };

        this.position = { ...character.position };
        this.rotation = character.pointer.rotation;

        this.load();
    }

    onAnimation() {
        this.animate();
    }
}

class Character extends Entity {
    constructor({ game, cursor, html, options }) {
        super({ game, html, options });
        this.keybinds = options?.keybinds || {};
        this.keypresses = new Set();
        this.hasCooldown = false;
        this.isMoving = false;
        this.cursor = cursor;

        if (options?.position) {
            this.position = options.position;
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
        new Projectile({
            game,
            cursor: this.cursor,
            character: this,
            html: {
                classList: ["fireball"],
            },
        });
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
                Game.wait(1000).then(() => (this.hasCooldown = false));
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

        this.render("x");
        this.render("y");

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
        hp: 100,
        speed: 0.15,
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

window.addEventListener("keydown", (e) => mage.keypresses.add(e.key));
window.addEventListener("keyup", (e) => mage.keypresses.delete(e.key));
