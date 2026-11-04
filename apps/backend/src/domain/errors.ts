// Erros de regra de negócio. O errorHandler de app.ts converte em { message } com o status certo.
export class AppError extends Error {
    constructor(
        message: string,
        readonly statusCode: number,
    ) {
        super(message);
        this.name = new.target.name;
    }
}

export class BadRequestError extends AppError {
    constructor(message: string) {
        super(message, 400);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Faça login para continuar.") {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Você não tem permissão para esta ação.") {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Não encontrado.") {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409);
    }
}
