export interface StatTileProps {
    value: number | string;
    label: string;
}

/** Número grande com rótulo (painel do gestor). */
export function StatTile({ value, label }: StatTileProps) {
    return (
        <div className="sg-stat">
            <span className="sg-stat__value">{value}</span>
            <span className="sg-stat__label">{label}</span>
        </div>
    );
}

export interface BarListProps {
    label: string;
    items: { label: string; value: number }[];
}

/** Barras horizontais com o valor sempre escrito (a barra é só reforço visual). */
export function BarList({ label, items }: BarListProps) {
    const max = Math.max(1, ...items.map((i) => i.value));
    return (
        <figure className="sg-bars">
            <figcaption className="sg-bars__title">{label}</figcaption>
            <ul className="sg-bars__list">
                {items.map((item) => (
                    <li key={item.label} className="sg-bars__item">
                        <span className="sg-bars__text">
                            {item.label}: {item.value}
                        </span>
                        <span className="sg-bars__track" aria-hidden="true">
                            <span
                                className="sg-bars__bar"
                                style={{ width: `${(item.value / max) * 100}%` }}
                            />
                        </span>
                    </li>
                ))}
            </ul>
        </figure>
    );
}
