// Tiny client for the itihasa Supabase project (marks + comments).
// The publishable key is meant to ship to browsers: row-level security and the
// rate-limited RPC functions in the database are what protect the data.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://lnswhympyfgllnddczse.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_hWRYJK9OTbGDlW3UWLvUiQ_B8r2B11w';

async function request(path, options = {}) {
    const res = await fetch(`${URL}/rest/v1/${path}`, {
        ...options,
        headers: { apikey: KEY, 'Content-Type': 'application/json', ...options.headers },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || 'Something went wrong. Please try again.');
    return data;
}

export const getMarks = () => request('marks?select=number,answer,x,y,seed,created_at&order=number.asc&limit=5000');
export const getMark = (number) => request(`marks?select=number,answer,x,y,seed,created_at&number=eq.${Number(number)}`).then((r) => r[0] || null);
export const leaveMark = (answer) => request('rpc/leave_mark', { method: 'POST', body: JSON.stringify({ p_answer: answer }) });

export const getComments = (chronicle) =>
    request(`comments?select=id,name,body,created_at&chronicle=eq.${encodeURIComponent(chronicle)}&order=created_at.desc&limit=200`);
export const addComment = (chronicle, name, body) =>
    request('rpc/add_comment', { method: 'POST', body: JSON.stringify({ p_chronicle: chronicle, p_name: name, p_body: body }) });
