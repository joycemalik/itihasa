import { Scroll, Sword, Anchor, MessageCircle, Skull, Waves, Footprints, Dna, Hammer, FileQuestion } from 'lucide-react';

export const articles = [
    {
        id: 'bharat',
        title: 'THE ORIGINS OF BHARAT',
        icon: Scroll,
        teaser: 'When does a piece of land become an idea? We say the name "Bharat" effortlessly. But where did it begin? Was it a King? A Tribe? Or was it a fire lit thousands of years ago?',
        color: 'text-[#8b3a3a]',
        hoverBorder: 'border-[#8b3a3a]',
        hoverBg: 'bg-[#8b3a3a]',
        effect: 'ink', // Changed to ink for a "quiet" feel, or maybe blood if it's still intense? User said "Stripping away hype", "Quiet curiosity". Ink fits better.
        content: {
            type: 'contradiction',
            front: {
                icon: Skull,
                category: 'The Contradiction',
                title: 'They told you your history began with an invasion.',
                intro: 'I am standing on the edge of a contradiction that keeps me awake at night. How did the Vedic poets sing praises of the mighty Saraswati River—describing it roaring from the mountains to the sea—when geology proves that river vanished into the desert 2,000 years before the textbooks say the "Aryans" arrived?',
                points: [
                    { icon: Waves, text: 'Did they hallucinate an ocean in the sand, or were they standing there, on those banks, millennia before history gave them permission to exist?' },
                    { icon: Footprints, text: 'And if they were here that early, who actually moved? But where did the losers go? Did the defeated clans of the Punjab flee westward?' }
                ],
                conclusion: 'Is the DNA in our blood an immigrant marker, or is it the ancient root from which the rest of the world grew? The stars in the Mahabharata point to 5000 BCE, the genetics refuse to fit the colonial narrative, and the silence of the soil is getting louder.'
            },
            back: {
                icon: Dna,
                title: 'The Unraveling',
                subtitle: 'Evidence Level: Critical',
                blocks: [1, 2, 3]
            }
        }
    },
    {
        id: 'tech',
        title: 'IMPOSSIBLE ARCHITECTURE',
        icon: Hammer,
        teaser: 'Stone, Stars, and Sweat. How did they carve the Kailasa temple from the top down? We geek out on the engineering marvels that shouldn\'t exist (but do).',
        color: 'text-[#D4AF37]',
        hoverBorder: 'border-[#D4AF37]',
        hoverBg: 'bg-[#D4AF37]',
        effect: 'gold',
        content: null
    },
    {
        id: 'truth',
        title: 'CONTROVERSIAL TRUTHS',
        icon: FileQuestion,
        teaser: 'Unravelling the "Official" Narratives. Debunking myths, questioning timelines, and looking at the parts of Indian history that make people uncomfortable.',
        color: 'text-[#e8e6e1]',
        hoverBorder: 'border-[#e8e6e1]',
        hoverBg: 'bg-[#e8e6e1]',
        effect: 'ink',
        content: null
    }
];
