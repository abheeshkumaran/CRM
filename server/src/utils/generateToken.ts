import jwt from 'jsonwebtoken';

const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret_key_change_this', {
        expiresIn: '3650d',
    });
};

export default generateToken;
