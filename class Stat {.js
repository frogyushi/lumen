class Item {
    constructor({ name, description, stats, sprite }) {
        this.sprite = sprite;
        this.name = name;
        this.description = description;
        this.stats = stats;
    }
}

const items = [
    new Item({
        name: "shaped glass",
        sprite: "images/shaped-glass.png",
        description: "multiply damage by 1.5 times, halfs hp",
        stats: [["hp", character.hp]],
    }),
];

class Room {
    constructor() {
        this.items = [];
    }
}
