// asyncHandler.js
// Wraps async route controllers to automatically catch errors
// and forward them to Express error middleware.

const asyncHandler = (fn) => {
  // Return a new function that Express can call with req, res, next
  return (req, res, next) => {
    // Call the controller and catch any errors automatically
        Promise.resolve(fn(req, res, next)).catch((err) => next(err))  };
};
export { asyncHandler };
