// app/api/invite/[code]/route.ts
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function DELETE(
  req: Request,
  { params }: { params: { code: string } }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  const { code } = params;

  // Attempt to delete the invite row
  const { error } = await auth.serviceClient
    .from('invites')
    .delete()
    .eq('code', code);

  if (error) {
    console.error(`DELETE /api/invite/${code} error:`, error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
