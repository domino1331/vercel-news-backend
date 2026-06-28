// api/news.js - Vercel Edge Function
// Deploy this file to your Vercel project in the /api folder

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query = 'technology', region = 'global', limit = '10' } = req.query;
    const apiKey = process.env.APITUBE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Build APITube request based on region
    let apiUrl = `https://api.apitube.io/v1/news/everything?per_page=${limit}&sort.by=published_at`;

    if (region === 'sg') {
      apiUrl += '&source.country.code=sg';
    } else if (region === 'my') {
      apiUrl += '&source.country.code=my';
    } else if (region === 'sea') {
      apiUrl += '&source.country.code=sg,my';
    } else {
      // Global news by topic
      apiUrl += `&title=${encodeURIComponent(query)}`;
    }

    // Call APITube
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({
        error: `APITube error: ${apiResponse.statusText}`,
      });
    }

    const data = await apiResponse.json();

    if (data.status !== 'ok') {
      return res.status(400).json({
        error: data.errors?.[0]?.message || 'APITube returned error',
      });
    }

    // Transform results to match Daily Brief format
    const articles = (data.results || []).map((article) => ({
      title: article.title,
      description: article.summary || 'No summary available',
      source: {
        name: article.source?.domain || 'Unknown Source',
      },
      url: article.href,
      publishedAt: article.published_at,
      category: query,
      region: region,
    }));

    return res.status(200).json({
      status: 'ok',
      articles: articles,
      count: articles.length,
    });
  } catch (error) {
    console.error('Backend error:', error);
    return res.status(500).json({
      error: 'Backend error: ' + error.message,
    });
  }
}
