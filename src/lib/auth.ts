import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'xchange_default_secret_jwt_key_443322';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name?: string;
  bio?: string;
  location?: string;
  languages?: string;
  teachSkills?: string[];
  learnSkills?: string[];
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getSessionUser(req: NextRequest) {
  // Check Authorization header or cookie
  let token: string | undefined;
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = req.cookies.get('token')?.value;
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  let user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      profile: true,
      userSkills: {
        include: { skill: true },
      },
    },
  });

  // Self-healing rehydration for Vercel ephemeral serverless containers
  if (!user && payload.userId && payload.email) {
    try {
      const cleanName = payload.name || payload.email.split('@')[0];
      user = await prisma.user.create({
        data: {
          id: payload.userId,
          email: payload.email,
          password: 'persisted_user_hash',
          role: payload.role || 'USER',
          profile: {
            create: {
              name: cleanName,
              bio: payload.bio || 'Computer Science engineer & peer knowledge contributor',
              location: payload.location || 'Remote',
              languages: payload.languages || 'English, Russian',
              xCredits: 5,
            },
          },
        },
        include: {
          profile: true,
          userSkills: {
            include: { skill: true },
          },
        },
      });

      if (payload.teachSkills && payload.teachSkills.length > 0) {
        for (const skillName of payload.teachSkills) {
          let s = await prisma.skill.findFirst({ where: { name: skillName } });
          if (!s) {
            s = await prisma.skill.create({
              data: {
                name: skillName,
                category: 'COMPUTER_SCIENCE',
                description: `Skill: ${skillName}`,
              },
            });
          }
          await prisma.userSkill.create({
            data: {
              userId: user.id,
              skillId: s.id,
              type: 'TEACH',
              level: 'INTERMEDIATE',
              description: `Ready to teach ${skillName}`,
            },
          }).catch(() => {});
        }
      }

      if (payload.learnSkills && payload.learnSkills.length > 0) {
        for (const skillName of payload.learnSkills) {
          let s = await prisma.skill.findFirst({ where: { name: skillName } });
          if (!s) {
            s = await prisma.skill.create({
              data: {
                name: skillName,
                category: 'COMPUTER_SCIENCE',
                description: `Skill: ${skillName}`,
              },
            });
          }
          await prisma.userSkill.create({
            data: {
              userId: user.id,
              skillId: s.id,
              type: 'LEARN',
              level: 'BEGINNER',
              learningGoal: `Learning ${skillName}`,
            },
          }).catch(() => {});
        }
      }

      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          profile: true,
          userSkills: {
            include: { skill: true },
          },
        },
      });
    } catch (rehydrateErr) {
      console.warn('Rehydration skipped or handled:', rehydrateErr);
    }
  }

  return user;
}
