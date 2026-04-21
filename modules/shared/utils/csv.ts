export interface CsvParseResult<T> {
  rows: T[];
  errors: string[];
}

export function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const cells: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];

        if (char === '"' && next === '"') {
          current += '"';
          index += 1;
          continue;
        }

        if (char === '"') {
          inQuotes = !inQuotes;
          continue;
        }

        if (char === "," && !inQuotes) {
          cells.push(current.trim());
          current = "";
          continue;
        }

        current += char;
      }

      cells.push(current.trim());
      return cells;
    });
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const stringValue = cell === null || cell === undefined ? "" : String(cell);
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }

          return stringValue;
        })
        .join(","),
    )
    .join("\n");
}
