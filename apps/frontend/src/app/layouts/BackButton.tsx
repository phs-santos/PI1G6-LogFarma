import { useNavigate } from "react-router";
import { Button } from "@fatec-pi/style-guide";

/** "Voltar" grande: volta uma tela; se a tela foi aberta direto, vai para o início do perfil. */
export function BackButton({ home }: { home: string }) {
    const navigate = useNavigate();
    const goBack = () => {
        const idx: unknown = (window.history.state as { idx?: unknown } | null)?.idx;
        if (typeof idx === "number" && idx > 0) navigate(-1);
        else navigate(home);
    };
    return (
        <Button variant="ghost" className="app-back" onClick={goBack}>
            Voltar
        </Button>
    );
}
