class Game {
    static PIXEL_SIZE = 4;
    static UPDATE_RATE = 1000 / 60;

    constructor() {
        this.objects = new Set();
    }

    static getRandom(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    static getRandomArray(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    static count(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

class GameObject {
    constructor({ game, html, data }) {
        this.game = game;
        this.html = html;
        this.element = document.createElement("div");
        this.hasCollision = data?.hasCollision || false;
        this.isDefaultDestructable = false;
        this.sprite = data?.sprite || "./images/none.png";
        this.rotation = 0;
        this.position = data?.position || { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.size = data?.size || { x: 0, y: 0 };

        if (this.sprite) this.setSprite(this.sprite);
        if (html?.id) this.element.id = html.id;
        if (html?.classList) this.element.classList.add(...html.classList);

        this.game.objects.add(this);
    }

    setSprite(url) {
        this.sprite = url;
        this.element.style.backgroundImage = `url(${url})`;
    }

    renderElement() {
        document.getElementById(this.html?.parent || "map").append(this.element);
    }

    loadEvents() {
        this.onLoad?.();

        if (typeof this.onUpdate === "function") {
            setInterval(() => this.onUpdate(), Game.UPDATE_RATE);
        }

        if (typeof this.onAnimation === "function") {
            const iteration = () => {
                this.onAnimation();
                window.requestAnimationFrame(iteration);
            };

            iteration();
        }
    }

    updatePosition() {
        const x = this.position.x * Game.PIXEL_SIZE;
        const y = this.position.y * Game.PIXEL_SIZE;

        this.element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${this.rotation}deg)`;
    }

    delete() {
        this.element.remove();
        this.game.objects.delete(this);
    }
}

class Cursor extends GameObject {
    constructor({ game, html, data }) {
        super({ game, html, data });

        document.addEventListener("mousemove", (mouse) => {
            this.position = {
                x: mouse.x,
                y: mouse.y,
            };
        });

        this.loadEvents();
        this.renderElement();
    }

    onAnimation() {
        let x = this.position?.x - 28;
        let y = this.position?.y - 28;

        this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
}

class Item extends GameObject {
    constructor({ game, html, data }) {
        super({ game, html, data });

        this.loadEvents();
        this.renderElement();

        const x = options?.position.x * Game.PIXEL_SIZE;
        const y = options?.position.y * Game.PIXEL_SIZE;

        this.element.animate(
            [
                { transform: `translate3d(${x}px, ${y - 1}px, 0)` },
                { transform: `translate3d(${x}px, ${y + 2}px, 0)` },
                { transform: `translate3d(${x}px, ${y - 1}px, 0)` },
            ],
            {
                duration: 1000,
                iterations: Infinity,
            }
        );
    }
}

class Tile extends GameObject {
    static SPRITES = {
        11: "./images/floor.png",
        111: "./images/floor-1.png",
        112: "./images/floor-2.png",
        12: "./images/floor-pebble.png",
        13: "./images/floor-grass.png",
        21: "./images/top-left-wall.png",
        22: "./images/top-wall.png",
        221: "./images/top-wall-1.png",
        222: "./images/top-wall-2.png",
        23: "./images/top-right-wall.png",
        24: "./images/left-wall.png",
        241: "./images/left-wall-1.png",
        242: "./images/left-wall-2.png",
        25: "./images/right-wall.png",
        251: "./images/right-wall-1.png",
        252: "./images/right-wall-2.png",
        26: "./images/bottom-left-wall.png",
        27: "./images/bottom-wall.png",
        271: "./images/bottom-wall-1.png",
        272: "./images/bottom-wall-2.png",
        28: "./images/bottom-right-wall.png",
    };

    constructor({ game, html, data }) {
        super({ game, html, data });

        this.setSpriteById(data?.id);

        this.loadEvents();
        this.renderElement();
        this.updatePosition();
    }

    setSpriteById(id) {
        for (const img in Tile.SPRITES) {
            if (img != id) continue;
            this.setSprite(Tile.SPRITES[id]);
        }
    }
}

class Room {
    constructor({ game, layout }) {
        this.game = game;
        this.layout = layout;

        this.generate();
    }

    generate() {
        for (let y = 0; y < this.layout.length; y++) {
            for (let x = 0; x < this.layout[y].length; x++) {
                const tile = this.layout[y][x];
                if (tile === 0) continue;
                const type = Array.from(String(tile), Number)[0];
                if ([11, 12, 13, 22, 24, 25, 27].includes(tile)) {
                    if (Game.getRandom(0, 100) > 80) {
                        const id1 = String(type) + Game.getRandom(1, 3);
                        const id2 = String(tile) + Game.getRandom(1, 2);
                        this.layout[y][x] = Tile.SPRITES.hasOwnProperty(id2)
                            ? Number(id2)
                            : Number(id1);
                    }
                }

                new Tile({
                    game: this.game,
                    data: {
                        id: this.layout[y][x],
                        size: { x: 16, y: 16 },
                        position: { x: x * 16, y: y * 16 },
                        hasCollision: type === 1 ? false : true,
                    },
                    html: { classList: ["tile"] },
                });
            }
        }
    }
}

class Entity extends GameObject {
    constructor({ game, html, data }) {
        super({ game, html, data });
        this.stats = data?.stats;
        this.isMoving = false;
        this.acceleration = 0;
    }

    setView(direction) {
        this.element.setAttribute("view", direction);
    }

    renderCollision(object) {
        const center = {
            x: this.position.x + this.size.x / 2,
            y: this.position.y + this.size.y / 2,
        };

        let x = center.x;
        let y = center.y;

        if (center.x < object.position.x) x = object.position.x;
        if (center.x > object.position.x + object.size.x) x = object.position.x + object.size.x;
        if (center.y < object.position.y) y = object.position.y;
        if (center.y > object.position.y + object.size.y) y = object.position.y + object.size.y;

        const dist = { x: center.x - x, y: center.y - y };
        return Math.sqrt(dist.x * dist.x + dist.y * dist.y) <= 8 ? true : false;
    }

    addCollider(object, callback) {
        if (this.renderCollision(object) === false) return;

        const collider = { x: 0, y: 0 };

        const up = this.position.y + object.size.y - object.position.y;
        const down = this.position.y - (object.position.y + object.size.y);
        const left = this.position.x - (object.position.x + object.size.x);
        const right = this.position.x + this.size.x - object.position.x;

        if (up > 0 && up < 3) collider.y = up;
        if (down < 0 && down > -3) collider.y = down;
        if (right > 0 && right < 3) collider.x = right;
        if (left < 0 && left > -3) collider.x = left;

        callback?.();

        this.position.x -= collider.x;
        this.position.y -= collider.y;
    }

    renderVelocity() {
        for (const axis of ["x", "y"]) {
            const v = Math.round(this.velocity[axis] * 100);
            this.velocity[axis] = v !== 0 ? this.velocity[axis] * 0.93 : 0;
        }

        if (this.acceleration > this.stats.speed) {
            this.acceleration = this.stats.speed;
        }
    }

    move() {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

class Projectile extends Entity {
    constructor({ game, html, data, cursor, character }) {
        super({ game, html, data });
        this.game = game;
        this.character = character;
        this.rotation = character.pointer.rotation;
        this.stats = data?.stats;
        this.cursor = { position: cursor.position };
        this.position = character.position;
        this.isMoving = true;

        const x = this.cursor.position.x / Game.PIXEL_SIZE - 7 - this.position.x;
        const y = this.cursor.position.y / Game.PIXEL_SIZE - 7 - this.position.y;
        const v = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
        const rad = (this.rotation * Math.PI) / 180;

        this.vector = { x: x / v, y: y / v };
        this.position = {
            x: 25 * Math.cos(rad) + this.position.x,
            y: 25 * Math.sin(rad) + this.position.y,
        };
    }

    onUpdate() {
        const filter = ["Projectile"];
        const objects = [...game.objects]
            .filter((o) => o !== this && o.hasCollision)
            .filter((o) => filter.includes(o.constructor.name) === false);

        for (const object of objects) {
            if (!this.isMoving) continue;

            if (
                this.position.x + this.size.x > object.position.x &&
                object.position.x + object.size.x > this.position.x &&
                this.position.y + this.size.y > object.position.y &&
                object.position.y + object.size.y > this.position.y
            ) {
                this.isMoving = false;
                this.position[0] = { ...this.position };
                this.delete();

                if (object.defaultDestructable) {
                    if (object.stats?.hp > 0) {
                        object.stats.hp -= this.stats.damage;
                    }
                }
            }
        }

        this.position.x += this.vector.x * this.stats.speed;
        this.position.y += this.vector.y * this.stats.speed;
    }

    onAnimation() {
        this.updatePosition();
    }
}

class CharacterPointer extends Entity {
    constructor({ game, html, data, cursor, character }) {
        super({ game, html, data });
        this.cursor = cursor;
        this.character = character;
        this.position = character.position;

        this.loadEvents();
        this.renderElement();
    }

    onUpdate() {
        if (this.effect === false && this.enableEffect) {
            this.effect = true;
            Game.wait(this.effectUpdateRate).then(() => (this.effect = false));
        }

        const y = this.cursor.position.y / Game.PIXEL_SIZE - 7 - this.position.y;
        const x = this.cursor.position.x / Game.PIXEL_SIZE - 7 - this.position.x;

        this.rotation = Math.atan2(y, x) * (180 / Math.PI);
    }

    onAnimation() {
        this.updatePosition();
    }
}

class Character extends Entity {
    constructor({ game, html, data, cursor }) {
        super({ game, html, data });
        this.id = html?.id || null;
        this.keypresses = new Set();
        this.equipment = 1;
        this.hasCooldown = false;
        this.isMoving = false;
        this.cursor = cursor;
        this.keybinds = data?.keybinds || {};
        this.stats = data?.stats || {};

        this.pointer = new CharacterPointer({
            game,
            cursor,
            character: this,
            html: {
                classList: ["character-pointer"],
            },
        });

        window.addEventListener("keydown", (e) => this.keypresses.add(e.key));
        window.addEventListener("keyup", (e) => this.keypresses.delete(e.key));

        this.loadEvents();
        this.renderElement();
    }

    input(...keypresses) {
        for (const key of keypresses) {
            if (this.keypresses.has(key)) continue;
            return false;
        }

        return true;
    }

    castSpell() {
        const p = new Projectile({
            game,
            cursor: this.cursor,
            character: this,
            data: {
                sprite: "./images/fireball.png",
                stats: {
                    damage: 10,
                    speed: 1.5,
                    manaUsage: 10,
                },
                size: { x: 16, y: 16 },
            },
            html: { classList: ["fireball"] },
        });

        if (this.stats.mana - p.stats.manaUsage > 0) {
            this.stats.mana -= p.stats.manaUsage;
            p.loadEvents();
            p.renderElement();
        }
    }

    onUpdate() {
        this.isMoving = true;
        this.acceleration += 0.01;

        const view = this.pointer.rotation < 90 && this.pointer.rotation > -90 ? "right" : "left";
        const equipment = { 1: "staff", 2: "blade" }[this.equipment];

        this.setView(view);

        this.pointer.setSprite(`./images/${equipment}-${view}.png`);
        this.setSprite(`./images/mage-${view}.png`);

        switch (true) {
            case this.input(this.keybinds.slot[1]):
                this.equipment = 1;
                break;
            case this.input(this.keybinds.slot[2]):
                this.equipment = 2;
                break;
            case this.input(this.keybinds.useEquipment):
                if (this.hasCooldown) break;
                this.hasCooldown = true;
                if (this.equipment === 1) this.castSpell();
                Game.count(this.stats.fireRate).then(() => (this.hasCooldown = false));
                break;
        }

        switch (true) {
            case this.input(this.keybinds.up, this.keybinds.right):
                this.velocity.x += this.acceleration;
                this.velocity.y -= this.acceleration;
                break;
            case this.input(this.keybinds.down, this.keybinds.right):
                this.velocity.x += this.acceleration;
                this.velocity.y += this.acceleration;
                break;
            case this.input(this.keybinds.up, this.keybinds.left):
                this.velocity.x -= this.acceleration;
                this.velocity.y -= this.acceleration;
                break;
            case this.input(this.keybinds.down, this.keybinds.left):
                this.velocity.x -= this.acceleration;
                this.velocity.y += this.acceleration;
                break;
            case this.input(this.keybinds.up):
                this.velocity.y -= this.acceleration;
                break;
            case this.input(this.keybinds.down):
                this.velocity.y += this.acceleration;
                break;
            case this.input(this.keybinds.left):
                this.velocity.x -= this.acceleration;
                break;
            case this.input(this.keybinds.right):
                this.velocity.x += this.acceleration;
                break;
            default:
                this.isMoving = false;
                break;
        }

        const filter = ["Character", "Cursor", "Effect", "Tile"];

        const objects = [...game.objects]
            .filter((o) => o !== this)
            .filter((o) => filter.includes(o.constructor.name) === false);

        for (const object of objects) {
            if (
                this.position.x + this.size.x > object.position.x &&
                object.position.x + object.size.x > this.position.x &&
                this.position.y + this.size.y > object.position.y &&
                object.position.y + -(object.size.y / 2) > this.position.y
            ) {
                this.element.style.zIndex = 0;
                this.pointer.element.style.zIndex = 1;
                object.element.style.zIndex = 1;
            } else {
                this.element.style.zIndex = 1;
                this.pointer.element.style.zIndex = 1;
                object.element.style.zIndex = 0;
            }
        }

        [...game.objects]
            .filter((o) => o !== this && o.hasCollision)
            .filter((o) => ["Frog"].includes(o.constructor.name) === false)
            .forEach((c) => this.addCollider(c));

        this.renderVelocity();
        this.move();
    }

    onAnimation() {
        this.updatePosition();
    }
}

class Chest extends Entity {
    constructor({ game, html, data, character }) {
        super({ game, html, data });
        this.character = character;
        this.opened = false;

        this.loadEvents();
        this.renderElement();
    }

    onUpdate() {
        if (this.stats.hp < (this.stats.maxHp / 100) * 66.6) {
            this.element.style.backgroundImage = `url(./images/chest-half.png)`;
        }

        if (this.stats.hp < (this.stats.maxHp / 100) * 33.3) {
            this.element.style.backgroundImage = `url(./images/chest-broken.png)`;
        }

        if (this.stats.hp <= 0 && this.opened == false) {
            this.opened = true;
            this.delete();
        }

        this.renderVelocity();
        this.move();
    }

    onAnimation() {
        this.updatePosition();
    }
}

class Frog extends Entity {
    constructor({ game, html, data, character }) {
        super({ game, html, data });
        this.isMoving = false;
        this.stats = data?.stats;
        this.delay = data?.jumpDelay;
        this.character = character;
        this.duration = 0;
        this.active = false;
        this.view = "left";
        this.type = Game.getRandom(1, 2);

        this.loadEvents();
        this.renderElement();
    }

    data() {
        const x = (this.center.x - this.position.x) / 100;
        const y = (this.center.y - this.position.y) / 100;
        const d = Math.round(Math.sqrt(x * x + y * y) * 100) / 100;
        const speed = Math.round((2 / d) * 100 * Game.getRandom(1, 2)) / 100;

        this.view = x > 0 ? "right" : "left";

        return { x, y, speed };
    }

    bounce() {}

    onUpdate() {
        this.center = {
            x: this.character.position.x + this.character.size.x / 2,
            y: this.character.position.y + this.character.size.y / 2,
        };

        if (this.stats.hp <= 0) {
            this.shadow.delete();
            this.delete();
        }

        this.setView(this.view);
        this.setSprite(`./images/frog-${this.view}${this.active ? "-jump" : ""}-2.png`);

        const direction = { x: this.data().x, y: this.data().y };
        const filter = ["Character", "Cursor"];

        [...game.objects]
            .filter((o) => o !== this && o.hasCollision)
            .filter((o) => filter.includes(o.constructor.name) === false)
            .forEach((o) => this.addCollider(o, () => this.bounce()));

        if (this.duration === 0) {
            this.active = true;
            this.velocity.x = this.stats.speed * this.data().speed * direction.x;
            this.velocity.y = this.stats.speed * this.data().speed * direction.y;
            this.duration = Game.getRandom(this.delay, this.delay + 40);
        }

        if (this.duration < this.delay / 2) {
            this.active = false;
            this.velocity.x = 0;
            this.velocity.y = 0;
            this.duration--;
        } else {
            this.duration--;
        }

        this.move();
        this.renderVelocity();
    }

    onAnimation() {
        this.updatePosition();
    }
}

const game = new Game();

const room = new Room({
    game,
    layout: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 21, 22, 22, 22, 221, 22, 22, 22, 222, 22, 22, 23],
        [0, 24, 111, 112, 11, 11, 11, 11, 11, 11, 112, 111, 25],
        [0, 242, 11, 11, 11, 11, 11, 13, 11, 12, 11, 11, 25],
        [0, 24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [0, 24, 11, 13, 12, 11, 112, 111, 11, 11, 11, 11, 252],
        [0, 24, 11, 11, 11, 11, 111, 111, 112, 11, 11, 11, 25],
        [0, 24, 11, 11, 11, 11, 11, 111, 11, 11, 12, 11, 25],
        [0, 24, 11, 11, 11, 11, 11, 12, 11, 11, 11, 11, 25],
        [0, 242, 11, 111, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [0, 24, 11, 12, 11, 11, 13, 11, 11, 11, 13, 112, 25],
        [0, 24, 112, 11, 11, 11, 11, 11, 11, 11, 112, 111, 25],
        [0, 26, 27, 27, 27, 27, 272, 271, 27, 27, 27, 27, 28],
    ],
});

const cursor = new Cursor({
    game,
    html: {
        parent: "canvas",
        id: "cursor",
    },
    data: { sprite: "./images/cursor-default.png" },
});

const character = new Character({
    game,
    cursor,
    data: {
        stats: {
            maxHp: 50,
            hp: 50,
            maxMana: 100,
            mana: 100,
            speed: 0.15,
            fireRate: 300,
            baseDamage: 10,
        },
        size: { x: 16, y: 16 },
        position: { x: 16 * Game.getRandom(3, 10), y: 16 * Game.getRandom(3, 10) },
        keybinds: {
            up: "w",
            down: "s",
            left: "a",
            right: "d",
            useEquipment: " ",
            slot: {
                1: "1",
                2: "2",
            },
        },
    },
    html: {
        id: "character",
        classList: ["character-default"],
    },
});

new Frog({
    game,
    character,
    data: {
        hasCollision: true,
        isDefaultDestructable: true,
        stats: {
            maxHp: 50,
            hp: 50,
            speed: 0.5,
            attackSpeed: 1,
            baseDamage: 5,
        },
        jumpDelay: 75,
        size: { x: 16, y: 16 },
        position: { x: 16 * Game.getRandom(2, 11), y: 16 * Game.getRandom(2, 11) },
    },
    html: { classList: ["frog"] },
});

new Frog({
    game,
    character,
    data: {
        hasCollision: true,
        isDefaultDestructable: true,
        stats: {
            maxHp: 50,
            hp: 50,
            speed: 0.5,
            attackSpeed: 1,
            baseDamage: 5,
        },
        jumpDelay: 75,
        size: { x: 16, y: 16 },
        position: { x: 16 * Game.getRandom(2, 11), y: 16 * Game.getRandom(2, 11) },
    },
    html: { classList: ["frog"] },
});

new Chest({
    game,
    character,
    data: {
        sprite: "./images/chest-full.png",
        hasCollision: true,
        isDefaultDestructable: true,
        stats: {
            maxHp: 100,
            hp: 100,
        },
        size: { x: 16, y: 16 },
        position: { x: 16 * Game.getRandom(3, 10), y: 16 * Game.getRandom(3, 10) },
    },
    html: { classList: ["chest"] },
});

new Chest({
    game,
    character,
    data: {
        sprite: "./images/chest-full.png",
        hasCollision: true,
        isDefaultDestructable: true,
        stats: {
            maxHp: 100,
            hp: 100,
        },
        size: { x: 16, y: 16 },
        position: { x: 16 * Game.getRandom(3, 10), y: 16 * Game.getRandom(3, 10) },
    },
    html: { classList: ["chest"] },
});
