import jwt from 'jsonwebtoken';

const authDoctor = async (req, res, next) => {
  let token;

  // Support both: dtoken and Authorization: Bearer <token>
  if (req.headers.dtoken) {
    token = req.headers.dtoken;
  } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not Authorized Login Again' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.body.docId = decoded.id;
    next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(401).json({ success: false, message: 'Not Authorized Login Again' });
  }
};

export default authDoctor;
