# RFID Attendance Dashboard

A modern, minimalistic RFID attendance dashboard with real-time updates, search functionality, and dark/light theme support.

## Features

- 🔄 **Real-time Updates** - Auto-refreshes every 1 second
- 🔍 **Advanced Search** - Search by RA number, lab, or date range
- 🔊 **Sound Notifications** - Audio alerts for new entries
- 🌙 **Dark/Light Theme** - Toggle between themes with persistence
- 📊 **Lab Filtering** - Filter by specific labs
- 📱 **Responsive Design** - Works on desktop and mobile
- 📥 **CSV Export** - Download attendance data
- ⚡ **Minimalistic Design** - Clean, professional interface

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Google Apps Script + Google Sheets
- **Styling**: Custom CSS with minimalistic design
- **Deployment**: Vercel

## Setup

### 1. Google Apps Script Setup

1. Create a new Google Apps Script project
2. Replace the default code with your attendance tracking script
3. Deploy as web app with execute permissions
4. Copy the execution URL

### 2. Update Configuration

Update the `APPS_SCRIPT_EXEC_URL` in `script.js`:

```javascript
const APPS_SCRIPT_EXEC_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL";
```

## Deployment to Vercel

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy? `Y`
   - Which scope? Choose your account
   - Link to existing project? `N`
   - Project name: `rfid-attendance-dashboard`
   - Directory: `.` (current directory)

### Method 2: GitHub Integration

1. **Create GitHub Repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/rfid-attendance-dashboard.git
   git push -u origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Deploy automatically

### Method 3: Drag & Drop

1. Go to [vercel.com](https://vercel.com)
2. Drag and drop your project folder
3. Deploy instantly

## Environment Variables

If you need to keep your Google Apps Script URL private, you can use environment variables:

1. **In Vercel Dashboard**:
   - Go to your project settings
   - Add environment variable: `GOOGLE_APPS_SCRIPT_URL`

2. **Update script.js**:
   ```javascript
   const APPS_SCRIPT_EXEC_URL = process.env.GOOGLE_APPS_SCRIPT_URL || "YOUR_FALLBACK_URL";
   ```

## Custom Domain

1. **In Vercel Dashboard**:
   - Go to your project settings
   - Click "Domains"
   - Add your custom domain
   - Update DNS records as instructed

## Local Development

```bash
# Start local server
python3 -m http.server 8000

# Or with Node.js
npx serve .

# Open in browser
open http://localhost:8000
```

## Project Structure

```
rfid-attendance-dashboard/
├── index.html          # Main HTML file
├── script.js           # JavaScript functionality
├── style.css           # CSS styles
├── package.json        # Project configuration
├── vercel.json         # Vercel deployment config
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Configuration

### Google Apps Script Endpoints

Your Google Apps Script should handle these endpoints:

- `GET /exec` - Returns attendance data as JSON
- `GET /exec?download=1` - Returns CSV data
- `GET /exec?action=clear&token=qwerty` - Clears all data

### Data Format

Expected JSON response format:
```json
[
  {
    "epoch": 1761603244,
    "time": "1899-12-29T22:22:54.000Z",
    "Lab": "Lab_503",
    "ra": 3012245,
    "last3": 245
  }
]
```

## Features in Detail

### Search & Filter
- **Real-time search** by RA number, last 3 digits, or lab name
- **Date range filtering** with from/to date pickers
- **Lab-specific filtering** with dropdown selection
- **Clear filters** functionality

### Sound Notifications
- **Web Audio API** implementation
- **Automatic playback** for new entries
- **Graceful fallback** if audio not supported

### Theme System
- **System preference detection**
- **Manual toggle** with sun/moon icons
- **Persistent storage** of theme choice
- **Smooth transitions** between themes

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Ensure Google Apps Script is deployed with proper permissions
   - Check that the URL is correct

2. **No Data Loading**:
   - Verify Google Apps Script URL
   - Check browser console for errors
   - Ensure Google Sheets has data

3. **Sound Not Working**:
   - Check browser audio permissions
   - Try clicking on the page first to enable audio context

### Debug Mode

Enable debug logging by opening browser console (F12) to see:
- Search filter operations
- Data fetching status
- Theme changes
- Error messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review browser console for errors

---

**Deployed on Vercel** 🚀
