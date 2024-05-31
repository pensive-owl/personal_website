// Helper function to search the puzzle box for a slot with no child nodes
function findEmptySlot() {
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            if (puzzleStateArray[row][col] === null) {
                return { row, col };
            }
        }
    }
}

// Helper function to return true if the piece is able to move
function isValidMove(row, col, emptySlot) {
    const { row: emptyRow, col: emptyCol } = emptySlot;
    // Manhattan distance
    return Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1;
}

// Helper function to move pieces and refresh the game board
function movePiece(row, col, emptySlot) {
    const { row: emptyRow, col: emptyCol } = emptySlot;
    puzzleStateArray[emptyRow][emptyCol] = puzzleStateArray[row][col];
    puzzleStateArray[row][col] = puzzleStateArray[emptyRow][emptyCol];
    puzzleStateArray[row][col] = null;
    puzzleBox.innerHTML = '';
    createSlots();
    createPieces();
}

// Helper function to pass the clicked piece row and col data to the isValidMove and movePiece functions
function handlePieceClick(e) {
    const piece = e.target;
    const pieceRow = parseInt(piece.dataset.row);
    const pieceCol = parseInt(piece.dataset.col);
    const emptySlot = findEmptySlot();
    if (isValidMove(pieceRow, pieceCol, emptySlot)) {
        movePiece(pieceRow, pieceCol, emptySlot);
    }
}

const puzzleBox = document.getElementById('fifteen-puzzle');

// Declare and initialize puzzle state array. Numbers can be substituted with image urls
let puzzleStateArray = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, null],
];

// Create puzzle slots and append to puzzle box
function createSlots() {
    // Loop through each row and set to empty
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const slot = document.createElement('div');
            slot.classList.add('slot');
            slot.dataset.row = row;
            slot.dataset.col = col;
            puzzleBox.appendChild(slot);
        }
    }
}

// Creates pieces with the value stored in the puzzleStateArray
function createPieces() {
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const value = puzzleStateArray[row][col];
            if (value !== null) {
                let piece = document.createElement('button');
                piece.classList.add('piece');
                piece.textContent = value;
                piece.dataset.row = row;
                piece.dataset.col = col;

                // Add click event listener to pieces
                piece.addEventListener('click', handlePieceClick);

                // Append to slot based on row col data from the puzzleStateArray
                const slot = document.querySelector(
                    `.slot[data-row='${row}'][data-col='${col}']`
                );
                slot.appendChild(piece);
            }
        }
    }
}

createSlots();
createPieces();
