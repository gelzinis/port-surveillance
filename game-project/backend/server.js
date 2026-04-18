const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'highscore.json');

app.use(express.json());

// Serve static files from frontend directory (copied to /app root)
app.use(express.static(__dirname));

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ highscore: 0 }));
}

// Get highscore
app.get('/api/highscore', (req, res) => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        res.json({ highscore: parsed.highscore || 0 });
    } catch (error) {
        res.json({ highscore: 0 });
    }
});

// Save highscore
app.post('/api/highscore', (req, res) => {
    try {
        const { highscore } = req.body;
        
        if (typeof highscore !== 'number' || highscore < 0) {
            return res.status(400).json({ error: 'Invalid highscore value' });
        }
        
        // Read current highscore
        let currentData = { highscore: 0 };
        try {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            currentData = JSON.parse(data);
        } catch (e) {
            // File doesn't exist, use default
        }
        
        // Only update if new score is higher
        if (highscore > currentData.highscore) {
            currentData.highscore = highscore;
            fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
        }
        
        res.json({ highscore: currentData.highscore });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save highscore' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});