// errorHandler.js

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // Define default error response structure
    const errorResponse = {
        ok: false,
        message: err.message || 'Internal Server Error',
        // Optionally include stack trace in development mode
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    };

    // Set status code based on error type
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json(errorResponse);
};

export default errorHandler;
