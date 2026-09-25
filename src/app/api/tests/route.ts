import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const tests = await prisma.test.findMany({
      include: {
        skill: true,
        questions: true,
      },
    });
    return NextResponse.json({ success: true, tests });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
