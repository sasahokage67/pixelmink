import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    let reviewerId = user?.id;
    if (!reviewerId) {
      const demo = await prisma.user.findFirst({ where: { email: 'alex@xchange.dev' } });
      reviewerId = demo?.id;
    }

    const body = await req.json();
    const { sessionId, revieweeId, rating = 5, comment = '', clarityScore = 5, understandScore = 5, wouldStudyAgain = true } = body;

    if (!sessionId || !revieweeId) {
      return NextResponse.json({ error: 'sessionId and revieweeId are required' }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        sessionId,
        reviewerId,
        revieweeId,
        rating: parseInt(rating, 10),
        comment,
        clarityScore: parseInt(clarityScore, 10),
        understandScore: parseInt(understandScore, 10),
        wouldStudyAgain: Boolean(wouldStudyAgain),
      },
    });

    // Update reviewee rating average and review count
    const allReviews = await prisma.review.findMany({
      where: { revieweeId },
    });
    const avgRating = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;

    await prisma.profile.update({
      where: { userId: revieweeId },
      data: {
        rating: parseFloat(avgRating.toFixed(2)),
        reviewsCount: allReviews.length,
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
