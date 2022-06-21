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
    constructor({ game, html, options }) {
        this.game = game;
        this.collision = options?.collision || false;
        this.defaultDestructable = options?.defaultDestructable || false;
        this.position = options?.position || { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.size = options?.size || { x: 0, y: 0 };
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

    delete() {
        this.element.remove();
        this.game.objects.delete(this);
    }

    updatePosition() {
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

class Item extends GameObject {
    constructor({ character, game, html, options }) {
        super({ game, html, options });
        this.character = character;
        this.options = options;

        this.load();
        this.render();
        this.updatePosition();
    }
}

class Wall extends GameObject {
    constructor({ game, html, options }) {
        super({ game, html, options });

        this.load();
        this.render();
        this.updatePosition();
    }
}

class Tile extends GameObject {
    constructor({ game, options, html }) {
        super({ game, options, html });
        this.id = options?.id;
        this.pixel = 16 * Game.PIXEL_SIZE;
        this.element.style.backgroundImage = `url(${this.getSprite(this.id)})`;

        this.load();
        this.render();
        this.updatePosition();
    }

    getSprite(id) {
        let img = null;

        switch (id) {
            case 11:
                img = "./images/floor.png";
                break;
            case 12:
                img = "./images/floor-pebble.png";
                break;
            case 13:
                img = "./images/floor-grass.png";
                break;
            case 21:
                img = "./images/top-left-wall.png";
                break;
            case 22:
                img = "./images/top-wall.png";
                break;
            case 23:
                img = "./images/top-right-wall.png";
                break;
            case 24:
                img = "./images/left-wall.png";
                break;
            case 25:
                img = "./images/right-wall.png";
                break;
            case 26:
                img = "./images/bottom-left-wall.png";
                break;
            case 27:
                img = "./images/bottom-wall.png";
                break;
            case 28:
                img = "./images/bottom-right-wall.png";
                break;
        }

        return img;
    }
}

class Room {
    constructor({ stage }) {
        this.stage = stage;
    }

    renderTiles() {
        for (let y = 0; y < this.stage.length; y++) {
            for (let x = 0; x < this.stage[y].length; x++) {
                const tile = this.stage[y][Array.isArray(x) ? x[0] : x];

                new Tile({
                    game,
                    options: {
                        id: tile,
                        size: { x: 16, y: 16 },
                        position: { x: x * 16, y: y * 16 },
                        collision: this.hasCollision(tile),
                    },
                    html: {
                        classList: ["tile"],
                    },
                });
            }
        }
    }

    hasCollision(id) {
        return Number(String(id).charAt(0)) == 1 ? false : true;
    }
}

class Shadow extends GameObject {
    constructor({ object, game, html, options }) {
        super({ game, html, options });
        this.options = options;
        this.object = object;
        this.offset = options?.offset || { x: 0, y: 0 };
        this.element.style.width = `${this.size.x}px`;
        this.element.style.height = `${this.size.y}px`;

        this.load();
        this.render();
    }

    onAnimation() {
        this.position = {
            x: this.options?.position.x + this.offset.x,
            y: this.options?.position.y + this.offset.y,
        };

        this.updatePosition();
    }
}

class Entity extends GameObject {
    constructor({ game, html, options }) {
        super({ game, html, options });
        this.stats = options?.stats || {};
        this.elapsedTime = 0;
        this.shadow = options?.shadow
            ? new Shadow({
                  game,
                  object: this,
                  options: {
                      position: this.position,
                      offset: options?.shadowOffset,
                      size: options?.shadowSize || { x: 0, y: 0 },
                  },
                  html: {
                      classList: ["shadow"],
                  },
              })
            : {};
    }

    renderVelocity() {
        for (let i of ["x", "y"]) {
            if (Math.round(this.velocity[i] * 100) != 0) {
                this.velocity[i] *= 0.93;
                continue;
            }

            this.velocity[i] = 0;
        }

        if (this.elapsedTime > this.stats.speed) {
            this.elapsedTime = this.stats.speed;
        }
    }

    move() {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

class Projectile extends Entity {
    constructor({ game, character, options, html, cursor }) {
        super({ game, html, options });
        this.game = game;
        this.character = character;
        this.stats = options?.stats || {};
        this.rotation = character.pointer.rotation;
        this.active = false;
        this.destroyed = false;
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
        const objects = [...game.objects].filter(
            (obj) =>
                obj !== this &&
                obj.constructor.name !== "Projectile" &&
                obj.collision &&
                obj.destroyed !== true
        );

        for (const obj of objects) {
            if (this.active) continue;

            if (
                this.position.x + this.size.x > obj.position.x &&
                obj.position.x + obj.size.x > this.position.x &&
                this.position.y + this.size.y > obj.position.y &&
                obj.position.y + obj.size.y > this.position.y
            ) {
                this.active = true;
                this.delete();

                if (!obj.defaultDestructable) continue;
                if (obj.stats?.hp > 0) {
                    obj.stats.hp -= this.stats.damage;
                }
            }
        }

        this.position.x += this.directional.x * this.stats.speed;
        this.position.y += this.directional.y * this.stats.speed;
    }

    onAnimation() {
        this.updatePosition();
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
        this.updatePosition();
    }
}

class Character extends Entity {
    constructor({ game, cursor, html, options }) {
        super({ game, html, options });
        this.id = html?.id || null;
        this.keypresses = new Set();
        this.hasCooldown = false;
        this.isMoving = false;
        this.cursor = cursor;
        this.keybinds = options?.keybinds || {};
        this.stats = options?.stats || {};

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
            if (this.stats.mana < this.stats.maxMana) {
                this.stats.mana++;
            }
        }, 100);

        window.addEventListener("keydown", (event) => {
            this.keypresses.add(event.key);
            event.preventDefault();
        });

        window.addEventListener("keyup", (event) => {
            this.keypresses.delete(event.key);
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

    cast() {
        const projectile = new Projectile({
            game,
            cursor: this.cursor,
            character: this,
            options: {
                stats: {
                    damage: 10,
                    speed: 1.5,
                    manaUsage: 10,
                },
                size: { x: 16, y: 16 },
            },
            html: {
                classList: ["fireball"],
            },
        });

        if (this.stats.mana - projectile.stats.manaUsage > 0) {
            this.stats.mana -= projectile.stats.manaUsage;
            projectile.load();
            projectile.render();
        }
    }

    circularCollision(obj) {
        const playerCenter = {
            x: this.position.x + this.size.x / 2,
            y: this.position.y + this.size.y / 2,
        };

        let closeEdgeX = playerCenter.x;
        let closeEdgeY = playerCenter.y;

        if (playerCenter.x < obj.position.x) {
            closeEdgeX = obj.position.x;
        }

        if (playerCenter.x > obj.position.x + obj.size.x) {
            closeEdgeX = obj.position.x + obj.size.x;
        }

        if (playerCenter.y < obj.position.y) {
            closeEdgeY = obj.position.y;
        }

        if (playerCenter.y > obj.position.y + obj.size.y) {
            closeEdgeY = obj.position.y + obj.size.y;
        }

        const distX = playerCenter.x - closeEdgeX;
        const distY = playerCenter.y - closeEdgeY;
        const distance = Math.sqrt(distX * distX + distY * distY);

        return distance <= 8 ? true : false;
    }

    checkCollision(obj) {
        if (!this.circularCollision(obj)) return;

        const collider = { x: 0, y: 0 };

        const up = this.position.y + obj.size.y - obj.position.y;
        const down = this.position.y - (obj.position.y + obj.size.y);
        const left = this.position.x - (obj.position.x + obj.size.x);
        const right = this.position.x + this.size.x - obj.position.x;

        if (up > 0 && up < 3) {
            collider.y = up;
        }

        if (down < 0 && down > -3) {
            collider.y = down;
        }

        if (right > 0 && right < 3) {
            collider.x = right;
        }

        if (left < 0 && left > -3) {
            collider.x = left;
        }

        this.position.x -= collider.x;
        this.position.y -= collider.y;
    }

    onUpdate() {
        this.isMoving = true;
        this.elapsedTime += 0.01;
        this.view = this.pointer?.rotation < 90 && this.pointer?.rotation > -90 ? "right" : "left";

        let view = this.pointer?.rotation < 90 && this.pointer?.rotation > -90 ? "right" : "left";
        if (view === "left") {
            this.shadow.offset.x = 0;
        } else {
            this.shadow.offset.x = -1;
        }

        switch (true) {
            case this.input(this.keybinds.shoot):
                if (this.hasCooldown) break;
                this.hasCooldown = true;

                this.cast();

                Game.wait(this.stats.fireRate).then(() => {
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

        const objects = [...game.objects].filter(
            (obj) =>
                obj.constructor.name !== "Character" &&
                obj.constructor.name !== "Cursor" &&
                obj.constructor.name !== "Wall" &&
                obj.constructor.name !== "Tile"
        );

        for (const obj of objects) {
            if (
                this.position.x + this.size.x > obj.position.x &&
                obj.position.x + obj.size.x > this.position.x &&
                this.position.y + this.size.y > obj.position.y &&
                obj.position.y + -(obj.size.y / 2) > this.position.y
            ) {
                this.element.style.zIndex = 1;
                this.pointer.element.style.zIndex = 2;
                obj.element.style.zIndex = 2;
            } else {
                this.element.style.zIndex = 2;
                this.pointer.element.style.zIndex = 3;
                obj.element.style.zIndex = 1;
            }
        }

        const colliders = [...game.objects].filter((obj) => obj.collision && obj !== this);

        for (const obj of colliders) {
            this.checkCollision(obj);
        }

        this.renderVelocity();
        this.move();
    }

    onAnimation() {
        this.updatePosition();
    }
}

class Chest extends Entity {
    constructor({ character, game, html, options }) {
        super({ game, html, options });
        this.character = character;
        this.opened = false;

        this.load();
        this.render();
    }

    onUpdate() {
        if (this.stats.hp <= 0 && this.opened == false) {
            this.opened = true;

            new Item({
                game,
                character,
                options: {
                    position: this.position,
                    name: "medium-rare steak",
                    sprite: "images/shaped-glass.png",
                    description: "increase maxHp by 10",
                    stats: [["maxHp", 10]],
                },
                html: {
                    classList: ["item"],
                },
            });

            this.shadow.delete();
            this.delete();
        }

        this.renderVelocity();
        this.move();
    }

    onAnimation() {
        this.updatePosition();
    }
}

const game = new Game();

const room = new Room({
    stage: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 21, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23],
        [0, 24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [0, 24, 11, 11, 11, 11, 11, 13, 11, 12, 11, 11, 25],
        [0, 24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [0, 24, 11, 13, 12, 11, 11, 11, 11, 11, 11, 11, 25],
        [0, 24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [0, 24, 11, 11, 11, 11, 11, 11, 11, 11, 12, 11, 25],
        [0, 24, 11, 11, 11, 11, 11, 12, 11, 11, 11, 11, 25],
        [0, 24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [0, 24, 11, 12, 11, 11, 13, 11, 11, 11, 13, 11, 25],
        [0, 24, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 25],
        [0, 26, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 28],
    ],
});

room.renderTiles();

const cursor = new Cursor({
    game,
    html: {
        parent: "canvas",
        id: "cursor",
    },
});

const character = new Character({
    game,
    cursor,
    options: {
        shadow: true,
        shadowOffset: {
            x: -1,
            y: 12,
        },
        shadowSize: {
            x: 17 * 4,
            y: 5 * 4,
        },
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
        position: { x: 16 * 3, y: 16 * 3 },
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

const chest = new Chest({
    game,
    character,
    options: {
        shadow: true,
        shadowOffset: {
            x: -1,
            y: 7,
        },
        shadowSize: {
            x: 18 * 4,
            y: 10 * 4,
        },
        collision: true,
        defaultDestructable: true,
        stats: {
            maxHp: 50,
            hp: 50,
        },
        size: { x: 16, y: 16 },
        position: { x: 16 * 4, y: 16 * 3 },
    },
    html: {
        classList: ["chest"],
    },
});
