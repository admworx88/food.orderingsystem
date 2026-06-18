import { NextResponse } from 'next/server';

/**
 * PayMongo webhook handler — disabled.
 * PayMongo integration has been removed. This stub prevents 404 errors
 * from any cached webhook registrations still pointing to this endpoint.
 */
export async function POST() {
  return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 503 });
}
