import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@fatec-pi/style-guide";
import { clearRecentMedications, listRecentMedications } from "../../api/me";
import { qk } from "../../app/queryKeys";
import { useActionMutation } from "../../app/useActionMutation";

/** "Você procurou recentemente": atalhos para os remédios que a paciente já consultou. */
export function RecentMedications({ allowClear = false }: { allowClear?: boolean }) {
    const query = useQuery({ queryKey: qk.recentMedications, queryFn: listRecentMedications });
    const clear = useActionMutation(() => clearRecentMedications(), {
        invalidate: [qk.recentMedications],
    });
    const items = query.data ?? [];
    if (items.length === 0) return null;
    return (
        <section className="app-home-card" aria-labelledby="recentes">
            <h2 id="recentes">Você procurou recentemente</h2>
            <ul className="app-chips">
                {items.map(({ medication }) => (
                    <li key={medication.id}>
                        <Link className="app-chip" to={`/remedio/${medication.id}`}>
                            {medication.displayName}
                        </Link>
                    </li>
                ))}
            </ul>
            {allowClear && (
                <Button
                    variant="ghost"
                    size="sm"
                    loading={clear.isPending}
                    onClick={() => clear.run(undefined)}
                >
                    Limpar histórico
                </Button>
            )}
        </section>
    );
}
