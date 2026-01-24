import openRouter from '@/config/openrouter.ts';

export const generateIconForSubject = async (subjectName: string): Promise<string> => {
  try {
    const completion = await openRouter.chat.send({
      model: 'google/gemma-3-27b-it:free',
      messages: [{
        role: 'user',
        content: `Suggest a single, standard Lucide React icon name (PascalCase, e.g. Book, Gavel, Globe, Calculator, Landmark, Newspaper, TrendingUp) for a study subject named "${subjectName}". Return ONLY the name. Do not explain.`
      }]
    });

    const content = completion?.choices?.[0]?.message?.content;
    let suggested = '';
    
    if (typeof content === 'string') {
      suggested = content.trim();
    } else if (Array.isArray(content) && content.length > 0) {
       const firstPart = content[0];
       // Check if 'text' property exists safely
       if (firstPart && typeof firstPart === 'object' && 'text' in firstPart) {
           suggested = (firstPart as any).text.trim();
       }
    }
    
    // Simple validation
    if (suggested && /^[A-Z][a-zA-Z]+$/.test(suggested)) {
       return suggested;
    }
  } catch (err) {
     console.error('Icon generation failed, using default', err);
  }
  return 'Book';
};
