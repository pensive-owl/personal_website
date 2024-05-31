// Get reference to the game board element
const gameBoard = document.getElementById('gameBoard');

// Create 16 cards and add them to the game board
for (let i = 0; i < 16; i++) {
	let card = document.createElement('div');
	card.classList.add('card');
	card.id = `card${i}`;
	gameBoard.appendChild(card);
}