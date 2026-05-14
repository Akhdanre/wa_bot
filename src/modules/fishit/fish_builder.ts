export function generateFishBox(position: number): string {
    // 3x3 grid positions:
    // 1 2 3
    // 4 5 6
    // 7 8 9

    const fish = "><(('>";
    const boxWidth = 7;
    const cellHeight = 2;

    const horizontal = "+" + "-------+".repeat(3);

    function center(value: string): string {
        const paddingLeft = Math.floor((boxWidth - value.length) / 2);
        const paddingRight = boxWidth - value.length - paddingLeft;

        return " ".repeat(paddingLeft) + value + " ".repeat(paddingRight);
    }

    function createEmptyRow(): string {
        return `|${center("")}|${center("")}|${center("")}|`;
    }

    function createCenterRow(row: number): string {
        const cells = ["       ", "       ", "       "];

        for (let col = 0; col < 3; col++) {
            const cellPosition = row * 3 + col + 1;

            cells[col] = center(
                cellPosition === position
                    ? fish
                    : ""
            );
        }

        return `|${cells[0]}|${cells[1]}|${cells[2]}|`;
    }

    const lines: string[] = [];

    for (let row = 0; row < 3; row++) {
        lines.push(horizontal);

        for (let h = 0; h < cellHeight; h++) {
            if (h === 1) {
                lines.push(createCenterRow(row));
            } else {
                lines.push(createEmptyRow());
            }
        }
    }

    lines.push(horizontal);

    return lines.join("\n");
}
