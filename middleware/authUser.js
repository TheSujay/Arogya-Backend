import jwt from 'jsonwebtoken';

// user authentication middleware
const authUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Check if Authorization header is missing or malformed
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Not Authorized Login Again' });
    }

    const token = authHeader.split(' ')[1]; // Get the token after "Bearer"

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id; // or req.user = decoded; if you prefer
        next();
    } catch (error) {
        console.error('JWT Error:', error.message);
        return res.status(401).json({ success: false, message: 'Token expired or invalid, please login again' });
    }
};

export default authUser;
