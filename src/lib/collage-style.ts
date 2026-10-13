export const POSTER_COLORS = {
  paper: "#f4efe7",
  ink: "#29251f",
  accent: "#a45e48",
  line: "#d8cec0",
  white: "#ffffff",
} as const;

export const POSTER_TYPOGRAPHY = {
  heading: "Georgia, 'Times New Roman', serif",
  italic: "italic Georgia, 'Times New Roman', serif",
  meta: "'Helvetica Neue', Arial, sans-serif",
} as const;

export type CollageGridLayout = {
  columns: number;
  rows: number;
  featuredFirst: boolean;
};

export function collageGridLayout(count: number): CollageGridLayout {
  switch (count) {
    case 4:
      return { columns: 2, rows: 2, featuredFirst: false };
    case 8:
      return { columns: 2, rows: 4, featuredFirst: false };
    case 16:
      return { columns: 4, rows: 4, featuredFirst: false };
    case 32:
      return { columns: 4, rows: 8, featuredFirst: false };
    default: {
      const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, count))));
      const rows = Math.max(1, Math.ceil(count / columns));
      return { columns, rows, featuredFirst: false };
    }
  }
}

export function collageGrid(count: number): { columns: number; rows: number } {
  const { columns, rows } = collageGridLayout(count);
  return { columns, rows };
}