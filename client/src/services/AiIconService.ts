

const KEYWORD_ICON_MAP: Record<string, string[]> = {
    // Math & Logic
    'math': ['Calculator', 'Sigma', 'Binary', 'FunctionSquare'],
    'calculation': ['Calculator', 'Abacus'],
    'algebra': ['Variable', 'FunctionSquare', 'Superscript'],
    'geometry': ['Triangle', 'Ruler', 'Compass', 'Circle', 'Square'],
    'statistics': ['BarChart3', 'PieChart', 'ScatterChart', 'TrendingUp'],
    'calculus': ['Sigma', 'TrendingUp'],

    // Science
    'science': ['FlaskConical', 'Atom', 'Microscope'],
    'physics': ['Atom', 'Zap', 'Magnet', 'Rocket'],
    'chemistry': ['FlaskConical', 'TestTube', 'Pipette'],
    'biology': ['Dna', 'Sprout', 'HeartPulse', 'Bug'],
    'nature': ['Leaf', 'TreeDeciduous', 'Flower2'],
    'space': ['Rocket', 'Moon', 'Star'],

    // Humanities
    'history': ['Hourglass', 'Scroll', 'Landmark', 'Sword', 'Castle'],
    'geography': ['Globe', 'Map', 'Compass', 'Mountain'],
    'politics': ['Vote', 'Landmark', 'Gavel'],
    'law': ['Gavel', 'Scale', 'Scroll'],
    'economics': ['Coins', 'Banknote', 'PieChart', 'Landmark'],

    // Language & Literature
    'english': ['BookOpen', 'PenTool', 'Languages'],
    'literature': ['BookOpen', 'Feather', 'Library'],
    'reading': ['BookOpen', 'Glasses'],
    'writing': ['PenTool', 'Pencil', 'Feather'],
    'language': ['Languages', 'MessageCircle', 'Globe'],

    // Arts
    'art': ['Palette', 'Brush', 'Image'],
    'music': ['Music', 'Headphones', 'Mic2', 'Piano'],
    'film': ['Film', 'Video'],
    'design': ['PenTool', 'Layout', 'Component'],

    // Tech
    'computer': ['Laptop', 'Code', 'Cpu', 'Terminal', 'Monitor'],
    'technology': ['Cpu', 'Smartphone', 'Wifi'],
    'coding': ['Code', 'Terminal', 'Braces', 'GitBranch'],
    'data': ['Database', 'Binary', 'BarChart'],
    'ai': ['BrainCircuit', 'Bot', 'Sparkles'],

    // General/Productivity
    'exam': ['ClipboardCheck', 'Pen', 'GraduationCap'],
    'study': ['BookOpen', 'Library', 'Brain'],
    'plan': ['Calendar', 'Kanban'],
    'work': ['Briefcase', 'Building'],
    'idea': ['Lightbulb', 'Sparkles'],
    'goal': ['Target', 'Trophy', 'Medal'],
};

// Common prefixes to ignore for better matching
const IGNORED_WORDS = ['intro', 'introduction', 'basics', 'advanced', 'intermediate', 'part', 'unit', 'chapter', 'lesson'];

export class AiIconService {
    /**
     * Suggests a Lucide icon name based on input text (title/description)
     */
    static suggestIcon(text: string): string {
        if (!text) return 'Book';

        const lowerText = text.toLowerCase();
        const words = lowerText.split(/[\s-_]+/).filter(w => !IGNORED_WORDS.includes(w) && w.length > 2);

        // 1. Check for exact keyword matches in the text
        for (const [keyword, icons] of Object.entries(KEYWORD_ICON_MAP)) {
            if (lowerText.includes(keyword)) {
                return icons[0];
            }
        }

        // 2. Check individual words against keywords
        for (const word of words) {
            // Direct match
            if (KEYWORD_ICON_MAP[word]) {
                return KEYWORD_ICON_MAP[word][0];
            }

            // Partial match (word contains keyword)
            for (const keyword of Object.keys(KEYWORD_ICON_MAP)) {
                if (word.includes(keyword) || keyword.includes(word)) {
                    // Only if similarity is high enough? 
                    // For now keep it simple: if keyword is significant length
                    if (keyword.length > 3) return KEYWORD_ICON_MAP[keyword][0];
                }
            }
        }

        // 3. Fallback based on first letter or completely random deterministic?
        // Let's return a generic default for now if no match
        return 'Book';
    }

    /**
     * Returns a list of alternative icons for a given text
     */
    static getAlternatives(text: string): string[] {
        const lowerText = text.toLowerCase();
        let matches: string[] = [];

        for (const [keyword, icons] of Object.entries(KEYWORD_ICON_MAP)) {
            if (lowerText.includes(keyword)) {
                matches = [...matches, ...icons];
            }
        }

        // Dedup and return top 5
        return Array.from(new Set(matches)).slice(0, 5);
    }
}
