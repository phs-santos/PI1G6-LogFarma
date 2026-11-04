export type TarjaType = "none" | "simple" | "antimicrobial" | "special_control";

export interface TarjaProps {
    type: TarjaType;
    className?: string;
}

const TEXT: Record<TarjaType, string> = {
    none: "Não precisa de receita",
    simple: "Leve a receita",
    antimicrobial: "Receita retida na farmácia",
    special_control: "Receita de controle especial retida na farmácia",
};

/** A tarja da caixa do remédio: faixa + texto do tipo de receita (nunca só a cor). */
export function Tarja({ type, className = "" }: TarjaProps) {
    const tone =
        type === "none" ? "" : type === "special_control" ? "sg-tarja--black" : "sg-tarja--red";
    return (
        <div className={["sg-tarja", tone, className].filter(Boolean).join(" ")}>
            <span className="sg-tarja__text">{TEXT[type]}</span>
            {type !== "none" && <span className="sg-tarja__band" aria-hidden="true" />}
        </div>
    );
}
