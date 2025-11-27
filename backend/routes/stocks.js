import express from 'express';
import Stock from '../models/Stock.js';
import yahooFinanceService from '../services/yahooFinanceService.js';

const router = express.Router();

// GET /api/stocks - Get all compliant stocks
router.get('/', async (req, res) => {
    try {
        const mongoose = await import('mongoose');

        // If MongoDB not connected, return empty array with message
        if (mongoose.default.connection.readyState !== 1) {
            return res.json({
                stocks: [],
                message: 'Database not connected. Use the search feature to screen individual stocks.',
                pagination: {
                    page: 1,
                    limit: 100,
                    total: 0,
                    pages: 0
                }
            });
        }

        const { sector, sortBy, page = 1, limit = 100 } = req.query;

        // Build query
        let query = { isCompliant: true };
        if (sector && sector !== 'all') {
            query.sector = sector;
        }

        // Build sort
        let sort = {};
        switch (sortBy) {
            case 'score':
                sort = { complianceScore: -1 };
                break;
            case 'performance':
                sort = { change: -1 };
                break;
            case 'market-cap':
                sort = { marketCap: -1 };
                break;
            default:
                sort = { complianceScore: -1 };
        }

        // Execute query with pagination
        const stocks = await Stock.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Stock.countDocuments(query);

        res.json({
            stocks,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/stocks/:symbol - Get specific stock
router.get('/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const mongoose = await import('mongoose');

        console.log(`📊 Fetching stock data for: ${symbol}`);

        let stock = null;

        // Only try database if MongoDB is connected
        if (mongoose.default.connection.readyState === 1) {
            // Try to get from database first
            stock = await Stock.findOne({ symbol: symbol.toUpperCase() });

            // Check if data is stale (older than 24 hours)
            if (stock) {
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                if (stock.updatedAt < oneDayAgo) {
                    console.log(`🔄 Data for ${symbol} is stale (older than 24h). Re-fetching...`);
                    stock = null; // Force re-fetch
                } else {
                    console.log(`✅ Using cached data for ${symbol}`);
                }
            }
        } else {
            console.log('⚠️ MongoDB not connected. Skipping cache check.');
        }

        if (stock) {
            return res.json(stock);
        }

        // If not in DB or stale, fetch from Yahoo Finance
        console.log(`🌍 Fetching fresh data from Yahoo Finance for ${symbol}`);
        const stockData = await yahooFinanceService.getStockData(symbol.toUpperCase());

        if (!stockData) {
            return res.status(404).json({
                error: 'Symbol not found',
                message: `Unable to fetch data for "${symbol}". Please verify it's a valid ticker.`
            });
        }

        const screenedData = yahooFinanceService.screenStock(stockData);

        // Save to DB if connected
        if (mongoose.default.connection.readyState === 1) {
            stock = await Stock.findOneAndUpdate(
                { symbol: symbol.toUpperCase() },
                { ...screenedData, lastUpdated: Date.now() },
                { upsert: true, new: true }
            );
            console.log(`💾 Saved ${symbol} to database`);
        } else {
            stock = screenedData;
        }

        res.json(stock);
    } catch (error) {
        console.error(`💥 Error in /api/stocks/${req.params.symbol}:`, error.message);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            symbol: req.params.symbol
        });
    }
});

// POST /api/stocks/refresh/:symbol - Manually refresh stock data
router.post('/refresh/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const mongoose = await import('mongoose');

        const stockData = await yahooFinanceService.getStockData(symbol.toUpperCase());

        if (!stockData) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        const screenedData = yahooFinanceService.screenStock(stockData);

        let stock = screenedData;
        if (mongoose.default.connection.readyState === 1) {
            stock = await Stock.findOneAndUpdate(
                { symbol: symbol.toUpperCase() },
                { ...screenedData, lastUpdated: Date.now() },
                { upsert: true, new: true }
            );
        }

        res.json({ message: 'Stock refreshed successfully', stock });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/stocks/search/:query - Search stocks
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;

        const stocks = await Stock.find({
            $or: [
                { symbol: { $regex: query, $options: 'i' } },
                { company: { $regex: query, $options: 'i' } }
            ]
        }).limit(10);

        res.json(stocks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
