import { describe, expect, it } from "vitest";
import { maskCep, maskCns, maskPhone } from "./masks";

describe("máscaras", () => {
    it("telefone celular e fixo, enquanto digita", () => {
        expect(maskPhone("1")).toBe("(1");
        expect(maskPhone("16")).toBe("(16");
        expect(maskPhone("169")).toBe("(16) 9");
        expect(maskPhone("1699123")).toBe("(16) 9912-3");
        expect(maskPhone("1632521002")).toBe("(16) 3252-1002");
        expect(maskPhone("16991234567")).toBe("(16) 99123-4567");
        expect(maskPhone("(16) 99123-45678")).toBe("(16) 99123-4567");
        expect(maskPhone("")).toBe("");
    });

    it("Cartão SUS em grupos de 3-4-4-4", () => {
        expect(maskCns("898")).toBe("898");
        expect(maskCns("8980012")).toBe("898 0012");
        expect(maskCns("898001234567890")).toBe("898 0012 3456 7890");
        expect(maskCns("8980012345678901")).toBe("898 0012 3456 7890");
    });

    it("CEP com hífen", () => {
        expect(maskCep("15990")).toBe("15990");
        expect(maskCep("159900")).toBe("15990-0");
        expect(maskCep("15990020")).toBe("15990-020");
        expect(maskCep("15990-0201")).toBe("15990-020");
    });
});
