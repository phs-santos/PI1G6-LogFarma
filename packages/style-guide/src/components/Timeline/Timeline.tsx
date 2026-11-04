export interface TimelineStep {
    label: string;
    state: "done" | "current" | "todo";
    detail?: string;
}

export interface TimelineProps {
    label: string;
    steps: TimelineStep[];
}

const SPOKEN: Record<TimelineStep["state"], string> = {
    done: "feito",
    current: "agora",
    todo: "a seguir",
};

/** Linha do tempo do pedido: um passo por situação, o atual destacado. */
export function Timeline({ label, steps }: TimelineProps) {
    return (
        <ol className="sg-timeline" aria-label={label}>
            {steps.map((step) => (
                <li
                    key={step.label}
                    className={`sg-timeline__step sg-timeline__step--${step.state}`}
                    aria-current={step.state === "current" ? "step" : undefined}
                >
                    <span className="sg-timeline__dot" aria-hidden="true" />
                    <span className="sg-timeline__text">
                        <span className="sg-visually-hidden">{SPOKEN[step.state]}: </span>
                        {step.label}
                        {step.state === "current" && (
                            <span className="sg-timeline__now"> (agora)</span>
                        )}
                        {step.detail && <span className="sg-timeline__detail">{step.detail}</span>}
                    </span>
                </li>
            ))}
        </ol>
    );
}
