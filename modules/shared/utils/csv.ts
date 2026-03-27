export interface CsvParseResult<T> {
  rows: T[];
  errors: string[];
}

export function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) => row.map((cell) => (cell === null || cell === undefined ? "" : String(cell))).join(","))
    .join("\n");
}
