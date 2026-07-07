module.exports = async function handler(req, res) {
  console.log('API key present:', !!process.env.ANTHROPIC_API_KEY);
  console.log('API key prefix:', process.env.ANTHROPIC_API_KEY?.slice(0, 10));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { curProfile, idealProfile, bandwidthTier, habitTags, strategies, isSameProfile, modalType } = req.body;

  if (!curProfile || !idealProfile || !bandwidthTier) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const bandwidthDescriptions = {
    low: 'low bandwidth — stretched thin in terms of time, energy, or mental load',
    mid: 'medium bandwidth — some capacity but not unlimited',
    high: 'high bandwidth — real time, energy, and motivation available right now',
  };

  const isCurrent = modalType === 'current';

  const prompt = `You are writing a short, warm, personalized summary for someone who just completed the Inbox Alignment Quiz — a quiz that profiles how people organize and process their email.

Here is what we know about this person:

CURRENT PROFILE: ${curProfile.name} (${curProfile.axis})
${curProfile.desc}

IDEAL PROFILE: ${idealProfile.name} (${idealProfile.axis})
${idealProfile.desc}

BANDWIDTH: ${bandwidthDescriptions[bandwidthTier]}

HABIT TAGS (behaviors they selected): ${habitTags && habitTags.length > 0 ? habitTags.join(', ') : 'none selected'}

${isSameProfile ? 'Their current and ideal profiles are the SAME — they are already where they want to be.' : `They are trying to move from ${curProfile.name} to ${idealProfile.name}.`}

${strategies && strategies.length > 0 ? 'RECOMMENDED STRATEGIES:\n' + strategies.map(s => '- ' + s).join('\n') : ''}

Write a personalized summary for the "${isCurrent ? 'Where you are now' : 'Where you want to be'}" card.

${isCurrent
  ? 'Reflect their current profile personally, reference 1-2 habit tags naturally if relevant, acknowledge their bandwidth. 3-4 sentences, warm but direct.'
  : 'Describe their ideal inbox life concretely, acknowledge the gap from where they are, reference bandwidth in terms of what the journey looks like. 3-4 sentences, warm but direct.'}

No headers. No bullet points. Flowing prose only. Do not start with the word "You".`;

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

    const data = await response.json();
    console.log('Anthropic status:', response.status);
    console.log('Anthropic response:', JSON.stringify(data).slice(0, 300));

    if (!response.ok) {
      return res.status(500).json({ error: 'Anthropic error', details: data });
    }

    const summary = data.content && data.content[0] ? data.content[0].text : '';
    return res.status(200).json({ summary });

  } catch (err) {
    console.error('Function error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
