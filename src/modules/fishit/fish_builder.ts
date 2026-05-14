function generateFishBox(position: number): string {
    // 3x3 grid positions:
    // 1 2 3
    // 4 5 6
    // 7 8 9

    const fish = "><(((('>";
    const boxWidth = 11;
    const cellHeight = 3;

    const horizontal = "+" + "-----------+".repeat(3);

    function createEmptyRow() {
        return "|           |           |           |";
    }

    function createFishRow(col: number) {
        const cells = ["           ", "           ", "           "];

        // center fish in selected cell
        const paddingLeft = Math.floor((boxWidth - fish.length) / 2);
        const paddingRight = boxWidth - fish.length - paddingLeft;

        cells[col] =
            " ".repeat(paddingLeft) +
            fish +
            " ".repeat(paddingRight);

        return `|${cells[0]}|${cells[1]}|${cells[2]}|`;
    }

    const rowIndex = Math.floor((position - 1) / 3);
    const colIndex = (position - 1) % 3;

    const lines: string[] = [];

    for (let row = 0; row < 3; row++) {
        lines.push(horizontal);

        for (let h = 0; h < cellHeight; h++) {
            // Put fish in center line of selected row
            if (row === rowIndex && h === 1) {
                lines.push(createFishRow(colIndex));
            } else {
                lines.push(createEmptyRow());
            }
        }
    }

    lines.push(horizontal);

    return lines.join("\n");
}

// Example usage
console.log(generateFishBox(1));
console.log(generateFishBox(5));
console.log(generateFishBox(9));