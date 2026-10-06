import React, { useEffect, useState } from 'react';
import { getComments, addComment } from '../lib/supabase';

const timeAgo = (iso) => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

// A reader's margin: comments for one chronicle, stored in Supabase.
const Comments = ({ chronicle, title = 'THE MARGIN', prompt = 'Leave a note in the margin.' }) => {
    const [comments, setComments] = useState([]);
    const [name, setName] = useState(() => localStorage.getItem('itihasa-name') || '');
    const [body, setBody] = useState('');
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');

    useEffect(() => {
        getComments(chronicle).then(setComments).catch(() => setComments([]));
    }, [chronicle]);

    const submit = async (e) => {
        e.preventDefault();
        setStatus('sending');
        setError('');
        try {
            const c = await addComment(chronicle, name.trim(), body.trim());
            try {
                localStorage.setItem('itihasa-name', name.trim());
            } catch {
                // private mode
            }
            setComments((list) => [c, ...list]);
            setBody('');
            setStatus('idle');
        } catch (err) {
            setError(err.message);
            setStatus('idle');
        }
    };

    return (
        <section className="w-full max-w-2xl mx-auto px-6 py-24 text-[#d6cfc2]">
            <h3 className="font-ancient text-2xl md:text-3xl text-center tracking-[0.2em] mb-3">{title}</h3>
            <p className="font-scholar italic text-lg text-center text-[#d6cfc2]/60 mb-12">{prompt}</p>

            <form onSubmit={submit} className="flex flex-col gap-4 mb-16">
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={40}
                    required
                    placeholder="Your name"
                    className="bg-transparent border-b border-[#8b3a3a]/70 px-1 py-2 font-scholar text-lg placeholder-[#5c5346] focus:outline-none focus:border-[#d6cfc2]"
                />
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={1000}
                    required
                    rows={3}
                    placeholder="What did it stir in you?"
                    className="bg-transparent border-b border-[#8b3a3a]/70 px-1 py-2 font-scholar text-lg placeholder-[#5c5346] focus:outline-none focus:border-[#d6cfc2] resize-none"
                />
                {error && <p className="font-scholar text-[#d98a7a]">{error}</p>}
                <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="self-center mt-4 px-8 py-2 border border-[#8b3a3a] text-[#d6cfc2] font-ancient text-xs tracking-[0.3em] hover:bg-[#8b3a3a] transition-colors cursor-pointer disabled:opacity-50"
                >
                    {status === 'sending' ? '[ WRITING… ]' : '[ WRITE IN THE MARGIN ]'}
                </button>
            </form>

            <ul className="flex flex-col gap-10">
                {comments.map((c) => (
                    <li key={c.id} className="border-l border-[#8b3a3a]/50 pl-5">
                        <p className="font-scholar text-lg leading-relaxed whitespace-pre-wrap">{c.body}</p>
                        <p className="mt-2 font-hand text-lg text-[#d6cfc2]/50">
                            {c.name} · {timeAgo(c.created_at)}
                        </p>
                    </li>
                ))}
                {comments.length === 0 && (
                    <li className="text-center font-hand text-xl text-[#d6cfc2]/40">The margin is still empty. Be the first.</li>
                )}
            </ul>
        </section>
    );
};

export default Comments;
