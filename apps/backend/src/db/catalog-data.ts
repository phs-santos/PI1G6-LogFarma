// Catálogo para produção: unidades de Taquaritinga, Matão e Monte Alto e medicamentos da RENAME.
// Carregado por seed-catalog.ts, que só acrescenta (nunca apaga). Nomes, endereços, CNES e
// telefones das unidades são fictícios, como no seed da demonstração. Medicamentos seguem a
// RENAME (componentes básico, estratégico e especializado); o tipo de receita segue a
// RDC 471/2021 (antimicrobianos) e a Portaria 344/1998 (controle especial).
import type { MedicationInput } from "../services/medications.js";
import type { pharmacies } from "./schema.js";
import { DEMO_PHARMACIES } from "./seed-data.js";

type NewPharmacy = typeof pharmacies.$inferInsert;

// ---------- unidades ----------

const unit = (
    name: string,
    kind: NewPharmacy["kind"],
    cnes: string,
    address: string,
    latitude: number,
    longitude: number,
    phone: string,
    openingHours = "seg–sex 7h–17h",
): NewPharmacy => ({
    name,
    kind,
    network: kind === "pfpb" ? "pfpb" : kind === "specialized_pharmacy" ? "state" : "municipal",
    ...(kind === "pfpb" ? { cnpj: cnes } : { cnes }),
    address,
    latitude,
    longitude,
    phone,
    openingHours,
});

export const CATALOG_PHARMACIES: NewPharmacy[] = [
    // Taquaritinga: as mesmas da demonstração.
    ...Object.values(DEMO_PHARMACIES).map((p) => ({ ...p }) as NewPharmacy),

    // Matão
    unit(
        "UBS Centro de Matão",
        "ubs",
        "2082001",
        "Rua Rui Barbosa, 410 — Centro, Matão/SP",
        -21.6033,
        -48.3658,
        "1633821001",
    ),
    unit(
        "UBS Jardim Paraíso (Matão)",
        "ubs",
        "2082002",
        "Rua das Acácias, 220 — Jd. Paraíso, Matão/SP",
        -21.6121,
        -48.3742,
        "1633821002",
    ),
    unit(
        "UBS Vila Santa Cruz (Matão)",
        "ubs",
        "2082003",
        "Av. Sete de Setembro, 1150 — Vila Santa Cruz, Matão/SP",
        -21.5958,
        -48.3561,
        "1633821003",
    ),
    unit(
        "UBS Jardim Bela Vista (Matão)",
        "ubs",
        "2082004",
        "Rua Treze de Maio, 88 — Jd. Bela Vista, Matão/SP",
        -21.6087,
        -48.3529,
        "1633821004",
        "seg–sex 7h–16h",
    ),
    unit(
        "Farmácia Municipal de Matão",
        "municipal_pharmacy",
        "2082005",
        "Rua Narciso Baldan, 300 — Centro, Matão/SP",
        -21.6049,
        -48.3672,
        "1633821005",
        "seg–sex 7h–18h, sáb 8h–12h",
    ),
    unit(
        "Drogaria Matão (Farmácia Popular)",
        "pfpb",
        "33444555000166",
        "Rua Rui Barbosa, 640 — Centro, Matão/SP",
        -21.6041,
        -48.3648,
        "1633829001",
        "todos os dias 8h–22h",
    ),

    // Monte Alto
    unit(
        "UBS Centro de Monte Alto",
        "ubs",
        "2083001",
        "Rua Dr. Raul da Rocha Medeiros, 150 — Centro, Monte Alto/SP",
        -21.2611,
        -48.4964,
        "1632441001",
    ),
    unit(
        "UBS Jardim Alvorada (Monte Alto)",
        "ubs",
        "2083002",
        "Rua José Bonifácio, 990 — Jd. Alvorada, Monte Alto/SP",
        -21.2532,
        -48.5048,
        "1632441002",
    ),
    unit(
        "UBS Vila Nova (Monte Alto)",
        "ubs",
        "2083003",
        "Av. Brasil, 2100 — Vila Nova, Monte Alto/SP",
        -21.2689,
        -48.4901,
        "1632441003",
        "seg–sex 7h–16h",
    ),
    unit(
        "Farmácia Municipal de Monte Alto",
        "municipal_pharmacy",
        "2083004",
        "Rua Tiradentes, 420 — Centro, Monte Alto/SP",
        -21.2623,
        -48.4979,
        "1632441004",
        "seg–sex 7h–18h",
    ),
    unit(
        "Farmácia Saúde Monte Alto (Farmácia Popular)",
        "pfpb",
        "44555666000177",
        "Rua Nhonhô do Livramento, 75 — Centro, Monte Alto/SP",
        -21.2605,
        -48.4951,
        "1632449001",
        "seg–sáb 8h–20h",
    ),
];

