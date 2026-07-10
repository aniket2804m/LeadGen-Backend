const authorizeRole = (role) => {
  return (req, res, next) => {

    if (req.user.role !== role) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};

const isAdmin = (req, res, next) => {

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }

  next();
};

const isUser = (req, res, next) => {

  if (req.user.role !== "user") {
    return res.status(403).json({ message: "User access only" });
  }

  next();
};

export { authorizeRole, isAdmin, isUser };