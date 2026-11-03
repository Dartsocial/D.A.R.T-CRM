// app/api/apply-invite/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  let inviteCode: string | undefined;

  try {
    inviteCode = (await req.json()).invite;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No authenticated user" }, { status: 401 });
  }

  if (!inviteCode || !user.email) {
    return NextResponse.json({ error: 'Invitation and verified account email are required' }, { status: 400 });
  }

  const serviceClient = await createClient('service');

  // 1. Find invite
  const { data: inviteData, error: inviteError } = await serviceClient
    .from('invites')
    .select('role_id, code, email')
    .eq('code', inviteCode)
    .maybeSingle();

  if (inviteError || !inviteData || inviteData.email?.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
  }

  const { data: existingProfile, error: profileReadError } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileReadError) {
    return NextResponse.json({ error: 'Could not load member profile' }, { status: 500 });
  }

  const invitedDisplayName = typeof user.user_metadata?.display_name === 'string'
    ? user.user_metadata.display_name.trim()
    : '';
  const profileValues = {
    role: inviteData.role_id,
    ...(invitedDisplayName ? { display_name: invitedDisplayName } : {}),
  };
  const profileWrite = existingProfile
    ? await serviceClient.from('profiles').update(profileValues).eq('id', user.id)
    : await serviceClient.from('profiles').insert({ id: user.id, ...profileValues });

  if (profileWrite.error) {
    return NextResponse.json({ error: 'Could not assign invitation role' }, { status: 500 });
  }

  // 4. Fetch specializations attached to the invite
  const { data: specializations, error: specializationReadError } = await serviceClient
    .from('invite_specializations')
    .select('specialization_id, created_by')
    .eq('invite_code', inviteCode);

  if (specializationReadError) {
    return NextResponse.json({ error: 'Could not load invitation permissions' }, { status: 500 });
  }

  // 5. Manually insert specializations (if any)
  if (specializations && specializations.length > 0) {
    const inserts = specializations.map((spec) => ({
      user_id: user.id,
      specialization_id: spec.specialization_id,
      assigned_by: spec.created_by,
    }));

    const { error: specializationWriteError } = await serviceClient
      .from('user_specializations')
      .insert(inserts);

    if (specializationWriteError) {
      return NextResponse.json({ error: 'Could not assign invitation permissions' }, { status: 500 });
    }
  }

  // 6. Delete invite after use
  const { error: deleteError } = await serviceClient
    .from('invites')
    .delete()
    .eq('code', inviteCode);

  if (deleteError) {
    return NextResponse.json({ error: 'Could not finalize invitation' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}