// ---------- medicamentos ----------

type Form = MedicationInput["pharmaceuticalForm"];
interface Opts {
    route?: MedicationInput["route"];
    unit?: string;
    component?: MedicationInput["component"];
    rx?: MedicationInput["prescriptionType"];
    cold?: boolean;
    fp?: boolean;
}

const ROUTE: Record<Form, MedicationInput["route"]> = {
    tablet: "oral",
    capsule: "oral",
    oral_solution: "oral",
    oral_suspension: "oral",
    injectable: "intramuscular",
    cream: "topical",
    inhaler: "inhalation",
    other: "other",
};

const UNIT: Record<Form, string> = {
    tablet: "comprimido",
    capsule: "cápsula",
    oral_solution: "frasco",
    oral_suspension: "frasco",
    injectable: "frasco-ampola",
    cream: "bisnaga",
    inhaler: "inalador",
    other: "unidade",
};

function med(
    activeIngredient: string,
    concentration: string,
    pharmaceuticalForm: Form,
    therapeuticClass: string,
    o: Opts = {},
): MedicationInput {
    return {
        activeIngredient,
        concentration,
        pharmaceuticalForm,
        route: o.route ?? ROUTE[pharmaceuticalForm],
        dispensingUnit: o.unit ?? UNIT[pharmaceuticalForm],
        component: o.component ?? "basic",
        therapeuticClass,
        prescriptionType: o.rx ?? "simple",
        storage: o.cold ? "refrigerated" : "room_temperature",
        inRename: true,
        inFarmaciaPopular: o.fp ?? false,
    };
}

/** Várias concentrações do mesmo remédio. */
const each = (concs: string[], f: (c: string) => MedicationInput) => concs.map(f);

const ATB = { rx: "antimicrobial" } as const;
const CTRL = { rx: "special_control" } as const;
const MIP = { rx: "none" } as const;
const FP = { fp: true } as const;
const ESP = { component: "specialized" } as const;
const EST = { component: "strategic" } as const;
const SC = { route: "subcutaneous" } as const;

