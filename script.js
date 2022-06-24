class Game {
    static PIXEL_SIZE = 4;
    static UPDATE_RATE = 1000 / 60;
    static ROOM_OFFSET = { x: 1, y: 1 };

    constructor() {
        this.objects = new Set();
    }

    static random(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    static css(element, css) {
        return Object.assign(element.style, css);
    }

    static sample(array) {
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
        this.isMoving = false;
        this.element = document.createElement("div");
        this.hasCollision = data?.hasCollision || false;
        this.isDefaultDestructable = false;
        this.sprite = data?.sprite;
        this.rotation = 0;
        this.position = data?.position || { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.size = data?.size || { x: 0, y: 0 };

        if (this.sprite) this.setSprite(this.sprite);
        if (html?.id) this.element.id = html.id;
        if (html?.classList) this.element.classList.add(...html.classList);

        this.game.objects.add(this);
    }

    setDefaultEffect(callback, data) {
        if (this.game.objects.has(this) && this.effect == false) {
            this.effect = true;
            callback();
            Game.count(data.duration).then(() => (this.effect = false));
        }
    }

    setSprite(url) {
        this.sprite = url;
        this.element.style.backgroundImage = `url(${url})`;
    }

    renderElement() {
        document.getElementById(this.html?.parent || "map").append(this.element);
    }

    loadEvents() {
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
        121: "./images/floor-pebble.png",
        122: "./images/floor-grass.png",
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

                if ([22, 24, 25, 27].includes(tile)) {
                    if (Game.random(0, 100) > 80) {
                        this.layout[y][x] = String(tile) + Game.random(1, 2);
                    }
                }

                if ([11, 12].includes(tile)) {
                    if (Game.random(0, 100) > 80) {
                        this.layout[y][x] = String(Game.sample([11, 12])) + Game.random(1, 2);
                    }
                }

                new Tile({
                    game: this.game,
                    data: {
                        id: this.layout[y][x],
                        size: { x: 16, y: 16 },
                        position: {
                            x: x * 16 + Game.ROOM_OFFSET.x * 16,
                            y: y * 16 + Game.ROOM_OFFSET.y * 16,
                        },
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
    constructor({ game, html, data, cursor }) {
        super({ game, html, data });
        this.game = game;
        this.rotation = data?.rotation;
        this.position = data?.position;
        this.hasCollided = false;
        this.effect = false;

        const x = cursor.position.x / Game.PIXEL_SIZE - 7 - this.position.x;
        const y = cursor.position.y / Game.PIXEL_SIZE - 7 - this.position.y;
        const v = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
        const rad = (this.rotation * Math.PI) / 180;

        this.vector = { x: x / v, y: y / v };

        this.position = {
            x: 25 * Math.cos(rad) + this.position.x,
            y: 25 * Math.sin(rad) + this.position.y,
        };
    }

    onCollision(callback, data) {
        [...this.game.objects]
            .filter((o) => o !== this && o.hasCollision)
            .filter((o) => ["Projectile"].includes(o.constructor.name) === false)
            .forEach((o) => {
                if (this.isMoving === false) return;

                if (
                    this.position.x + this.size.x > o.position.x + 7 &&
                    o.position.x + o.size.x - 7 > this.position.x &&
                    this.position.y + this.size.y > o.position.y + 7 &&
                    o.position.y + o.size.y - 7 > this.position.y
                ) {
                    this.isMoving = false;
                    this.position[0] = { ...this.position };
                    this.delete();

                    const r = setInterval(() => callback(), data.iterations);
                    Game.count(data.duration).then(() => clearInterval(r));

                    if (o.stats?.hp > 0 && o.defaultDestructable) {
                        o.stats.hp -= this.stats.damage;
                    }
                }
            });
    }

    updateVector() {
        this.position.x += this.vector.x * this.stats.speed;
        this.position.y += this.vector.y * this.stats.speed;
    }
}

class Fireball extends Projectile {
    constructor({ game, html, data, cursor }) {
        super({ game, html, data, cursor });
        this.game = game;
        this.stats = data?.stats;
        this.isMoving = true;
    }

    onUpdate() {
        this.onCollision(
            () => {
                new Effect({
                    game: this.game,
                    data: {
                        updateRate: 400,
                        color: Game.sample(["#fff42d", "#f26262", "#f2bd62"]),
                        duration: 400,
                        size: { x: 2, y: 2 },
                        position: {
                            x: Game.random(this.position.x + 8 - 1, this.position.x + 8 + 1),
                            y: Game.random(this.position.y + 8 - 1, this.position.y + 8 + 1),
                        },
                    },
                    html: {
                        classList: ["effect"],
                    },
                });

                new Effect({
                    game: this.game,
                    data: {
                        updateRate: 400,
                        color: Game.sample(["#fff42d", "#f26262", "#f2bd62", "#6e6e6e", "#FFFFFF"]),
                        duration: 1000,
                        size: { x: 1, y: 1 },
                        position: {
                            x: Game.random(this.position.x + 8 - 5, this.position.x + 8 + 5),
                            y: Game.random(this.position.y + 8 - 5, this.position.y + 8 + 5),
                        },
                    },
                    html: {
                        classList: ["effect"],
                    },
                });
            },
            {
                iterations: 20,
                duration: 100,
            }
        );

        this.setDefaultEffect(
            () => {
                new Effect({
                    game: this.game,
                    data: {
                        updateRate: 400,
                        color: Game.sample(["#fff42d", "#f26262", "#f2bd62"]),
                        duration: 1000,
                        size: { x: 1, y: 1 },
                        position: {
                            x: Game.random(this.position.x + 8 - 1, this.position.x + 8 + 1),
                            y: Game.random(this.position.y + 8 - 1, this.position.y + 8 + 1),
                        },
                    },
                    html: {
                        classList: ["effect"],
                    },
                });
            },
            {
                duration: 20,
            }
        );

        this.updateVector();
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
        this.effect = false;

        this.loadEvents();
        this.renderElement();
    }

    onUpdate() {
        if (this.effect === false && this.enableEffect) {
            this.effect = true;
            Game.count(this.effectUpdateRate).then(() => (this.effect = false));
        }

        this.setDefaultEffect(
            () => {
                const rad = (this.rotation * Math.PI) / 180;

                new Effect({
                    game: this.game,
                    data: {
                        updateRate: 700,
                        color: Game.sample(["#5fcde4", "#aeebf8", "#aeebf8"]),
                        duration: 700,
                        size: { x: 1, y: 1 },
                        position: {
                            x: 22 * Math.cos(rad) + character.position.x + 7.5 + Game.random(-3, 3),
                            y: 22 * Math.sin(rad) + character.position.y + 7.5 + Game.random(-3, 3),
                        },
                    },
                    html: {
                        classList: ["effect"],
                    },
                });
            },
            {
                duration: 50,
            }
        );

        const y = this.cursor.position.y / Game.PIXEL_SIZE - 7 - this.position.y;
        const x = this.cursor.position.x / Game.PIXEL_SIZE - 7 - this.position.x;

        this.rotation = Math.atan2(y, x) * (180 / Math.PI);
    }

    onAnimation() {
        this.updatePosition();
    }
}

class Effect extends GameObject {
    constructor({ game, html, data }) {
        super({ game, html, data });

        Game.css(this.element, {
            backgroundColor: data?.color,
            width: this.size.x * Game.PIXEL_SIZE + "px",
            height: this.size.y * Game.PIXEL_SIZE + "px",
            animation: `fadeOut ${data?.duration || 0}ms`,
        });

        this.loadEvents();
        this.renderElement();
        this.updatePosition();

        Game.count(data?.updateRate || 100).then(() => this.delete());
    }
}

class Character extends Entity {
    constructor({ game, html, data, cursor }) {
        super({ game, html, data });
        this.id = html?.id || null;
        this.keypresses = new Set();
        this.hasCooldown = false;
        this.isMoving = false;
        this.cursor = cursor;
        this.keybinds = data?.keybinds || {};
        this.stats = data?.stats || {};
        this.selectedSpell = 1;
        this.effect = false;

        this.pointer = new CharacterPointer({
            game,
            cursor,
            character: this,
            html: {
                classList: ["character-pointer"],
            },
        });

        setInterval(() => {
            if (this.stats.mana < this.stats.maxMana) {
                this.stats.mana++;
            }
        }, 100);

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
        let spell = null;

        switch (this.selectedSpell) {
            case 1:
                spell = new Fireball({
                    game,
                    cursor: this.cursor,
                    character: this,
                    data: {
                        sprite: "./images/fireball.png",
                        rotation: this.pointer.rotation,
                        position: this.position,
                        size: { x: 16, y: 16 },
                        stats: {
                            damage: 10,
                            speed: 1.5,
                            manaUsage: 10,
                        },
                    },
                    html: { classList: ["fireball"] },
                });
                break;
        }

        if (this.stats.mana - spell.stats.manaUsage < 0) return;
        this.stats.mana -= spell.stats.manaUsage;

        spell.loadEvents();
        spell.renderElement();
    }

    onUpdate() {
        const view = this.pointer.rotation < 90 && this.pointer.rotation > -90 ? "right" : "left";

        this.isMoving = true;
        this.acceleration += 0.01;
        this.pointer.setSprite(`./images/staff-${view}.png`);
        this.setSprite(`./images/mage-${view}.png`);
        this.setView(view);

        switch (true) {
            case this.input(this.keybinds.cast):
                if (this.hasCooldown) break;
                this.hasCooldown = true;
                this.castSpell();
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

        if (this.isMoving) {
            this.setDefaultEffect(
                () => {
                    new Effect({
                        game: this.game,
                        data: {
                            updateRate: 300,
                            color: Game.sample(["#3c312d", "#574742"]),
                            duration: 300,
                            size: { x: 1, y: 1 },
                            position: {
                                x: Game.random(this.position.x + 8 - 2, this.position.x + 8 + 2),
                                y: Game.random(this.position.y + 16, this.position.y + 17),
                            },
                        },
                        html: {
                            classList: ["effect"],
                        },
                    });
                },
                {
                    duration: 50,
                }
            );
        }

        const filter = ["Character", "Cursor", "Effect", "Tile"];
        [...this.game.objects]
            .filter((o) => o !== this && o.hasCollision)
            .filter((o) => filter.includes(o.constructor.name) === false)
            .forEach((o) => {
                if (
                    this.position.x + this.size.x > o.position.x &&
                    o.position.x + o.size.x > this.position.x &&
                    this.position.y + this.size.y > o.position.y &&
                    o.position.y + -(o.size.y / 2) > this.position.y
                ) {
                    this.element.style.zIndex = 0;
                    o.element.style.zIndex = 1;
                } else {
                    this.element.style.zIndex = 1;
                    o.element.style.zIndex = 0;
                }
            });

        [...this.game.objects]
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
        this.effect = false;

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

        this.setDefaultEffect(
            () => {
                new Effect({
                    game: this.game,
                    data: {
                        updateRate: 1000,
                        color: "#f2bd62",
                        duration: 1000,
                        size: { x: 1, y: 1 },
                        position: {
                            x: Game.random(this.position.x + 8 - 10, this.position.x + 8 + 10),
                            y: Game.random(this.position.y + 8 - 10, this.position.y + 8 + 10),
                        },
                    },
                    html: {
                        classList: ["effect"],
                    },
                });
            },
            {
                duration: 300,
            }
        );

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
        this.type = Game.random(1, 2);

        this.loadEvents();
        this.renderElement();
    }

    data() {
        const x = (this.center.x - this.position.x) / 100;
        const y = (this.center.y - this.position.y) / 100;
        const d = Math.round(Math.sqrt(x * x + y * y) * 100) / 100;
        const speed = Math.round((2 / d) * 100 * Game.random(1, 2)) / 100;

        this.view = x > 0 ? "right" : "left";

        return { x, y, speed };
    }

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

        [...this.game.objects]
            .filter((o) => o !== this && o.hasCollision)
            .filter((o) => filter.includes(o.constructor.name) === false)
            .forEach((o) => this.addCollider(o));

        if (this.duration === 0) {
            this.active = true;
            this.velocity.x = this.stats.speed * this.data().speed * direction.x;
            this.velocity.y = this.stats.speed * this.data().speed * direction.y;
            this.duration = Game.random(this.delay, this.delay + 40);
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
        [21, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23],
        [24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [26, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 28],
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
        size: { x: 16, y: 16 },
        position: {
            x: 16 * Game.random(3, 10) + Game.ROOM_OFFSET.x * 16,
            y: 16 * Game.random(3, 10) + Game.ROOM_OFFSET.y * 16,
        },
        stats: {
            maxHp: 50,
            hp: 50,
            maxMana: 100,
            mana: 1000000000,
            speed: 0.15,
            fireRate: 300,
            baseDamage: 10,
        },
        keybinds: {
            up: "w",
            down: "s",
            left: "a",
            right: "d",
            cast: " ",
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
        jumpDelay: 75,
        size: { x: 16, y: 16 },
        position: {
            x: 16 * Game.random(2, 9) + Game.ROOM_OFFSET.x * 16,
            y: 16 * Game.random(2, 9) + Game.ROOM_OFFSET.y * 16,
        },
        stats: {
            maxHp: 50,
            hp: 50,
            speed: 0.5,
            attackSpeed: 1,
            baseDamage: 5,
        },
    },
    html: { classList: ["frog"] },
});

new Frog({
    game,
    character,
    data: {
        hasCollision: true,
        isDefaultDestructable: true,
        jumpDelay: 75,
        size: { x: 16, y: 16 },
        position: {
            x: 16 * Game.random(2, 9) + Game.ROOM_OFFSET.x * 16,
            y: 16 * Game.random(2, 9) + Game.ROOM_OFFSET.y * 16,
        },
        stats: {
            maxHp: 50,
            hp: 50,
            speed: 0.5,
            attackSpeed: 1,
            baseDamage: 5,
        },
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
        size: { x: 16, y: 16 },
        position: {
            x: 16 * Game.random(2, 9) + Game.ROOM_OFFSET.x * 16,
            y: 16 * Game.random(2, 9) + Game.ROOM_OFFSET.y * 16,
        },
        stats: {
            maxHp: 100,
            hp: 100,
        },
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
        size: { x: 16, y: 16 },
        position: {
            x: 16 * Game.random(2, 9) + Game.ROOM_OFFSET.x * 16,
            y: 16 * Game.random(2, 9) + Game.ROOM_OFFSET.y * 16,
        },
        stats: {
            maxHp: 100,
            hp: 100,
        },
    },
    html: { classList: ["chest"] },
});
