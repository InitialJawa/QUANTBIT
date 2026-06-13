console.log('Gemini key:', !!process.env.GEMINI_API_KEY, 'length:', process.env.GEMINI_API_KEY?.length);
console.log('Env keys:', Object.keys(process.env).filter(k => k.includes('KEY')));
