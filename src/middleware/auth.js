import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
    const hdr = req.headers.authorization || '';
    const [, token] = hdr.split(' ');
    if (!token) return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Missing token' });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload; // { sub, email, name, role, iat, exp }
        next();
    } catch (e) {
        return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Invalid or expired token' });
    }
}
