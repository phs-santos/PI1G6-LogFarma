import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Notice } from "@fatec-pi/style-guide";
import { listNotifications } from "../../api/notifications";
import { listPharmacies } from "../../api/pharmacies";
import { listRequests } from "../../api/requests";
import type { RequestStatus } from "../../api/types";
import { LIVE, qk, REGULAR } from "../../app/queryKeys";
import { useSession } from "../../app/session";
import { usePageTitle } from "../../app/usePageTitle";
import { formatAgo, formatPhone, telHref } from "../../lib/format";
import { LinkButton } from "../../ui/LinkButton";
import { RecentMedications } from "./RecentMedications";
import { STATUS_TEXT } from "./statusText";
import { mapUrl } from "./VouBuscar";
import "./paciente.css";

const FINISHED: RequestStatus[] = ["picked_up", "delivered", "cancelled"];

function plural(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`;
}

/**
 * Início da paciente: a busca logo na saudação, o aviso que importa agora, atalhos grandes,
 * a unidade dela (endereço, horário, telefone e caminho) e só o que existe de pedidos, buscas
 * e avisos. Sem pedidos, um convite para procurar o primeiro remédio.
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
    const pharmacies = useQuery({ queryKey: qk.pharmacies, queryFn: listPharmacies });
    const items = unread.data ?? [];
    const latest = items[0];
    const name = profile?.kind === "patient" ? profile.displayName.split(" ")[0] : "";
    const unitRef = profile?.kind === "patient" ? profile.referencePharmacy : null;
    const unit = (pharmacies.data ?? []).find((p) => p.id === unitRef?.id);
    const open = (requests.data ?? []).filter((r) => !FINISHED.includes(r.status));
    const recentNotices = (all.data ?? []).slice(0, 3);
    const search = (e: FormEvent) => {
        e.preventDefault();
        const q = text.trim();
        navigate(q ? `/buscar?${new URLSearchParams({ q }).toString()}` : "/buscar");
    };
    return (
        <>
            <header className="app-band app-home-hero">
                <h1>Olá, {name}</h1>
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
                        <Button type="submit" size="lg" variant="secondary">
                            Procurar
                        </Button>
                    </div>
                </form>
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
            <nav className="app-tiles" aria-label="O que você quer fazer">
                <Link className="app-tile" to="/pedidos">
                    <span className="app-tile__title">Meus pedidos</span>{" "}
                    <span className="app-tile__info">
                        {open.length > 0
                            ? plural(open.length, "em andamento", "em andamento")
                            : "Acompanhe seus pedidos"}
                    </span>
                </Link>
                <Link className="app-tile" to="/avisos">
                    <span className="app-tile__title">Avisos</span>{" "}
                    <span className="app-tile__info">
                        {items.length > 0 ? (
                            <span className="app-tile__badge">
                                {plural(items.length, "novo", "novos")}
                            </span>
                        ) : (
                            "Nenhum aviso novo"
                        )}
                    </span>
                </Link>
                <Link className="app-tile" to="/meus-dados">
                    <span className="app-tile__title">Meus dados</span>{" "}
                    <span className="app-tile__info">Endereço e quem retira por você</span>
                </Link>
            </nav>
            <div className="app-home-grid">
                <section className="app-home-card app-home-unit" aria-labelledby="sua-unidade">
                    <h2 id="sua-unidade">Sua unidade</h2>
                    <p className="app-home-unit__name">{unitRef?.name}</p>
                    {unit && (
                        <>
                            <p>{unit.address}</p>
                            <p className="app-unit__fact--muted">{unit.openingHours}</p>
                            <p>
                                <a className="app-link" href={telHref(unit.phone)}>
                                    {formatPhone(unit.phone)}
                                </a>
                            </p>
                            <LinkButton
                                to={mapUrl(null, unit.address)}
                                external
                                variant="secondary"
                                block={false}
                            >
                                Como chegar
                            </LinkButton>
                        </>
                    )}
                </section>

                {open.length > 0 ? (
                    <section className="app-home-card" aria-labelledby="em-andamento">
                        <h2 id="em-andamento">Seus pedidos em andamento</h2>
                        <ul className="app-home-list">
                            {open.slice(0, 3).map((r) => (
                                <li key={r.id}>
                                    <Link className="app-link" to={`/pedidos/${r.id}`}>
                                        {r.medication.displayName}
                                    </Link>
                                    <span className="app-status">{STATUS_TEXT[r.status]}</span>
                                </li>
                            ))}
                        </ul>
                        <Link className="app-link app-home-more" to="/pedidos">
                            Ver todos os pedidos
                        </Link>
                    </section>
                ) : (
                    <section
                        className="app-home-card app-home-invite"
                        aria-labelledby="sem-pedidos"
                    >
                        <h2 id="sem-pedidos">Nenhum pedido em andamento</h2>
                        <p>
                            Procure um remédio para saber em qual unidade tem. Você pode retirar ou
                            pedir para receber em casa.
                        </p>
                        <LinkButton to="/buscar" block={false}>
                            Buscar um remédio
                        </LinkButton>
                    </section>
                )}

                <RecentMedications />

                {recentNotices.length > 0 && (
                    <section className="app-home-card" aria-labelledby="avisos-recentes">
                        <h2 id="avisos-recentes">Avisos recentes</h2>
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
                        <Link className="app-link app-home-more" to="/avisos">
                            Ver todos os avisos
                        </Link>
                    </section>
                )}
            </div>

            <section className="app-home-tips" aria-labelledby="bom-saber">
                <h2 id="bom-saber">Bom saber</h2>
                <ul>
                    <li>Para retirar, leve a receita e um documento com foto.</li>
                    <li>
                        Alguém da família pode buscar por você: cadastre em{" "}
                        <Link className="app-link" to="/meus-dados">
                            Meus dados
                        </Link>
                        .
                    </li>
                </ul>
            </section>
        </>
    );
}
