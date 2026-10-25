// Espelho dos tokens em tokens.css para uso em TS (ex.: estilos inline, gráficos).
export const tokens = {
  color: {
    primary: "var(--color-primary)",
    secondary: "var(--color-secondary)",
    bg: "var(--color-bg)",
    surface: "var(--color-surface)",
    text: "var(--color-text)",
    textMuted: "var(--color-text-muted)",
    border: "var(--color-border)",
    success: "var(--color-success)",
    danger: "var(--color-danger)",
  },
  space: {
    1: "var(--space-1)",
    2: "var(--space-2)",
    3: "var(--space-3)",
    4: "var(--space-4)",
    6: "var(--space-6)",
    8: "var(--space-8)",
  },
  radius: { sm: "var(--radius-sm)", md: "var(--radius-md)" },
} as const;
