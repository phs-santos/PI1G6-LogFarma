import { useEffect, useState } from "react";
import { Button, Card } from "@fatec-pi/style-guide";

export function App() {
    const [status, setStatus] = useState("verificando...");

    const checkApi = () => {
        fetch("/api/health")
            .then((res) => res.json())
            .then((data: { status: string }) => setStatus(data.status))
            .catch(() => setStatus("offline"));
    };

    useEffect(checkApi, []);

    return (
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "var(--space-8)" }}>
            <Card title="Fatec PI">
                <p>Status da API: {status}</p>
                <Button onClick={checkApi}>Verificar novamente</Button>
            </Card>
        </main>
    );
}
