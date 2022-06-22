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

    static getRandomArray(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    static wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

class GameObject {
    constructor({ game, html, options }) {
        this.game = game;
        this.html = html;
        this.effect = false;
        this.enableEffect = true;
        this.effectRadius = options?.effectRadius || 0;
        this.effectUpdateRate = options?.effectUpdateRate || 20;
        this.collision = options?.collision || false;
        this.defaultDestructable = options?.defaultDestructable || false;
        this.position = options?.position || { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.size = options?.size || { x: 0, y: 0 };
        this.rotation = 0;
        this.element = document.createElement("div");
        this.shadow = options?.shadow
            ? new Shadow({
                  game,
                  object: this,
                  options: {
                      position: this.position,
                      offset: options?.shadowOffset || { x: 0, y: 0 },
                      size: options?.shadowSize || { x: 0, y: 0 },
                  },
                  html: {
                      classList: ["shadow"],
                  },
              })
            : {};

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

        let x = options?.position.x * Game.PIXEL_SIZE;
        let y = options?.position.y * Game.PIXEL_SIZE;

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
            case 111:
                img = "./images/floor-1.png";
                break;
            case 112:
                img = "./images/floor-2.png";
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
            case 221:
                img = "./images/top-wall-1.png";
                break;
            case 222:
                img = "./images/top-wall-2.png";
                break;
            case 23:
                img = "./images/top-right-wall.png";
                break;
            case 24:
                img = "./images/left-wall.png";
                break;
            case 241:
                img = "./images/left-wall-1.png";
                break;
            case 242:
                img = "./images/left-wall-2.png";
                break;
            case 25:
                img = "./images/right-wall.png";
                break;
            case 251:
                img = "./images/right-wall-1.png";
                break;
            case 252:
                img = "./images/right-wall-2.png";
                break;
            case 26:
                img = "./images/bottom-left-wall.png";
                break;
            case 27:
                img = "./images/bottom-wall.png";
                break;
            case 271:
                img = "./images/bottom-wall-1.png";
                break;
            case 272:
                img = "./images/bottom-wall-2.png";
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

        this.createStage();
        this.renderTiles();
    }

    createStage() {
        for (let y = 0; y < this.stage.length; y++) {
            for (let x = 0; x < this.stage[y].length; x++) {
                const [first, second] = String(this.stage[y][x])
                    .split("")
                    .map((i) => Number(i));

                switch (first) {
                    case 1:
                        if (this.stage[y][x] == 11) {
                            if (Game.getRandom(0, 100) > 80) {
                                this.stage[y][x] = Number(
                                    String(first) + String(second) + Game.getRandom(1, 2)
                                );
                            }
                        }
                        break;
                    case 2:
                        if (
                            this.stage[y][x] == 22 ||
                            this.stage[y][x] == 24 ||
                            this.stage[y][x] == 25 ||
                            this.stage[y][x] == 27
                        ) {
                            if (Game.getRandom(0, 100) > 80) {
                                this.stage[y][x] = Number(
                                    String(first) + String(second) + Game.getRandom(1, 2)
                                );
                            }
                        }
                        break;
                }
            }
        }
    }

    renderTiles() {
        for (let y = 0; y < this.stage.length; y++) {
            for (let x = 0; x < this.stage[y].length; x++) {
                const tile = this.stage[y][x];

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

class Effect extends GameObject {
    constructor({ game, html, options }) {
        super({ game, html, options });

        this.element.style.backgroundColor = options?.trailColor || "#FFFFFF";
        this.element.style.width = `${this.size.x * Game.PIXEL_SIZE}px`;
        this.element.style.height = `${this.size.y * Game.PIXEL_SIZE}px`;
        this.element.style.animation = `fadeOut ${options?.fadeOutDuration || 0}ms`;

        this.load();
        this.render();
        this.updatePosition();

        Game.wait(options?.trailLength || 100).then(() => {
            this.delete();
        });
    }
}

class Projectile extends Entity {
    constructor({ game, character, cursor, options, html }) {
        super({ game, html, options });
        this.game = game;
        this.character = character;
        this.stats = options?.stats || {};
        this.rotation = character.pointer.rotation;
        this.active = false;
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
            (obj) => obj !== this && obj.constructor.name !== "Projectile" && obj.collision
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
                this.positionOld = { ...this.position };

                this.delete();

                const blast = setInterval(() => {
                    new Effect({
                        game: this.game,
                        options: {
                            trailLength: 400,
                            trailColor: Game.getRandomArray(["#fff42d", "#f26262", "#f2bd62"]),
                            fadeOutDuration: 400,
                            size: { x: 2, y: 2 },
                            position: {
                                x: Game.getRandom(
                                    this.positionOld.x + 8 - 1,
                                    this.positionOld.x + 8 + 1
                                ),
                                y: Game.getRandom(
                                    this.positionOld.y + 8 - 1,
                                    this.positionOld.y + 8 + 1
                                ),
                            },
                        },
                        html: {
                            classList: ["effect"],
                        },
                    });

                    new Effect({
                        game: this.game,
                        options: {
                            trailLength: 400,
                            trailColor: Game.getRandomArray([
                                "#fff42d",
                                "#f26262",
                                "#f2bd62",
                                "#6e6e6e",
                                "#FFFFFF",
                            ]),
                            fadeOutDuration: 1000,
                            size: { x: 1, y: 1 },
                            position: {
                                x: Game.getRandom(
                                    this.positionOld.x + 8 - 5,
                                    this.positionOld.x + 8 + 5
                                ),
                                y: Game.getRandom(
                                    this.positionOld.y + 8 - 5,
                                    this.positionOld.y + 8 + 5
                                ),
                            },
                        },
                        html: {
                            classList: ["effect"],
                        },
                    });
                }, 20);

                Game.wait(100).then(() => {
                    clearInterval(blast);
                });

                let x = obj.position.x * Game.PIXEL_SIZE;
                let y = obj.position.y * Game.PIXEL_SIZE;

                if (Number(String(obj?.id).charAt(0)) !== 2) {
                    if (obj.constructor.name !== "Frog") {
                        obj.element.animate(
                            [
                                { transform: `translate3d(${x - 1}px, ${y}px, 0)` },
                                { transform: `translate3d(${x + 2}px, ${y}px, 0)` },
                                { transform: `translate3d(${x - 1}px, ${y}px, 0)` },
                            ],
                            {
                                duration: 100,
                                iterations: 5,
                            }
                        );
                    }
                }

                if (!obj.defaultDestructable) continue;

                if (obj.stats?.hp > 0) {
                    obj.stats.hp -= this.stats.damage;
                }
            }
        }

        if (this.game.objects.has(this) && !this.effect) {
            this.effect = true;

            new Effect({
                game: this.game,
                options: {
                    trailLength: 400,
                    trailColor: Game.getRandomArray(["#fff42d", "#f26262", "#f2bd62"]),
                    fadeOutDuration: 1000,
                    size: { x: 1, y: 1 },
                    position: {
                        x: Game.getRandom(
                            this.position.x + 8 - this.effectRadius,
                            this.position.x + 8 + this.effectRadius
                        ),
                        y: Game.getRandom(
                            this.position.y + 8 - this.effectRadius,
                            this.position.y + 8 + this.effectRadius
                        ),
                    },
                },
                html: {
                    classList: ["effect"],
                },
            });

            Game.wait(this.effectUpdateRate).then(() => {
                this.effect = false;
            });
        }

        this.position.x += this.directional.x * this.stats.speed;
        this.position.y += this.directional.y * this.stats.speed;
    }

    onAnimation() {
        this.updatePosition();
    }
}

class CharacterPointer extends Entity {
    constructor({ game, character, cursor, options, html }) {
        super({ game, html, options });
        this.cursor = cursor;
        this.character = character;
        this.position = character.position;

        this.load();
        this.render();
    }

    onUpdate() {
        if (!this.effect && this.enableEffect) {
            this.effect = true;
            const rad = (this.rotation * Math.PI) / 180;

            new Effect({
                game: this.game,
                options: {
                    trailLength: 700,
                    trailColor: Game.getRandomArray(["#5fcde4", "#aeebf8", "#aeebf8"]),
                    fadeOutDuration: 700,
                    size: { x: 1, y: 1 },
                    position: {
                        x: 22 * Math.cos(rad) + character.position.x + 7.5 + Game.getRandom(-3, 3),
                        y: 22 * Math.sin(rad) + character.position.y + 7.5 + Game.getRandom(-3, 3),
                    },
                },
                html: {
                    classList: ["effect"],
                },
            });

            Game.wait(this.effectUpdateRate).then(() => {
                this.effect = false;
            });
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
    constructor({ game, cursor, html, options }) {
        super({ game, html, options });
        this.id = html?.id || null;
        this.keypresses = new Set();
        this.hasCooldown = false;
        this.isMoving = false;
        this.cursor = cursor;
        this.keybinds = options?.keybinds || {};
        this.stats = options?.stats || {};
        this.equipment = 1;
        this.inventory = { 1: "staff", 2: "blade" };

        this.pointer = new CharacterPointer({
            game,
            cursor,
            character: this,
            options: {
                effectUpdateRate: 60,
            },
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

    useItem(slot) {
        switch (slot) {
            case 1:
                const projectile = new Projectile({
                    game,
                    cursor: this.cursor,
                    character: this,
                    options: {
                        effectRadius: 1,
                        effectUpdateRate: 20,
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
                break;
            case 2:
                break;
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

        let view = this.pointer?.rotation < 90 && this.pointer?.rotation > -90 ? "right" : "left";
        this.view = view;
        this.shadow.offset.x = view === "left" ? 0 : -1;

        this.pointer.element.style.backgroundImage = `url(./images/${
            this.inventory[this.equipment]
        }-${view}.png)`;

        switch (true) {
            case this.input("1"):
                this.pointer.enableEffect = true;
                this.equipment = 1;
                break;
            case this.input("2"):
                this.pointer.enableEffect = false;
                this.equipment = 2;
                break;
            case this.input(this.keybinds.shoot):
                if (this.hasCooldown) break;
                this.hasCooldown = true;

                this.useItem(this.equipment);

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

        if (this.isMoving && !this.effect) {
            this.effect = true;

            new Effect({
                game: this.game,
                options: {
                    trailLength: 400,
                    trailColor: Game.getRandomArray(["#3c312d", "#574742"]),
                    fadeOutDuration: 400,
                    size: { x: 1, y: 1 },
                    position: {
                        x: Game.getRandom(
                            this.position.x + 8 - this.effectRadius,
                            this.position.x + 8 + this.effectRadius
                        ),
                        y: Game.getRandom(this.position.y + 16, this.position.y + 17),
                    },
                },
                html: {
                    classList: ["effect"],
                },
            });

            Game.wait(this.effectUpdateRate).then(() => {
                this.effect = false;
            });
        }

        const objects = [...game.objects].filter(
            (obj) =>
                obj.constructor.name !== "Character" &&
                obj.constructor.name !== "Cursor" &&
                obj.constructor.name !== "Effect" &&
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
                this.element.style.zIndex = 0;
                this.pointer.element.style.zIndex = 1;
                obj.element.style.zIndex = 1;
            } else {
                this.element.style.zIndex = 1;
                this.pointer.element.style.zIndex = 1;
                obj.element.style.zIndex = 0;
            }
        }

        const colliders = [...game.objects].filter(
            (obj) => obj.collision && obj !== this && obj.constructor.name !== "Frog"
        );

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

class Frog extends Entity {
    constructor({ game, html, options, character }) {
        super({ game, html, options });
        this.isMoving = false;
        this.stats = options?.stats || {};
        this.jumpDelay = options?.jumpDelay || 100;
        this.character = character;
        this.canJump = 0;
        this.jumpView = "left";

        this.playerCenter = {
            x: (this.character.position.x += this.character.size.x / 2),
            y: (this.character.position.y += this.character.size.y / 2),
        };

        this.load();
        this.render();
    }

    getPlayerCenter() {
        this.playerCenter = {
            x: this.character.position.x + this.character.size.x / 2,
            y: this.character.position.y + this.character.size.y / 2,
        };
    }

    set view(direction) {
        this.element.setAttribute("view", direction);
    }

    getDirections() {
        this.getPlayerCenter();

        let distX = (this.playerCenter.x - this.position.x) / 100;
        let distY = (this.playerCenter.y - this.position.y) / 100;
        let speed = 2;

        if (distX > 0) {
            this.shadow.offset.x = -1;
            this.view = "right";
            this.jumpView = "right";
        }

        if (distX < 0) {
            this.shadow.offset.x = 1;
            this.view = "left";
            this.jumpView = "left";
        }

        let distance = Math.round(Math.sqrt(distX * distX + distY * distY) * 100) / 100;
        speed = Math.round((speed / distance) * 100 * Game.getRandom(1, 3)) / 100;

        return { x: distX, y: distY, speed: speed };
    }

    doCollision() {
        const colliders = [...game.objects].filter(
            (obj) =>
                obj.constructor.name !== "Cursor" &&
                obj.constructor.name !== "Character" &&
                obj.collision &&
                obj !== this
        );

        for (const obj of colliders) {
            this.checkCollision(obj);
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
        if (this.stats.hp <= 0) {
            this.shadow.delete();
            this.delete();
        }

        this.doCollision();
        this.getPlayerCenter();

        let view = this.jumpView;

        this.element.style.backgroundImage = `url(./images/frog-${view}${
            this.jumping ? "-jump" : ""
        }.png)`;

        if (this.game.objects.has(this) && !this.effect && !this.canJump) {
            this.effect = true;

            for (let i = 0; i < 5; i++) {
                new Effect({
                    game: this.game,
                    options: {
                        trailLength: 400,
                        trailColor: Game.getRandomArray(["#3c312d", "#574742"]),
                        fadeOutDuration: 400,
                        size: { x: 1, y: 1 },
                        position: {
                            x: Game.getRandom(
                                this.position.x + 8 - this.effectRadius,
                                this.position.x + 8 + this.effectRadius
                            ),
                            y: Game.getRandom(this.position.y + 14, this.position.y + 15),
                        },
                    },
                    html: {
                        classList: ["effect"],
                    },
                });
            }

            Game.wait(this.effectUpdateRate).then(() => {
                this.effect = false;
            });
        }

        if (this.canJump === 0) {
            this.jumping = true;
            const playerDirection = {
                x: this.getDirections().x,
                y: this.getDirections().y,
            };

            this.velocity.x = this.stats.speed * this.getDirections().speed * playerDirection.x;
            this.velocity.y = this.stats.speed * this.getDirections().speed * playerDirection.y;
            this.canJump = this.jumpDelay;
        } else if (this.canJump < this.jumpDelay / 2 && this.canJump != 0) {
            this.velocity.x = 0;
            this.velocity.y = 0;
            this.jumping = false;
            this.canJump--;
        } else {
            this.canJump--;
        }

        this.move();
        this.renderVelocity();
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
        if (this.stats.hp < (this.stats.maxHp / 100) * 66.6) {
            this.element.style.backgroundImage = `url(./images/chest-half.png)`;
        }

        if (this.stats.hp < (this.stats.maxHp / 100) * 33.3) {
            this.element.style.backgroundImage = `url(./images/chest-broken.png)`;
        }

        if (this.stats.hp <= 0 && this.opened == false) {
            this.opened = true;

            new Item({
                game,
                character,
                options: {
                    shadow: true,
                    shadowOffset: { x: 3, y: 10 },
                    shadowSize: { x: 10 * 4, y: 4 * 4 },
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

        if (this.game.objects.has(this) && !this.effect) {
            this.effect = true;

            new Effect({
                game: this.game,
                options: {
                    trailLength: 5000,
                    trailColor: Game.getRandomArray(["#f2bd62"]),
                    fadeOutDuration: 5000,
                    size: { x: 1, y: 1 },
                    position: {
                        x: Game.getRandom(
                            this.position.x + 8 - this.effectRadius,
                            this.position.x + 8 + this.effectRadius
                        ),
                        y: Game.getRandom(
                            this.position.y + 8 - this.effectRadius,
                            this.position.y + 8 + this.effectRadius
                        ),
                    },
                },
                html: {
                    classList: ["effect"],
                },
            });

            Game.wait(this.effectUpdateRate).then(() => {
                this.effect = false;
            });
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
});

const character = new Character({
    game,
    cursor,
    options: {
        shadow: true,
        shadowOffset: { x: -1, y: 12 },
        shadowSize: { x: 17 * 4, y: 5 * 4 },
        effectRadius: 2,
        effectUpdateRate: 50,
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
            shoot: " ",
        },
    },
    html: {
        id: "character",
        classList: ["character-default"],
    },
});

new Chest({
    game,
    character,
    options: {
        shadow: true,
        shadowOffset: { x: -1, y: 7 },
        shadowSize: { x: 18 * 4, y: 10 * 4 },
        effectRadius: 10,
        effectUpdateRate: 400,
        collision: true,
        defaultDestructable: true,
        stats: {
            maxHp: 100,
            hp: 100,
        },
        size: { x: 16, y: 16 },
        position: { x: 16 * Game.getRandom(3, 10), y: 16 * Game.getRandom(3, 10) },
    },
    html: {
        classList: ["chest"],
    },
});

new Chest({
    game,
    character,
    options: {
        shadow: true,
        shadowOffset: { x: -1, y: 7 },
        shadowSize: { x: 18 * 4, y: 10 * 4 },
        effectRadius: 10,
        effectUpdateRate: 400,
        collision: true,
        defaultDestructable: true,
        stats: {
            maxHp: 100,
            hp: 100,
        },
        size: { x: 16, y: 16 },
        position: { x: 16 * Game.getRandom(3, 10), y: 16 * Game.getRandom(3, 10) },
    },
    html: {
        classList: ["chest"],
    },
});

new Frog({
    game,
    character,
    options: {
        shadow: true,
        shadowOffset: { x: 0, y: 10 },
        shadowSize: { x: 16 * 4, y: 5 * 4 },
        effectRadius: 5,
        effectUpdateRate: 100,
        stats: {
            maxHp: 50,
            hp: 50,
            speed: 0.5,
            attackSpeed: 1,
            baseDamage: 5,
        },
        jumpDelay: 75,
        collision: true,
        defaultDestructable: true,
        size: { x: 16, y: 16 },
        position: { x: 16 * Game.getRandom(2, 11), y: 16 * Game.getRandom(2, 11) },
    },
    html: {
        parent: "map",
        classList: ["frog"],
    },
});

new Frog({
    game,
    character,
    options: {
        shadow: true,
        shadowOffset: { x: 0, y: 10 },
        shadowSize: { x: 16 * 4, y: 5 * 4 },
        stats: {
            maxHp: 50,
            hp: 50,
            speed: 0.5,
            attackSpeed: 1,
            baseDamage: 5,
        },
        effectRadius: 5,
        effectUpdateRate: 100,
        jumpDelay: 100,
        collision: true,
        defaultDestructable: true,
        size: { x: 16, y: 16 },
        position: { x: 16 * Game.getRandom(2, 11), y: 16 * Game.getRandom(2, 11) },
    },
    html: {
        parent: "map",
        classList: ["frog"],
    },
});
