export class AppError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', status = 400) {
    super(message, status)
  }
}

export class NotAuthenticatedError extends AppError {
  constructor(message = 'Unauthorized', status = 401) {
    super(message, status)
  }
}

export class NotAuthorizedError extends AppError {
  constructor(message = 'Forbidden', status = 403) {
    super(message, status)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not Found', status = 404) {
    super(message, status)
  }
}

export class ServerError extends AppError {
  constructor(message = 'Internal Server Error', status = 500) {
    super(message, status)
  }
}
