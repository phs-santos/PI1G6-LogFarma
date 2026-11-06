/** Número de pendências ao lado de um item do menu ("Pedidos 3 pendentes" no leitor de tela). */
export function NavCount({ count }: { count: number | undefined }) {
    if (!count) return null;
    return (
        <span className="app-nav-count">
            {" "}
            {count}
            <span className="sg-visually-hidden"> pendentes</span>
        </span>
    );
}
