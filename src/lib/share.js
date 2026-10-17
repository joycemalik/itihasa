export const SITE = 'https://itihasaa.netlify.app';

// Shares an observer's star (or the film, with no number) via the native sheet,
// falling back to the clipboard. Resolves to 'copied' when it used the clipboard.
export async function shareStar(number) {
    const url = number ? `${SITE}/sky/${number}` : `${SITE}/film`;
    const text = number
        ? `Before the light went out, they asked me who I am. I'm Observer No. ${number}.`
        : 'Before the light goes out, they ask you one question: who are you?';
    if (navigator.share) {
        try {
            await navigator.share({ title: 'Who are you?', text, url });
        } catch {
            // dismissed
        }
        return 'shared';
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
}
