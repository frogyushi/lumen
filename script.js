const game = new Game();
const cursor = new Cursor();
const mage = new Mage(
    {
        up: "w",
        down: "s",
        left: "a",
        right: "d",
    },
    {
        id: "mage",
        classList: ["mage-default"],
    }
);

game.onUpdate(() => {
    mage.controller();
    mage.move();
    game.renderVelocity(mage, "x");
    game.renderVelocity(mage, "y");
});

game.onAnimation(() => {
    mage.updatePosition();
});

window.addEventListener("keydown", ({ key }) => mage.keypresses.add(key));
window.addEventListener("keyup", ({ key }) => mage.keypresses.delete(key));
