import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;

export interface JwtPayload {
  userId: string;
  username: string;
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, SECRET) as JwtPayload;
};
