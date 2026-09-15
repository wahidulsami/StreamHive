const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof Error)) {
    error = new Error(error || "Internal Server Error");
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  const errors = error.errors || [];

  const response = {
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  };

  return res.status(statusCode).json(response);
};

export { errorHandler };
