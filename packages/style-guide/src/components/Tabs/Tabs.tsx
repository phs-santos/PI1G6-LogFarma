export interface TabItem {
    id: string;
    label: string;
    count?: number;
}

export interface TabsProps {
    label: string;
    items: TabItem[];
    activeId: string;
    onSelect: (id: string) => void;
}

/** Abas do computador (navegação entre áreas), com contador de pendências. */
export function Tabs({ label, items, activeId, onSelect }: TabsProps) {
    return (
        <nav className="sg-tabs" aria-label={label}>
            {items.map((item) => (
                // Sem aria-label: o nome vem do texto ("Pedidos, 2 pendentes"), e o que se lê
                // na tela faz parte dele (quem usa comando de voz fala "Pedidos").
                <button
                    key={item.id}
                    type="button"
                    className={`sg-tabs__item${item.id === activeId ? " sg-tabs__item--active" : ""}`}
                    aria-current={item.id === activeId ? "page" : undefined}
                    onClick={() => onSelect(item.id)}
                >
                    {item.label}
                    {item.count ? (
                        <>
                            <span className="sg-visually-hidden">{`, ${item.count} pendentes`}</span>
                            <span className="sg-tabs__count" aria-hidden="true">
                                {item.count}
                            </span>
                        </>
                    ) : null}
                </button>
            ))}
        </nav>
    );
}
