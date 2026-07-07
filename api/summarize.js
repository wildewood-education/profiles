export default async function handler(req, res) {
  console.log('API key present:', !!process.env.ANTHROPIC_API_KEY);
  console.log('API key prefix:', process.env.ANTHROPIC_API_KEY?.slice(0, 10));

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    curProfile,
    idealProfile,
    bandwidthTier,
    habitTags,
    strategies,
    isSameProfile,
    modalType, // 'current' or 'ideal'
  } = req.body;

  if (!curProfile || !idealProfile || !bandwidthTier) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const bandwidthDescriptions = {
    low: 'low bandwidth — they are stretched thin right now in terms of time, energy, or mental load',
    mid: 'medium bandwidth — they have some capacity but not unlimited',
    high: 'high bandwidth — they have real time, energy, and motivation available right now',
  };

  const isCurrent = modalType === 'current';

  const prompt = `You are writing a short, warm, personalized summary for someone who just completed the Inbox Alignment Quiz — a quiz that profiles how people organize and process their email.

Here is what we know about this person:

CURRENT PROFILE: ${curProfile.name} (${curProfile.axis})
${curProfile.desc}

IDEAL PROFILE: ${idealProfile.name} (${idealProfile.axis})
${idealProfile.desc}

BANDWIDTH: ${bandwidthDescriptions[bandwidthTier]}

HABIT TAGS (behaviors they selected): ${habitTags.length > 0 ? habitTags.join(', ') : 'none selected'}

${isSameProfile ? 'Their current and ideal profiles are the SAME — they are already where they want to be.' : `They are trying to move from ${curProfile.name} to ${idealProfile.name}.`}

${strategies && strategies.length > 0 ? `RECOMMENDED STRATEGIES FOR THEM:\n${strategies.map(s => '- ' + s).join('\n')}` : ''}

Write a personalized summary for the "${isCurrent ? 'Where you are now' : 'Where you want to be'}" modal card. 

${isCurrent ? `This summary should:
- Reflect their current profile in a way that feels personally observed, not generic
- Reference 1-2 of their habit tags naturally if relevant (don't list them mechanically)
- Acknowledge their bandwidth honestly — if they're stretched thin, name it; if they have capacity, acknowledge that too
- Feel like someone who has been paying attention to their answers wrote this, not a template
- Be 3-4 sentences, warm but direct, no fluff` 
: `This summary should:
- Describe what their ideal inbox life looks like in concrete, specific terms
- Acknowledge the gap from where they are now (or note if they're already there)
- Reference their bandwidth in terms of what the journey toward this goal realistically looks like for them
- Feel aspirational but honest — not a sales pitch, just a clear picture
- Be 3-4 sentences, warm but direct, no fluff`}

Do not use headers. Do not use bullet points. Just flowing prose. Do not start with "You" as the first word.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Anthropic API error:', JSON.stringify(error));
      return res.status(500).json({ error: 'Anthropic API error', details: error });
    }

    const data = await response.json();
    console.log('Anthropic response:', JSON.stringify(data).slice(0, 200));
    const summary = data.content?.[0]?.text || '';
    return res.status(200).json({ summary });

  } catch (err) {
    console.error('Function error:', err.message, err.stack);
    return res.status(500).json({ error: 'Server error', details: err.message, stack: err.stack });
  }
}
