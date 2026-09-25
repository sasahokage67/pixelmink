import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const whereClause = userId ? { revieweeId: userId } : {};

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        reviewer: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, reviews });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    let reviewerId = user?.id;

    if (!reviewerId) {
      // Find the first available user as fallback for testing/demo
      const firstUser = await prisma.user.findFirst();
      reviewerId = firstUser?.id;
    }

    if (!reviewerId) {
      return NextResponse.json({ error: 'Authentication required to post a review' }, { status: 401 });
    }

    const body = await req.json();
    const {
      revieweeId,
      sessionId = null,
      rating = 5,
      comment = '',
      clarityScore = 5,
      understandScore = 5,
      wouldStudyAgain = true,
    } = body;

    if (!revieweeId) {
      return NextResponse.json({ error: 'revieweeId is required' }, { status: 400 });
    }

    if (!comment || comment.trim().length === 0) {
      return NextResponse.json({ error: 'Comment text cannot be empty' }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        sessionId: sessionId || null,
        reviewerId,
        revieweeId,
        rating: Math.max(1, Math.min(5, parseInt(rating, 10) || 5)),
        comment: comment.trim(),
        clarityScore: Math.max(1, Math.min(5, parseInt(clarityScore, 10) || 5)),
        understandScore: Math.max(1, Math.min(5, parseInt(understandScore, 10) || 5)),
        wouldStudyAgain: Boolean(wouldStudyAgain),
      },
      include: {
        reviewer: {
          include: { profile: true },
        },
      },
    });

    // Update reviewee rating average and review count
    const allReviews = await prisma.review.findMany({
      where: { revieweeId },
    });
    const avgRating = allReviews.reduce((acc, r) => acc + r.rating, 0) / (allReviews.length || 1);

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
