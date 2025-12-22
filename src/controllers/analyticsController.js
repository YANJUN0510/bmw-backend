const axios = require('axios');

const getAnalytics = async (req, res) => {
  try {
    const { range } = req.query;
    const token = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!token || !projectId) {
      console.error('Vercel configuration missing');
      return res.status(500).json({ error: 'Vercel configuration missing' });
    }

    let from = new Date();
    const to = new Date();

    switch (range) {
      case '24h':
        from.setHours(from.getHours() - 24);
        break;
      case '7d':
        from.setDate(from.getDate() - 7);
        break;
      case '30d':
        from.setDate(from.getDate() - 30);
        break;
      case '3m':
        from.setMonth(from.getMonth() - 3);
        break;
      case '12m':
        from.setFullYear(from.getFullYear() - 1);
        break;
      case '24m':
        from.setFullYear(from.getFullYear() - 2);
        break;
      case 'all':
        from = new Date('2023-01-01'); // Approximate start date
        break;
      default:
        from.setDate(from.getDate() - 30);
    }

    // Using the Vercel Web Analytics API endpoint
    // Note: This is an internal API endpoint used by the Vercel dashboard
    const url = 'https://vercel.com/api/v1/web-analytics/stats';
    
    const params = {
      projectId,
      from: from.toISOString(),
      to: to.toISOString(),
      environment: 'production',
    };

    if (teamId) params.teamId = teamId;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params,
    });

    res.json(response.data);
  } catch (error) {
    console.error('Analytics API Error:', error.response?.data || error.message);
    // Return mock data if API fails (for development/demo purposes)
    // or return the actual error
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch analytics data',
      details: error.response?.data || error.message
    });
  }
};

module.exports = { getAnalytics };
