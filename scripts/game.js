function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

class Game {
    constructor() {
        this.pixelSize = 4;
        this.velocity = 0.93;
        this.objects = new Set();
    }

    /**
     * @description render the velocity of a directional positioning of an object
     * @param { Entity } object
     * @param { number } vel
     */
    renderVelocity(object, vel) {
        Math.round(object.velocity[vel] * 100) != 0
            ? (object.velocity[vel] *= game.velocity)
            : (object.velocity[vel] = 0);
    }

    /**
     * @description update data
     * @param { function } callback
     */
    onUpdate(callback) {
        setInterval(callback, 1000 / 60);
    }

    /**
     * @description update data related with the interaction between the html elements and their attributes
     * @param { function } callback
     */
    onAnimation(callback) {
        function step() {
            callback();
            window.requestAnimationFrame(step);
        }

        step();
    }
}

class GameObject {
    constructor(html) {
        this.position = { x: 0, y: 0 };
        this.rotation = 0;
        this.element = document.createElement("div");
        this.offset = 0;
        if (html?.offset) this.offset = html.offset;
        if (html?.id) this.element.id = html.id;
        if (html?.classList) this.element.classList.add(...html.classList);
        document.getElementById("canvas").append(this.element);
        game.objects.add(this);
    }

    /**
     * @description updates the position of the entity on the canvas
     */
    updatePosition() {
        let x = this.position.x * game.pixelSize;
        let y = this.position.y * game.pixelSize;
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${this.rotation}deg)`;
    }
}

class Entity extends GameObject {
    constructor(html) {
        super(html);
        this.hp = 0;
        this.velocity = { x: 0, y: 0 };
    }
}

class Cursor extends GameObject {
    constructor() {
        super({ id: "cursor" });
        this.position = { x: 0, y: 0 };

        document.addEventListener("mousemove", (event) => {
            this.position.x = event.x;
            this.position.y = event.y;
        });

        game.onAnimation(() => {
            let x = this.position.x - 28;
            let y = this.position.y - 28;
            this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        });
    }
}

class MagePointer extends Entity {
    constructor(mage, html) {
        super(html);
        this.mage = mage;
        this.position = mage.position;

        game.onUpdate(() => {
            let y = cursor.position.y / game.pixelSize - 7 - this.position.y;
            let x = cursor.position.x / game.pixelSize - 7 - this.position.x;
            this.rotation = Math.atan2(y, x) * (180 / Math.PI);
        });
    }
}

class Spell extends Entity {
    /**
     * @param { Mage } mage
     * @param {*} data
     * @param {{ id: string, classList: string[] }} html
     * @description create a new mage entity
     */
    constructor(mage, data, html) {
        super(html);
        this.data = data;
        this.mage = mage;
        this.position = { ...mage.position };
        this.rotation = mage.pointer.rotation;

        game.onAnimation(() => this.updatePosition());
    }
}

class Mage extends Entity {
    /**
     * @param { string } id
     * @param {{ up: string, down: string, left: string, right: string, shoot: string }} keybinds
     * @param {{ id: string, classList: string[] }} html
     * @description create a new mage entity
     */
    constructor(keybinds, html) {
        super(html);
        this.hp = 5;
        this.speed = 0.15;
        this.acceleration = 0;
        this.keybinds = keybinds;
        this.hasCooldown = false;
        this.keypresses = new Set();
        this.active = false;
        this.pointer = new MagePointer(this, { classList: ["mage-pointer"] });
        this.setViewDirection("right");
    }

    /**
     * @description set a directional value for the view of the sprite
     * @param { string } direction
     */
    setViewDirection(direction) {
        this.element.setAttribute("view-direction", direction);
    }

    /**
     * @param { string[] } keypress
     * @returns boolean
     */
    hasKeypress(...keypress) {
        for (const key of keypress) if (!this.keypresses.has(key)) return false;
        return true;
    }

    shoot() {
        const spell = new Spell(
            this,
            {
                type: "projectile",
                damage: 10,
                speed: 1,
            },
            {
                offset: 100,
                classList: ["fireball"],
            }
        );

        spell.updatePosition();
    }

    /**
     * @description set positioning, rotation, movement, and interaction events for mage
     */
    controller() {
        this.active = true;

        this.pointer.updatePosition();

        this.setViewDirection(
            this.pointer.rotation < 90 && this.pointer.rotation > -90
                ? "right"
                : "left"
        );

        switch (true) {
            case this.keypresses.has(this.keybinds.shoot):
                if (this.hasCooldown) break;
                this.hasCooldown = true;
                this.shoot();
                sleep(500).then(() => (this.hasCooldown = false));
                break;
        }

        switch (true) {
            case this.hasKeypress(this.keybinds.up, this.keybinds.right):
                this.velocity.x += this.acceleration;
                this.velocity.y -= this.acceleration;
                break;
            case this.hasKeypress(this.keybinds.down, this.keybinds.right):
                this.velocity.x += this.acceleration;
                this.velocity.y += this.acceleration;
                break;
            case this.hasKeypress(this.keybinds.up, this.keybinds.left):
                this.velocity.x -= this.acceleration;
                this.velocity.y -= this.acceleration;
                break;
            case this.hasKeypress(this.keybinds.down, this.keybinds.left):
                this.velocity.x -= this.acceleration;
                this.velocity.y += this.acceleration;
                break;
            case this.hasKeypress(this.keybinds.up):
                this.velocity.y -= this.acceleration;
                break;
            case this.hasKeypress(this.keybinds.down):
                this.velocity.y += this.acceleration;
                break;
            case this.hasKeypress(this.keybinds.left):
                this.velocity.x -= this.acceleration;
                break;
            case this.hasKeypress(this.keybinds.right):
                this.velocity.x += this.acceleration;
                break;
            default:
                this.active = false;
                break;
        }

        this.acceleration += 0.01;

        if (this.acceleration > this.speed) {
            this.acceleration = this.speed;
        }
    }

    move() {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}