export const CATALOG_MEDICATIONS: MedicationInput[] = [
    // Hipertensão e coração
    med("Losartana potássica", "50 mg", "tablet", "anti-hipertensivo", FP),
    med("Captopril", "25 mg", "tablet", "anti-hipertensivo", FP),
    ...each(["5 mg", "10 mg", "20 mg"], (c) =>
        med("Maleato de enalapril", c, "tablet", "anti-hipertensivo", FP),
    ),
    ...each(["12,5 mg", "25 mg"], (c) => med("Hidroclorotiazida", c, "tablet", "diurético", FP)),
    ...each(["5 mg", "10 mg"], (c) =>
        med("Besilato de anlodipino", c, "tablet", "anti-hipertensivo", FP),
    ),
    ...each(["25 mg", "50 mg", "100 mg"], (c) =>
        med("Atenolol", c, "tablet", "betabloqueador", FP),
    ),
    ...each(["10 mg", "40 mg"], (c) =>
        med("Cloridrato de propranolol", c, "tablet", "betabloqueador", FP),
    ),
    ...each(["25 mg", "50 mg", "100 mg"], (c) =>
        med("Succinato de metoprolol", c, "tablet", "betabloqueador", FP),
    ),
    ...each(["3,125 mg", "6,25 mg", "12,5 mg", "25 mg"], (c) =>
        med("Carvedilol", c, "tablet", "betabloqueador"),
    ),
    ...each(["25 mg", "100 mg"], (c) => med("Espironolactona", c, "tablet", "diurético", FP)),
    med("Furosemida", "40 mg", "tablet", "diurético"),
    med("Furosemida", "10 mg/mL", "injectable", "diurético", {
        route: "intravenous",
        unit: "ampola",
    }),
    med("Clortalidona", "25 mg", "tablet", "diurético"),
    med("Metildopa", "250 mg", "tablet", "anti-hipertensivo"),
    ...each(["25 mg", "50 mg"], (c) =>
        med("Cloridrato de hidralazina", c, "tablet", "anti-hipertensivo"),
    ),
    med("Nifedipino", "10 mg", "tablet", "anti-hipertensivo"),
    med("Cloridrato de verapamil", "80 mg", "tablet", "antiarrítmico"),
    med("Digoxina", "0,25 mg", "tablet", "cardiotônico"),
    med("Cloridrato de amiodarona", "200 mg", "tablet", "antiarrítmico"),
    med("Dinitrato de isossorbida", "5 mg", "tablet", "antianginoso", { route: "other" }),
    ...each(["20 mg", "40 mg"], (c) =>
        med("Mononitrato de isossorbida", c, "tablet", "antianginoso"),
    ),
    med("Ácido acetilsalicílico", "100 mg", "tablet", "antiagregante plaquetário", MIP),
    med("Clopidogrel", "75 mg", "tablet", "antiagregante plaquetário"),
    ...each(["1 mg", "5 mg"], (c) => med("Varfarina sódica", c, "tablet", "anticoagulante")),
    med("Enoxaparina sódica", "40 mg/0,4 mL", "injectable", "anticoagulante", {
        ...SC,
        unit: "seringa",
    }),

    // Diabetes
    ...each(["500 mg", "850 mg"], (c) =>
        med("Cloridrato de metformina", c, "tablet", "antidiabético", FP),
    ),
    med(
        "Cloridrato de metformina",
        "500 mg de liberação prolongada",
        "tablet",
        "antidiabético",
        FP,
    ),
    med("Glibenclamida", "5 mg", "tablet", "antidiabético", FP),
    ...each(["30 mg", "60 mg"], (c) => med("Gliclazida", c, "tablet", "antidiabético")),
    med("Dapagliflozina", "10 mg", "tablet", "antidiabético", FP),
    med("Insulina humana NPH", "100 UI/mL", "injectable", "antidiabético", {
        ...SC,
        unit: "frasco",
        cold: true,
        fp: true,
    }),
    med("Insulina humana regular", "100 UI/mL", "injectable", "antidiabético", {
        ...SC,
        unit: "frasco",
        cold: true,
        fp: true,
    }),
    med("Insulina glargina", "100 UI/mL", "injectable", "antidiabético", {
        ...SC,
        ...ESP,
        unit: "caneta",
        cold: true,
    }),
    med("Insulina asparte", "100 UI/mL", "injectable", "antidiabético", {
        ...SC,
        ...ESP,
        unit: "caneta",
        cold: true,
    }),
    med("Glicose", "50%", "injectable", "hipoglicemia", { route: "intravenous", unit: "ampola" }),

    // Colesterol
    ...each(["10 mg", "20 mg", "40 mg"], (c) =>
        med("Sinvastatina", c, "tablet", "hipolipemiante", FP),
    ),
    ...each(["10 mg", "20 mg", "40 mg", "80 mg"], (c) =>
        med("Atorvastatina cálcica", c, "tablet", "hipolipemiante", ESP),
    ),

    // Asma e DPOC
    med("Sulfato de salbutamol", "100 mcg/dose", "inhaler", "broncodilatador", FP),
    med("Sulfato de salbutamol", "0,4 mg/mL", "oral_solution", "broncodilatador"),
    ...each(["50 mcg/dose", "200 mcg/dose", "250 mcg/dose"], (c) =>
        med("Dipropionato de beclometasona", c, "inhaler", "corticoide inalatório", FP),
    ),
    med("Brometo de ipratrópio", "0,25 mg/mL", "oral_solution", "broncodilatador", {
        route: "inhalation",
        fp: true,
    }),
    med("Brometo de ipratrópio", "0,02 mg/dose", "inhaler", "broncodilatador", FP),
    med("Budesonida", "32 mcg/dose", "inhaler", "corticoide nasal", { route: "other" }),
    ...each(["6 mcg + 200 mcg", "12 mcg + 400 mcg"], (c) =>
        med("Formoterol + budesonida", c, "inhaler", "broncodilatador", ESP),
    ),
    med("Brometo de tiotrópio", "2,5 mcg/dose", "inhaler", "broncodilatador", ESP),

    // Dor, febre e inflamação
    med("Paracetamol", "500 mg", "tablet", "analgésico", MIP),
    med("Paracetamol", "200 mg/mL", "oral_solution", "analgésico", MIP),
    med("Dipirona monoidratada", "500 mg", "tablet", "analgésico", MIP),
    med("Dipirona monoidratada", "500 mg/mL", "oral_solution", "analgésico", MIP),
    med("Dipirona monoidratada", "500 mg/mL", "injectable", "analgésico", {
        route: "intravenous",
        unit: "ampola",
    }),
    ...each(["200 mg", "300 mg", "600 mg"], (c) =>
        med("Ibuprofeno", c, "tablet", "anti-inflamatório"),
    ),
    med("Ibuprofeno", "50 mg/mL", "oral_suspension", "anti-inflamatório", MIP),
    med("Ácido acetilsalicílico", "500 mg", "tablet", "analgésico", MIP),
    med("Diclofenaco sódico", "50 mg", "tablet", "anti-inflamatório"),
    med("Diclofenaco sódico", "25 mg/mL", "injectable", "anti-inflamatório", { unit: "ampola" }),
    ...each(["5 mg", "20 mg"], (c) => med("Prednisona", c, "tablet", "corticoide")),
    med("Fosfato sódico de prednisolona", "3 mg/mL", "oral_solution", "corticoide"),
    med("Dexametasona", "4 mg", "tablet", "corticoide"),
    med("Dexametasona", "0,1%", "cream", "corticoide tópico"),
    med("Fosfato dissódico de dexametasona", "4 mg/mL", "injectable", "corticoide", {
        unit: "ampola",
    }),
    med("Acetato de hidrocortisona", "1%", "cream", "corticoide tópico"),
    med("Succinato sódico de hidrocortisona", "100 mg", "injectable", "corticoide", {
        route: "intravenous",
    }),
    ...each(["100 mg", "300 mg"], (c) => med("Alopurinol", c, "tablet", "antigotoso")),
    med("Colchicina", "0,5 mg", "tablet", "antigotoso"),

    // Antimicrobianos (receita retida)
    med("Amoxicilina", "500 mg", "capsule", "antimicrobiano", ATB),
    med("Amoxicilina", "50 mg/mL", "oral_suspension", "antimicrobiano", ATB),
    med(
        "Amoxicilina + clavulanato de potássio",
        "500 mg + 125 mg",
        "tablet",
        "antimicrobiano",
        ATB,
    ),
    med(
        "Amoxicilina + clavulanato de potássio",
        "50 mg + 12,5 mg/mL",
        "oral_suspension",
        "antimicrobiano",
        ATB,
    ),
    med("Azitromicina", "500 mg", "tablet", "antimicrobiano", ATB),
    med("Azitromicina", "40 mg/mL", "oral_suspension", "antimicrobiano", ATB),
    med("Cefalexina", "500 mg", "capsule", "antimicrobiano", ATB),
    med("Cefalexina", "50 mg/mL", "oral_suspension", "antimicrobiano", ATB),
    med("Ceftriaxona", "1 g", "injectable", "antimicrobiano", ATB),
    med("Cloridrato de ciprofloxacino", "500 mg", "tablet", "antimicrobiano", ATB),
    med("Sulfametoxazol + trimetoprima", "400 mg + 80 mg", "tablet", "antimicrobiano", ATB),
    med(
        "Sulfametoxazol + trimetoprima",
        "40 mg + 8 mg/mL",
        "oral_suspension",
        "antimicrobiano",
        ATB,
    ),
    med("Nitrofurantoína", "100 mg", "capsule", "antimicrobiano", ATB),
    ...each(["250 mg", "400 mg"], (c) => med("Metronidazol", c, "tablet", "antimicrobiano", ATB)),
    med("Metronidazol", "100 mg/g", "cream", "antimicrobiano", {
        ...ATB,
        route: "other",
        unit: "bisnaga com aplicador",
    }),
    med("Doxiciclina", "100 mg", "tablet", "antimicrobiano", ATB),
    med("Claritromicina", "500 mg", "tablet", "antimicrobiano", ATB),
    med("Eritromicina", "500 mg", "tablet", "antimicrobiano", ATB),
    med("Benzilpenicilina benzatina", "1.200.000 UI", "injectable", "antimicrobiano", ATB),
    med("Fluconazol", "150 mg", "capsule", "antifúngico", ATB),
    med("Aciclovir", "200 mg", "tablet", "antiviral", ATB),
    med("Fosfato de oseltamivir", "75 mg", "capsule", "antiviral", { ...ATB, ...EST }),

    // Vermes, piolho, sarna e fungos
    med("Albendazol", "400 mg", "tablet", "antiparasitário"),
    med("Albendazol", "40 mg/mL", "oral_suspension", "antiparasitário"),
    med("Mebendazol", "100 mg", "tablet", "antiparasitário"),
    med("Ivermectina", "6 mg", "tablet", "antiparasitário"),
    med("Permetrina", "5%", "cream", "escabicida", { unit: "frasco de loção" }),
    med("Nistatina", "100.000 UI/mL", "oral_suspension", "antifúngico"),
    med("Nistatina", "25.000 UI/g", "cream", "antifúngico", {
        route: "other",
        unit: "bisnaga com aplicador",
    }),
    med("Nitrato de miconazol", "2%", "cream", "antifúngico"),
    med("Sulfadiazina de prata", "1%", "cream", "queimaduras"),
    med("Neomicina + bacitracina", "5 mg + 250 UI/g", "cream", "antibacteriano tópico", {
        unit: "bisnaga de pomada",
    }),

    // Estômago e intestino
    med("Omeprazol", "20 mg", "capsule", "antiulceroso"),
    med("Omeprazol", "40 mg", "injectable", "antiulceroso", { route: "intravenous" }),
    med("Cloridrato de metoclopramida", "10 mg", "tablet", "antiemético"),
    med("Cloridrato de metoclopramida", "4 mg/mL", "oral_solution", "antiemético"),
    med("Cloridrato de ondansetrona", "4 mg", "tablet", "antiemético"),
    med("Hidróxido de alumínio", "61,5 mg/mL", "oral_suspension", "antiácido", MIP),
    med("Sais para reidratação oral", "27,9 g", "other", "reidratação", {
        ...MIP,
        route: "oral",
        unit: "envelope",
    }),
    med("Lactulose", "667 mg/mL", "oral_solution", "laxante"),
    med("Simeticona", "75 mg/mL", "oral_solution", "antiflatulento", MIP),
    med("Butilbrometo de escopolamina", "10 mg", "tablet", "antiespasmódico"),

    // Alergia
    med("Loratadina", "10 mg", "tablet", "antialérgico", MIP),
    med("Loratadina", "1 mg/mL", "oral_solution", "antialérgico", MIP),
    med("Maleato de dexclorfeniramina", "2 mg", "tablet", "antialérgico"),
    med("Maleato de dexclorfeniramina", "0,4 mg/mL", "oral_solution", "antialérgico"),
    med("Cloridrato de prometazina", "25 mg", "tablet", "antialérgico"),
    med("Epinefrina", "1 mg/mL", "injectable", "anafilaxia", { unit: "ampola" }),

    // Tireoide, ossos, vitaminas e minerais
    ...each(["25 mcg", "50 mcg", "88 mcg", "100 mcg"], (c) =>
        med("Levotiroxina sódica", c, "tablet", "hormônio tireoidiano"),
    ),
    med("Propiltiouracila", "100 mg", "tablet", "antitireoidiano"),
    med("Tiamazol", "10 mg", "tablet", "antitireoidiano"),
    med("Alendronato de sódio", "70 mg", "tablet", "osteoporose"),
    med("Carbonato de cálcio + colecalciferol", "500 mg + 400 UI", "tablet", "suplemento"),
    med("Sulfato ferroso", "40 mg de ferro", "tablet", "antianêmico", MIP),
    med("Sulfato ferroso", "25 mg/mL de ferro", "oral_solution", "antianêmico", MIP),
    med("Ácido fólico", "5 mg", "tablet", "antianêmico"),
    med("Ácido fólico", "0,2 mg/mL", "oral_solution", "antianêmico"),
    med("Cianocobalamina", "1.000 mcg/mL", "injectable", "vitamina", { unit: "ampola" }),
    med("Colecalciferol", "50.000 UI", "capsule", "vitamina"),
    med("Calcitriol", "0,25 mcg", "capsule", "vitamina D", ESP),

    // Saúde da mulher
    med("Levonorgestrel + etinilestradiol", "0,15 mg + 0,03 mg", "tablet", "contraceptivo", {
        ...FP,
        unit: "cartela",
    }),
    med("Noretisterona", "0,35 mg", "tablet", "contraceptivo", { unit: "cartela" }),
    med("Levonorgestrel", "0,75 mg", "tablet", "contracepção de emergência", { unit: "cartela" }),
    med("Acetato de medroxiprogesterona", "150 mg/mL", "injectable", "contraceptivo", {
        unit: "ampola",
    }),
    med(
        "Enantato de noretisterona + valerato de estradiol",
        "50 mg + 5 mg/mL",
        "injectable",
        "contraceptivo",
        { unit: "ampola" },
    ),
    med("Estrogênios conjugados", "0,3 mg", "tablet", "terapia hormonal"),
    med("Ocitocina", "5 UI/mL", "injectable", "uterotônico", { unit: "ampola" }),

    // Saúde mental e neurologia (controle especial)
    med("Clonazepam", "2 mg", "tablet", "anticonvulsivante", CTRL),
    med("Clonazepam", "2,5 mg/mL", "oral_solution", "anticonvulsivante", CTRL),
    ...each(["5 mg", "10 mg"], (c) => med("Diazepam", c, "tablet", "ansiolítico", CTRL)),
    med("Diazepam", "5 mg/mL", "injectable", "ansiolítico", {
        ...CTRL,
        route: "intravenous",
        unit: "ampola",
    }),
    med("Fenobarbital", "100 mg", "tablet", "anticonvulsivante", CTRL),
    med("Fenobarbital", "40 mg/mL", "oral_solution", "anticonvulsivante", CTRL),
    med("Carbamazepina", "200 mg", "tablet", "anticonvulsivante", CTRL),
    med("Carbamazepina", "20 mg/mL", "oral_suspension", "anticonvulsivante", CTRL),
    med("Fenitoína sódica", "100 mg", "tablet", "anticonvulsivante", CTRL),
    ...each(["250 mg", "500 mg"], (c) =>
        med("Valproato de sódio", c, "tablet", "anticonvulsivante", CTRL),
    ),
    med("Valproato de sódio", "50 mg/mL", "oral_solution", "anticonvulsivante", CTRL),
    med("Cloridrato de amitriptilina", "25 mg", "tablet", "antidepressivo", CTRL),
    med("Cloridrato de nortriptilina", "25 mg", "capsule", "antidepressivo", CTRL),
    med("Cloridrato de clomipramina", "25 mg", "tablet", "antidepressivo", CTRL),
    med("Cloridrato de fluoxetina", "20 mg", "capsule", "antidepressivo", CTRL),
    med("Cloridrato de sertralina", "50 mg", "tablet", "antidepressivo", CTRL),
    med("Bromidrato de citalopram", "20 mg", "tablet", "antidepressivo", CTRL),
    med("Cloridrato de bupropiona", "150 mg", "tablet", "antitabagismo", { ...CTRL, ...EST }),
    ...each(["1 mg", "5 mg"], (c) => med("Haloperidol", c, "tablet", "antipsicótico", CTRL)),
    med("Decanoato de haloperidol", "50 mg/mL", "injectable", "antipsicótico", {
        ...CTRL,
        unit: "ampola",
    }),
    ...each(["25 mg", "100 mg"], (c) =>
        med("Cloridrato de clorpromazina", c, "tablet", "antipsicótico", CTRL),
    ),
    med("Levomepromazina", "25 mg", "tablet", "antipsicótico", CTRL),
    ...each(["1 mg", "2 mg"], (c) => med("Risperidona", c, "tablet", "antipsicótico", CTRL)),
    med("Carbonato de lítio", "300 mg", "tablet", "estabilizador de humor", CTRL),
    med("Cloridrato de biperideno", "2 mg", "tablet", "antiparkinsoniano", CTRL),
    med("Levodopa + benserazida", "200 mg + 50 mg", "tablet", "antiparkinsoniano"),
    med("Levodopa + carbidopa", "250 mg + 25 mg", "tablet", "antiparkinsoniano"),
    ...each(["10 mg", "30 mg"], (c) =>
        med("Sulfato de morfina", c, "tablet", "analgésico opioide", CTRL),
    ),
    med("Sulfato de morfina", "10 mg/mL", "injectable", "analgésico opioide", {
        ...CTRL,
        unit: "ampola",
    }),
    med("Fosfato de codeína", "30 mg", "tablet", "analgésico opioide", CTRL),
    ...each(["25 mg", "100 mg"], (c) =>
        med("Clozapina", c, "tablet", "antipsicótico", { ...CTRL, ...ESP }),
    ),
    ...each(["5 mg", "10 mg"], (c) =>
        med("Olanzapina", c, "tablet", "antipsicótico", { ...CTRL, ...ESP }),
    ),
    ...each(["25 mg", "100 mg", "200 mg"], (c) =>
        med("Hemifumarato de quetiapina", c, "tablet", "antipsicótico", { ...CTRL, ...ESP }),
    ),
    ...each(["25 mg", "50 mg", "100 mg"], (c) =>
        med("Topiramato", c, "tablet", "anticonvulsivante", { ...CTRL, ...ESP }),
    ),
    ...each(["25 mg", "50 mg", "100 mg"], (c) =>
        med("Lamotrigina", c, "tablet", "anticonvulsivante", { ...CTRL, ...ESP }),
    ),
    ...each(["300 mg", "400 mg"], (c) =>
        med("Gabapentina", c, "capsule", "anticonvulsivante", { ...CTRL, ...ESP }),
    ),
    med("Vigabatrina", "500 mg", "tablet", "anticonvulsivante", { ...CTRL, ...ESP }),
    ...each(["5 mg", "10 mg"], (c) =>
        med("Cloridrato de donepezila", c, "tablet", "antidemência", { ...CTRL, ...ESP }),
    ),
    ...each(["1,5 mg", "3 mg", "4,5 mg", "6 mg"], (c) =>
        med("Hemitartarato de rivastigmina", c, "capsule", "antidemência", { ...CTRL, ...ESP }),
    ),
    ...each(["8 mg", "16 mg", "24 mg"], (c) =>
        med("Bromidrato de galantamina", c, "capsule", "antidemência", { ...CTRL, ...ESP }),
    ),
    med("Cloridrato de memantina", "10 mg", "tablet", "antidemência", { ...CTRL, ...ESP }),
    ...each(["0,125 mg", "0,25 mg", "1 mg"], (c) =>
        med("Dicloridrato de pramipexol", c, "tablet", "antiparkinsoniano", ESP),
    ),
    med("Riluzol", "50 mg", "tablet", "esclerose lateral amiotrófica", ESP),

    // Programas estratégicos (tuberculose, hanseníase, HIV, malária, Chagas, tabagismo)
    med(
        "Rifampicina + isoniazida + pirazinamida + etambutol",
        "150 mg + 75 mg + 400 mg + 275 mg",
        "tablet",
        "antituberculoso",
        { ...ATB, ...EST },
    ),
    med("Rifampicina + isoniazida", "150 mg + 75 mg", "tablet", "antituberculoso", {
        ...ATB,
        ...EST,
    }),
    med("Isoniazida", "100 mg", "tablet", "antituberculoso", { ...ATB, ...EST }),
    med("Pirazinamida", "500 mg", "tablet", "antituberculoso", { ...ATB, ...EST }),
    med("Cloridrato de etambutol", "400 mg", "tablet", "antituberculoso", { ...ATB, ...EST }),
    med("Rifampicina", "300 mg", "capsule", "antituberculoso", { ...ATB, ...EST }),
    med("Dapsona", "100 mg", "tablet", "hansenostático", { ...ATB, ...EST }),
    med("Clofazimina", "100 mg", "capsule", "hansenostático", { ...ATB, ...EST }),
    med("Tenofovir + lamivudina", "300 mg + 300 mg", "tablet", "antirretroviral", EST),
    med("Dolutegravir sódico", "50 mg", "tablet", "antirretroviral", EST),
    med("Efavirenz", "600 mg", "tablet", "antirretroviral", EST),
    med("Zidovudina + lamivudina", "300 mg + 150 mg", "tablet", "antirretroviral", EST),
    med("Atazanavir", "300 mg", "capsule", "antirretroviral", EST),
    med("Ritonavir", "100 mg", "tablet", "antirretroviral", EST),
    med(
        "Tenofovir + entricitabina",
        "300 mg + 200 mg",
        "tablet",
        "profilaxia pré-exposição (PrEP)",
        EST,
    ),
    med("Difosfato de cloroquina", "150 mg", "tablet", "antimalárico", EST),
    med("Difosfato de primaquina", "15 mg", "tablet", "antimalárico", EST),
    med("Artemeter + lumefantrina", "20 mg + 120 mg", "tablet", "antimalárico", EST),
    med("Benznidazol", "100 mg", "tablet", "doença de Chagas", EST),
    med("Nicotina", "21 mg", "other", "antitabagismo", {
        ...EST,
        route: "topical",
        unit: "adesivo",
    }),
    med("Nicotina", "14 mg", "other", "antitabagismo", {
        ...EST,
        route: "topical",
        unit: "adesivo",
    }),
    med("Nicotina", "2 mg", "other", "antitabagismo", {
        ...EST,
        route: "oral",
        unit: "goma de mascar",
    }),

    // Especializados: reumatologia, transplante, intestino, rim e outros
    med("Adalimumabe", "40 mg", "injectable", "imunobiológico", {
        ...ESP,
        ...SC,
        unit: "seringa preenchida",
        cold: true,
    }),
    med("Etanercepte", "50 mg", "injectable", "imunobiológico", {
        ...ESP,
        ...SC,
        unit: "seringa preenchida",
        cold: true,
    }),
    med("Infliximabe", "100 mg", "injectable", "imunobiológico", {
        ...ESP,
        route: "intravenous",
        cold: true,
    }),
    med("Tocilizumabe", "162 mg", "injectable", "imunobiológico", {
        ...ESP,
        ...SC,
        unit: "seringa preenchida",
        cold: true,
    }),
    med("Certolizumabe pegol", "200 mg", "injectable", "imunobiológico", {
        ...ESP,
        ...SC,
        unit: "seringa preenchida",
        cold: true,
    }),
    med("Leflunomida", "20 mg", "tablet", "antirreumático", ESP),
    med("Metotrexato", "2,5 mg", "tablet", "antirreumático", ESP),
    med("Metotrexato", "25 mg/mL", "injectable", "antirreumático", { ...ESP, ...SC }),
    med("Sulfato de hidroxicloroquina", "400 mg", "tablet", "antirreumático", ESP),
    med("Sulfassalazina", "500 mg", "tablet", "anti-inflamatório intestinal", ESP),
    ...each(["400 mg", "800 mg"], (c) =>
        med("Mesalazina", c, "tablet", "anti-inflamatório intestinal", ESP),
    ),
    med("Micofenolato de mofetila", "500 mg", "tablet", "imunossupressor", ESP),
    ...each(["1 mg", "5 mg"], (c) => med("Tacrolimo", c, "capsule", "imunossupressor", ESP)),
    ...each(["25 mg", "100 mg"], (c) => med("Ciclosporina", c, "capsule", "imunossupressor", ESP)),
    med("Azatioprina", "50 mg", "tablet", "imunossupressor", ESP),
    med("Alfaepoetina", "4.000 UI", "injectable", "antianêmico", { ...ESP, ...SC, cold: true }),
    med("Somatropina", "4 UI", "injectable", "hormônio de crescimento", {
        ...ESP,
        ...SC,
        cold: true,
    }),
    med("Cloridrato de sevelâmer", "800 mg", "tablet", "doença renal crônica", ESP),
    med("Ácido zoledrônico", "5 mg/100 mL", "injectable", "osteoporose", {
        ...ESP,
        route: "intravenous",
        unit: "bolsa",
    }),
    med("Citrato de sildenafila", "20 mg", "tablet", "hipertensão pulmonar", ESP),
    med("Ambrisentana", "5 mg", "tablet", "hipertensão pulmonar", ESP),
    med("Bosentana", "62,5 mg", "tablet", "hipertensão pulmonar", ESP),
    med("Cloridrato de fingolimode", "0,5 mg", "capsule", "esclerose múltipla", ESP),
    med("Teriflunomida", "14 mg", "tablet", "esclerose múltipla", ESP),
    med("Acetato de glatirâmer", "40 mg/mL", "injectable", "esclerose múltipla", {
        ...ESP,
        ...SC,
        unit: "seringa preenchida",
        cold: true,
    }),
    med("Natalizumabe", "300 mg", "injectable", "esclerose múltipla", {
        ...ESP,
        route: "intravenous",
        cold: true,
    }),
    med("Toxina botulínica tipo A", "100 UI", "injectable", "distonia", { ...ESP, cold: true }),
    med("Acetato de octreotida", "0,1 mg/mL", "injectable", "acromegalia", {
        ...ESP,
        ...SC,
        unit: "ampola",
        cold: true,
    }),
    med("Deferasirox", "500 mg", "tablet", "quelante de ferro", ESP),
    med("Hidroxiureia", "500 mg", "capsule", "doença falciforme", ESP),
    med("Cinacalcete", "30 mg", "tablet", "hiperparatireoidismo", ESP),
    med("Alfacalcidol", "1 mcg", "capsule", "vitamina D", ESP),
    med("Entecavir", "0,5 mg", "tablet", "hepatite B", ESP),
    med("Sofosbuvir", "400 mg", "tablet", "hepatite C", ESP),
    med("Daclatasvir", "60 mg", "tablet", "hepatite C", ESP),
    med("Desmopressina", "0,1 mg", "tablet", "diabetes insípido", ESP),
    med("Cabergolina", "0,5 mg", "tablet", "hiperprolactinemia", ESP),
    med("Ácido ursodesoxicólico", "300 mg", "tablet", "doença hepática", ESP),
    med("Pancreatina", "25.000 UI", "capsule", "fibrose cística", ESP),
    med("Alfadornase", "2,5 mg", "other", "fibrose cística", {
        ...ESP,
        route: "inhalation",
        unit: "ampola para nebulização",
        cold: true,
    }),
];
