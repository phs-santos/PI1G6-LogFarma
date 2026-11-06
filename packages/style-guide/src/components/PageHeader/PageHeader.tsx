import type { HTMLAttributes, ReactNode } from "react";

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
    /** Nome da tela (vira o h1). */
    title: ReactNode;
    /** Uma linha explicando a tela ou o assunto (ex.: o remédio do pedido). */
    description?: ReactNode;
    /** Botões da tela, à direita (ex.: "Criar conta"). */
    actions?: ReactNode;
}

/**
 * Cabeçalho padrão de toda tela: título, descrição e ações. No computador fica parado no
 * topo ao rolar. Ocupa a largura da área de conteúdo: quem envolve a tela informa o recuo
 * lateral em `--page-gutter` para o fundo do cabeçalho ir de ponta a ponta.
 */
export function PageHeader({ title, description, actions, className, ...props }: PageHeaderProps) {
    return (
        <header className={["sg-page-header", className].filter(Boolean).join(" ")} {...props}>
            <div className="sg-page-header__text">
                <h1 className="sg-page-header__title">{title}</h1>
                {description && <p className="sg-page-header__description">{description}</p>}
            </div>
            {actions && <div className="sg-page-header__actions">{actions}</div>}
        </header>
    );
}
