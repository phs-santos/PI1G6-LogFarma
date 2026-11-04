import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ActionList, Button, Notice } from "@fatec-pi/style-guide";
import { listNotifications } from "../../api/notifications";
import { listRequests } from "../../api/requests";
import type { RequestStatus } from "../../api/types";
import { LIVE, qk, REGULAR } from "../../app/queryKeys";
import { useSession } from "../../app/session";
import { usePageTitle } from "../../app/usePageTitle";
import { formatAgo } from "../../lib/format";
import { LinkButton } from "../../ui/LinkButton";
import { RecentMedications } from "./RecentMedications";
import { STATUS_TEXT } from "./statusText";
import "./paciente.css";

const FINISHED: RequestStatus[] = ["picked_up", "delivered", "cancelled"];

/**
 * Início da paciente: o aviso que importa agora, a busca, o que ela procurou, os pedidos em
 * andamento e os avisos. No celular, os quatro caminhos grandes; no computador o menu do topo
 * já faz esse papel.
 */
export function Inicio() {
    usePageTitle("Início");
    const navigate = useNavigate();
    const { profile } = useSession();
    const [text, setText] = useState("");
    const unread = useQuery({
        queryKey: qk.notifications(true),
        queryFn: () => listNotifications(true),
        refetchInterval: LIVE,
    });
    const all = useQuery({
        queryKey: qk.notifications(false),
        queryFn: () => listNotifications(false),
        refetchInterval: REGULAR,
    });
    const requests = useQuery({
        queryKey: qk.requests,
        queryFn: listRequests,
        refetchInterval: REGULAR,
    });
    const items = unread.data ?? [];
    const latest = items[0];
    const name = profile?.kind === "patient" ? profile.displayName.split(" ")[0] : "";
    const unit = profile?.kind === "patient" ? profile.referencePharmacy.name : "";
    const open = (requests.data ?? []).filter((r) => !FINISHED.includes(r.status)).slice(0, 3);
    const recentNotices = (all.data ?? []).slice(0, 3);

    const search = (e: FormEvent) => {
        e.preventDefault();
        const q = text.trim();
        navigate(q ? `/buscar?${new URLSearchParams({ q }).toString()}` : "/buscar");
    };

    return (
        <>
            <header className="app-band">
                <h1>Olá, {name}</h1>
                <p>{unit} é a sua unidade</p>
            </header>
            {/* Sempre na página: o leitor de tela anuncia o aviso que chegar. */}
            <div className="app-live" role="status" aria-live="polite">
                {latest && (
                    <Notice tone="info" title={latest.title}>
                        {latest.body && <p>{latest.body}</p>}
                        {latest.requestId && (
                            <Link className="app-link" to={`/pedidos/${latest.requestId}`}>
                                Ver o pedido
                            </Link>
                        )}
                    </Notice>
                )}
            </div>

            <form className="app-home-search" role="search" onSubmit={search}>
                <label htmlFor="inicio-busca" className="app-home-search__label">
                    Qual remédio você precisa?
                </label>
                <div className="app-home-search__row">
                    <input
                        id="inicio-busca"
                        type="search"
                        className="sg-field__control app-home-search__input"
                        placeholder="Ex.: losartana"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <Button type="submit" size="lg">
                        Procurar
                    </Button>
                </div>
            </form>

            <div className="app-mobile-only">
                <ActionList label="O que você quer fazer">
                    <LinkButton to="/pedidos" variant="secondary">
                        Meus pedidos
                    </LinkButton>
                    <LinkButton to="/avisos" variant="secondary">
                        {items.length > 0 ? `Avisos (${items.length})` : "Avisos"}
                    </LinkButton>
                    <LinkButton to="/meus-dados" variant="secondary">
                        Meus dados
                    </LinkButton>
                </ActionList>
            </div>

            <div className="app-home-grid">
                <RecentMedications />

                <section className="app-home-card" aria-labelledby="em-andamento">
                    <h2 id="em-andamento">Seus pedidos em andamento</h2>
                    {open.length === 0 ? (
                        <p className="app-unit__fact--muted">Nenhum pedido em andamento.</p>
                    ) : (
                        <ul className="app-home-list">
                            {open.map((r) => (
                                <li key={r.id}>
                                    <Link className="app-link" to={`/pedidos/${r.id}`}>
                                        {r.medication.displayName}
                                    </Link>
                                    <span className="app-status">{STATUS_TEXT[r.status]}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <Link className="app-link app-home-more" to="/pedidos">
                        Ver todos os pedidos
                    </Link>
                </section>

                <section className="app-home-card" aria-labelledby="avisos-recentes">
                    <h2 id="avisos-recentes">Avisos recentes</h2>
                    {recentNotices.length === 0 ? (
                        <p className="app-unit__fact--muted">Nenhum aviso por enquanto.</p>
                    ) : (
                        <ul className="app-home-list">
                            {recentNotices.map((n) => (
                                <li key={n.id}>
                                    <span className="app-status">
                                        {!n.readAt && <span className="app-notice__new">Novo</span>}{" "}
                                        {n.title}
                                    </span>
                                    <span className="app-unit__fact--muted">
                                        {formatAgo(n.createdAt)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <Link className="app-link app-home-more" to="/avisos">
                        Ver todos os avisos
                    </Link>
                </section>

                <section className="app-home-card app-home-card--tips" aria-labelledby="bom-saber">
                    <h2 id="bom-saber">Bom saber</h2>
                    <ul className="app-home-list">
                        <li>Para retirar, leve a receita e um documento com foto.</li>
                        <li>
                            Alguém da família pode buscar por você: cadastre em{" "}
                            <Link className="app-link" to="/meus-dados">
                                Meus dados
                            </Link>
                            .
                        </li>
                        <li>
                            Na Farmácia Popular, alguns remédios são gratuitos. Ligue antes para
                            saber se tem.
                        </li>
                    </ul>
                </section>
            </div>
        </>
    );
}
