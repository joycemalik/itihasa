import { useState } from 'react';
import { leaveMark } from '../lib/supabase';

// Asked once, before the light goes out. The film then spends itself taking the answer apart.
export default function Opener({ onDone }) {
    const [answer, setAnswer] = useState('');
    const [leaving, setLeaving] = useState(false);

    const finish = (mark) => {
        setLeaving(true);
        setTimeout(() => onDone(mark), 1400);
    };

    const submit = (e) => {
        e.preventDefault();
        const text = answer.trim();
        if (!text) return;
        // Saved in the background: the film never waits on the network.
        leaveMark(text)
            .then((m) => {
                try {
                    localStorage.setItem('itihasa-mark', String(m.number));
                } catch {
                    // private mode
                }
                onDone(m.number, true);
            })
            .catch(() => {});
        finish(null);
    };

    return (
        <div className={`exp-opener ${leaving ? 'is-leaving' : ''}`}>
            <form onSubmit={submit}>
                <p className="exp-opener-kicker">Before the light goes out</p>
                <label htmlFor="exp-who">Who are you?</label>
                <input
                    id="exp-who"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    maxLength={120}
                    autoComplete="off"
                    autoFocus
                    placeholder="one line, honestly"
                />
                <button type="submit" disabled={!answer.trim()}>begin</button>
                <button type="button" className="exp-opener-skip" onClick={() => finish(null)}>
                    skip
                </button>
            </form>
        </div>
    );
}
